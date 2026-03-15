ALTER TABLE "lessons"
ADD COLUMN "difficulty" TEXT,
ADD COLUMN "section_total" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "task_time" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "native_language" TEXT,
ADD COLUMN "test_mode" TEXT,
ADD COLUMN "lesson_title" TEXT NOT NULL DEFAULT 'Auto';
