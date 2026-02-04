import { useState, useEffect, useCallback } from 'react';
import { supabase, FriendRequest, FriendRequestWithSender, Profile } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export const useFriendRequests = () => {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<FriendRequestWithSender[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch pending requests received by this user
      const { data: received, error: receivedError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (receivedError) throw receivedError;

      // Fetch sender profiles for pending requests
      if (received && received.length > 0) {
        const senderIds = received.map(r => r.sender_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', senderIds);

        const requestsWithSenders: FriendRequestWithSender[] = received.map(request => ({
          ...request,
          status: request.status as 'pending' | 'accepted' | 'declined',
          sender: profiles?.find(p => p.id === request.sender_id) as Profile || {
            id: request.sender_id,
            name: 'Unknown',
            avatar_url: null,
            join_code: '',
            fcm_token: null,
            is_online: false,
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }));

        setPendingRequests(requestsWithSenders);
      } else {
        setPendingRequests([]);
      }

      // Fetch sent requests
      const { data: sent, error: sentError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      if (sentError) throw sentError;

      setSentRequests((sent || []).map(r => ({
        ...r,
        status: r.status as 'pending' | 'accepted' | 'declined'
      })));
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Real-time subscription for friend requests
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('friend-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `sender_id=eq.${user.id}`,
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchRequests]);

  // Send a friend request
  const sendRequest = async (receiverId: string): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not authenticated' };

    // Check for self-request
    if (receiverId === user.id) {
      return { error: "You can't send a request to yourself" };
    }

    // Check for existing connection
    const { data: existingConnection } = await supabase
      .from('connections')
      .select('id')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${receiverId}),and(user_id.eq.${receiverId},friend_id.eq.${user.id})`)
      .limit(1);

    if (existingConnection && existingConnection.length > 0) {
      return { error: 'You are already connected with this user' };
    }

    // Check for existing pending request (in either direction)
    const { data: existingRequest } = await supabase
      .from('friend_requests')
      .select('id, status, sender_id')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
      .limit(1);

    if (existingRequest && existingRequest.length > 0) {
      const request = existingRequest[0];
      if (request.status === 'pending') {
        if (request.sender_id === user.id) {
          return { error: 'You already have a pending request to this user' };
        } else {
          return { error: 'This user has already sent you a friend request' };
        }
      }
      if (request.status === 'declined' && request.sender_id === user.id) {
        return { error: 'Your previous request was declined' };
      }
    }

    // Create the friend request
    const { error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        status: 'pending',
      });

    if (error) {
      console.error('Error sending friend request:', error);
      return { error: 'Failed to send friend request' };
    }

    await fetchRequests();
    return { error: null };
  };

  // Accept a friend request
  const acceptRequest = async (requestId: string): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not authenticated' };

    // Get the request details
    const { data: request, error: fetchError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return { error: 'Request not found' };
    }

    if (request.receiver_id !== user.id) {
      return { error: 'You can only accept requests sent to you' };
    }

    if (request.status !== 'pending') {
      return { error: 'This request has already been processed' };
    }

    // Update request status to accepted
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating request:', updateError);
      return { error: 'Failed to accept request' };
    }

    // Create bidirectional connections
    const { error: conn1Error } = await supabase
      .from('connections')
      .insert({ user_id: user.id, friend_id: request.sender_id });

    if (conn1Error && !conn1Error.message.includes('duplicate')) {
      console.error('Error creating connection 1:', conn1Error);
    }

    const { error: conn2Error } = await supabase
      .from('connections')
      .insert({ user_id: request.sender_id, friend_id: user.id });

    if (conn2Error && !conn2Error.message.includes('duplicate')) {
      console.error('Error creating connection 2:', conn2Error);
    }

    // Create a chat between the two users
    const [user1, user2] = [user.id, request.sender_id].sort();
    
    const { error: chatError } = await supabase
      .from('chats')
      .insert({ user1_id: user1, user2_id: user2 });

    if (chatError && !chatError.message.includes('duplicate')) {
      console.error('Error creating chat:', chatError);
    }

    await fetchRequests();
    return { error: null };
  };

  // Decline a friend request
  const declineRequest = async (requestId: string): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'declined' })
      .eq('id', requestId)
      .eq('receiver_id', user.id);

    if (error) {
      console.error('Error declining request:', error);
      return { error: 'Failed to decline request' };
    }

    await fetchRequests();
    return { error: null };
  };

  return {
    pendingRequests,
    sentRequests,
    loading,
    sendRequest,
    acceptRequest,
    declineRequest,
    refetch: fetchRequests,
    pendingCount: pendingRequests.length,
  };
};
