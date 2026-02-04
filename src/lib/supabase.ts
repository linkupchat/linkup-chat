import { supabase } from "@/integrations/supabase/client";

export { supabase };

// Types for our app
export interface Profile {
  id: string;
  name: string | null;
  avatar_url: string | null;
  join_code: string;
  fcm_token: string | null;
  is_online: boolean;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Connection {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
}

export interface TypingStatus {
  id: string;
  chat_id: string;
  user_id: string;
  is_typing: boolean;
  updated_at: string;
}

// Helper to get the other user in a chat
export const getOtherUserId = (chat: Chat, currentUserId: string): string => {
  return chat.user1_id === currentUserId ? chat.user2_id : chat.user1_id;
};

// Default avatar URL
export const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/avataaars/svg?seed=default";

// Generate avatar URL from user ID if no custom avatar
export const getAvatarUrl = (avatarUrl: string | null, userId: string): string => {
  if (avatarUrl) return avatarUrl;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
};

// Format last seen time
export const formatLastSeen = (lastSeen: string): string => {
  const date = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

// Format message time
export const formatMessageTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
