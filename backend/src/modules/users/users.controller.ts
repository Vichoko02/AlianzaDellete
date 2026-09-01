import { Controller, Get, Put, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdatePreferencesDto, AssignWikisDto } from './dto/user.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/interfaces/user.interface';

@Controller('users')
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMyProfile(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.uid);
  }

  @Put('me/profile')
  async updateMyProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.uid, dto);
  }

  @Put('me/preferences')
  async updateMyPreferences(@CurrentUser() user: any, @Body() dto: UpdatePreferencesDto) {
    return this.usersService.updatePreferences(user.uid, dto);
  }

  @Post('me/wishlist/:productId')
  async addToMyWishlist(@CurrentUser() user: any, @Param('productId') productId: string) {
    return this.usersService.addToWishlist(user.uid, productId);
  }

  @Post('me/wishlist/:productId/remove')
  async removeFromMyWishlist(@CurrentUser() user: any, @Param('productId') productId: string) {
    return this.usersService.removeFromWishlist(user.uid, productId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA)
  async getAllUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.usersService.getAllUsers(Number(page), Number(limit));
  }

  @Get(':uid')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA)
  async getUser(@Param('uid') uid: string) {
    return this.usersService.getUserById(uid);
  }

  @Post('me/wikis')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA, UserRole.JEFE_PROYECTO)
  async assignWikisToUser(@Body() dto: AssignWikisDto) {
    return { success: true, message: 'Wikis asignadas' };
  }
}
