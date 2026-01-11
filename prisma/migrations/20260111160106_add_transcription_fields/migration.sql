-- CreateEnum
CREATE TYPE "TranscriptionStatus" AS ENUM ('NONE', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "transcription" TEXT,
ADD COLUMN     "transcriptionStatus" "TranscriptionStatus" NOT NULL DEFAULT 'NONE';
