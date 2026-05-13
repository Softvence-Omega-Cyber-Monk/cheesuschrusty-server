import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmptyObject, IsObject } from 'class-validator';

export class UpsertIntegrationCredentialDto {
  @ApiProperty({
    example: {
      api_key: 'sk-example-key',
      model_name: 'gpt-4o',
      organization_id: 'org_123',
    },
  })
  @IsObject()
  @IsNotEmptyObject()
  credentials: Record<string, string | number | boolean>;
}
