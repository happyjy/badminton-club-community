-- CreateTable
CREATE TABLE "TournamentFile" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentFile_tournamentId_idx" ON "TournamentFile"("tournamentId");

-- AddForeignKey
ALTER TABLE "TournamentFile" ADD CONSTRAINT "TournamentFile_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
