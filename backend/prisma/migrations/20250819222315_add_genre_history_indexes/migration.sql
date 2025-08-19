-- CreateIndex
CREATE INDEX "student_genre_history_student_id_used_at_idx" ON "student_genre_history"("student_id", "used_at" DESC);

-- CreateIndex
CREATE INDEX "student_genre_history_genre_combination_idx" ON "student_genre_history"("genre_combination");
