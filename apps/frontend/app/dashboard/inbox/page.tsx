'use client';

import React from 'react';
import { ConversationList } from '@/components/conversation-list';

export default function InboxPage() {
  return (
    <ConversationList
      title="Inbox & All Conversations"
      description="Comprehensive archive of all student psychology cases and support threads"
    />
  );
}
