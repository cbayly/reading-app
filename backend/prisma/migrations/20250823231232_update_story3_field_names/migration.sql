/*
  Warnings:

  - You are about to drop the column `chapter1` on the `story3s` table. All the data in the column will be lost.
  - You are about to drop the column `chapter2` on the `story3s` table. All the data in the column will be lost.
  - You are about to drop the column `chapter3` on the `story3s` table. All the data in the column will be lost.
  - Added the required column `part1` to the `story3s` table without a default value. This is not possible if the table is not empty.
  - Added the required column `part2` to the `story3s` table without a default value. This is not possible if the table is not empty.
  - Added the required column `part3` to the `story3s` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_story3s" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan3_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "themes" JSONB NOT NULL,
    "part1" TEXT NOT NULL,
    "part2" TEXT NOT NULL,
    "part3" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "story3s_plan3_id_fkey" FOREIGN KEY ("plan3_id") REFERENCES "plan3s" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_story3s" ("created_at", "id", "plan3_id", "themes", "title") SELECT "created_at", "id", "plan3_id", "themes", "title" FROM "story3s";
DROP TABLE "story3s";
ALTER TABLE "new_story3s" RENAME TO "story3s";
CREATE UNIQUE INDEX "story3s_plan3_id_key" ON "story3s"("plan3_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
