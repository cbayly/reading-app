/*
  Warnings:

  - You are about to drop the `chapters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `daily_activities` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `weekly_plans` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "chapters";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "daily_activities";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "weekly_plans";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "plans" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "student_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "plans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "plan_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "themes" JSONB NOT NULL,
    "part1" TEXT NOT NULL,
    "part2" TEXT NOT NULL,
    "part3" TEXT NOT NULL,
    "vocabulary" JSONB NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stories_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "days" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "plan_id" INTEGER NOT NULL,
    "day_index" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'locked',
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "days_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "activities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "day_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "response" JSONB,
    "is_valid" BOOLEAN,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "activities_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "days" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "stories_plan_id_key" ON "stories"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "days_plan_id_day_index_key" ON "days"("plan_id", "day_index");
