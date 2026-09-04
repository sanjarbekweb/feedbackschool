import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { AppSseEvent } from '@psychology/types';

@Injectable()
export class RealtimeService {
  private readonly events$ = new Subject<AppSseEvent>();

  emit(event: AppSseEvent): void {
    this.events$.next(event);
  }

  getEventStream(): Observable<AppSseEvent> {
    return this.events$.asObservable();
  }
}
