import { Global, Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { RolesGuard } from './guards/roles.guard';
import { ConversationOwnershipGuard } from './guards/ownership.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { InMemoryCacheService } from './cache/in-memory-cache.service';

@Global()
@Module({
  controllers: [HealthController],
  providers: [RolesGuard, ConversationOwnershipGuard, JwtAuthGuard, InMemoryCacheService],
  exports: [RolesGuard, ConversationOwnershipGuard, JwtAuthGuard, InMemoryCacheService],
})
export class CommonModule {}
