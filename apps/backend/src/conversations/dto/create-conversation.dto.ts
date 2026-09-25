import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ConversationCategory } from '@psychology/types';

export class CreateConversationDto {
  @IsEnum(ConversationCategory)
  @IsNotEmpty()
  category!: ConversationCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  initialMessage!: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  recipientRoleId?: string;

  @IsString()
  @IsOptional()
  studentTelegramId?: string;
}
