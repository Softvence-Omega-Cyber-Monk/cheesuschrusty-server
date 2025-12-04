import { Controller, Get, Query, Param, Post, Body, Patch, Delete, Req, Res, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation,  ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { Role, SubscriptionPlan } from '@prisma/client';
import { UserService } from './user.service';
import sendResponse from '../utils/sendResponse';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreatePlatformUserDto } from './dto/create-admin.dto';


@ApiTags('User Management')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // -------------------------
  // STUDENT MANAGEMENT
  // -------------------------
  @Get('students')
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER, Role.SUPORT_MANAGER)
  @ApiOperation({ summary: 'Get all students with filters, search and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: Boolean })
  @ApiQuery({ name: 'subscription', required: false, enum: SubscriptionPlan })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getAllStudents(
    @Req() req: Request,
    @Res() res: Response,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: boolean,
     @Query('subscription') subscription?: 'PRO' | 'FREE',
    @Query('search') search?: string,
  ) {
    const students = await this.userService.getAllStudents(page, limit, search, status, subscription);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Students retrieved successfully',
      data: students,
    });
  }


   @Get('me')
  async getMyProfile(@Req() req: Request, @Res() res: Response) {
     const userId = (req.user as any).id;

      const profile = await this.userService.getUserById(userId);

      return sendResponse(res, {
        statusCode: HttpStatus.OK,
        success: true,
        message: 'Profile retrieved successfully',
        data: profile,
      });
  }

  @Get('students/:id')
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER, Role.SUPORT_MANAGER)
  @ApiParam({ name: 'id', description: 'User ID' })
  async getStudentById(@Res() res: Response, @Param('id') id: string) {
    const user = await this.userService.getUserById(id);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'User details retrieved successfully',
      data: user,
    });
  }

  @Patch('students/:id/status')
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER, Role.SUPORT_MANAGER)
  async toggleStudentStatus(@Res() res: Response, @Param('id') id: string) {
    const updated = await this.userService.toggleUserStatus(id);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: `User status updated to ${updated.isActive ? 'active' : 'suspended'}`,
      data: updated,
    });
  }

  @Delete('students/:id')
  @Roles(Role.SUPER_ADMIN)
  async deleteStudent(@Res() res: Response, @Param('id') id: string, @Req() req: Request) {
    const result = await this.userService.deleteUser(id, req.user!.role as Role);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: result.message,
      data:result
    });
  }

  // -------------------------
  // PLATFORM ADMIN MANAGEMENT
  // -------------------------
  @Get('platform-users')
  @Roles(Role.SUPER_ADMIN)
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getPlatformUsers(
    @Res() res: Response,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string
  ) {
    const users = await this.userService.getPlatformUsers(page, limit, search);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Platform users retrieved successfully',
      data: users,
    });
  }

  @Post('platform-users')
  @Roles(Role.SUPER_ADMIN)
  @ApiBody({ type: CreatePlatformUserDto })
  async createPlatformUser(@Res() res: Response, @Body() dto: CreatePlatformUserDto) {
    const user = await this.userService.createPlatformUser(dto);
    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Platform user created successfully',
      data: user,
    });
  }

  @Delete('platform-users/:id')
  @Roles(Role.SUPER_ADMIN)
  async deletePlatformUser(@Res() res: Response, @Param('id') id: string, @Req() req: Request) {
    const result = await this.userService.deleteUser(id, req.user!.role as Role);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: result.message,
      data: result,
    });
  }
}
