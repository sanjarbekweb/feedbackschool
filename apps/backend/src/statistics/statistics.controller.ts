import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentUser as Actor } from '@psychology/types';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, ApiResponse, DashboardStatistics } from '@psychology/types';

@Controller('statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAFF, UserRole.ADMIN)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  async getStatistics(@CurrentUser() actor: Actor): Promise<ApiResponse<DashboardStatistics>> {
    const stats = await this.statisticsService.getDashboardStatistics(actor);
    return {
      success: true,
      data: stats,
    };
  }
}
