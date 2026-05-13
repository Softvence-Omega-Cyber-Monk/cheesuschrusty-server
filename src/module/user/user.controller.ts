import {
  Controller,
  Get,
  Query,
  Param,
  Post,
  Body,
  Patch,
  Delete,
  Req,
  Res,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiConsumes,
  ApiResponse,
} from '@nestjs/swagger';
import { Role, SubscriptionPlan } from '@prisma/client';
import { UserService } from './user.service';
import sendResponse from '../utils/sendResponse';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreatePlatformUserDto } from './dto/create-admin.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateProfileDto } from './dto/update-user.dto';
import { UpsertStudyPlanDto } from './dto/upsert-study-plan.dto';
import { AdminEditUserDto } from './dto/admin-edit-user.dto';
import { JwtPayload } from '../auth/strategy/jwt.strategy';

@ApiTags('User Management')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // -------------------------
  // STUDENT MANAGEMENT
  // -------------------------
  @Get('students')
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER, Role.SUPORT_MANAGER)
  @ApiOperation({
    summary: 'Get all students with filters, search and pagination',
  })
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
    const students = await this.userService.getAllStudents(
      page,
      limit,
      search,
      status,
      subscription,
    );

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Students retrieved successfully',
      data: students,
    });
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile.',
    description: `Returns the logged-in user's profile, including preferences and subscription status.
    **Curl Example:**
    \`\`\`bash
    curl -X GET http://localhost:5001/api/v1/users/me \\
    -H "Authorization: Bearer YOUR_TOKEN"
    \`\`\``,
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: { id: 'uuid', email: 'user@example.com', name: 'Marco' },
      },
    },
  })
  async getMyProfile(@Req() req: Request, @Res() res: Response) {
    const userId = (req.user as JwtPayload).id;

    const profile = await this.userService.getUserById(userId);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Profile retrieved successfully',
      data: profile,
    });
  }

  @Get('metadata')
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER, Role.SUPORT_MANAGER)
  @ApiOperation({ summary: 'Get user metadata counts' })
  async getUserMetaData(@Res() res: Response) {
    const data = await this.userService.getUserMetaData();

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'User metadata retrieved successfully',
      data,
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

  @Patch('students/:id')
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER, Role.SUPORT_MANAGER)
  @ApiOperation({ summary: 'Admin edit user details' })
  @ApiParam({ name: 'id', description: 'User ID to edit' })
  @ApiBody({ type: AdminEditUserDto })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or email already exists',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - cannot edit admin accounts',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async adminEditUser(
    @Res() res: Response,
    @Param('id') id: string,
    @Body() dto: AdminEditUserDto,
  ) {
    const updatedUser = await this.userService.adminEditUser(id, dto);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
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
  async deleteStudent(
    @Res() res: Response,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const result = await this.userService.deleteUser(
      id,
      req.user!.role as Role,
    );
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: result.message,
      data: result,
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
    @Query('search') search?: string,
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
  async createPlatformUser(
    @Res() res: Response,
    @Body() dto: CreatePlatformUserDto,
  ) {
    const user = await this.userService.createPlatformUser(dto);
    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Platform user created successfully',
      data: user,
    });
  }

  @Patch('profile')
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER, Role.SUPORT_MANAGER, Role.USER)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({
    summary: 'Update user profile (multipart).',
    description: `Update name, notification settings, and upload avatar.
    **Curl Example:**
    \`\`\`bash
    curl -X PATCH http://localhost:5001/api/v1/users/profile \\
    -H "Authorization: Bearer YOUR_TOKEN" \\
    -F "name=Marco Rossi" \\
    -F "avatar=@profile.jpg"
    \`\`\``,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Marco Rossi' },
        weeklyUpdateEnabled: { type: 'boolean', example: true },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpdateProfileDto,
    @Res() res: Response,
  ) {
    const userId = (req.user as JwtPayload).id;
    const result = await this.userService.updateProfile(userId, dto, file);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: result.message,
      data: result.user,
    });
  }

  @Delete('platform-users/:id')
  @Roles(Role.SUPER_ADMIN)
  async deletePlatformUser(
    @Res() res: Response,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const result = await this.userService.deleteUser(
      id,
      req.user!.role as Role,
    );
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: result.message,
      data: result,
    });
  }

  @Post('study-planner')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Create or update AI study plan' })
  @ApiResponse({ status: 200, description: 'Study plan saved' })
  async upsertStudyPlan(
    @Req() req: Request,
    @Body() dto: UpsertStudyPlanDto,
    @Res() res: Response,
  ) {
    const userId = (req.user as JwtPayload).id;

    const plan = await this.userService.upsertStudyPlan(userId, dto);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Study plan saved successfully',
      data: plan,
    });
  }

  // 🔹 GET STUDY PLAN
  @Get('study-planner')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Get current study plan' })
  @ApiResponse({ status: 200, description: 'Study plan retrieved' })
  async getStudyPlan(@Req() req: Request, @Res() res: Response) {
    const userId = (req.user as JwtPayload).id;

    const plan = await this.userService.getStudyPlan(userId);

    return res.status(HttpStatus.OK).json({
      success: true,
      data: plan,
    });
  }
}
