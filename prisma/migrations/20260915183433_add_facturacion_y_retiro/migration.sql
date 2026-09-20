-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerTaxCondition" TEXT,
ADD COLUMN     "customerTaxId" TEXT,
ADD COLUMN     "pickupDni" TEXT,
ADD COLUMN     "pickupFirstName" TEXT,
ADD COLUMN     "pickupLastName" TEXT;
