import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WikiService } from './wiki.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/interfaces/user.interface';

@Controller('wiki')
@UseGuards(FirebaseAuthGuard)
export class WikiController {
  constructor(private readonly wikiService: WikiService) {}

  @Get()
  async findAll(@Query('projectId') projectId?: string) {
    return this.wikiService.findAll(projectId);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.wikiService.findBySlug(slug);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.wikiService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA, UserRole.JEFE_PROYECTO)
  async create(
    @Body() body: { projectId: string; title: string; content: string; coverImage?: string },
    @CurrentUser() user: any,
  ) {
    return this.wikiService.create(body, user.uid);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA, UserRole.JEFE_PROYECTO, UserRole.STAFF)
  async update(
    @Param('id') id: string,
    @Body() body: { title?: string; content?: string; coverImage?: string; status?: string },
    @CurrentUser() user: any,
  ) {
    return this.wikiService.update(id, body, user.uid);
  }

  @Put(':id/assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA, UserRole.JEFE_PROYECTO)
  async assignStaff(@Param('id') id: string, @Body() body: { staffIds: string[] }) {
    return this.wikiService.assignStaff(id, body.staffIds);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA)
  async delete(@Param('id') id: string) {
    return this.wikiService.delete(id);
  }
}
