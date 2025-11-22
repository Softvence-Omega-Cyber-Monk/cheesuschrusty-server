// import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
// import { PrismaService } from 'src/prisma/prisma.service';
// import { CreateQuoteDto } from './dto/create-quote.dto';
// import { Cloudinary } from 'src/shared/cloudinary/cloudinary.types';
// import * as fs from 'fs';
// import { join } from 'path';
// import { UpdateQuoteDto } from './dto/update-qoute.dto';


// @Injectable()
// export class QuoteService {
//     constructor(
//     private prisma: PrismaService,
//     @Inject('CLOUDINARY') private cloudinary: Cloudinary,
//   ) {}

//  async create(dto: CreateQuoteDto, file?: Express.Multer.File) {
//   try {
//     let imageUrl = dto.imageUrl;
//     let publicId: string | undefined;
//     if (file) {
//     const fileExt = file.originalname.split('.').pop()
//     const fileName =file.originalname.split('.')[0]
//     const originalFileName = `${fileName}-${Date.now()}.${fileExt}`; 
//       const uploadRes = await this.cloudinary.uploader.upload(file.path, {
//         folder: 'quotes',
//         public_id: originalFileName, 
//       });
//       imageUrl = uploadRes.secure_url;
//       publicId = uploadRes.public_id;
//       // Delete local file after upload
//   const filePath = join(process.cwd(), file.path);
//   if (fs.existsSync(filePath)) {
//     fs.unlinkSync(filePath);
//   }
//     }

//     return await this.prisma.quote.create({
//       data: {
//         name: dto.name,
//         quote: dto.quote,
//         imageUrl,
//         cloudinaryPublicId: publicId,
//       },
//     });
//   } catch (err) {
//     console.error('Error uploading quote:', err);
//     throw new InternalServerErrorException('Failed to upload quote');
//   }
// }


// async findAll() {
//   return this.prisma.quote.findMany({take:200});
// }

// async findOne(id: string) {
//   return this.prisma.quote.findUnique({ where: { id } });
// }


// async update(id: string, dto: UpdateQuoteDto, file?: Express.Multer.File) {
//   const existing = await this.prisma.quote.findUnique({ where: { id } });
//   if (!existing) throw new NotFoundException('Quote not found');

//   let imageUrl = existing.imageUrl;
//   let publicId = existing.cloudinaryPublicId;

//   if (file) {
//     // Delete previous image from Cloudinary
//     if (publicId) {
//       await this.cloudinary.uploader.destroy(publicId);
//       }
//       const fileExt = file.originalname.split('.').pop()
//     const fileName =file.originalname.split('.')[0]
//     const originalFileName = `${fileName}-${Date.now()}.${fileExt}`;
//     const uploadRes = await this.cloudinary.uploader.upload(file.path, {
//       folder: 'quotes',
//       public_id:originalFileName
//     });
//     imageUrl = uploadRes.secure_url;
//     publicId = uploadRes.public_id;
//     const filePath = join(process.cwd(), file.path);
//   if (fs.existsSync(filePath)) {
//     fs.unlinkSync(filePath);
//   }
//   }

//   return this.prisma.quote.update({
//     where: { id },
//     data: {
//       name: dto.name ?? existing.name,
//       quote: dto.quote ?? existing.quote,
//       imageUrl,
//       cloudinaryPublicId: publicId,
//     },
//   });
// }



// async remove(id: string) {
//   const existing = await this.prisma.quote.findUnique({ where: { id } });
//   if (!existing) throw new NotFoundException('Quote not found');

//   // Delete image from Cloudinary
//   if (existing.cloudinaryPublicId) {
//     await this.cloudinary.uploader.destroy(existing.cloudinaryPublicId);
//   }

//   return this.prisma.quote.delete({ where: { id } });
// }


// }
