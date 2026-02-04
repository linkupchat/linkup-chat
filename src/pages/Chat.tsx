import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChats } from '@/hooks/useChats';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase, Message, getAvatarUrl } from '@/lib/supabase';
import { ChatList } from '@/components/chat/ChatList';
import { ChatView } from '@/components/chat/ChatView';
import { AddFriend } from '@/components/friends/AddFriend';
import { ProfileView } from '@/components/profile/ProfileView';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type View = 'chats' | 'add-friend' | 'profile';

const Chat: React.FC = () => {
  const { user, profile } = useAuth();
  const { chats, loading, refetch } = useChats();
  const { supported, permission, requestPermission, showNotification } = useNotifications();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('chats');
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [notificationRequested, setNotificationRequested] = useState(false);

  // Request notification permission after login
  useEffect(() => {
    if (user && supported && permission === 'default' && !notificationRequested) {
      setNotificationRequested(true);
      // Delay slightly to not interrupt the user immediately
      const timer = setTimeout(async () => {
        const granted = await requestPermission();
        if (granted) {
          toast.success('Notifications enabled!');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, supported, permission, requestPermission, notificationRequested]);

  // Listen for global message notifications
  useEffect(() => {
    if (!user) return;

    // Subscribe to all messages for the current user's chats
    const allMessagesChannel = supabase
      .channel('all-new-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          // Don't notify for own messages
          if (newMessage.sender_id === user.id) return;
          
          // Check if this chat belongs to the current user
          const { data: chat } = await supabase
            .from('chats')
            .select('*')
            .eq('id', newMessage.chat_id)
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .single();
          
          if (!chat) return;
          
          // Don't notify if the user is currently viewing this chat
          if (selectedChatId === newMessage.chat_id && document.hasFocus()) {
            return;
          }
          
          // Fetch sender info for notification
          const { data: sender } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMessage.sender_id)
            .single();
          
          if (sender && permission === 'granted') {
            showNotification(
              sender.name || 'New message',
              newMessage.content.length > 50 
                ? newMessage.content.substring(0, 47) + '...' 
                : newMessage.content,
              getAvatarUrl(sender.avatar_url, sender.id),
              newMessage.chat_id
            );
          }
          
          // Refetch chats to update the list
          refetch();
        }
      )
      .subscribe();

    // Listen for notification clicks
    const handleOpenChat = (event: CustomEvent<{ chatId: string }>) => {
      setSelectedChatId(event.detail.chatId);
      setShowChatOnMobile(true);
      setCurrentView('chats');
    };

    window.addEventListener('open-chat', handleOpenChat as EventListener);

    return () => {
      supabase.removeChannel(allMessagesChannel);
      window.removeEventListener('open-chat', handleOpenChat as EventListener);
    };
  }, [user, selectedChatId, permission, showNotification, refetch]);

  // Get selected chat and other user
  const selectedChat = chats.find((c) => c.id === selectedChatId);
  const otherUser = selectedChat?.otherUser || null;

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setShowChatOnMobile(true);
  };

  const handleBackFromChat = () => {
    setShowChatOnMobile(false);
  };

  const handleFriendAdded = () => {
    setCurrentView('chats');
    refetch();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Non-chat views
  if (currentView === 'add-friend') {
    return <AddFriend onBack={() => setCurrentView('chats')} onFriendAdded={handleFriendAdded} />;
  }

  if (currentView === 'profile') {
    return <ProfileView onBack={() => setCurrentView('chats')} />;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar / Chat List */}
      <div className={`w-full md:w-96 md:min-w-[320px] md:max-w-sm border-r border-border flex flex-col bg-card ${
        showChatOnMobile ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">LinkUp</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('add-friend')}
              className="p-2.5 rounded-xl hover:bg-accent transition-colors"
              title="Add Friend"
            >
              <UserPlus className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setCurrentView('profile')}
              className="p-1 rounded-xl hover:bg-accent transition-colors"
              title="Profile"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={profile ? getAvatarUrl(profile.avatar_url, profile.id) : ''} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {profile?.name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>

        {/* Chat List */}
        <ChatList
          chats={chats}
          selectedChatId={selectedChatId}
          onSelectChat={handleSelectChat}
        />
      </div>

      {/* Chat View */}
      <div className={`flex-1 ${
        !showChatOnMobile ? 'hidden md:flex' : 'flex'
      }`}>
        <ChatView
          chatId={selectedChatId}
          otherUser={otherUser}
          onBack={handleBackFromChat}
        />
      </div>
    </div>
  );
};

export default Chat;
