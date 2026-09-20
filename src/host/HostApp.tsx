import { useState, useEffect, useRef } from 'react';
import { network_manager } from '../services/network';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'host' | 'player' | 'system';
  timestamp: Date;
  playerId?: string;
}

interface PlayerState {
  username: string;
  claimedBy: string | null;
  claimedById: string | null;
  messages: ChatMessage[];
  unread: boolean;
}

export default function HostApp() {
  const [operatorName, setOperatorName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting to server...');
  const [isLoading, setIsLoading] = useState(false);
  
  // Track all players independently
  const [players, setPlayers] = useState<Record<string, PlayerState>>({});
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const localIdRef = useRef<string>('');

  useEffect(() => {
    if (!hasJoined) return;
    
    localIdRef.current = network_manager.get_local_id() || `host-${Date.now()}`;
    
    const handleConnection = (connected: boolean, message: string) => {
      setIsConnected(connected);
      setConnectionStatus(connected ? 'Connected to server!' : message || 'Connecting...');
      
      if (connected) {
        const ws = (network_manager as any).ws;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'register-host',
            clientId: localIdRef.current,
            hostName: operatorName,
            timestamp: Date.now()
          }));
        }
      }
    };

    const handleMessage = (msg: any) => {
      switch (msg.type) {
        case 'player-list':
          setPlayers(prev => {
            const next = { ...prev };
            msg.players.forEach((p: any) => {
              if (!next[p.id]) {
                next[p.id] = {
                  username: p.username,
                  claimedBy: p.claimedBy,
                  claimedById: p.claimedById,
                  messages: [],
                  unread: false
                };
              }
            });
            return next;
          });
          setIsLoading(false);
          break;
          
        case 'player-joined':
          setPlayers(prev => ({
            ...prev,
            [msg.clientId]: {
              username: msg.username,
              claimedBy: null,
              claimedById: null,
              messages: [],
              unread: false
            }
          }));
          break;
          
        case 'player-left':
          setPlayers(prev => {
            const next = { ...prev };
            delete next[msg.clientId];
            if (activePlayerId === msg.clientId) setActivePlayerId(null);
            return next;
          });
          break;
          
        case 'player-claimed':
          setPlayers(prev => {
            if (!prev[msg.playerId]) return prev;
            return {
              ...prev,
              [msg.playerId]: {
                ...prev[msg.playerId],
                claimedBy: msg.hostName,
                claimedById: msg.hostId
              }
            };
          });
          break;
          
        case 'chat':
          if (msg.senderId !== 'host') {
            const playerId = msg.senderId;
            setPlayers(prev => {
              if (!prev[playerId]) return prev; // Ignore if player unknown
              return {
                ...prev,
                [playerId]: {
                  ...prev[playerId],
                  messages: [...prev[playerId].messages, {
                    id: Date.now().toString() + Math.random(),
                    text: msg.content,
                    sender: 'player',
                    timestamp: new Date(msg.timestamp),
                  }],
                  unread: activePlayerId !== playerId
                }
              };
            });
          }
          break;
          
        case 'error':
          if (msg.message.includes('Maximum 2 operators')) {
             setHasJoined(false);
             alert(msg.message);
          } else {
             console.error('Server error:', msg.message);
          }
          break;
      }
    };

    setIsLoading(true);
    network_manager.connection_callback = handleConnection;
    network_manager.message_callback = handleMessage;
    network_manager.connect_as_host(import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:8080`);

    return () => {
      network_manager.disconnect();
      network_manager.connection_callback = null;
      network_manager.message_callback = null;
    };
  }, [hasJoined, operatorName]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [players, activePlayerId]);

  const claimPlayer = (playerId: string) => {
    const ws = (network_manager as any).ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'claim-player',
        playerId: playerId,
        timestamp: Date.now()
      }));
    }
  };

  const sendMessage = () => {
    if (!input.trim() || !isConnected || !activePlayerId) return;
    
    const activePlayer = players[activePlayerId];
    if (activePlayer.claimedById !== localIdRef.current) return;

    // Add to local state instantly
    setPlayers(prev => ({
      ...prev,
      [activePlayerId]: {
        ...prev[activePlayerId],
        messages: [...prev[activePlayerId].messages, {
          id: Date.now().toString(),
          text: input,
          sender: 'host',
          timestamp: new Date()
        }]
      }
    }));
    
    // Send via network (Private message)
    network_manager.send_private_message_to_player(activePlayerId, input);
    
    setInput('');
  };

  const selectPlayer = (id: string) => {
    setActivePlayerId(id);
    setPlayers(prev => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], unread: false }
      };
    });
  };

  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-xl max-w-md w-full border border-purple-500/30">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Operator Login</h2>
          <input
            type="text"
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            placeholder="Enter your name (e.g. Alice)"
            className="w-full bg-slate-700 text-white border border-slate-600 rounded-lg p-3 mb-4"
          />
          <button
            onClick={() => {
              if (operatorName.trim().length > 0) setHasJoined(true);
            }}
            disabled={operatorName.trim().length === 0}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-bold disabled:opacity-50"
          >
            Join Inbox
          </button>
        </div>
      </div>
    );
  }

  const activePlayer = activePlayerId ? players[activePlayerId] : null;
  const isClaimedByMe = activePlayer?.claimedById === localIdRef.current;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex h-screen overflow-hidden">
      {/* LEFT SIDEBAR */}
      <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
          <h2 className="font-bold text-lg text-purple-400">Players ({Object.keys(players).length})</h2>
          <div className="text-xs text-slate-400">
            {isConnected ? <span className="text-green-500">● Online</span> : <span className="text-red-500">● Offline</span>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {Object.keys(players).length === 0 ? (
            <div className="text-center text-slate-500 mt-10">No players connected</div>
          ) : (
            Object.entries(players).map(([id, p]) => (
              <div 
                key={id}
                onClick={() => selectPlayer(id)}
                className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                  activePlayerId === id ? 'bg-purple-900/50 border border-purple-500' : 'bg-slate-700/50 hover:bg-slate-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="font-semibold">{p.username}</div>
                  {p.unread && <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
                </div>
                <div className="text-xs text-slate-400">
                  {p.claimedById === localIdRef.current ? (
                    <span className="text-green-400">Claimed by You</span>
                  ) : p.claimedBy ? (
                    <span className="text-orange-400">Claimed by {p.claimedBy}</span>
                  ) : (
                    <span>Waiting for Host</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL: CHAT */}
      <div className="flex-1 flex flex-col bg-slate-900">
        {!activePlayerId || !activePlayer ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Select a player from the sidebar to chat
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-xl">{activePlayer.username}</h2>
                <div className="text-sm text-slate-400">
                  {activePlayer.claimedById === localIdRef.current 
                    ? 'You are chatting with this player' 
                    : activePlayer.claimedBy 
                    ? `Claimed by ${activePlayer.claimedBy}` 
                    : 'Unclaimed'}
                </div>
              </div>
              {!activePlayer.claimedBy && (
                <button 
                  onClick={() => claimPlayer(activePlayerId)}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
                >
                  Claim Player
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              {activePlayer.messages.length === 0 ? (
                <div className="text-center text-slate-500 mt-10">No messages yet.</div>
              ) : (
                activePlayer.messages.map(msg => (
                  <div key={msg.id} className={`mb-4 flex ${msg.sender === 'host' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl p-3 ${
                      msg.sender === 'host' 
                        ? 'bg-purple-600 text-white rounded-br-none' 
                        : 'bg-slate-700 text-white rounded-bl-none'
                    }`}>
                      <div className="text-xs opacity-50 mb-1">
                        {msg.sender === 'host' ? 'You' : activePlayer.username} • {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <div>{msg.text}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input box */}
            <div className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && sendMessage()}
                placeholder={isClaimedByMe ? "Type your message..." : "You must claim this player to chat"}
                disabled={!isClaimedByMe}
                className="flex-1 bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!isClaimedByMe || !input.trim()}
                className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-bold disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
