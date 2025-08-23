-- CreateIndex
CREATE INDEX "activities_day_id_type_idx" ON "activities"("day_id", "type");

-- CreateIndex
CREATE INDEX "activities_is_valid_idx" ON "activities"("is_valid");

-- CreateIndex
CREATE INDEX "days_plan_id_state_idx" ON "days"("plan_id", "state");

-- CreateIndex
CREATE INDEX "days_plan_id_day_index_idx" ON "days"("plan_id", "day_index");

-- CreateIndex
CREATE INDEX "plans_student_id_created_at_idx" ON "plans"("student_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "plans_status_idx" ON "plans"("status");
