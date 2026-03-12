import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmptyObject, IsObject } from 'class-validator';

export class UpsertIntegrationCredentialDto {
  @ApiProperty({
    example: {
      apiKey: 'sk-example',
      organizationId: 'org_123',
    },
  })
  @IsObject()
  @IsNotEmptyObject()
  credentials: Record<string, string | number | boolean>;
}
