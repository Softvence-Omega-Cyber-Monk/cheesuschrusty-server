// src/module/security-settings/security-settings.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { UpdateSecuritySettingsDto } from './dto/update-security-settings.dto';

@Injectable()
export class SecuritySettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // Get the current security settings
  async getSettings() {
    return this.prisma.securitySettings.findUnique({
      where: { id: 1 },
    });
  }

  // Update or create security settings (upsert)
  async updateSettings(dto: UpdateSecuritySettingsDto) {
    return this.prisma.securitySettings.upsert({
      where: { id: 1 },
      update: { ...dto },
      create: { id: 1, ...dto },
    });
  }
}
