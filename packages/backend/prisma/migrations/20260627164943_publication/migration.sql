-- CreateTable
CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'idea',
    "title" TEXT NOT NULL,
    "noteId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "status" "GeneralStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PublicationLabels" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_PublicationLabels_AB_unique" ON "_PublicationLabels"("A", "B");

-- CreateIndex
CREATE INDEX "_PublicationLabels_B_index" ON "_PublicationLabels"("B");

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PublicationLabels" ADD CONSTRAINT "_PublicationLabels_A_fkey" FOREIGN KEY ("A") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PublicationLabels" ADD CONSTRAINT "_PublicationLabels_B_fkey" FOREIGN KEY ("B") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
