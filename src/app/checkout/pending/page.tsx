import CheckoutStatus from "@/components/CheckoutStatus";

export const metadata = {
  title: "Pago en proceso | Haras del Este",
};

/**
 * Retorno con el pago pendiente (back_urls.pending): efectivo en Rapipago,
 * transferencias demoradas o revisiones manuales de MP.
 *
 * El carrito NO se vacia: mientras el pago no este acreditado, el pedido no
 * esta cerrado.
 */
export default async function CheckoutPendingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const primero = (valor: string | string[] | undefined) =>
    Array.isArray(valor) ? valor[0] ?? null : valor ?? null;

  return (
    <CheckoutStatus
      variant="pending"
      paymentId={primero(params.payment_id) ?? primero(params.collection_id)}
    />
  );
}
