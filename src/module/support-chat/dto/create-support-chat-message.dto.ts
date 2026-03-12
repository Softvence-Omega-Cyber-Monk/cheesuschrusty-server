import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';

export class CreateSupportChatMessageDto {
  @ApiProperty({
    example: 'I could not understand question 12 in the mock test.',
  })
  @IsString()
  @MaxLength(5000)
  message: string;

  @ApiProperty({
    example: 201,
    description: 'HTTP code returned by the caller for this chat flow.',
  })
  @IsInt()
  @Min(100)
  httpCode: number;
}
