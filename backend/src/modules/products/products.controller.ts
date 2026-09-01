import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductFiltersDto } from './dto/product.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/interfaces/user.interface';

@Controller('products')
@UseGuards(FirebaseAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@Query() filters: ProductFiltersDto) {
    return this.productsService.findAll(filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA, UserRole.JEFE_PROYECTO)
  async create(@Body() dto: CreateProductDto, @CurrentUser() user: any) {
    return this.productsService.create(dto, user.uid);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA, UserRole.JEFE_PROYECTO)
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA)
  async delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }

  @Put(':id/stock')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA, UserRole.JEFE_PROYECTO)
  async updateStock(
    @Param('id') id: string,
    @Body() body: { variantId: string; country: string; quantity: number; operation?: 'set' | 'increment' | 'decrement' },
  ) {
    return this.productsService.updateStock(id, body.variantId, body.country, body.quantity, body.operation);
  }
}
