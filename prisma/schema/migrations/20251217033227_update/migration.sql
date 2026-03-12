-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
