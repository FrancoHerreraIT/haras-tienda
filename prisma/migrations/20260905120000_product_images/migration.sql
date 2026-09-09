-- Product pasa de una sola foto (imageUrl) a una lista (images).
-- La primera posicion es la portada, asi que la foto que ya tenia cada
-- producto se copia ahi antes de borrar la columna vieja: sin este UPDATE
-- se perderian las fotos ya cargadas.

ALTER TABLE "Product" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Product"
SET "images" = ARRAY["imageUrl"]
WHERE "imageUrl" IS NOT NULL AND "imageUrl" <> '';

ALTER TABLE "Product" DROP COLUMN "imageUrl";
