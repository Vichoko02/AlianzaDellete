import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/interfaces/user.interface';

@Controller('projects')
@UseGuards(FirebaseAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.projectsService.findBySlug(slug);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA)
  async create(
    @Body() body: { name: string; description?: string; imageUrl?: string },
    @CurrentUser() user: any,
  ) {
    return this.projectsService.create(body, user.uid);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA)
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; imageUrl?: string },
  ) {
    return this.projectsService.update(id, body);
  }

  @Put(':id/jefe')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA)
  async assignJefeProyecto(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.projectsService.assignJefeProyecto(id, body.userId);
  }

  @Put(':id/staff')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA, UserRole.JEFE_PROYECTO)
  async assignStaff(@Param('id') id: string, @Body() body: { staffIds: string[] }) {
    return this.projectsService.assignStaff(id, body.staffIds);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ALIANZA)
  async delete(@Param('id') id: string) {
    return this.projectsService.delete(id);
  }
}
