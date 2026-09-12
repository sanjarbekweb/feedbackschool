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
  ): Promise<PaginatedApiResponse<StudentDirectoryItem>> {
    const result = await this.usersService.listStudents(
      pagination.page,
      pagination.limit,
    );

    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }
}
