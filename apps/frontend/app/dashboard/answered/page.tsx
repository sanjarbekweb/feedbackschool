'use client';

import React from 'react';
import { ConversationList } from '@/components/conversation-list';
import { ConversationStatus } from '@psychology/types';

export default function AnsweredPage() {
  return (
    <ConversationList
      initialStatus={ConversationStatus.ANSWERED}
      title="Answered Cases"
      description="Student conversations that have received staff responses"
    />
  );
}
