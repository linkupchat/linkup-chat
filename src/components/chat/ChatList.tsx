import React from 'react';
import { ChatWithDetails } from '@/hooks/useChats';
import { getAvatarUrl, formatLastSeen, formatMessageTime } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

interface ChatListProps {
  chats: ChatWithDetails[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({ chats, selectedChatId, onSelectChat }) => {
  const { user } = useAuth();

  if (chats.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <span className="text-3xl">💬</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No chats yet</h3>
        <p className="text-sm text-muted-foreground">
          Add friends using their Join Code to start chatting
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {chats.map((chat) => {
        const otherUser = chat.otherUser;
        if (!otherUser) return null;

        const isSelected = selectedChatId === chat.id;
        const lastMessageTime = chat.lastMessage 
          ? formatMessageTime(chat.lastMessage.created_at)
          : '';
        const isOwnMessage = chat.lastMessage?.sender_id === user?.id;

        return (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors ${
              isSelected ? 'bg-accent' : ''
            }`}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <Avatar className="w-12 h-12">
                <AvatarImage src={getAvatarUrl(otherUser.avatar_url, otherUser.id)} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {otherUser.name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator */}
              <div 
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-background ${
                  otherUser.is_online ? 'bg-online' : 'bg-offline'
                }`}
              />
            </div>

            {/* Chat info */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-foreground truncate">
                  {otherUser.name || 'Unknown'}
                </h3>
                {lastMessageTime && (
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {lastMessageTime}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground truncate">
                  {chat.lastMessage ? (
                    <>
                      {isOwnMessage && <span className="text-primary">You: </span>}
                      {chat.lastMessage.content}
                    </>
                  ) : (
                    <span className="italic">No messages yet</span>
                  )}
                </p>
                {chat.unreadCount > 0 && (
                  <span className="flex-shrink-0 ml-2 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                    {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
