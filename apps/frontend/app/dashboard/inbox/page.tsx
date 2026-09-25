'use client';

import React from 'react';
import { ConversationList } from '@/components/conversation-list';

export default function InboxPage() {
  return (
    <ConversationList
      title="Barcha murojaatlar"
      description="Murojaatni ochib, javob yozing."
    />
  );
}
