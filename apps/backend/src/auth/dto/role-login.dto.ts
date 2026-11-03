import { IsIn, IsNotEmpty, IsString } from 'class-validator';

/**
 * All known staff roles that can log in via the passwordless role-selector.
 * ID → Uzbek label mapping is kept in STAFF_ROLES below.
 */
export const STAFF_ROLES = {
  principal: 'Direktor',
  psychologist: 'Psixolog',
  counselor: 'Maktab maslahatchi',
  mmibdo: "MMIBDO'",
  otibdo: "O'TIBDO'",
} as const;

export type StaffRoleId = keyof typeof STAFF_ROLES;
export const VALID_ROLE_IDS = Object.keys(STAFF_ROLES) as StaffRoleId[];

export class RoleLoginDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(VALID_ROLE_IDS)
  roleId!: StaffRoleId;
}
