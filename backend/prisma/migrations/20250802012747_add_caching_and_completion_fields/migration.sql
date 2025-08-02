-- AlterTable
ALTER TABLE "weekly_plans" ADD COLUMN "cached_output" JSONB;
ALTER TABLE "weekly_plans" ADD COLUMN "cached_prompt" JSONB;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_daily_activities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "plan_id" INTEGER NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "activity_type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "student_response" JSONB,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "daily_activities_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "weekly_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_daily_activities" ("activity_type", "content", "created_at", "day_of_week", "id", "plan_id", "student_response", "updated_at") SELECT "activity_type", "content", "created_at", "day_of_week", "id", "plan_id", "student_response", "updated_at" FROM "daily_activities";
DROP TABLE "daily_activities";
ALTER TABLE "new_daily_activities" RENAME TO "daily_activities";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
