/**
 * Singular y plural de los textos con cantidades.
 *
 * Sin esto cada pantalla resolvia el plural a su manera: unas con un ternario,
 * otras con "producto(s)" y otras sin resolverlo ("Últimas 1", "1 unidades").
 * No depende de nada del servidor: lo usan la tienda, el panel y las acciones.
 */

/** La palabra que corresponde a la cantidad. Por defecto el plural es + "s". */
export const plural = (
  cantidad: number,
  singular: string,
  formaPlural = `${singular}s`,
): string => (cantidad === 1 ? singular : formaPlural);

/** La cantidad con su palabra: "1 producto", "3 productos". */
export const contar = (
  cantidad: number,
  singular: string,
  formaPlural?: string,
): string => `${cantidad} ${plural(cantidad, singular, formaPlural)}`;

/** "1 unidad", "4 unidades". */
export const contarUnidades = (cantidad: number): string =>
  contar(cantidad, "unidad", "unidades");

/** Desde cuantas unidades se avisa que quedan pocas (tienda y panel). */
export const UMBRAL_STOCK_BAJO = 3;

export const esStockBajo = (stock: number): boolean =>
  stock > 0 && stock <= UMBRAL_STOCK_BAJO;

/** "Última unidad" o "Últimas 3 unidades". */
export const etiquetaStockBajo = (stock: number): string =>
  stock === 1 ? "Última unidad" : `Últimas ${contarUnidades(stock)}`;
