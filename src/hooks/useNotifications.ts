import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Request notification permission and get FCM token
export const useNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supported) {
      console.log('Notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted' && user) {
        // For now, we'll use a simple token based on the user ID
        // In a production app, you would integrate with FCM SDK
        const token = `web-${user.id}-${Date.now()}`;
        
        await supabase
          .from('profiles')
          .update({ fcm_token: token })
          .eq('id', user.id);
        
        console.log('Notification permission granted, token saved');
        return true;
      }
      
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [supported, user]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      // Try custom sound first
      const audio = new Audio('/linkup_soft_pulse.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Fallback to a simple beep if custom sound fails
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
      });
    } catch (_e) {
      console.log('Could not play notification sound');
    }
  }, []);

  // Show a notification
  const showNotification = useCallback((title: string, body: string, icon?: string, chatId?: string) => {
    if (permission !== 'granted') return;

    try {
      const notification = new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: chatId || 'linkup-message',
      });

      playNotificationSound();

      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Navigate to chat if chatId provided
        if (chatId) {
          // Dispatch custom event to open chat
          window.dispatchEvent(new CustomEvent('open-chat', { detail: { chatId } }));
        }
      };
    } catch (e) {
      console.error('Error showing notification:', e);
    }
  }, [permission, playNotificationSound]);

  return {
    supported,
    permission,
    requestPermission,
    showNotification,
    playNotificationSound,
  };
};
