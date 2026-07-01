-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "resourceId" TEXT;

-- CreateIndex
CREATE INDEX "Goal_userId_resourceId_idx" ON "Goal"("userId", "resourceId");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
