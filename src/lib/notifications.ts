import { supabase } from '@/lib/supabase';

/**
 * Send a push notification for a new message.
 * 
 * This function should be called after a message is successfully inserted.
 * It determines the receiver from the chat participants and triggers
 * the notification edge function.
 * 
 * NOTE: Do NOT call this function until edge function is deployed.
 */
export const sendMessageNotification = async (
  chatId: string,
  senderId: string,
  content: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Fetch chat to determine the receiver
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('user1_id, user2_id')
      .eq('id', chatId)
      .single();

    if (chatError || !chat) {
      console.error('[notifications] Failed to fetch chat:', chatError);
      return { success: false, error: 'Chat not found' };
    }

    // Determine receiver (the other user in the chat)
    const receiverId = chat.user1_id === senderId ? chat.user2_id : chat.user1_id;

    // Call the edge function (DO NOT USE UNTIL DEPLOYED)
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        chat_id: chatId,
      },
    });

    if (error) {
      console.error('[notifications] Edge function error:', error);
      return { success: false, error: error.message };
    }

    console.log('[notifications] Notification result:', data);
    return { success: true };

  } catch (err) {
    console.error('[notifications] Unexpected error:', err);
    return { success: false, error: 'Unexpected error' };
  }
};
