import { assertConversationAccess, conversationScope } from './conversation-access';
import { UserRole } from '@psychology/types';

describe('Recipient boundaries', () => {
  const conversation = { studentId: 'student', recipientRoleId: 'psychologist' };
  it('isolates students and denies unassigned staff', () => {
    expect(conversationScope({ id: 'student', role: UserRole.STUDENT })).toEqual({ studentId: 'student' });
    expect(() => assertConversationAccess(conversation, { id: 'staff', role: UserRole.STAFF })).toThrow();
  });
  it('a principal is not implicitly an administrator', () => {
    expect(() => assertConversationAccess(conversation, { id: 'principal', role: UserRole.STAFF, staffRoleId: 'principal' })).toThrow();
  });
  it('keeps administrator access explicit', () => {
    expect(conversationScope({ id: 'admin', role: UserRole.ADMIN })).toEqual({});
    expect(() => assertConversationAccess(conversation, { id: 'admin', role: UserRole.ADMIN })).not.toThrow();
  });
});
