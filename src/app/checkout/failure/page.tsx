import CheckoutStatus from "@/components/CheckoutStatus";

export const metadata = {
  title: "Pago rechazado | Haras del Este",
};

/**
 * Retorno con el pago rechazado (back_urls.failure).
 *
 * El carrito queda intacto a proposito: lo mas probable es que quiera
 * reintentar con otra tarjeta.
 */
export default async function CheckoutFailurePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const primero = (valor: string | string[] | undefined) =>
    Array.isArray(valor) ? valor[0] ?? null : valor ?? null;

  return (
    <CheckoutStatus
      variant="failure"
      paymentId={primero(params.payment_id) ?? primero(params.collection_id)}
      status={primero(params.status) ?? primero(params.collection_status)}
      externalReference={primero(params.external_reference)}
    />
  );
}
