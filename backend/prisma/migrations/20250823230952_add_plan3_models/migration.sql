-- CreateTable
CREATE TABLE "plan3s" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "plan3s_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "story3s" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan3_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "themes" JSONB NOT NULL,
    "chapter1" TEXT NOT NULL,
    "chapter2" TEXT NOT NULL,
    "chapter3" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "story3s_plan3_id_fkey" FOREIGN KEY ("plan3_id") REFERENCES "plan3s" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "plan3_days" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan3_id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'locked',
    "completed_at" DATETIME,
    "answers" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "plan3_days_plan3_id_fkey" FOREIGN KEY ("plan3_id") REFERENCES "plan3s" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "plan3s_student_id_created_at_idx" ON "plan3s"("student_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "plan3s_status_idx" ON "plan3s"("status");

-- CreateIndex
CREATE UNIQUE INDEX "story3s_plan3_id_key" ON "story3s"("plan3_id");

-- CreateIndex
CREATE INDEX "plan3_days_plan3_id_state_idx" ON "plan3_days"("plan3_id", "state");

-- CreateIndex
CREATE INDEX "plan3_days_plan3_id_index_idx" ON "plan3_days"("plan3_id", "index");

-- CreateIndex
CREATE UNIQUE INDEX "plan3_days_plan3_id_index_key" ON "plan3_days"("plan3_id", "index");
