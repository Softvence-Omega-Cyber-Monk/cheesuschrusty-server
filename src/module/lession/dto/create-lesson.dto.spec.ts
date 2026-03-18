import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateLessonContainerDto } from './create-lesson.dto';

describe('CreateLessonContainerDto', () => {
  it('accepts grammar as SKILL by normalizing it to GRAMMAR', () => {
    const dto = plainToInstance(CreateLessonContainerDto, {
      provider: 'OPENAI',
      LEVEL_ID: 'B1',
      TARGET_LANGUAGE: 'Italian',
      SKILL: 'grammar',
      TASK_ID: 'L-01',
      DOMAIN: 'Business',
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
  });
});
