import { Controller, Get, Param } from '@nestjs/common';
import { RolesService, ROLE_PERMISSIONS, PERMISSIONS } from './roles.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/interfaces/user.interface';

@Controller('roles')
@UseGuards(FirebaseAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('permissions')
  getAllPermissions() {
    return {
      permissions: PERMISSIONS,
      rolePermissions: ROLE_PERMISSIONS,
    };
  }

  @Get('permissions/:role')
  async getRolePermissions(@Param('role') role: string) {
    const permissions = await this.rolesService.getRolePermissions(role);
    return { role, permissions };
  }
}
