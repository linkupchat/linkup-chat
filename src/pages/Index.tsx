import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { ProfileSetup } from '@/components/profile/ProfileSetup';
import Chat from './Chat';
import { Loader2 } from 'lucide-react';

const Index: React.FC = () => {
  const { user, profile, loading, needsProfileSetup } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <AuthForm />;
  }

  // Needs profile setup
  if (needsProfileSetup) {
    return <ProfileSetup />;
  }

  // Main chat view
  return <Chat />;
};

export default Index;
