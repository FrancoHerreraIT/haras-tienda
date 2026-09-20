-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentMethod" TEXT NOT NULL DEFAULT 'mercadopago',
ADD COLUMN     "pickupBranch" TEXT;
