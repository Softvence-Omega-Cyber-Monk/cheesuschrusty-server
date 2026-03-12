import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({
    example: 'PRO_MONTHLY',
    description:
      'The subscription plan alias the user wants to subscribe to. Must match an existing plan alias in the system (e.g., PRO_MONTHLY, PRO_LIFETIME).',
  })
  @IsString()
  planAlias: string;
}
