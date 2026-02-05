import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, Message, TypingStatus, Profile } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export const useMessages = (chatId: string | null, onNewMessage?: (message: Message, senderProfile: Profile | null) => void) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const activeRef = useRef(true);

  const fetchMessages = useCallback(async () => {
    if (!chatId) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
      return;
    }

    setMessages(data as Message[]);
    setLoading(false);

    // Mark messages as read
    if (user) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('chat_id', chatId)
        .neq('sender_id', user.id)
        .eq('is_read', false);
    }
  }, [chatId, user]);

  const sendMessage = async (content: string) => {
    if (!chatId || !user || !content.trim()) return;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        content: content.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return { error };
    }

    // Update chat's updated_at
    await supabase
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chatId);

    // Stop typing indicator
    await updateTypingStatus(false);

    // Call Edge Function for push notification (fire and forget)
    try {
      // Fetch chat to get receiver_id
      const { data: chat } = await supabase
        .from('chats')
        .select('user1_id, user2_id')
        .eq('id', chatId)
        .single();

      if (chat) {
        const receiverId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id;

        // Fetch receiver's onesignal_id and sender's name in parallel
        const [receiverResult, senderResult] = await Promise.all([
          supabase.from('profiles').select('onesignal_id').eq('id', receiverId).single(),
          supabase.from('profiles').select('name').eq('id', user.id).single()
        ]);

        const receiverOnesignalId = receiverResult.data?.onesignal_id;
        const senderName = senderResult.data?.name || 'Someone';

        if (receiverOnesignalId) {
          // Call edge function via HTTP POST
          supabase.functions.invoke('send-notification', {
            body: {
              receiver_onesignal_id: receiverOnesignalId,
              sender_name: senderName,
              message: content.trim(),
              chat_id: chatId,
            },
          }).catch((err) => {
            console.error('[notifications] Edge function error:', err);
          });
        }
      }
    } catch (err) {
      console.error('[notifications] Failed to send notification:', err);
    }

    return { error: null, data };
  };

  const updateTypingStatus = async (isTyping: boolean) => {
    if (!chatId || !user) return;

    await supabase
      .from('typing_status')
      .upsert({
        chat_id: chatId,
        user_id: user.id,
        is_typing: isTyping,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'chat_id,user_id',
      });
  };

  useEffect(() => {
    activeRef.current = true;
    fetchMessages();

    if (!chatId) return;

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`messages-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          if (activeRef.current) {
            setMessages((prev) => [...prev, newMessage]);
          }
          
          // Mark as read if from other user and this chat is active
          if (user && newMessage.sender_id !== user.id && activeRef.current) {
            await supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMessage.id);
          }
          
          // Trigger notification callback for messages from others
          if (user && newMessage.sender_id !== user.id && onNewMessage) {
            // Fetch sender profile for notification
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newMessage.sender_id)
              .single();
            
            onNewMessage(newMessage, senderProfile as Profile | null);
          }
        }
      )
      .subscribe();

    // Subscribe to typing status
    const typingChannel = supabase
      .channel(`typing-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_status',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const typingData = payload.new as TypingStatus;
          if (user && typingData.user_id !== user.id && activeRef.current) {
            setIsOtherTyping(typingData.is_typing);
          }
        }
      )
      .subscribe();

    return () => {
      activeRef.current = false;
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(typingChannel);
      // Clear typing status when leaving chat
      updateTypingStatus(false);
    };
  }, [chatId, user, fetchMessages, onNewMessage]);

  return {
    messages,
    loading,
    sendMessage,
    updateTypingStatus,
    isOtherTyping,
    setActive: (active: boolean) => { activeRef.current = active; },
  };
};
