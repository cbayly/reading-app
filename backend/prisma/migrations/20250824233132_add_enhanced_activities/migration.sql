-- CreateTable
CREATE TABLE "activity_contents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan3_id" TEXT NOT NULL,
    "day_index" INTEGER NOT NULL,
    "activity_type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "student_age" INTEGER NOT NULL,
    "content_hash" TEXT NOT NULL,
    "expires_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "activity_contents_plan3_id_fkey" FOREIGN KEY ("plan3_id") REFERENCES "plan3s" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "activity_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" INTEGER NOT NULL,
    "plan3_id" TEXT NOT NULL,
    "day_index" INTEGER NOT NULL,
    "activity_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "time_spent" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "activity_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "activity_progress_plan3_id_fkey" FOREIGN KEY ("plan3_id") REFERENCES "plan3s" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "activity_responses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "progress_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "is_correct" BOOLEAN,
    "feedback" TEXT,
    "score" REAL,
    "time_spent" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_responses_progress_id_fkey" FOREIGN KEY ("progress_id") REFERENCES "activity_progress" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "activity_contents_plan3_id_day_index_idx" ON "activity_contents"("plan3_id", "day_index");

-- CreateIndex
CREATE INDEX "activity_contents_content_hash_idx" ON "activity_contents"("content_hash");

-- CreateIndex
CREATE INDEX "activity_contents_expires_at_idx" ON "activity_contents"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "activity_contents_plan3_id_day_index_activity_type_key" ON "activity_contents"("plan3_id", "day_index", "activity_type");

-- CreateIndex
CREATE INDEX "activity_progress_student_id_plan3_id_day_index_idx" ON "activity_progress"("student_id", "plan3_id", "day_index");

-- CreateIndex
CREATE INDEX "activity_progress_status_idx" ON "activity_progress"("status");

-- CreateIndex
CREATE INDEX "activity_progress_completed_at_idx" ON "activity_progress"("completed_at");

-- CreateIndex
CREATE UNIQUE INDEX "activity_progress_student_id_plan3_id_day_index_activity_type_key" ON "activity_progress"("student_id", "plan3_id", "day_index", "activity_type");

-- CreateIndex
CREATE INDEX "activity_responses_progress_id_idx" ON "activity_responses"("progress_id");

-- CreateIndex
CREATE INDEX "activity_responses_is_correct_idx" ON "activity_responses"("is_correct");

-- CreateIndex
CREATE INDEX "activity_responses_created_at_idx" ON "activity_responses"("created_at");
