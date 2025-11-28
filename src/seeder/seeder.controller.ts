// src/module/database/seeder/seeder.controller.ts
import { Controller, Post, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SeederService } from './seeder.service';
import sendResponse from 'src/module/utils/sendResponse';

@ApiTags('Admin/SuperAdmin Tools')
@Controller('admin/tools')
@Roles(Role.SUPER_ADMIN)
export class SeederController {
  constructor(private readonly seederService: SeederService) {}

  @Post('seed-plans')
  @ApiOperation({ 
    summary: 'SUPER ADMIN: Runs the database seed function for plans.',
    description: '⚠️ Highly sensitive endpoint. Only for setup/testing environments.'
  })
  @ApiResponse({ status: 200, description: 'Plans seeded successfully.' })
  async runPlanSeeder(@Res() res: Response) {
    // SECURITY NOTE: In a real app, you should also wrap this in an ENV check:
    // if (process.env.NODE_ENV === 'production') { throw new ForbiddenException(); }

    const seededPlans = await this.seederService.seedPlans();

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Subscription plans seeded/updated successfully.',
      data: seededPlans,
    });
  }
}