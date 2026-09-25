import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class StaffRoleDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;
}

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  displayName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  staffRoleId!: string;

  @IsString()
  @Matches(/^\d{1,20}$/)
  telegramId!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(12)
  @MaxLength(72)
  password?: string;
}

export class ActiveDto {
  @IsBoolean()
  isActive!: boolean;
}
