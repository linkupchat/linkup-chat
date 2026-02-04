-- Create friend_requests table
CREATE TABLE public.friend_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate requests (same sender to same receiver)
  CONSTRAINT unique_friend_request UNIQUE (sender_id, receiver_id),
  -- Prevent self-requests
  CONSTRAINT no_self_request CHECK (sender_id != receiver_id)
);

-- Enable RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their sent or received requests"
ON public.friend_requests
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create friend requests"
ON public.friend_requests
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update requests they received"
ON public.friend_requests
FOR UPDATE
USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their sent requests"
ON public.friend_requests
FOR DELETE
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Add trigger for updated_at
CREATE TRIGGER update_friend_requests_updated_at
BEFORE UPDATE ON public.friend_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for friend_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;

-- Create index for faster queries
CREATE INDEX idx_friend_requests_receiver ON public.friend_requests(receiver_id) WHERE status = 'pending';
CREATE INDEX idx_friend_requests_sender ON public.friend_requests(sender_id);