import { Controller, Sse, MessageEvent, UseGuards } from '@nestjs/common';
import { Observable, interval, map, merge } from 'rxjs';
import { RealtimeService } from './realtime.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@psychology/types';

@Controller('events')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Sse()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  sendEvents(): Observable<MessageEvent> {
    const events = this.realtimeService.getEventStream().pipe(
      map((event) => ({
        data: event,
        type: event.type,
      })),
    );

    const heartbeat = interval(25_000).pipe(
      map(() => ({
        data: { timestamp: new Date().toISOString() },
        type: 'heartbeat',
      })),
    );

    return merge(events, heartbeat);
  }
}
