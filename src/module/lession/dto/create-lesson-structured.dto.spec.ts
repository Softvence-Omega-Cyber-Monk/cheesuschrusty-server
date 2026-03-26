import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateStructuredLessonDto } from './create-lesson-structured.dto';

describe('CreateStructuredLessonDto', () => {
  it('accepts grammar as SKILL by normalizing it to GRAMMAR', () => {
    const dto = plainToInstance(CreateStructuredLessonDto, {
      provider: 'OPENAI',
      LEVEL_ID: 'B1',
      level_title: 'standard',
      TARGET_LANGUAGE: 'Italian',
      SKILL: 'grammar',
      TASK_ID: 'L-01',
      topic: 'Daily Conversations',
      DOMAIN: 'Business',
      is_pro: false,
      schema: 'mcq',
      DIFFICULTY: 'Beginner',
      SECTION_TOTAL: 3,
      TASK_TIME: 15,
      NATIVE_LANGUAGE: 'English',
      TEST_MODE: 'practice',
      LESSON_TITLE: 'Grammar Basics',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.SKILL).toBe('GRAMMAR');
    expect(dto.is_pro).toBe(false);
  });
});
