import { assertConversationAccess } from '../conversation-access';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@psychology/types';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ConversationOwnershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const conversationId = request.params?.id;

    if (!user) {
      return false;
    }

    // Staff and Admin have authority across all conversations
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    if (!conversationId) {
      return true;
    }

    // Students may only access their own conversations
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { studentId: true, recipientRoleId: true },
    });

    if (!conversation) {
      // Throw 404 instead of 403 to prevent IDOR enumeration of cases
      throw new NotFoundException('Murojaat topilmadi');
    }

    assertConversationAccess(conversation, user);
    return true;
  }
}
