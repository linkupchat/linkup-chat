import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { supabase, Profile, getAvatarUrl } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, Loader2, X, ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';

interface AddFriendProps {
  onBack: () => void;
  onFriendAdded: () => void;
}

export const AddFriend: React.FC<AddFriendProps> = ({ onBack, onFriendAdded }) => {
  const { user } = useAuth();
  const { sendRequest } = useFriendRequests();
  const [joinCode, setJoinCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<Profile | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a Join Code');
      return;
    }

    setSearching(true);
    setError(null);
    setFoundUser(null);

    try {
      const { data, error: searchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('join_code', joinCode.toUpperCase().trim())
        .single();

      if (searchError || !data) {
        setError('No user found with this Join Code');
        return;
      }

      if (data.id === user?.id) {
        setError("That's your own Join Code!");
        return;
      }

      setFoundUser(data as Profile);
    } catch (err) {
      setError('Failed to search. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!foundUser || !user) return;

    setSending(true);

    const { error: sendError } = await sendRequest(foundUser.id);

    if (sendError) {
      toast.error(sendError);
    } else {
      toast.success(`Friend request sent to ${foundUser.name}!`);
      onFriendAdded();
    }

    setSending(false);
  };

  const handleClear = () => {
    setFoundUser(null);
    setError(null);
    setJoinCode('');
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold">Add Friend</h1>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Enter Join Code</CardTitle>
          <CardDescription>
            Ask your friend for their Join Code to send a request
          </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Input */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase());
                    setError(null);
                    setFoundUser(null);
                  }}
                  placeholder="Enter 8-character code"
                  className="h-12 rounded-xl text-center tracking-widest font-mono text-lg uppercase"
                  maxLength={8}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={searching || joinCode.length < 8}
                className="h-12 w-12 rounded-xl gradient-primary"
              >
                {searching ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </Button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm text-center animate-fade-in">
                {error}
              </div>
            )}

            {/* Found User */}
            {foundUser && (
              <div className="p-4 rounded-2xl bg-accent/50 animate-slide-up">
                <div className="flex items-center gap-4">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={getAvatarUrl(foundUser.avatar_url, foundUser.id)} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
                      {foundUser.name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {foundUser.name || 'Unknown'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Found by Join Code
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={handleClear}
                    className="flex-1 h-11 rounded-xl"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendRequest}
                    disabled={sending}
                    className="flex-1 h-11 rounded-xl gradient-primary"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Request
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
