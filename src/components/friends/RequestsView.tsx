import React from 'react';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { getAvatarUrl } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Check, X, Loader2, UserPlus, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface RequestsViewProps {
  onBack: () => void;
  onRequestAccepted: () => void;
}

export const RequestsView: React.FC<RequestsViewProps> = ({ onBack, onRequestAccepted }) => {
  const { pendingRequests, sentRequests, loading, acceptRequest, declineRequest } = useFriendRequests();
  const [processingIds, setProcessingIds] = React.useState<Set<string>>(new Set());

  const handleAccept = async (requestId: string, senderName: string) => {
    setProcessingIds(prev => new Set(prev).add(requestId));
    
    const { error } = await acceptRequest(requestId);
    
    if (error) {
      toast.error(error);
    } else {
      toast.success(`You are now connected with ${senderName}!`);
      onRequestAccepted();
    }
    
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(requestId);
      return next;
    });
  };

  const handleDecline = async (requestId: string) => {
    setProcessingIds(prev => new Set(prev).add(requestId));
    
    const { error } = await declineRequest(requestId);
    
    if (error) {
      toast.error(error);
    } else {
      toast.info('Friend request declined');
    }
    
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(requestId);
      return next;
    });
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
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
        <h1 className="text-lg font-semibold">Friend Requests</h1>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Pending Requests Section */}
            <Card className="border-0 shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Pending Requests
                  {pendingRequests.length > 0 && (
                    <span className="ml-auto bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                      {pendingRequests.length}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  People who want to connect with you
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No pending requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center gap-4 p-3 rounded-xl bg-accent/30 animate-fade-in"
                      >
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={getAvatarUrl(request.sender.avatar_url, request.sender.id)} />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {request.sender.name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {request.sender.name || 'Unknown'}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeAgo(request.created_at)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDecline(request.id)}
                            disabled={processingIds.has(request.id)}
                            className="h-9 w-9 p-0 rounded-lg"
                          >
                            {processingIds.has(request.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAccept(request.id, request.sender.name || 'Unknown')}
                            disabled={processingIds.has(request.id)}
                            className="h-9 w-9 p-0 rounded-lg gradient-primary"
                          >
                            {processingIds.has(request.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sent Requests Section */}
            {sentRequests.filter(r => r.status === 'pending').length > 0 && (
              <Card className="border-0 shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    Sent Requests
                  </CardTitle>
                  <CardDescription>
                    Waiting for response
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sentRequests
                      .filter(r => r.status === 'pending')
                      .map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
                        >
                          <div className="w-2 h-2 rounded-full bg-primary/70 animate-pulse" />
                          <span className="text-sm text-muted-foreground">
                            Request sent • {formatTimeAgo(request.created_at)}
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};
