import React from 'react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex justify-start mb-2 animate-fade-in">
      <div className="chat-bubble-received px-4 py-3">
        <div className="typing-dots flex gap-1">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/60" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/60" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/60" />
        </div>
      </div>
    </div>
  );
};
