import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { network_manager } from '../../services/network';
import { get_ai_response } from '../../services/gemini_chat';

// Import NetworkMessage type for proper typing
type NetworkMessage = {
  type: 'chat' | 'connect' | 'connected' | 'disconnect' | 'error' |
        'player-joined' | 'player-left' | 'player-list' |
        'host-registered' | 'host-available' | 'host-disconnected' |
        'register-host' | 'player-join' | 'private-message' | 'player-private-message';
  content?: string;
  message?: string;
  timestamp: number;
  senderId?: string;
  clientId?: string;
  isHost?: boolean;
  senderName?: string;
  recipientId?: string;
  isPrivate?: boolean;
  players?: string[];
  targetPlayerId?: string;
};

type Message = {
  id: string;
  text: string;
  sender: 'ai' | 'human' | 'you' | 'system' | 'host';
  timestamp: Date;
};

interface ChatInterfaceProps {
  mode: 'ai' | 'human';
  onComplete: (guess: 'ai' | 'human') => void;
  timeLimit: number;
  onTimeUp: () => void;
  isConnected?: boolean;
  messageLimit?: number;
  messagesSent?: number;
  onSendMessage?: () => void;
  disableInput?: boolean;
}

export default function ChatInterface({ mode, onComplete, timeLimit, onTimeUp, messageLimit, messagesSent, onSendMessage, disableInput }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const aiGreetingSent = useRef(false);

  // Generate unique message ID
  const generateMessageId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Initialize chat based on mode
  useEffect(() => {
    // Reset greeting flag when mode changes
    aiGreetingSent.current = false;

    // Clean up previous mode setup
    network_manager.message_callback = null;
    network_manager.connection_callback = null;

    if (mode === 'ai') {
      // Start with an AI greeting (only once per mode switch)
      if (!aiGreetingSent.current) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: generateMessageId(),
            text: "Hi there! I'm your chat partner. Let's have a conversation!",
            sender: 'ai',
            timestamp: new Date()
          }]);
          aiGreetingSent.current = true;
        }, 1000);
      }
    } else {
      console.log('Setting up human chat mode');

      // Set up connection callback
      network_manager.connection_callback = ((connected: boolean, message: string) => {
        console.log(`Connection status: ${connected ? 'Connected' : 'Disconnected'} - ${message}`);

        if (connected) {
          console.log('Successfully connected to host');
          setMessages(prev => [...prev, {
            id: generateMessageId(),
            text: 'Connected to chat partner! Say hello!',
            sender: 'human',
            timestamp: new Date()
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: generateMessageId(),
            text: `Connection lost: ${message}`,
            sender: 'human',
            timestamp: new Date()
          }]);
        }
      });

      // Set up message callback
      network_manager.message_callback = (msg) => {
        console.log('Received message from host:', msg);

        // Handle different message formats
        let parsedMsg: NetworkMessage | {
          type: string;
          content: string;
          senderId: string;
          senderName: string;
          timestamp: number | Date;
        };

        if (typeof msg === 'string') {
          try {
            parsedMsg = JSON.parse(msg) as NetworkMessage;
          } catch (e) {
            // If it's plain text, treat it as a chat message
            parsedMsg = {
              type: 'chat',
              content: msg,
              senderId: 'host',
              senderName: 'Host',
              timestamp: new Date()
            };
          }
        } else {
          parsedMsg = msg;
        }

        if (parsedMsg.type === 'chat') {
          let displayText = '';

          if (typeof parsedMsg.content === 'string' && parsedMsg.content.trim().startsWith('{')) {
            try {
              const nestedMessage = JSON.parse(parsedMsg.content);
              displayText = nestedMessage.content || parsedMsg.content;
            } catch (e) {
              displayText = parsedMsg.content;
            }
          } else {
            displayText = typeof parsedMsg.content === 'string' ? parsedMsg.content : JSON.stringify(parsedMsg.content || msg);
          }

          setMessages(prev => [...prev, {
            id: generateMessageId(),
            text: displayText,
            sender: parsedMsg.senderId === 'host' ? 'host' : 'human',
            timestamp: parsedMsg.timestamp ? new Date(parsedMsg.timestamp) : new Date()
          }]);
        }
      };

      // Connect to the host
      const hostUrl = window.location.hostname;
      console.log(`Connecting to host at: ${hostUrl}`);

      network_manager.connect_to_host(hostUrl).catch((error: Error) => {
        console.error('Failed to connect to host:', error);
        setMessages(prev => [...prev, {
          id: generateMessageId(),
          text: `Failed to connect to host: ${error.message}`,
          sender: 'system',
          timestamp: new Date()
        }]);
      });
    }

    // Clean up
    return () => {
      network_manager.message_callback = null;
      network_manager.connection_callback = null;
    };
  }, [mode]);

  // Timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, onTimeUp]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (disableInput) return;
    if (typeof messageLimit === 'number' && typeof messagesSent === 'number' && messagesSent >= messageLimit) return;

    // Add user message
    const userMessage: Message = {
      id: generateMessageId(),
      text: input,
      sender: 'you',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    if (onSendMessage) onSendMessage();

    if (mode === 'ai') {
      // Get AI response
      setIsTyping(true);
      try {
        const aiResponse = await get_ai_response(input);

        // Simulate typing delay
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: generateMessageId(),
            text: aiResponse,
            sender: 'ai',
            timestamp: new Date()
          }]);
          setIsTyping(false);
        }, 1000 + Math.random() * 2000); // 1-3 second delay
      } catch (error) {
        console.error('Error getting AI response:', error);
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: generateMessageId(),
          text: 'Sorry, I couldn\'t understand that. Please try again.',
          sender: 'ai',
          timestamp: new Date()
        }]);
      }
    } else {
      // Send to human chat (privately to host)
      network_manager.send_private_message_to_host(input);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="bg-slate-800 p-4 border-b border-slate-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">
            Chat Partner
          </h2>
          <div className="text-sm text-slate-400">
            Time left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Show messages left if limit is set */}
        {typeof messageLimit === 'number' && typeof messagesSent === 'number' && (
          <div className="mb-2 text-sm text-slate-300 text-center">
            Messages left: {Math.max(0, messageLimit - messagesSent)}
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'you' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.sender === 'you'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-slate-700 text-white rounded-bl-none'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">
                  {message.sender === 'you' 
                    ? 'You' 
                    : 'Chat Partner'}
                </span>
                <span className="text-xs opacity-70 ml-2">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words">{message.text}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 p-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message your chat partner..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={timeLeft <= 0 || disableInput}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || timeLeft <= 0}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
        
        {timeLeft <= 0 && (
          <div className="mt-4 flex justify-center gap-4">
            <button
              onClick={() => onComplete('ai')}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
            >
              AI
            </button>
            <button
              onClick={() => onComplete('human')}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
              Human
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
