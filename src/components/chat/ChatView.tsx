import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Profile } from '@/lib/supabase';
import { useMessages } from '@/hooks/useMessages';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { MessageInput } from './MessageInput';
import { Loader2 } from 'lucide-react';

interface ChatViewProps {
  chatId: string | null;
  otherUser: Profile | null;
  onBack?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ chatId, otherUser, onBack }) => {
  const { user } = useAuth();
  const { messages, loading, sendMessage, updateTypingStatus, isOtherTyping } = useMessages(chatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOtherTyping]);

  if (!chatId || !otherUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-accent/20 p-8 text-center">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <span className="text-4xl">💬</span>
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Select a chat</h3>
        <p className="text-muted-foreground max-w-xs">
          Choose a conversation from the list to start messaging
        </p>
      </div>
    );
  }

  const handleSend = async (content: string) => {
    await sendMessage(content);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <ChatHeader otherUser={otherUser} isTyping={isOtherTyping} onBack={onBack} />
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-accent/10">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground">
              No messages yet. Say hi! 👋
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === user?.id}
              />
            ))}
            {isOtherTyping && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput 
        onSend={handleSend} 
        onTyping={updateTypingStatus}
      />
    </div>
  );
};
