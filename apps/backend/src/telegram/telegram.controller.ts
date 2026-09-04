import {
  Controller,
  Post,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { TelegramService } from './telegram.service';

@SkipThrottle()
@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('student')
  @HttpCode(HttpStatus.OK)
  async handleStudentWebhook(@Req() req: Request, @Res() res: Response) {
    return this.telegramService.handleStudentWebhook(req, res);
  }

  @Post('staff')
  @HttpCode(HttpStatus.OK)
  async handleStaffWebhook(@Req() req: Request, @Res() res: Response) {
    return this.telegramService.handleStaffWebhook(req, res);
  }
}
