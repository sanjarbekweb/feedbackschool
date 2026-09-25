'use client';

import React from 'react';
import { ConversationList } from '@/components/conversation-list';
import { ConversationStatus } from '@psychology/types';

export default function AnsweredPage() {
  return (
    <ConversationList
      initialStatus={ConversationStatus.ANSWERED}
      title="Javob berilganlar"
      description="Javob yuborilgan murojaatlar"
    />
  );
}
