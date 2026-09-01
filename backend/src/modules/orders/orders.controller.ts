import { Controller, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto, OrderStatus } from './dto/order.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/interfaces/user.interface';

@Controller('orders')
@UseGuards(FirebaseAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('my-orders')
  async getMyOrders(@CurrentUser() user: any) {
    return this.ordersService.getUserOrders(user.uid);
  }

  @Get('my-orders/:id')
  async getMyOrder(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.getOrderById(id, user.uid);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA, UserRole.JEFE_PROYECTO)
  async getAllOrders(
    @Query('status') status?: OrderStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.getAllOrders({ status, page, limit });
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA, UserRole.JEFE_PROYECTO)
  async getOrderStats() {
    return this.ordersService.getOrderStats();
  }

  @Get('revenue')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA, UserRole.JEFE_PROYECTO)
  async getRevenueStats(@Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month') {
    return this.ordersService.getRevenueStats(period);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA, UserRole.JEFE_PROYECTO)
  async getOrder(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA, UserRole.JEFE_PROYECTO)
  async updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateOrderStatus(id, dto);
  }
}
