import {
  Controller,
  Post,
  Req,
  Res,
  Body,
  HttpStatus,
  Get,
  Logger,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorators';
import {
  SubscriptionService,
  LemonWebhookPayload,
} from './subscription.service';
import { Request, Response } from 'express';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import sendResponse from '../utils/sendResponse';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(private subService: SubscriptionService) {}

  /**
   * Create Lemon Squeezy checkout
   */
  @Post('checkout')
  @Roles(Role.USER)
  @ApiOperation({
    summary: 'Create subscription checkout.',
    description: `Generates a Lemon Squeezy checkout URL for the selected plan.
    **Curl Example:**
    \`\`\`bash
    curl -X POST http://localhost:5001/api/v1/subscriptions/checkout \\
    -H "Authorization: Bearer YOUR_TOKEN" \\
    -H "Content-Type: application/json" \\
    -d '{"planAlias": "PRO_MONTHLY"}'
    \`\`\``,
  })
  @ApiBody({ type: CreateSubscriptionDto })
  @ApiResponse({
    status: 201,
    description: 'Checkout URL generated.',
    schema: {
      example: {
        statusCode: 201,
        success: true,
        data: { checkoutUrl: 'https://checkout.lemonsqueezy.com/...' },
      },
    },
  })
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
    this.logger.log('🔔 WEBHOOK ENDPOINT HIT');

    try {
      const signature = req.headers['x-signature'] as string;

      if (!signature) {
        this.logger.warn('❌ Missing signature header');
        return res.status(400).json({ error: 'Missing signature' });
      }

      const rawBody = req.rawBody;

      if (!rawBody) {
        this.logger.warn('❌ Missing raw body');
        return res.status(400).json({ error: 'Missing raw body' });
      }

      // Convert Buffer to string for verification
      const rawBodyString = rawBody.toString('utf8');

      // Parse the JSON payload
      const payload = JSON.parse(rawBodyString) as LemonWebhookPayload;

      this.logger.log(`✅ Webhook processed: ${payload.meta.event_name}`);

      await this.subService.handleWebhook(rawBodyString, signature, payload);

      return res.status(201).json({ received: true });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Webhook error: ${err.message}`, err.stack);
      return res.status(400).json({ error: err.message });
    }
  }

  /**
   * Get current user subscription
   */
  @Get('me')
  @Roles(Role.USER)
  @ApiOperation({
    summary: 'Get current user subscription.',
    description: `Retrieves plan details, status, and renewal date.
    **Curl Example:**
    \`\`\`bash
    curl -X GET http://localhost:5001/api/v1/subscriptions/me \\
    -H "Authorization: Bearer YOUR_TOKEN"
    \`\`\``,
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription info retrieved.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: {
          status: 'active',
          plan: 'PRO_MONTHLY',
          endsAt: '2026-06-09T...',
        },
      },
    },
  })
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
