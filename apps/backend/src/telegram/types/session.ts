import { ConversationCategory } from '@psychology/types';

export enum StudentSessionState {
  IDLE = 'IDLE',
  AWAITING_CATEGORY = 'AWAITING_CATEGORY',
  AWAITING_INITIAL_MESSAGE = 'AWAITING_INITIAL_MESSAGE',
  AWAITING_FOLLOWUP_MESSAGE = 'AWAITING_FOLLOWUP_MESSAGE',
}

export interface StudentSessionData {
  state: StudentSessionState;
  selectedCategory?: ConversationCategory;
  activeConversationId?: string;
  activeCaseId?: string;
}

export enum StaffSessionState {
  IDLE = 'IDLE',
  AWAITING_REPLY = 'AWAITING_REPLY',
}

export interface StaffSessionData {
  state: StaffSessionState;
  activeConversationId?: string;
  activeCaseId?: string;
}
