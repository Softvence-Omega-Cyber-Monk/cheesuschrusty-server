
import {
  Controller,
  Post,
  Req,
  Res,
  Body,
  HttpStatus,
  Get,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiBody
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorators';
import { SubscriptionService } from './subscription.service';
import { Request, Response } from 'express';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import sendResponse from '../utils/sendResponse';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private subService: SubscriptionService) {}

  /**
   * Create Lemon Squeezy checkout
   */
  @Post('checkout')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Create Lemon Squeezy subscription checkout' })
  @ApiBody({ type: CreateSubscriptionDto })
  async createCheckout(
    @Body() body: CreateSubscriptionDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { planAlias } = body;

    const result = await this.subService.createCheckout(
      req.user!.id,
      planAlias,
    );

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Checkout session created successfully',
      data: result, // { checkoutUrl }
    });
  }

  /**
   * Cancel subscription (Lemon Squeezy)
   */
  @Post('cancel')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Cancel user subscription' })
  async cancelSubscription(@Req() req: Request, @Res() res: Response) {
    await this.subService.cancelUserSubscription(req.user!.id);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Subscription cancellation scheduled.',
      data: null,
    });
  }

  /**
   * Lemon Squeezy webhook
   */
 @Post('webhook')
@Public()
async handleWebhook(@Req() req: Request, @Res() res: Response) {
  try {
    const signature = req.headers['x-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'Missing signature' });
    }

    const rawBody = req.body.toString('utf8');
    const payload = JSON.parse(rawBody);

    await this.subService.handleWebhook(
      rawBody,
      signature,
      payload,
    );

    return res.status(201).json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error.message);
    return res.status(400).json({ error: error.message });
  }
}


  /**
   * Get current user subscription
   */
  @Get('me')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Get current user subscription details' })
  async getMySubscription(@Req() req: Request, @Res() res: Response) {
    const details = await this.subService.getMySubscriptionDetails(
      req.user!.id,
    );

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Subscription details retrieved.',
      data: details,
    });
  }
}