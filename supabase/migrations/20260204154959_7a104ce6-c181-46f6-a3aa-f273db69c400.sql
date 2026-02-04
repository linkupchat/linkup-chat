-- Create a function to accept friend requests with proper permissions
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_user1_id UUID;
  v_user2_id UUID;
  v_chat_id UUID;
BEGIN
  -- Get the request and verify the current user is the receiver
  SELECT * INTO v_request
  FROM public.friend_requests
  WHERE id = request_id
    AND receiver_id = auth.uid()
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or already processed');
  END IF;
  
  -- Update request status to accepted
  UPDATE public.friend_requests
  SET status = 'accepted', updated_at = now()
  WHERE id = request_id;
  
  -- Create bidirectional connections
  INSERT INTO public.connections (user_id, friend_id)
  VALUES (auth.uid(), v_request.sender_id)
  ON CONFLICT DO NOTHING;
  
  INSERT INTO public.connections (user_id, friend_id)
  VALUES (v_request.sender_id, auth.uid())
  ON CONFLICT DO NOTHING;
  
  -- Create chat (ensure consistent ordering)
  SELECT LEAST(auth.uid(), v_request.sender_id), GREATEST(auth.uid(), v_request.sender_id)
  INTO v_user1_id, v_user2_id;
  
  -- Check if chat already exists
  SELECT id INTO v_chat_id
  FROM public.chats
  WHERE user1_id = v_user1_id AND user2_id = v_user2_id;
  
  IF v_chat_id IS NULL THEN
    INSERT INTO public.chats (user1_id, user2_id)
    VALUES (v_user1_id, v_user2_id)
    RETURNING id INTO v_chat_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'chat_id', v_chat_id,
    'sender_id', v_request.sender_id
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_friend_request(UUID) TO authenticated;