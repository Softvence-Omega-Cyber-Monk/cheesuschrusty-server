import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { DynamicConfigService } from 'src/module/integration-management/dynamic-config.service';
import { CredentialProvider } from '@prisma/client';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly dynamicConfig: DynamicConfigService) {}

  private async getClient() {
    const credentials = await this.dynamicConfig.getCredentials(CredentialProvider.CLOUDINARY);
    
    if (!credentials || !credentials.cloud_name) {
      throw new BadRequestException('Cloudinary is not configured.');
    }

    cloudinary.config({
      cloud_name: String(credentials.cloud_name),
      api_key: String(credentials.api_key),
      api_secret: String(credentials.api_secret),
    });

    return cloudinary;
  }

  async uploadImage(
    file: Express.Multer.File,
    folder = 'master_italian',
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const client = await this.getClient();

    return new Promise((resolve, reject) => {
      client.uploader
        .upload_stream(
          {
            folder,
            resource_type: 'image',
          },
          (
            error: UploadApiErrorResponse | undefined,
            result: UploadApiResponse | undefined,
          ) => {
            if (error) reject(error);
            else resolve(result!.secure_url);
          },
        )
        .end(file.buffer);
    });
  }

  async deleteImage(publicId: string) {
    if (!publicId) return;

    try {
      const client = await this.getClient();
      await client.uploader.destroy(publicId);
    } catch (error) {
      this.logger.warn('Failed to delete cloudinary image:', error);
    }
  }
}
