import { Controller, Post, Get, Body, Param, Headers, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/payment.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipAuth } from '../../common/decorators/roles.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-checkout')
  @UseGuards(FirebaseAuthGuard)
  async createCheckout(
    @CurrentUser() user: any,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.paymentsService.createCheckoutSession(user.uid, dto);
  }

  @Post('webhook')
  @SkipAuth()
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      throw new Error('Raw body not available - configure raw body parser');
    }
    return this.paymentsService.handleWebhook(rawBody, signature);
  }

  @Get('session/:sessionId')
  async getSessionStatus(@Param('sessionId') sessionId: string) {
    return this.paymentsService.getSessionStatus(sessionId);
  }
}
