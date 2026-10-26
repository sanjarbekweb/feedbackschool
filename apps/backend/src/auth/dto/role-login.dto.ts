import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class RoleLoginDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['principal', 'psychologist'])
  roleId!: 'principal' | 'psychologist';
}
