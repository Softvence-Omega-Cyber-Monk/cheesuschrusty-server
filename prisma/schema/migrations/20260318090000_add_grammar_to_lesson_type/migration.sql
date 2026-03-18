DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'LessonType'
      AND e.enumlabel = 'GRAMMAR'
  ) THEN
    ALTER TYPE "LessonType" ADD VALUE 'GRAMMAR';
  END IF;
END $$;
