-- CreateEnum
CREATE TYPE "StudyItemStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'CONSOLIDATED');

-- CreateTable
CREATE TABLE "StudyItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceId" TEXT,
    "title" TEXT NOT NULL,
    "reference" TEXT,
    "questions" JSONB,
    "fichamentoNoteId" TEXT,
    "status" "StudyItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recall" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studyItemId" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_StudyItemLabels" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_StudyItemLabels_AB_unique" ON "_StudyItemLabels"("A", "B");

-- CreateIndex
CREATE INDEX "_StudyItemLabels_B_index" ON "_StudyItemLabels"("B");

-- AddForeignKey
ALTER TABLE "StudyItem" ADD CONSTRAINT "StudyItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyItem" ADD CONSTRAINT "StudyItem_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyItem" ADD CONSTRAINT "StudyItem_fichamentoNoteId_fkey" FOREIGN KEY ("fichamentoNoteId") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recall" ADD CONSTRAINT "Recall_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recall" ADD CONSTRAINT "Recall_studyItemId_fkey" FOREIGN KEY ("studyItemId") REFERENCES "StudyItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudyItemLabels" ADD CONSTRAINT "_StudyItemLabels_A_fkey" FOREIGN KEY ("A") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudyItemLabels" ADD CONSTRAINT "_StudyItemLabels_B_fkey" FOREIGN KEY ("B") REFERENCES "StudyItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
