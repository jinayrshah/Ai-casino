// src/host/HostChatInterface.tsx
import { useState, useEffect, useRef } from 'react';
import { network_manager } from '../services/network';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'host' | 'player' | 'system';
  timestamp: Date;
  playerId?: string;
  playerName?: string;
  targetPlayerId?: string; // For private messages
}

interface Player {
  id: string;
  name: string;
  connected: boolean;
}

export default function HostChatInterface() {

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('all'); // 'all' for broadcast
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set up as host
    network_manager.connection_callback = (connected, message) => {
      // System message
      addSystemMessage(connected ? 'Connected to Turing Test server' : message);
    };

    function addSystemMessage(text: string) {
      setMessages(prev => [...prev, {
        id: Date.now().toString() + Math.random(),
        text,
        sender: 'system',
        timestamp: new Date(),
      } as ChatMessage]);
    }

    network_manager.message_callback = (msg: any) => {
      if (msg.type === 'host-registered') {
        addSystemMessage('You are now the host! Players can connect to chat.');
      } else if (msg.type === 'player-joined') {
        setPlayers(prev => {
          const existingPlayer = prev.find(p => p.id === msg.clientId);
          if (existingPlayer) return prev;
          return [...prev, {
            id: msg.clientId,
            name: msg.username,
            connected: true
          }];
        });
        addSystemMessage(`🎮 Player ${msg.username || msg.clientId} joined the chat`);
      } else if (msg.type === 'player-left') {
        setPlayers(prev => prev.map(p => 
          p.id === msg.clientId ? { ...p, connected: false } : p
        ));
        addSystemMessage(`🚪 Player ${msg.username || msg.clientId} left the chat`);
      } else if (msg.type === 'player-list') {
        setPlayers(msg.players.map((player: any) => ({
          id: player.id,
          name: player.username,
          connected: player.connected
        })));
      } else if (msg.type === 'chat') {
        const newMessage: ChatMessage = {
          id: Date.now().toString() + Math.random(),
          text: msg.content,
          sender: msg.senderId === 'host' ? 'host' : 'player',
          timestamp: new Date(msg.timestamp),
          playerId: msg.senderId,
          playerName: msg.senderName,
          targetPlayerId: msg.isPrivate ? (msg.senderId === 'host' ? msg.targetPlayerId : 'host') : undefined
        };
        setMessages(prev => [...prev, newMessage]);
      } else if (msg.type === 'player-joined') {
        setPlayers(prev => {
          const existingPlayer = prev.find(p => p.id === msg.clientId);
          if (existingPlayer) return prev;
          
          return [...prev, {
            id: msg.clientId,
            name: msg.username,
            connected: true
          }];
        });
      } else if (msg.type === 'player-left') {
        setPlayers(prev => prev.map(p => 
          p.id === msg.clientId ? { ...p, connected: false } : p
        ));
      } else if (msg.type === 'player-list') {
        // Initialize player list when host connects
        setPlayers(msg.players.map((player: any) => ({
          id: player.id,
          name: player.username,
          connected: player.connected
        })));
      }
    };

    // Connect as host
    const hostAddress = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:8080`;
    network_manager.connect_as_host(hostAddress);

    return () => {
      network_manager.disconnect();
    };
  }, []);

  const sendMessage = () => {
    if (!input.trim()) return;

    const hostMessage: ChatMessage = {
      id: Date.now().toString() + Math.random(),
      text: input,
      sender: 'host',
      timestamp: new Date(),
      targetPlayerId: selectedPlayerId === 'all' ? undefined : selectedPlayerId
    };

    setMessages(prev => [...prev, hostMessage]);
    
    if (selectedPlayerId === 'all') {
      // Create standardized message format
      const messageData = {
        type: 'chat',
        content: input,
        senderId: 'host',
        senderName: 'Host',
        timestamp: new Date().toISOString(),
        isPrivate: false
      };
      
      // Send broadcast
      network_manager.send_chat_message(JSON.stringify(messageData));
    } else {
      // Send private message to specific player
      network_manager.send_private_message_to_player(selectedPlayerId, input);
    }
    
    setInput('');
  };

  const getMessageDisplayInfo = (msg: ChatMessage) => {
    if (msg.sender === 'system') {
      return {
        displayName: 'System',
        badge: '',
        bgColor: 'bg-gray-800 border border-gray-600'
      };
    } else if (msg.sender === 'host') {
      const targetPlayer = msg.targetPlayerId 
        ? players.find(p => p.id === msg.targetPlayerId)
        : null;
      
      return {
        displayName: 'You',
        badge: targetPlayer ? `→ ${targetPlayer.name}` : '(To All)',
        bgColor: targetPlayer ? 'bg-purple-600' : 'bg-blue-600'
      };
    } else {
      const player = players.find(p => p.id === msg.playerId);
      return {
        displayName: player?.name || `Player ${msg.playerId?.substring(0, 6)}`,
        badge: msg.targetPlayerId ? '(Private)' : '',
        bgColor: msg.targetPlayerId ? 'bg-green-600' : 'bg-gray-700'
      };
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const connectedPlayers = players.filter(p => p.connected);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">🏠 Turing Test Host</h1>
        
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            Connected Players: {connectedPlayers.length}
          </h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {connectedPlayers.map(player => (
              <span 
                key={player.id}
                className="bg-green-800 px-2 py-1 rounded text-sm"
              >
                {player.name}
              </span>
            ))}
          </div>
        </div>


        {/* Chat Messages */}
        <div className="bg-gray-800 rounded-lg p-4 h-96 overflow-y-auto mb-4">
          {messages.map((msg) => {
            const { displayName, badge, bgColor } = getMessageDisplayInfo(msg);
            
            return (
              <div key={msg.id} className={`mb-3 ${msg.sender === 'host' ? 'text-right' : 'text-left'}`}>
                <div 
                  className={`inline-block rounded-lg p-3 max-w-md ${bgColor} ${msg.sender === 'player' ? 'cursor-pointer hover:opacity-90' : ''}`}
                  onClick={() => {
                    if (msg.sender === 'player' && msg.playerId) {
                      setSelectedPlayerId(msg.playerId);
                      // Focus input could be added here
                    }
                  }}
                  title={msg.sender === 'player' ? 'Click to reply privately' : ''}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-sm font-medium">{displayName}</div>
                    {badge && (
                      <span className="text-xs bg-black bg-opacity-30 px-1 rounded">
                        {badge}
                      </span>
                    )}
                    <div className="text-xs opacity-70">
                      {msg.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-left">{msg.text}</div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input + Player Selection */}
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={
              selectedPlayerId === 'all' 
                ? "Type a message to all players..."
                : `Private message to ${players.find(p => p.id === selectedPlayerId)?.name || selectedPlayerId}...`
            }
            className="flex-1 bg-gray-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
            className="bg-gray-800 border-2 border-blue-500 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-w-[220px]"
            style={{ maxWidth: 280 }}
          >
            <option value="all">All Players (Broadcast)</option>
            {connectedPlayers.map(player => (
              <option key={player.id} value={player.id}>
                {player.name || player.id} ({player.id})
              </option>
            ))}
          </select>
          <button 
            onClick={sendMessage}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
          >
            Send
          </button>
        </div>
        <div className="text-xs text-blue-300 mt-2">
          {selectedPlayerId === 'all' 
            ? 'Message will be sent to all connected players'
            : `Private message to ${players.find(p => p.id === selectedPlayerId)?.name || selectedPlayerId}`
          }
        </div>
      </div>
    </div>
  );
}