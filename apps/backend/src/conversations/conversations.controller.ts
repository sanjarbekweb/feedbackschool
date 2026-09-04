import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ConversationFilterDto } from './dto/conversation-filter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ConversationOwnershipGuard } from '../common/guards/ownership.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser as CurrentUserType, UserRole, ApiResponse } from '@psychology/types';

@Controller('conversations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async findAll(
    @Query() filter: ConversationFilterDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<ApiResponse<any>> {
    const result = await this.conversationsService.findAll(filter, user);
    return {
      success: true,
      data: result.data,
      ...({ meta: result.meta } as any),
    };
  }

  @Get(':id')
  @UseGuards(ConversationOwnershipGuard)
  async findOne(@Param('id') id: string): Promise<ApiResponse<any>> {
    const conversation = await this.conversationsService.findOne(id);
    return {
      success: true,
      data: conversation,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<ApiResponse<any>> {
    const conversation = await this.conversationsService.createConversation(dto, user);
    return {
      success: true,
      data: conversation,
    };
  }

  @Patch(':id')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<ApiResponse<any>> {
    const conversation = await this.conversationsService.update(id, dto, user);
    return {
      success: true,
      data: conversation,
    };
  }
}
