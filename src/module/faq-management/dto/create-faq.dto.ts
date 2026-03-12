import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFaqDto {
  @ApiProperty({
    description: 'FAQ question',
    example: 'How do I reset my password?',
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({
    description: 'FAQ answer',
    example: 'Open settings, choose Security, then select Reset Password.',
  })
  @IsString()
  @IsNotEmpty()
  answer: string;
}
