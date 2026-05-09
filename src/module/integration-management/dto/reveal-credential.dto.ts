import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RevealCredentialDto {
  @ApiProperty({
    example: 'your-admin-password',
    description: 'Current admin password for step-up authentication',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
