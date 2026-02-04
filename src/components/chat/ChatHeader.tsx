import React from 'react';
import { Profile, getAvatarUrl, formatLastSeen } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft } from 'lucide-react';

interface ChatHeaderProps {
  otherUser: Profile | null;
  isTyping: boolean;
  onBack?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ otherUser, isTyping, onBack }) => {
  if (!otherUser) return null;

  const statusText = isTyping 
    ? 'typing...' 
    : otherUser.is_online 
      ? 'online' 
      : `last seen ${formatLastSeen(otherUser.last_seen)}`;

  return (
    <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
      {/* Back button for mobile */}
      {onBack && (
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors md:hidden"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
      )}

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-10 h-10">
          <AvatarImage src={getAvatarUrl(otherUser.avatar_url, otherUser.id)} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {otherUser.name?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        {/* Online indicator */}
        <div 
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
            otherUser.is_online ? 'bg-online' : 'bg-offline'
          }`}
        />
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-foreground truncate">
          {otherUser.name || 'Unknown'}
        </h2>
        <p className={`text-xs truncate ${
          isTyping ? 'text-primary font-medium' : otherUser.is_online ? 'text-online' : 'text-muted-foreground'
        }`}>
          {statusText}
        </p>
      </div>
    </div>
  );
};
