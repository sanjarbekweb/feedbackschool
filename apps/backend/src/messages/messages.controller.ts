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
import {
  ApiResponse,
  ConversationMessage,
  CurrentUser as CurrentUserType,
  PaginatedApiResponse,
} from '@psychology/types';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('conversations/:id/messages')
@UseGuards(JwtAuthGuard, ConversationOwnershipGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  async getMessages(
    @Param('id') conversationId: string,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedApiResponse<ConversationMessage>> {
    const result = await this.messagesService.getMessages(
      conversationId,
      pagination.page,
      pagination.limit,
    );
    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addMessage(
    @Param('id') conversationId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<ApiResponse<ConversationMessage>> {
    const { senderId: _senderId, ...message } =
      await this.messagesService.addMessage(conversationId, dto, user);
    return {
      success: true,
      data: message,
    };
  }
}
