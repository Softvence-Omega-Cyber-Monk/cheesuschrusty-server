import {
  Controller,
  Post,
  Req,
  Res,
  Body,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
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
    console.log('🔔 WEBHOOK ENDPOINT HIT');
    console.log('Headers:', req.headers);
    console.log('Body type:', typeof req.body);
    console.log('RawBody exists:', !!(req as any).rawBody);

    try {
      const signature = req.headers['x-signature'] as string;

      if (!signature) {
        console.log('❌ Missing signature header');
        return res.status(400).json({ error: 'Missing signature' });
      }

      console.log('✅ Signature found:', signature.substring(0, 20) + '...');

      // Access rawBody from the verify function in main.ts
      const rawBody = (req as any).rawBody;

      if (!rawBody) {
        console.log('❌ Missing raw body');
        return res.status(400).json({ error: 'Missing raw body' });
      }

      console.log('✅ Raw body exists, length:', rawBody.length);

      // Convert Buffer to string for verification
      const rawBodyString = rawBody.toString('utf8');

      console.log('✅ Converted to string, length:', rawBodyString.length);
      console.log('Body preview:', rawBodyString.substring(0, 200));

      // Parse the JSON payload
      const payload = JSON.parse(rawBodyString);

      console.log('✅ JSON parsed successfully');
      console.log('Event name:', payload.meta?.event_name);

      await this.subService.handleWebhook(rawBodyString, signature, payload);

      console.log('✅ Webhook processed successfully');

      return res.status(201).json({ received: true });
    } catch (error: any) {
      console.error('❌ Webhook error:', error.message);
      console.error('Stack:', error.stack);
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
