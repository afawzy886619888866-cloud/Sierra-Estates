import { describe, it, expect } from 'vitest';

describe('Chatting, Live Messaging & Thread Management Test Suite', () => {
  interface ChatMessage {
    id: string;
    senderId: string;
    senderRole: 'client' | 'bot' | 'human_agent';
    content: string;
    timestamp: number;
    status: 'sent' | 'delivered' | 'read';
  }

  class ChatThread {
    public threadId: string;
    public messages: ChatMessage[] = [];
    public activeAgentId?: string;

    constructor(threadId: string) {
      this.threadId = threadId;
    }

    public addMessage(senderId: string, senderRole: 'client' | 'bot' | 'human_agent', content: string): ChatMessage {
      const msg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        senderId,
        senderRole,
        content,
        timestamp: Date.now(),
        status: 'sent',
      };
      this.messages.push(msg);
      return msg;
    }

    public markAllAsRead(): void {
      for (const msg of this.messages) {
        msg.status = 'read';
      }
    }

    public getUnreadCount(role: 'client' | 'human_agent'): number {
      return this.messages.filter((m) => m.senderRole !== role && m.status !== 'read').length;
    }
  }

  it('should maintain chronological message history in chat thread', () => {
    const thread = new ChatThread('thread-lead-101');

    thread.addMessage('client-karim', 'client', 'Hi, do you have any villas in Mivida?');
    thread.addMessage('bot-concierge', 'bot', 'Hello Karim, yes we have 3 prime standalone villas available.');

    expect(thread.messages.length).toBe(2);
    expect(thread.messages[0].senderRole).toBe('client');
    expect(thread.messages[1].senderRole).toBe('bot');
  });

  it('should track unread message counts and mark as read', () => {
    const thread = new ChatThread('thread-lead-102');

    thread.addMessage('client-omar', 'client', 'Hello?');
    thread.addMessage('client-omar', 'client', 'Can you call me?');

    expect(thread.getUnreadCount('human_agent')).toBe(2);

    thread.markAllAsRead();
    expect(thread.getUnreadCount('human_agent')).toBe(0);
  });
});
