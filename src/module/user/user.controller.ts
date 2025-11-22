// import {
//   Body,
//   Controller,
//   Get,
//   HttpStatus,
//   Param,
//   Patch,
//   Post,
//   Req,
//   Res,
// } from '@nestjs/common';
// import { UserService } from './user.service';
// import sendResponse from '../utils/sendResponse';
// import { Request, Response } from 'express';
// import { Roles } from 'src/common/decorators/roles.decorator';
// import { Role } from '@prisma/client';
// import { CreateAdminDto } from './dto/create-admin.dto';
// import { UpdateUserDto } from './dto/update-user.dto';

// @Controller('user')
// export class UserController {
//   constructor(private userService: UserService) {}

//   // @Post('admin/create')
//   // @Roles(Role.SUPER_ADMIN)
//   // async createAdmin(@Body() dto: CreateAdminDto, @Res() res: Response) {
//   //   const data = await this.userService.createAdmin(dto);
//   //   return sendResponse(res, {
//   //     statusCode: HttpStatus.CREATED,
//   //     success: true,
//   //     message: 'Admin created successfully',
//   //     data,
//   //   });
//   // }

//   @Get()
//   @Roles(Role.ADMIN)
//   async getAllUser(@Res() res: Response) {
//     const data = await this.userService.getAllUser();
//     return sendResponse(res, {
//       statusCode: HttpStatus.OK,
//       success: true,
//       message: 'Retrive all users successfully',
//       data,
//     });
//   }

//    @Roles(Role.ADMIN)
//   @Patch('block/:id')
//   async updateUserBlockStatus(
//     @Param('id') id: string,
//     @Body() dto: UpdateUserDto,
//     @Res() res: Response
//   ) {
//     const data = await this.userService.updateUserBlockStatus(id, dto.isBlocked);
//     return sendResponse(res, {
//       statusCode: HttpStatus.OK,
//       success: true,
//       message: 'Update user status successfully',
//       data,
//     });
//   }
// }
