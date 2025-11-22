// import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
// import { QuoteService } from './quote.service';
// import { FileInterceptor } from '@nestjs/platform-express';
// import { CreateQuoteDto } from './dto/create-quote.dto';
// import sendResponse from '../utils/sendResponse';
// import { Response } from 'express';
// import { Roles } from 'src/common/decorators/roles.decorator';
// import { Role } from '@prisma/client';
// import { diskStorage } from 'multer';
// import { extname } from 'path';
// import { v4 as uuidv4 } from 'uuid';
// import { UpdateQuoteDto } from './dto/update-qoute.dto';
// import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';

// @Controller('quote')
// export class QuoteController {

// constructor(private readonly quoteService: QuoteService) {}

//   @Post('create')
//   @ApiOperation({ summary: 'Create a quote with an image (file required)' })
//   @ApiConsumes('multipart/form-data')
//   @ApiBody({
//     description: 'Create Quote',
//     schema: {
//       type: 'object',
//       properties: {
//         name: { type: 'string', example: 'Albert Einstein' },
//         quote: { type: 'string', example: 'Imagination is more important than knowledge.' },
//         file: {
//           type: 'string',
//           format: 'binary',
//         },
//       },
//       required: ['name', 'quote', 'file'],
//     },
//   })
//   @UseInterceptors(
//     FileInterceptor('file', {
//       storage: diskStorage({
//        destination: '/tmp',
//         filename: (req, file, cb) => {
//           const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
//           cb(null, uniqueName);
//         },
//       }),
//     }),
//   )
//   async create(
//     @UploadedFile() file: Express.Multer.File,
//     @Body() dto: CreateQuoteDto,
//     @Res() res: Response,
//   ) {
//     if (!file) {
//       return res.status(HttpStatus.BAD_REQUEST).json({
//         success: false,
//         message: 'Image file is required',
//       });
//     }

//     const data = await this.quoteService.create(dto, file);

//     return res.status(201).json({
//       success: true,
//       message: 'Quote created with image successfully',
//       data,
//     });
//   }




//  @Get()
//   async findAll(@Res() res: Response) {
//     const data = await this.quoteService.findAll();
//     return sendResponse(res, {
//       statusCode: HttpStatus.OK,
//       success: true,
//       message: 'Retrieve all Quotes successfully',
//       data,
//     });
//   }

//   @Get(':id')
//   async findOne(@Param('id') id: string, @Res() res: Response) {
//     const data = await this.quoteService.findOne(id);
//     return sendResponse(res, {
//       statusCode: HttpStatus.OK,
//       success: true,
//       message: 'Retrieve single Quote successfully',
//       data,
//     });
//   }


// @Patch(':id')
//  @Roles(Role.ADMIN)
// @UseInterceptors(
//   FileInterceptor('file', {
//     storage: diskStorage({
//    destination: '/tmp',
//       filename: (req, file, cb) => {
//         const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
//         cb(null, uniqueName);
//       },
//     }),
//   }),
// )
// async update(
//   @Param('id') id: string,
//   @Body() dto: UpdateQuoteDto,
//   @UploadedFile() file: Express.Multer.File,
//    @Res() res: Response
// ) {
//   const data=await this.quoteService.update(id, dto, file);
//    return sendResponse(res, {
//       success: true,
//       statusCode: HttpStatus.OK,
//       message: 'Quote updated successfully',
//       data,
//     });
// }





// @Delete(':id')
// @Roles(Role.ADMIN)
//   async delete(@Param('id') id: string, @Res() res: Response) {
//     const data = await this.quoteService.remove(id);
//     return sendResponse(res, {
//       statusCode: HttpStatus.OK,
//       success: true,
//       message: 'Delete Quote successfully',
//       data,
//     });
//   }

// }
