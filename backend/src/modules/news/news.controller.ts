import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { NewsService } from './news.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/interfaces/user.interface';

@Controller('news')
@UseGuards(FirebaseAuthGuard)
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  async findAll(@Query('projectId') projectId?: string) {
    return this.newsService.findAll(projectId);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.newsService.findBySlug(slug);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.newsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA, UserRole.JEFE_PROYECTO)
  async create(
    @Body() body: { title: string; content: string; excerpt?: string; coverImage?: string; projectIds?: string[] },
    @CurrentUser() user: any,
  ) {
    return this.newsService.create(body, user.uid);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA, UserRole.JEFE_PROYECTO)
  async update(
    @Param('id') id: string,
    @Body() body: { title?: string; content?: string; excerpt?: string; coverImage?: string; status?: string; projectIds?: string[] },
    @CurrentUser() user: any,
  ) {
    return this.newsService.update(id, body, user.uid);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA)
  async delete(@Param('id') id: string) {
    return this.newsService.delete(id);
  }
}
