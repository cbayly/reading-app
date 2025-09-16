-- CreateTable
CREATE TABLE "Parent" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "parentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "passage" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "answers" JSONB,
    "compositeScore" DOUBLE PRECISION,
    "fluencyScore" DOUBLE PRECISION,
    "comprehensionScore" DOUBLE PRECISION,
    "readingTime" INTEGER,
    "errorCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Benchmark" (
    "id" SERIAL NOT NULL,
    "grade" INTEGER NOT NULL,
    "fluencyMin" DOUBLE PRECISION NOT NULL,
    "fluencyMax" DOUBLE PRECISION NOT NULL,
    "comprehensionMin" DOUBLE PRECISION NOT NULL,
    "comprehensionMax" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Benchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Day" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "storyId" INTEGER NOT NULL,
    "answers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" SERIAL NOT NULL,
    "dayId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan3" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'generating',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan3_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story3" (
    "id" SERIAL NOT NULL,
    "plan3Id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "part1" TEXT NOT NULL,
    "part2" TEXT NOT NULL,
    "part3" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Story3_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan3Day" (
    "id" SERIAL NOT NULL,
    "plan3Id" INTEGER NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "story3Id" INTEGER NOT NULL,
    "answers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan3Day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityContent" (
    "id" SERIAL NOT NULL,
    "plan3DayId" INTEGER NOT NULL,
    "activityType" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityProgress" (
    "id" SERIAL NOT NULL,
    "plan3DayId" INTEGER NOT NULL,
    "activityType" TEXT NOT NULL,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "responses" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityResponse" (
    "id" SERIAL NOT NULL,
    "plan3DayId" INTEGER NOT NULL,
    "activityType" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenreWord" (
    "id" SERIAL NOT NULL,
    "word" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenreWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentGenreHistory" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "genre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentGenreHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Parent_email_key" ON "Parent"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Benchmark_grade_key" ON "Benchmark"("grade");

-- CreateIndex
CREATE UNIQUE INDEX "Plan3_studentId_key" ON "Plan3"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Story3_plan3Id_key" ON "Story3"("plan3Id");

-- CreateIndex
CREATE UNIQUE INDEX "Plan3Day_plan3Id_dayNumber_key" ON "Plan3Day"("plan3Id", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityContent_plan3DayId_activityType_key" ON "ActivityContent"("plan3DayId", "activityType");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityProgress_plan3DayId_activityType_key" ON "ActivityProgress"("plan3DayId", "activityType");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Day" ADD CONSTRAINT "Day_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Day" ADD CONSTRAINT "Day_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan3" ADD CONSTRAINT "Plan3_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story3" ADD CONSTRAINT "Story3_plan3Id_fkey" FOREIGN KEY ("plan3Id") REFERENCES "Plan3"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan3Day" ADD CONSTRAINT "Plan3Day_plan3Id_fkey" FOREIGN KEY ("plan3Id") REFERENCES "Plan3"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan3Day" ADD CONSTRAINT "Plan3Day_story3Id_fkey" FOREIGN KEY ("story3Id") REFERENCES "Story3"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityContent" ADD CONSTRAINT "ActivityContent_plan3DayId_fkey" FOREIGN KEY ("plan3DayId") REFERENCES "Plan3Day"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityProgress" ADD CONSTRAINT "ActivityProgress_plan3DayId_fkey" FOREIGN KEY ("plan3DayId") REFERENCES "Plan3Day"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityResponse" ADD CONSTRAINT "ActivityResponse_plan3DayId_fkey" FOREIGN KEY ("plan3DayId") REFERENCES "Plan3Day"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGenreHistory" ADD CONSTRAINT "StudentGenreHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
