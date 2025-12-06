import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { UpdatePlatformSettingsDto } from './dto/update-platform-setting.dto';

@Injectable()
export class PlatformSettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    return this.prisma.platformSettings.findUnique({
      where: { id: 1 },
    });
  }
async updateSettings(dto: UpdatePlatformSettingsDto) {
  return this.prisma.platformSettings.upsert({
    where: { id: 1 },
    update: { ...dto },
    create: { id: 1, ...dto },
  });
}
}
