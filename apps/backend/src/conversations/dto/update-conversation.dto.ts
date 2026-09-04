import { IsEnum, IsOptional } from 'class-validator';
import { ConversationCategory, ConversationStatus } from '@psychology/types';

export class UpdateConversationDto {
  @IsEnum(ConversationStatus)
  @IsOptional()
  status?: ConversationStatus;

  @IsEnum(ConversationCategory)
  @IsOptional()
  category?: ConversationCategory;
}
