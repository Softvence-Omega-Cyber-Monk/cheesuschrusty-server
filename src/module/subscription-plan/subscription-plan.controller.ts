import { Controller, Get, Res, HttpStatus, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { SubscriptionPlanService } from './subscription-plan.service';
import sendResponse from '../utils/sendResponse';
import { Public } from 'src/common/decorators/public.decorators';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Subscription Plans (Public)')
@Controller('plans')
export class SubscriptionPlansController {
  constructor(private readonly subscriptionPlanService: SubscriptionPlanService) {}

  /**
   * GET /plans
   * Fetches all active plans for display on the pricing page.
   * This endpoint is public and does not require authentication.
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'PUBLIC: Get all active subscription plans for the pricing page.' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns a list of active plans (Monthly, Yearly) with pricing and features.' 
  })
  async getAllActivePlans(@Res() res: Response) {
    // We pass true to get only plans marked as isActive
    const plans = await this.subscriptionPlanService.getAllPlans();

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Active subscription plans retrieved successfully.',
      data: plans,
    });
  }


 /**
   * PATCH /admin/plans/:alias
   * Allows the admin to update the price, stripePriceId, and isActive status.
   * This corresponds to the updatePlan method in the service.
   */
  @Patch(':alias')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'ADMIN: Update price, Stripe ID, or active status for a plan.' })
  @ApiParam({ name: 'alias', description: 'The unique plan alias (e.g., PRO_MONTHLY or PRO_YEARLY).' })
  @ApiBody({ type: UpdatePlanDto })
  @ApiResponse({ status: 200, description: 'Plan configuration updated successfully.' })
  @ApiResponse({ status: 404, description: 'Plan alias not found.' })
  async updatePlan(
    @Param('alias') alias: string,
    @Body() dto: UpdatePlanDto,
    @Res() res: Response,
  ) {
    const updatedPlan = await this.subscriptionPlanService.updatePlan(alias, dto);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: `Plan ${alias} updated successfully.`,
      data: updatedPlan,
    });
  }



}