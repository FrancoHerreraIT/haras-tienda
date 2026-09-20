/**
 * Sucursales donde el cliente retira el pedido.
 *
 * La tienda no hace envios a domicilio: el checkout no pide direccion, pide
 * sucursal. Este es el unico lugar donde estan definidas; el Footer, el
 * selector del checkout y el mail de confirmacion leen de aca.
 *
 * El `id` es lo que se guarda en `Order.pickupBranch` y no se toca nunca:
 * cambiarle el nombre o la direccion a una sucursal no tiene que reescribir
 * los pedidos ya hechos.
 *
 * No hay secretos: se puede importar desde el cliente.
 */
export interface PickupBranch {
  id: string;
  nombre: string;
  direccion: string;
  /** Se muestra abajo del nombre en el selector del checkout. */
  horario: string;
}

export const PICKUP_BRANCHES = [
  {
    id: "centro",
    nombre: "Centro",
    direccion: "Duarte Quirós 591",
    horario: "Lunes a sábados de 10:30 a 13:30 h",
  },
  {
    id: "homa-mall",
    nombre: "Homa Mall",
    direccion: "Ruta C45 · Km 1 · Local 2",
    horario: "Lunes a sábados de 12:00 a 20:00 h",
  },
] as const satisfies readonly PickupBranch[];

export type PickupBranchId = (typeof PICKUP_BRANCHES)[number]["id"];

/** La sucursal con ese id, o null si el valor no es uno de los nuestros. */
export function buscarSucursal(id: string | null | undefined): PickupBranch | null {
  if (typeof id !== "string") return null;
  return PICKUP_BRANCHES.find((sucursal) => sucursal.id === id.trim()) ?? null;
}

/**
 * Como se nombra la sucursal en textos (mail, panel, pantalla de exito).
 *
 * Para un pedido viejo sin sucursal, o con un id que ya no existe, devuelve
 * algo legible en vez de romper.
 */
export function nombreSucursal(id: string | null | undefined): string {
  const sucursal = buscarSucursal(id);
  if (sucursal) return `${sucursal.nombre} — ${sucursal.direccion}`;
  return id?.trim() ? id.trim() : "Sucursal no especificada";
}
