import { IsOptional, IsString, IsArray, IsEnum, IsBoolean, IsObject } from 'class-validator';
import { UserRole } from '../../../common/interfaces/user.interface';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}

export class UpdatePreferencesDto {
  @IsBoolean()
  @IsOptional()
  notifications?: boolean;

  @IsBoolean()
  @IsOptional()
  newsletter?: boolean;
}

export class EnrollUserDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsString()
  @IsOptional()
  projectId?: string;
}

export class AssignWikisDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @IsString({ each: true })
  wikiIds: string[];
}
