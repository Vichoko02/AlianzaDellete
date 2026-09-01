import { IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  permissions: string[];
}

export class UpdateRoleDto {
  @IsArray()
  @IsOptional()
  permissions?: string[];
}

export class AssignPermissionsDto {
  @IsArray()
  permissions: string[];
}
