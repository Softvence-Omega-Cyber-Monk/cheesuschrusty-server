import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Cloudinary } from './cloudinary.types';

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject('CLOUDINARY') private cloudinary: Cloudinary,
  ) {}

  async uploadImage(
    file: Express.Multer.File,
    folder = 'master_italian',
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return new Promise((resolve, reject) => {
      this.cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) reject(error);
          else resolve(result!.secure_url);
        },
      ).end(file.buffer);
    });
  }

  async deleteImage(publicId: string) {
    if (!publicId) return;

    try {
      await this.cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.warn('Failed to delete cloudinary image:', error);
    }
  }
}
