-- AlterTable
ALTER TABLE "assessments" ADD COLUMN "accuracy" REAL;
ALTER TABLE "assessments" ADD COLUMN "composite_score" REAL;
ALTER TABLE "assessments" ADD COLUMN "error_count" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "passage" TEXT;
ALTER TABLE "assessments" ADD COLUMN "questions" JSONB;
ALTER TABLE "assessments" ADD COLUMN "reading_time" INTEGER;
ALTER TABLE "assessments" ADD COLUMN "student_answers" JSONB;
ALTER TABLE "assessments" ADD COLUMN "wpm" REAL;
