-- AlterTable
ALTER TABLE "User" ADD COLUMN     "refreshTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "refreshTokenHash" TEXT;
