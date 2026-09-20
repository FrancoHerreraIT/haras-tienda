-- La tienda no hace envios: "shipped" (Enviado) pasa a ser "ready_for_pickup"
-- (Listo para retirar). Solo datos, sin cambios de estructura: el estado es
-- un TEXT libre y los valores validos viven en src/components/admin/orderStatus.ts.
UPDATE "Order" SET "status" = 'ready_for_pickup' WHERE "status" = 'shipped';
UPDATE "OrderStatusLog" SET "status" = 'ready_for_pickup' WHERE "status" = 'shipped';
