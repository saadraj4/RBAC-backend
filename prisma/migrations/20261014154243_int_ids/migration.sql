BEGIN;

-- 1. FK hatao
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- 2. User ko naya auto-increment id do (purani rows ko bhi numbers mil jayenge)
ALTER TABLE "User" ADD COLUMN "new_id" SERIAL;

-- 3. RefreshToken mein naya int userId, purani uuid se map karke
ALTER TABLE "RefreshToken" ADD COLUMN "new_userId" INTEGER;
UPDATE "RefreshToken" rt
SET "new_userId" = u."new_id"
FROM "User" u
WHERE rt."userId" = u."id";

-- Orphan tokens (jinka user nahi mila) hata do
DELETE FROM "RefreshToken" WHERE "new_userId" IS NULL;

-- 4. RefreshToken ko bhi naya auto-increment id do
ALTER TABLE "RefreshToken" ADD COLUMN "new_id" SERIAL;

-- 5. RefreshToken ke columns swap
ALTER TABLE "RefreshToken" DROP COLUMN "userId";
ALTER TABLE "RefreshToken" RENAME COLUMN "new_userId" TO "userId";
ALTER TABLE "RefreshToken" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_pkey";
ALTER TABLE "RefreshToken" DROP COLUMN "id";
ALTER TABLE "RefreshToken" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id");
ALTER SEQUENCE "RefreshToken_new_id_seq" RENAME TO "RefreshToken_id_seq";

-- 6. User ke columns swap
ALTER TABLE "User" DROP CONSTRAINT "User_pkey";
ALTER TABLE "User" DROP COLUMN "id";
ALTER TABLE "User" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
ALTER SEQUENCE "User_new_id_seq" RENAME TO "User_id_seq";

-- 7. FK wapas lagao
ALTER TABLE "RefreshToken"
ADD CONSTRAINT "RefreshToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;