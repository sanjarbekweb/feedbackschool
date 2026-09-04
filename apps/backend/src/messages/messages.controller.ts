import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ConversationOwnershipGuard } from '../common/guards/ownership.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentUser as CurrentUserType, ApiResponse } from '@psychology/types';

@Controller('conversations/:id/messages')
@UseGuards(JwtAuthGuard, ConversationOwnershipGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  async getMessages(
    @Param('id') conversationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<any>> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    const result = await this.messagesService.getMessages(conversationId, pageNum, limitNum);
    return {
      success: true,
      data: result.data,
      ...({ meta: result.meta } as any),
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addMessage(
    @Param('id') conversationId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<ApiResponse<any>> {
    const message = await this.messagesService.addMessage(conversationId, dto, user);
    return {
      success: true,
      data: message,
    };
  }
}
