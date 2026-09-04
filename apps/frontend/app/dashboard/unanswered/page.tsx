'use client';

import React from 'react';
import { ConversationList } from '@/components/conversation-list';
import { ConversationStatus } from '@psychology/types';

export default function UnansweredPage() {
  return (
    <ConversationList
      initialStatus={ConversationStatus.UNANSWERED}
      title="Unanswered Cases"
      description="Student messages currently awaiting review and response by psychology staff"
    />
  );
}
