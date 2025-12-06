import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { CloudinaryService } from 'src/common/service/cloudinary/cloudinary.service';
import { UpdateBrandingDto } from './dto/branding.dto';


@Injectable()
export class BrandingSettingsService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async getBranding() {
    return this.prisma.brandingSettings.findUnique({
      where: { id: 1 },
    });
  }

  // ------------------------------------------------------
  // UPSERT BRANDING — handles dto + logo + favicon
  // ------------------------------------------------------
async updateBranding(dto: UpdateBrandingDto, files: Express.Multer.File[]) {
  const existing = await this.prisma.brandingSettings.findUnique({
    where: { id: 1 },
  });

  let logoUrl = existing?.platformLogoUrl || null;
  let faviconUrl = existing?.faviconUrl || null;

  const logoFile = files?.find((f) => f.fieldname === 'logo');
  const faviconFile = files?.find((f) => f.fieldname === 'favicon');

  if (logoFile) {
    logoUrl = await this.cloudinaryService.uploadImage(logoFile, 'branding/logo');
  }

  if (faviconFile) {
    faviconUrl = await this.cloudinaryService.uploadImage(faviconFile, 'branding/favicon');
  }

  return this.prisma.brandingSettings.upsert({
    where: { id: 1 },
    update: {
      ...dto,
      platformLogoUrl: logoUrl,
      faviconUrl: faviconUrl,
    },
    create: {
      id: 1,
      ...dto,
      platformLogoUrl: logoUrl,
      faviconUrl: faviconUrl,
    },
  });
}

}
