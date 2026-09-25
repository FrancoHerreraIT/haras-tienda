"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Landmark, Lock, MapPin, Package, ShoppingBag } from "lucide-react";
import { Great_Vibes } from "next/font/google";
import { useCartStore } from "@/store/useCartStore";
import { useHydrated } from "@/app/lib/useHydrated";
import TransferPanel from "@/components/TransferPanel";
import {
  DESCUENTO_TRANSFERENCIA,
  PAYMENT_METHODS,
  desglosarTotal,
  type PaymentMethod,
} from "@/app/lib/paymentConfig";
import {
  TAX_CONDITIONS,
  cartItemsToCheckoutLines,
  errorDocumentoFacturacion,
  esDni,
  normalizarDocumento,
  retiroDelComprador,
  type CheckoutCustomer,
  type DatosRetiro,
  type TaxCondition,
} from "@/app/lib/checkout";
import { useMercadoPagoCheckout } from "@/app/lib/useMercadoPagoCheckout";
import { PICKUP_BRANCHES } from "@/app/lib/branches";
import { confirmarPedidoPorTransferencia } from "./actions";

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const inputClass =
  "w-full bg-white border border-stone-300 rounded-lg px-4 py-3 text-[15px] text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/40 transition-all";

const labelClass =
"block text-[11px] tracking-wide text-stone-500 font-semibold mb-2";

interface FieldProps
  extends Omit<React.ComponentPropsWithoutRef<"input">, "id" | "className"> {
  id: string;
  label: string;
  className?: string;
  /** Mensaje de validacion; pinta el borde y se lee abajo del campo. */
  error?: string;
}

function Field({
  id,
  label,
  className = "",
  error,
  ...inputProps
}: FieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        className={`${inputClass} ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-500/30"
            : ""
        }`}
        /* aria-invalid + describedby: el lector de pantalla anuncia el error
           junto al campo, no como un texto suelto al final del formulario. */
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-[12px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Los campos de texto del formulario. Las claves son tambien el `id` de cada
 * control, asi el foco al primer error se resuelve con un getElementById.
 */
interface DatosComprador {
  /* Facturacion */
  razonSocial: string;
  documento: string;
  domicilio: string;
  email: string;
  telefono: string;
  /* Quien retira */
  retiroNombre: string;
  retiroApellido: string;
  retiroDni: string;
}

type CampoComprador = keyof DatosComprador;

/**
 * Todo lo que puede marcar error, en el orden en que se lee en pantalla: al
 * fallar se enfoca el primero de esta lista que tenga problema.
 *
 * `retiroPersonal` es el checkbox (cuando no se puede autocompletar el retiro)
 * y `sucursal` el bloque de radios; ninguno de los dos es un campo de texto.
 */
const ORDEN_DE_LECTURA = [
  "razonSocial",
  "documento",
  "domicilio",
  "email",
  "telefono",
  "retiroPersonal",
  "retiroNombre",
  "retiroApellido",
  "retiroDni",
  "sucursal",
] as const;

type CampoValidable = (typeof ORDEN_DE_LECTURA)[number];

const DATOS_VACIOS: DatosComprador = {
  razonSocial: "",
  documento: "",
  domicilio: "",
  email: "",
  telefono: "",
  retiroNombre: "",
  retiroApellido: "",
  retiroDni: "",
};

/** Ancla del bloque de sucursales, para enfocarlo cuando falta elegir una. */
const ID_SUCURSAL = "sucursal";

/* Chequeo de forma, no de existencia: que tenga algo, un @ y un punto. Si el
   mail no existe nos enteramos igual cuando rebote el aviso del pedido. */
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Quien retira, segun el checkbox: los datos de facturacion si retira el
 * mismo comprador, o los del bloque 2 si no. Si no se puede armar, el motivo.
 */
function datosDeRetiro(
  datos: DatosComprador,
  retiroPersonal: boolean,
): DatosRetiro | string {
  if (retiroPersonal) {
    return retiroDelComprador(datos.razonSocial, datos.documento);
  }

  return {
    firstName: datos.retiroNombre.trim(),
    lastName: datos.retiroApellido.trim(),
    dni: datos.retiroDni.trim(),
  };
}

/** Pasa el formulario al formato que espera el servidor. */
function aCheckoutCustomer(
  datos: DatosComprador,
  condicionIva: TaxCondition,
  retiro: DatosRetiro,
  sucursal: string,
): CheckoutCustomer {
  return {
    name: datos.razonSocial.trim(),
    email: datos.email.trim(),
    phone: datos.telefono.trim(),
    taxId: datos.documento.trim(),
    taxCondition: condicionIva,
    billingAddress: datos.domicilio.trim(),
    pickupFirstName: retiro.firstName,
    pickupLastName: retiro.lastName,
    pickupDni: retiro.dni,
    pickupBranch: sucursal,
  };
}

export default function CheckoutPage() {
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.getTotalPrice());
  /* Unidades, no lineas: dos veces el mismo producto cuentan como dos. */
  const totalUnidades = useCartStore((state) => state.getTotalItems());

  /* El store se rehidrata desde localStorage recién en el cliente */
  const mounted = useHydrated();

  const clearCart = useCartStore((state) => state.clearCart);
  const router = useRouter();

  const [metodoPago, setMetodoPago] = useState<PaymentMethod>("mercadopago");
  const esTransferencia = metodoPago === "transferencia";

  /* Mercado Pago: la preferencia se crea en /api/checkout y la redireccion
     sale de este hook. */
  const { handlePayment, isLoading, error: errorPago } =
    useMercadoPagoCheckout();

  const [datos, setDatos] = useState<DatosComprador>(DATOS_VACIOS);
  /* Arranca en Consumidor Final: es el caso de casi todos los compradores. */
  const [condicionIva, setCondicionIva] =
    useState<TaxCondition>("consumidor_final");
  /* Arranca tildado: lo habitual es que retire el mismo que compra, y asi no
     se le piden dos veces los mismos datos. */
  const [retiroPersonal, setRetiroPersonal] = useState(true);
  /** Id de PICKUP_BRANCHES; vacio hasta que el cliente elige. */
  const [sucursal, setSucursal] = useState("");
  const [errores, setErrores] = useState<
    Partial<Record<CampoValidable, string>>
  >({});

  /* Transferencia: confirma contra un Server Action, sin salir de la app. */
  const [confirmando, iniciarConfirmacion] = useTransition();
  const [errorTransferencia, setErrorTransferencia] = useState<string | null>(
    null,
  );

  /** Borra el error de un campo apenas el cliente lo toca. */
  const limpiarError = (campo: CampoValidable) =>
    setErrores((previos) =>
      previos[campo] ? { ...previos, [campo]: undefined } : previos,
    );

  const actualizar =
    (campo: CampoComprador) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const valor = e.target.value;
      setDatos((previos) => ({ ...previos, [campo]: valor }));

      /* El error se limpia al primer tecleo: dejar el campo en rojo mientras
         lo esta corrigiendo no aporta nada. */
      limpiarError(campo);

      /* El retiro personal se arma con estos dos: corregirlos resuelve el
         error del checkbox. */
      if (campo === "razonSocial" || campo === "documento") {
        limpiarError("retiroPersonal");
      }
    };

  const elegirSucursal = (id: string) => {
    setSucursal(id);
    limpiarError("sucursal");
  };

  const elegirCondicionIva = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCondicionIva(e.target.value as TaxCondition);
    /* Pasar a Consumidor Final puede volver valido un DNI rechazado. */
    limpiarError("documento");
  };

  const cambiarRetiroPersonal = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRetiroPersonal(e.target.checked);
    limpiarError("retiroPersonal");
  };

  /**
   * Valida, marca los campos flojos y enfoca el primero.
   *
   * Devuelve el cliente listo para mandar, o null si algo fallo. Las reglas
   * de documento y retiro son las de lib/checkout: el servidor corre las
   * mismas, asi que lo que pasa aca no rebota alla.
   */
  const validar = (): CheckoutCustomer | null => {
    const nuevos: Partial<Record<CampoValidable, string>> = {};

    if (datos.razonSocial.trim() === "") {
      nuevos.razonSocial = "Ingresá tu nombre y apellido o la razón social.";
    }

    const errorDocumento = errorDocumentoFacturacion(
      datos.documento,
      condicionIva,
    );
    if (errorDocumento) nuevos.documento = errorDocumento;

    if (datos.domicilio.trim() === "") {
      nuevos.domicilio = "Ingresá el domicilio de facturación.";
    }

    if (datos.email.trim() === "") {
      nuevos.email = "Ingresá tu email.";
    } else if (!EMAIL_VALIDO.test(datos.email.trim())) {
      nuevos.email = "Revisá el email: no parece una dirección válida.";
    }

    if (datos.telefono.trim() === "") {
      nuevos.telefono = "Ingresá un teléfono de contacto.";
    }

    const retiro = datosDeRetiro(datos, retiroPersonal);

    if (retiroPersonal) {
      /* Si el nombre o el documento ya estan en rojo, el motivo se lee ahi:
         repetirlo en el checkbox seria el mismo error dos veces. */
      if (
        typeof retiro === "string" &&
        !nuevos.razonSocial &&
        !nuevos.documento
      ) {
        nuevos.retiroPersonal = retiro;
      }
    } else if (typeof retiro !== "string") {
      if (retiro.firstName === "") {
        nuevos.retiroNombre = "Ingresá el nombre de quién retira.";
      }
      if (retiro.lastName === "") {
        nuevos.retiroApellido = "Ingresá el apellido de quién retira.";
      }
      if (retiro.dni === "") {
        nuevos.retiroDni = "Ingresá el DNI de quién retira.";
      } else if (!esDni(normalizarDocumento(retiro.dni) ?? "")) {
        nuevos.retiroDni = "Revisá el DNI: tiene 7 u 8 números.";
      }
    }

    /* Sin sucursal el pedido no tiene donde entregarse: es obligatoria. */
    if (sucursal === "") {
      nuevos.sucursal = "Elegí en qué sucursal vas a retirar el pedido.";
    }

    setErrores(nuevos);

    /* Se enfoca el primero que falle en orden de lectura, que es el primero
       que ve el comprador. */
    const primerError = ORDEN_DE_LECTURA.find((campo) => nuevos[campo]);

    if (primerError || typeof retiro === "string") {
      if (primerError) document.getElementById(primerError)?.focus();
      return null;
    }

    return aCheckoutCustomer(datos, condicionIva, retiro, sucursal);
  };

  /* El boton vive fuera del <form> (esta en la columna del resumen), asi que
     la validacion se dispara desde el click y no desde un submit. */
  const iniciarPago = () => {
    const cliente = validar();
    if (!cliente) return;
    void handlePayment(cliente);
  };

  /**
   * Transferencia: guarda el pedido en estado pendiente, vacia el carrito y
   * lleva a la pantalla con el alias. No se manda ningun mail: el pedido queda
   * pendiente hasta que la tienda confirme el pago, y recien ahi sale el
   * aviso. Por eso la pantalla de destino repite los datos bancarios.
   */
  const confirmarTransferencia = () => {
    const cliente = validar();
    if (!cliente) return;

    setErrorTransferencia(null);

    /* getState() y no el hook: el contenido que vale es el del click. */
    const delCarrito = useCartStore.getState().items;

    if (delCarrito.length === 0) {
      setErrorTransferencia("Tu carrito está vacío.");
      return;
    }

    iniciarConfirmacion(async () => {
      const resultado = await confirmarPedidoPorTransferencia({
        items: cartItemsToCheckoutLines(delCarrito),
        customer: cliente,
      });

      if (!resultado.ok) {
        setErrorTransferencia(resultado.error);
        return;
      }

      /* Recien con el pedido guardado se suelta el carrito: si la accion
         hubiera fallado, el comprador lo encuentra intacto. */
      clearCart();
      router.push(`/checkout/transferencia/${resultado.orderId}`);
    });
  };

  /* Lo que se cargaria como "quien retira" con el checkbox tildado. */
  const retiroAutocompletado = retiroDelComprador(
    datos.razonSocial,
    datos.documento,
  );

  /* Se retira en sucursal: no hay costo de envio, lo unico que mueve el total
     es el descuento por transferencia.

     La cuenta se hace en centavos con la misma funcion que usa el servidor al
     crear la orden (lib/paymentConfig): si el resumen calculara el descuento
     por su cuenta, alcanzaria un redondeo distinto para que el cliente vea un
     importe y le llegue el mail con otro.

     Hasta que hidrate va todo en 0, igual que antes: el store se rehidrata
     desde localStorage recien en el cliente y pintar el subtotal del server
     (vacio) contra el del cliente daria un mismatch. */
  const { descuentoCents, totalCents } = desglosarTotal(
    mounted ? Math.round(subtotal * 100) : 0,
    metodoPago,
  );

  const descuento = descuentoCents / 100;
  const total = totalCents / 100;

  /* Un solo boton para los dos metodos: se bloquea con el que este corriendo. */
  const ocupado = esTransferencia ? confirmando : isLoading;
  const mensajeError = esTransferencia ? errorTransferencia : errorPago;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      {/* Cabecera sobria del checkout */}
      <header className="bg-[#1C1A19] text-stone-100">
        <div className="w-full px-4 md:px-12 lg:px-24 xl:px-32 py-4 sm:py-5 flex items-center justify-between gap-3 sm:gap-6">
          <Link href="/" className="shrink-0 leading-none">
            <span
              className={`${greatVibes.className} block text-2xl md:text-3xl text-stone-50`}
            >
              Haras del Este
            </span>
          </Link>
        </div>
      </header>

      <main className="w-full px-4 md:px-12 lg:px-24 xl:px-32 py-8 sm:py-10 md:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-2 py-3 text-sm text-stone-500 hover:text-amber-800 transition-colors mb-5 sm:mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Seguir comprando
        </Link>

        <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl md:text-4xl text-stone-900 mb-2">
          Finalizar compra
        </h1>
        <span className="block w-14 h-px bg-amber-800 mb-10" />

        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12 items-start">
          {/* ---------- Columna izquierda: formulario ---------- */}
          <form
            onSubmit={(e) => e.preventDefault()}
            className="w-full lg:flex-1 space-y-6"
          >
            {/* Bloque 1: datos de facturacion (el comprador) */}
            <section className="bg-white border border-stone-200 rounded-xl shadow-sm shadow-stone-200/50 p-5 sm:p-6 md:p-8">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-stone-900 mb-1">
                Datos de facturación
              </h2>
              <p className="text-sm text-stone-500 mb-6">
                La factura sale a este nombre. Te enviamos el seguimiento del
                pedido al correo.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field
                  id="razonSocial"
                  value={datos.razonSocial}
                  onChange={actualizar("razonSocial")}
                  error={errores.razonSocial}
                  label="Nombre y apellido o razón social"
                  placeholder="Juan Pérez"
                  autoComplete="name"
                  maxLength={120}
                  className="sm:col-span-2"
                />
                <Field
                  id="documento"
                  value={datos.documento}
                  onChange={actualizar("documento")}
                  error={errores.documento}
                  label="DNI o CUIT"
                  inputMode="numeric"
                  placeholder="30 123 456 o 20-30123456-7"
                  maxLength={20}
                />

                <div>
                  <label htmlFor="condicionIva" className={labelClass}>
                    Condición frente al IVA
                  </label>
                  <select
                    id="condicionIva"
                    name="condicionIva"
                    value={condicionIva}
                    onChange={elegirCondicionIva}
                    className={`${inputClass} appearance-auto`}
                  >
                    {(Object.keys(TAX_CONDITIONS) as TaxCondition[]).map(
                      (clave) => (
                        <option key={clave} value={clave}>
                          {TAX_CONDITIONS[clave]}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <Field
                  id="domicilio"
                  value={datos.domicilio}
                  onChange={actualizar("domicilio")}
                  error={errores.domicilio}
                  label="Domicilio de facturación"
                  placeholder="Av. Colón 1234, Córdoba"
                  autoComplete="street-address"
                  maxLength={200}
                  className="sm:col-span-2"
                />

                <Field
                  id="email"
                  value={datos.email}
                  onChange={actualizar("email")}
                  error={errores.email}
                  label="Email"
                  type="email"
                  placeholder="tunombre@correo.com"
                  autoComplete="email"
                />
                <Field
                  id="telefono"
                  value={datos.telefono}
                  onChange={actualizar("telefono")}
                  error={errores.telefono}
                  label="Teléfono"
                  type="tel"
                  placeholder="351 000 0000"
                  autoComplete="tel"
                />
              </div>
            </section>

            {/* Bloque 2: quien retira */}
            <section className="bg-white border border-stone-200 rounded-xl shadow-sm shadow-stone-200/50 p-5 sm:p-6 md:p-8">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-stone-900 mb-1">
                Quién retira
              </h2>
              <p className="text-sm text-stone-500 mb-6">
                Quien pase a buscar el pedido tiene que presentar este DNI.
              </p>

              <label
                htmlFor="retiroPersonal"
                className="flex cursor-pointer items-start gap-3"
              >
                <input
                  id="retiroPersonal"
                  type="checkbox"
                  checked={retiroPersonal}
                  onChange={cambiarRetiroPersonal}
                  aria-invalid={errores.retiroPersonal ? true : undefined}
                  aria-describedby={
                    errores.retiroPersonal ? "retiroPersonal-error" : undefined
                  }
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#8B5A2B]"
                />
                <span className="text-sm font-semibold text-stone-800">
                  Retiro mi pedido personalmente
                </span>
              </label>

              {errores.retiroPersonal && (
                <p
                  id="retiroPersonal-error"
                  role="alert"
                  className="mt-2 text-[12px] text-red-700"
                >
                  {errores.retiroPersonal}
                </p>
              )}

              {retiroPersonal ? (
                /* Vista previa de lo que va a quedar cargado: si la razon
                   social es de una empresa, el comprador lo ve antes de pagar. */
                <p className="mt-4 rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-600">
                  {typeof retiroAutocompletado === "string"
                    ? "Usamos tu nombre y documento de los datos de facturación."
                    : `Retira ${retiroAutocompletado.firstName} ${retiroAutocompletado.lastName} · DNI ${retiroAutocompletado.dni}`}
                </p>
              ) : (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field
                    id="retiroNombre"
                    value={datos.retiroNombre}
                    onChange={actualizar("retiroNombre")}
                    error={errores.retiroNombre}
                    label="Nombre"
                    placeholder="Juan"
                    autoComplete="off"
                    maxLength={120}
                  />
                  <Field
                    id="retiroApellido"
                    value={datos.retiroApellido}
                    onChange={actualizar("retiroApellido")}
                    error={errores.retiroApellido}
                    label="Apellido"
                    placeholder="Pérez"
                    autoComplete="off"
                    maxLength={120}
                  />
                  <Field
                    id="retiroDni"
                    value={datos.retiroDni}
                    onChange={actualizar("retiroDni")}
                    error={errores.retiroDni}
                    label="DNI"
                    inputMode="numeric"
                    placeholder="30 123 456"
                    maxLength={12}
                    className="sm:col-span-2"
                  />
                </div>
              )}
            </section>

            {/* Sucursal de retiro */}
            <section className="bg-white border border-stone-200 rounded-xl shadow-sm shadow-stone-200/50 p-5 sm:p-6 md:p-8">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-stone-900 mb-1">
                Sucursal de retiro
              </h2>
              <p className="text-sm text-stone-500 mb-6">
                No hacemos envíos: elegí dónde pasás a buscar tu pedido.
              </p>

              {/* radiogroup + tabIndex: el bloque entero recibe el foco cuando
                  la validacion falla, que es lo que el lector de pantalla
                  necesita anunciar junto al error. */}
              <div
                id={ID_SUCURSAL}
                role="radiogroup"
                tabIndex={-1}
                aria-label="Sucursal de retiro"
                aria-invalid={errores.sucursal ? true : undefined}
                aria-describedby={
                  errores.sucursal ? `${ID_SUCURSAL}-error` : undefined
                }
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 focus:outline-none"
              >
                {PICKUP_BRANCHES.map((opcion) => {
                  const seleccionada = sucursal === opcion.id;
                  return (
                    <label
                      key={opcion.id}
                      className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                        seleccionada
                          ? "border-[#8B5A2B] bg-[#8B5A2B]/5 ring-2 ring-[#8B5A2B]/20"
                          : errores.sucursal
                            ? "border-red-300 hover:border-red-400"
                            : "border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      <span className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="pickupBranch"
                          value={opcion.id}
                          checked={seleccionada}
                          onChange={() => elegirSucursal(opcion.id)}
                          className="mt-0.5 h-5 w-5 shrink-0 accent-[#8B5A2B]"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-stone-800">
                            {opcion.nombre}
                          </span>
                          <span className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-stone-500">
                            <MapPin
                              className="mt-0.5 h-3 w-3 shrink-0 text-amber-800"
                              strokeWidth={1.75}
                            />
                            {opcion.direccion}
                          </span>
                          <span className="mt-1 block text-[11px] text-stone-400">
                            {opcion.horario}
                          </span>
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              {errores.sucursal && (
                <p
                  id={`${ID_SUCURSAL}-error`}
                  role="alert"
                  className="mt-3 text-[12px] text-red-700"
                >
                  {errores.sucursal}
                </p>
              )}
            </section>

            {/* Forma de pago */}
            <section className="bg-white border border-stone-200 rounded-xl shadow-sm shadow-stone-200/50 p-5 sm:p-6 md:p-8">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-stone-900 mb-1">
                Forma de pago
              </h2>
              <p className="text-sm text-stone-500 mb-6">
                Elegí cómo querés abonar tu pedido.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(
                  Object.keys(PAYMENT_METHODS) as PaymentMethod[]
                ).map((key) => {
                  const seleccionado = metodoPago === key;
                  return (
                    <label
                      key={key}
                      className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                        seleccionado
                          ? "border-[#8B5A2B] bg-[#8B5A2B]/5 ring-2 ring-[#8B5A2B]/20"
                          : "border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      <span className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="metodoPago"
                          value={key}
                          checked={seleccionado}
                          onChange={() => setMetodoPago(key)}
                          className="mt-0.5 h-5 w-5 shrink-0 accent-[#8B5A2B]"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-stone-800">
                            {PAYMENT_METHODS[key].label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">
                            {PAYMENT_METHODS[key].hint}
                          </span>
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              {esTransferencia && <TransferPanel />}
            </section>
          </form>

          {/* ---------- Columna derecha: resumen ---------- */}
          <aside className="w-full lg:w-[400px] xl:w-[440px] shrink-0 lg:sticky lg:top-8">
            <div className="bg-white border border-stone-200 rounded-xl shadow-sm shadow-stone-200/50 p-5 sm:p-6 md:p-8">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-stone-900 mb-6">
                Resumen de compra
              </h2>

              {!mounted ? (
                /* Placeholder mientras el store se hidrata */
                <div className="space-y-4" aria-hidden>
                  {[0, 1].map((i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                      <div className="w-16 h-16 rounded-lg bg-stone-100 shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 bg-stone-100 rounded w-3/4" />
                        <div className="h-3 bg-stone-100 rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-10 text-stone-400">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-3" strokeWidth={1} />
                  <p className="text-sm text-stone-500 mb-5">
                    Tu carrito está vacío.
                  </p>
                  <Link
                    href="/productos"
                    className="inline-block bg-[#8B5A2B] hover:bg-[#6b4421] text-[#F7F5F0] font-semibold tracking-wide text-xs px-7 py-3 rounded-lg transition-colors"
                  >
                    Ver productos
                  </Link>
                </div>
              ) : (
                <>
                  <ul className="space-y-5 max-h-[340px] overflow-y-auto pr-1">
                    {items.map((item) => (
                      <li key={item.id} className="flex gap-4">
                        {/* La cantidad va una sola vez, en el renglon de
                            abajo ("... c/u · x N"). El `relative` se queda:
                            lo necesita el `fill` de next/image. */}
                        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-100 bg-[#F7F5F0]">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.title}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          ) : (
                            <Package
                              className="w-7 h-7 text-stone-300"
                              strokeWidth={1}
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Sin el rubro arriba: el que llego al checkout ya
                              eligio, y en esta lista solo necesita reconocer
                              lo que compra.
                              El tamano va en px y no en `text-sm`, que con el
                              rem al 67% de globals.css cae a ~9px — menos que
                              los 10px literales que tenia el rubro, que con el
                              semibold en cuero encima terminaba leyendose como
                              el titulo del item. */}
                          <h3 className="text-[13px] font-semibold text-stone-900 leading-snug line-clamp-2">
                            {item.title}
                          </h3>
                          {/* Precio unitario x cantidad: sin esto el importe
                              de la derecha se leia como el de una sola unidad. */}
                          <p className="mt-1 text-xs text-stone-500 tabular-nums">
                            $ {item.price.toLocaleString("es-AR")} c/u
                            <span className="mx-1 text-stone-300">·</span>
                            <span className="font-semibold text-stone-600">
                              x {item.quantity}
                            </span>
                          </p>
                        </div>

                        <span className="text-sm font-semibold text-stone-900 whitespace-nowrap tabular-nums">
                          $ {(item.price * item.quantity).toLocaleString("es-AR")}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Totales */}
                  <div className="border-t border-stone-200 mt-6 pt-6 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">
                        Subtotal ({totalUnidades}{" "}
                        {totalUnidades === 1 ? "producto" : "productos"})
                      </span>
                      <span className="text-stone-800 tabular-nums">
                        $ {subtotal.toLocaleString("es-AR")}
                      </span>
                    </div>

                    {/* El renglon aparece solo con transferencia elegida: con
                        Mercado Pago no hay descuento y un "-$0" al lado del
                        subtotal se lee como un error de la pagina. */}
                    {descuento > 0 && (
                      <div className="flex justify-between text-[13px]">
                        <span className="font-medium text-green-700">
                          Descuento transferencia ({DESCUENTO_TRANSFERENCIA}%)
                        </span>
                        <span className="font-semibold text-green-700 tabular-nums">
                          − $ {descuento.toLocaleString("es-AR")}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-baseline border-t border-stone-200 pt-4 mt-4">
                      <span className="text-[11px] tracking-wide text-stone-500 font-semibold">
                        Total
                      </span>
                      <span className="font-[family-name:var(--font-display)] text-3xl text-stone-900 tabular-nums">
                        $ {total.toLocaleString("es-AR")}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={
                      esTransferencia ? confirmarTransferencia : iniciarPago
                    }
                    disabled={ocupado}
                    aria-busy={ocupado}
                    className={`w-full mt-7 active:scale-[0.99] text-white font-bold py-4 rounded-lg text-[15px] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 ${
                      esTransferencia
                        ? "bg-[#8B5A2B] hover:bg-[#6b4421]"
                        : "bg-[#009EE3] hover:bg-[#0089C7]"
                    }`}
                  >
                    {esTransferencia
                      ? confirmando
                        ? "Confirmando pedido..."
                        : "Confirmar pedido"
                      : isLoading
                        ? "Redirigiendo a Mercado Pago..."
                        : "Pagar con Mercado Pago"}
                  </button>

                  {mensajeError && (
                    <p
                      role="alert"
                      className="mt-3 text-[13px] text-red-700 text-center"
                    >
                      {mensajeError}
                    </p>
                  )}

                  <p className="flex items-center justify-center gap-1.5 text-[11px] text-stone-400 mt-4">
                    {esTransferencia ? (
                      <>
                        <Landmark className="w-3 h-3" />
                        Te enviamos el alias por mail y reservamos el pedido
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        Pago procesado de forma segura
                      </>
                    )}
                  </p>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
