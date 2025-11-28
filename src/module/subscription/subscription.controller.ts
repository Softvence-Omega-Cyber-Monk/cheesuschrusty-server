import {
  Controller,
  Post,
  Req,
  Res,
  Body,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiBody,
  ApiResponse,
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
   * Create Stripe checkout session
   */
  @Post('checkout')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Create Stripe subscription checkout session' })
@ApiBody({
  description: 'Payload required to create a subscription checkout session',
  type: CreateSubscriptionDto,
})
  @ApiResponse({
    status: 201,
    description: 'Checkout session created successfully',
    schema: {
      example: {
        checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_123456',
      },
    },
  })
  async createCheckout(
    @Body() body: CreateSubscriptionDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const {planAlias } = body;

    const result = await this.subService.createCheckout(req.user!.id, planAlias);

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Checkout session created successfully',
      data: result,
    });
  }

  /**
   * Cancel user subscription
   */
  @Post('cancel')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Cancel user subscription' })
  async cancelSubscription(@Req() req: Request, @Res() res: Response) {
    await this.subService.cancelUserSubscription(req.user!.id);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Subscription canceled. Access remains until period end.',
      data: null,
    });
  }

  /**
   * Stripe webhook
   */
  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Stripe webhook for subscription events' })
  @ApiResponse({
    status: 200,
    description: 'Webhook received successfully',
    schema: { example: { received: true } },
  })
  @ApiResponse({ status: 400, description: 'Invalid webhook request' })
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    try {
      const sig = req.headers['stripe-signature'];

      if (!sig || Array.isArray(sig)) {
        return res.status(400).send('Missing Stripe signature');
      }

      const event = this.subService.stripe.webhooks.constructEvent(
        (req as any).rawBody,
        sig,
        process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET!,
      );

      await this.subService.handleWebhook(event);

      return res.json({ received: true });
    } catch (err: any) {
      return res.status(400).send(`Webhook error: ${err.message}`);
    }
  }
}
