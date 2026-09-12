import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ConversationCategory, ConversationStatus } from '@psychology/types';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ConversationFilterDto extends PaginationDto {
  @IsEnum(ConversationStatus)
  @IsOptional()
  status?: ConversationStatus;

  @IsEnum(ConversationCategory)
  @IsOptional()
  category?: ConversationCategory;

  @IsString()
  @MaxLength(32)
  @IsOptional()
  search?: string;

  @IsIn(['newest', 'oldest', 'lastMessage'])
  @IsOptional()
  sortBy?: 'newest' | 'oldest' | 'lastMessage' = 'lastMessage';
}
