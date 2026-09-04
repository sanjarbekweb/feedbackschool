import { Global, Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { RolesGuard } from './guards/roles.guard';
import { ConversationOwnershipGuard } from './guards/ownership.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Global()
@Module({
  controllers: [HealthController],
  providers: [RolesGuard, ConversationOwnershipGuard, JwtAuthGuard],
  exports: [RolesGuard, ConversationOwnershipGuard, JwtAuthGuard],
})
export class CommonModule {}
