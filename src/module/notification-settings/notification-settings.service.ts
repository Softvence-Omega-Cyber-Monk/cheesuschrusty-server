import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { UpdateNotificationSettingsDto } from './update-notification-settings.dto';

@Injectable()
export class NotificationSettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    return this.prisma.notificationSettings.findUnique({
      where: { id: 1 },
    });
  }

  async updateSettings(dto: UpdateNotificationSettingsDto) {
    return this.prisma.notificationSettings.upsert({
      where: { id: 1 },
      update: { ...dto },
      create: { id: 1, ...dto },
    });
  }
}
