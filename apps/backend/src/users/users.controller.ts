import { Body, Post, Patch, Param } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentUser as Actor } from '@psychology/types';
import { StaffRoleDto, CreateStaffDto, ActiveDto } from './staff.dto';
import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginatedApiResponse, StudentDirectoryItem, UserRole } from '@psychology/types';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('students')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  async listStudents(
    @Query() pagination: PaginationDto,
    @CurrentUser() actor: Actor,
  ): Promise<PaginatedApiResponse<StudentDirectoryItem>> {
    const result = await this.usersService.listStudents(
      pagination.page,
      pagination.limit,
      actor,
    );

    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }
  @Get('roles')
  @Roles(UserRole.ADMIN)
  async roles() { return { success: true, data: await this.usersService.listRoles() }; }

  @Post('roles')
  @Roles(UserRole.ADMIN)
  async createRole(@Body() dto: StaffRoleDto, @CurrentUser() actor: Actor) {
    return { success: true, data: await this.usersService.createRole(dto.name, actor) };
  }

  @Get('staff')
  @Roles(UserRole.ADMIN)
  async staff(@Query() query: PaginationDto) {
    return { success: true, ...await this.usersService.listStaff(query.page, query.limit) };
  }

  @Post('staff')
  @Roles(UserRole.ADMIN)
  async createStaff(@Body() dto: CreateStaffDto, @CurrentUser() actor: Actor) {
    return { success: true, data: await this.usersService.createStaff(dto, actor) };
  }

  @Patch('staff/:id')
  @Roles(UserRole.ADMIN)
  async activate(@Param('id') id: string, @Body() dto: ActiveDto, @CurrentUser() actor: Actor) {
    return { success: true, data: await this.usersService.setStaffActive(id, dto.isActive, actor) };
  }

}
