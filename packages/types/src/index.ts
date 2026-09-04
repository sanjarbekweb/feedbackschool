/**
 * Shared domain types and contracts for School Psychology Support System.
 * Single source of truth consumed by apps/backend and apps/frontend.
 */

// ==========================================
// Domain Enums
// ==========================================

export const UserRole = {
  STUDENT: 'STUDENT',
  STAFF: 'STAFF',
  ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ConversationStatus = {
  UNANSWERED: 'UNANSWERED',
  IN_PROGRESS: 'IN_PROGRESS',
  ANSWERED: 'ANSWERED',
  CLOSED: 'CLOSED',
} as const;
export type ConversationStatus = (typeof ConversationStatus)[keyof typeof ConversationStatus];

export const SenderType = {
  STUDENT: 'STUDENT',
  STAFF: 'STAFF',
  SYSTEM: 'SYSTEM',
} as const;
export type SenderType = (typeof SenderType)[keyof typeof SenderType];

export const ConversationCategory = {
  GENERAL: 'GENERAL',
  ACADEMIC: 'ACADEMIC',
  PERSONAL: 'PERSONAL',
  SOCIAL: 'SOCIAL',
  URGENT: 'URGENT',
} as const;
export type ConversationCategory = (typeof ConversationCategory)[keyof typeof ConversationCategory];

// ==========================================
// Core Entities
// ==========================================

export interface User {
  id: string;
  telegramId: string;
  role: UserRole;
  studentIdentifier?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Conversation {
  id: string;
  caseId: string; // e.g. '#A81F42'
  studentId: string;
  status: ConversationStatus;
  category: ConversationCategory;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastMessageAt: Date | string;
  // Optional relations
  student?: User | null;
  messages?: Message[];
  _count?: {
    messages: number;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: SenderType;
  content: string;
  createdAt: Date | string;
  readAt?: Date | string | null;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
}

// ==========================================
// Pagination & Common API Types
// ==========================================

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ==========================================
// Auth DTOs
// ==========================================

export interface StaffLoginDto {
  email: string;
  password?: string;
  passcode?: string;
}

export interface CurrentUser {
  id: string;
  telegramId?: string | null;
  role: UserRole;
  studentIdentifier?: string | null;
}

export interface AuthSession {
  user: CurrentUser;
  expiresAt: string;
}

// ==========================================
// Conversation API DTOs
// ==========================================

export interface CreateConversationDto {
  category: ConversationCategory;
  initialMessage: string;
  studentTelegramId: string;
}

export interface UpdateConversationDto {
  status?: ConversationStatus;
  category?: ConversationCategory;
}

export interface ConversationFilterQuery extends PaginationQuery {
  status?: ConversationStatus;
  category?: ConversationCategory;
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'lastMessage';
}

// ==========================================
// Message API DTOs
// ==========================================

export interface CreateMessageDto {
  content: string;
}

// ==========================================
// Dashboard Statistics DTOs
// ==========================================

export interface DashboardStatistics {
  totalConversations: number;
  unansweredCount: number;
  answeredCount: number;
  closedCount: number;
  averageResponseTimeMinutes: number | null;
  recentActivityCount: number;
}

// ==========================================
// Realtime SSE Event Definitions
// ==========================================

export type SseEventType =
  | 'CONVERSATION_CREATED'
  | 'CONVERSATION_UPDATED'
  | 'MESSAGE_CREATED'
  | 'STATS_UPDATED';

export interface BaseSseEvent<T extends SseEventType, P> {
  type: T;
  timestamp: string;
  payload: P;
}

export type ConversationCreatedSseEvent = BaseSseEvent<
  'CONVERSATION_CREATED',
  {
    conversationId: string;
    caseId: string;
    category: ConversationCategory;
    status: ConversationStatus;
    createdAt: string;
  }
>;

export type ConversationUpdatedSseEvent = BaseSseEvent<
  'CONVERSATION_UPDATED',
  {
    conversationId: string;
    caseId: string;
    status: ConversationStatus;
    category: ConversationCategory;
    updatedAt: string;
  }
>;

export type MessageCreatedSseEvent = BaseSseEvent<
  'MESSAGE_CREATED',
  {
    messageId: string;
    conversationId: string;
    caseId: string;
    senderType: SenderType;
    createdAt: string;
  }
>;

export type StatsUpdatedSseEvent = BaseSseEvent<
  'STATS_UPDATED',
  DashboardStatistics
>;

export type AppSseEvent =
  | ConversationCreatedSseEvent
  | ConversationUpdatedSseEvent
  | MessageCreatedSseEvent
  | StatsUpdatedSseEvent;

export type RealtimeEvent = AppSseEvent;
