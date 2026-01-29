import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';

@Injectable()
export class UserSettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get user settings - creates default if not exists
   */
  async getUserSettings(userId: string) {
    let settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await this.prisma.userSettings.create({
        data: {
          userId,
          themeMode: 'SYSTEM',
          systemVoice: 'FEMALE',
          voiceSpeed: 1.0,
          newsletterEnabled: true,
        },
      });
    }

    return settings;
  }

  /**
   * Update user settings
   */
  async updateUserSettings(userId: string, dto: UpdateUserSettingsDto) {
    // Ensure user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if settings exist
    let settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      // Create settings if they don't exist
      settings = await this.prisma.userSettings.create({
        data: {
          userId,
          ...dto,
        },
      });
    } else {
      // Update existing settings
      settings = await this.prisma.userSettings.update({
        where: { userId },
        data: dto,
      });
    }

    return settings;
  }

  /**
   * Update theme mode only
   */
  async updateThemeMode(userId: string, themeMode: 'LIGHT' | 'DARK' | 'SYSTEM') {
    return this.updateUserSettings(userId, { themeMode } as UpdateUserSettingsDto);
  }

  /**
   * Update system voice only
   */
  async updateSystemVoice(userId: string, systemVoice: 'MALE' | 'FEMALE' | 'NEUTRAL') {
    return this.updateUserSettings(userId, { systemVoice });
  }

  /**
   * Update voice speed only
   */
  async updateVoiceSpeed(userId: string, voiceSpeed: number) {
    return this.updateUserSettings(userId, { voiceSpeed });
  }

  /**
   * Toggle newsletter subscription
   */
  async toggleNewsletter(userId: string, enabled: boolean) {
    return this.updateUserSettings(userId, { newsletterEnabled: enabled });
  }

  /**
   * Reset settings to default
   */
  async resetToDefaults(userId: string) {
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        themeMode: 'SYSTEM',
        systemVoice: 'FEMALE',
        voiceSpeed: 1.0,
        newsletterEnabled: true,
      },
      update: {
        themeMode: 'SYSTEM',
        systemVoice: 'FEMALE',
        voiceSpeed: 1.0,
        newsletterEnabled: true,
      },
    });
  }

  /**
   * Delete user settings (usually called when user is deleted)
   */
  async deleteUserSettings(userId: string) {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return { message: 'No settings found to delete' };
    }

    await this.prisma.userSettings.delete({
      where: { userId },
    });

    return { message: 'Settings deleted successfully' };
  }
}