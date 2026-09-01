import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { LogisticsService } from './logistics.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/interfaces/user.interface';

@Controller('logistics')
@UseGuards(FirebaseAuthGuard)
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Get('zones')
  async getShippingZones() {
    return this.logisticsService.getShippingZones();
  }

  @Get('countries')
  async getAvailableCountries() {
    return this.logisticsService.getAvailableCountries();
  }

  @Get('rates/:country')
  async getShippingRatesForCountry(@Param('country') country: string) {
    return this.logisticsService.getShippingRatesForCountry(country);
  }

  @Get('calculate/:country/:subtotal')
  async calculateShipping(
    @Param('country') country: string,
    @Param('subtotal') subtotal: string,
  ) {
    return this.logisticsService.calculateShippingCost(country, parseFloat(subtotal));
  }

  @Post('zones')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA)
  async createZone(@Body() body: any) {
    return this.logisticsService.createShippingZone(body);
  }

  @Put('zones/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA)
  async updateZone(@Param('id') id: string, @Body() body: any) {
    return this.logisticsService.updateShippingZone(id, body);
  }

  @Put('orders/:orderId/tracking')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA, UserRole.JEFE_PROYECTO)
  async updateTracking(@Param('orderId') orderId: string, @Body() body: any) {
    return this.logisticsService.updateTrackingInfo(orderId, body);
  }

  @Post('init-zones')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA)
  async initializeZones() {
    return this.logisticsService.initializeDefaultZones();
  }
}
