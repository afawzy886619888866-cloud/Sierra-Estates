'use client';

import React from 'react';
import SiteShell from '@/components/site/SiteShell';
import NotebookLMStudio from '@/components/client/NotebookLMStudio';
import '../../site-styles/notebookllm.css';

export default function NotebookLMPage() {
  return (
    <SiteShell active={null}>
      <NotebookLMStudio />
    </SiteShell>
  );
}
