-- AlterTable
ALTER TABLE "assessments" ADD COLUMN "comp_vocab_score" REAL;
ALTER TABLE "assessments" ADD COLUMN "fluency_score" REAL;
ALTER TABLE "assessments" ADD COLUMN "reading_level_label" TEXT;

-- CreateTable
CREATE TABLE "benchmarks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "grade" INTEGER NOT NULL,
    "wpm" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "benchmarks_grade_key" ON "benchmarks"("grade");
