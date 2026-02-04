import { useState, useEffect } from 'react';
import { supabase, Chat, Profile, Message, getOtherUserId } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatWithDetails extends Chat {
  otherUser: Profile | null;
  lastMessage: Message | null;
  unreadCount: number;
}

export const useChats = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChats = async () => {
    if (!user) return;

    // Fetch chats where user is participant
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    if (chatsError) {
      console.error('Error fetching chats:', chatsError);
      setLoading(false);
      return;
    }

    // Enrich chats with other user details and last message
    const enrichedChats = await Promise.all(
      (chatsData || []).map(async (chat) => {
        const otherUserId = getOtherUserId(chat, user.id);
        
        // Fetch other user's profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherUserId)
          .single();

        // Fetch last message
        const { data: messagesData } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1);

        // Count unread messages
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .eq('is_read', false)
          .neq('sender_id', user.id);

        return {
          ...chat,
          otherUser: profileData as Profile | null,
          lastMessage: messagesData?.[0] as Message | null,
          unreadCount: count || 0,
        };
      })
    );

    setChats(enrichedChats);
    setLoading(false);
  };

  useEffect(() => {
    fetchChats();

    // Subscribe to realtime updates for messages
    const messagesChannel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchChats();
        }
      )
      .subscribe();

    // Subscribe to profile updates (online status)
    const profilesChannel = supabase
      .channel('chat-profiles')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [user]);

  return { chats, loading, refetch: fetchChats };
};
