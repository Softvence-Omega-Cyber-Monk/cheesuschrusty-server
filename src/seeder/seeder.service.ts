import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger(SeederService.name);

  async onApplicationBootstrap() {
    await this.seedAdmin();
  }

  private async seedAdmin() {
    const adminEmail = process.env.ADMIN_EMAIL as string;
    const adminPassword = process.env.ADMIN_PASSWORD as string;

    const supperAdmin = await this.prisma.user.findFirst({
      where: { role: Role.ADMIN},
    });

    if ( supperAdmin) {
      this.logger.log('Admin is already exists, skipping seeding.');
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await this.prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        role: Role.ADMIN,
      },
    });

    this.logger.log(`Default super admin created: ${adminEmail}`);
  }
}
