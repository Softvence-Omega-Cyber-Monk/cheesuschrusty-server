import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class ReplySupportChatTicketDto {
  @ApiProperty({
    example:
      'We reviewed the issue. Please refresh and try the question again.',
  })
  @IsString()
  @MaxLength(5000)
  reply: string;
}
