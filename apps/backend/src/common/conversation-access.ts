import { CurrentUser, UserRole } from '@psychology/types';
import { Prisma } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

export function conversationScope(user: CurrentUser): Prisma.ConversationWhereInput {
  if (user.role === UserRole.ADMIN) return {};
  if (user.role === UserRole.STUDENT) return { studentId: user.id };
  return { recipientRoleId: user.staffRoleId || '__unassigned__' };
}

export function assertConversationAccess(
  conversation: { studentId: string; recipientRoleId: string },
  user: CurrentUser,
) {
  if (user.role === UserRole.ADMIN) return;
  if (user.role === UserRole.STUDENT && conversation.studentId === user.id) return;
  if (user.role === UserRole.STAFF && user.staffRoleId === conversation.recipientRoleId) return;
  throw new NotFoundException('Murojaat topilmadi.');
}
