-- AlterTable: widen avatarUrl and coverUrl to hold base64 data URLs
ALTER TABLE "User" ALTER COLUMN "avatarUrl" TYPE TEXT;
ALTER TABLE "User" ALTER COLUMN "coverUrl" TYPE TEXT;
