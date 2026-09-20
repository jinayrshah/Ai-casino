import express from 'express';
import { WebSocketServer } from 'ws';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
let supabase = null;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ SUPABASE_URL or SUPABASE_ANON_KEY is not set in .env! Database features will not work.');
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Connected to Supabase');
}

// --- HTTP API ROUTES ---

const mockPlayers = new Map();

// Get player data (or create if doesn't exist)
app.get('/api/player/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!supabase) {
      if (!mockPlayers.has(username)) {
        mockPlayers.set(username, { username, chips: 1000 });
      }
      return res.json({ success: true, player: mockPlayers.get(username) });
    }

    // Try to find the player
    let { data: player, error } = await supabase
      .from('players')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // Not found, so create it
      const { data: newPlayer, error: insertError } = await supabase
        .from('players')
        .insert([{ username, chips: 1000 }])
        .select('*')
        .single();
        
      if (insertError) throw insertError;
      player = newPlayer;
    } else if (error) {
      throw error;
    }
    
    res.json({ success: true, player });
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Update player state (chips and progress)
app.post('/api/player/:username/state', async (req, res) => {
  try {
    const { username } = req.params;
    const { chips, current_round, round1_score, round2_score, round3_score, bonus_earnings } = req.body;
    
    if (!supabase) {
      mockPlayers.set(username, { username, chips });
      return res.json({ success: true });
    }

    const { data: player, error } = await supabase
      .from('players')
      .update({ 
        chips, 
        current_round, 
        round1_score, 
        round2_score, 
        round3_score, 
        bonus_earnings,
        last_active: new Date().toISOString() 
      })
      .eq('username', username)
      .select('*')
      .single();
      
    if (error) throw error;
    
    res.json({ success: true, player });
  } catch (error) {
    console.error('Error updating player chips:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Get global leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    if (!supabase) {
      // Mock leaderboard
      const entries = Array.from(mockPlayers.values()).map(p => ({
        username: p.username,
        chips: p.chips,
        timestamp: Date.now()
      })).sort((a, b) => b.chips - a.chips).slice(0, 10);
      return res.json({ success: true, leaderboard: entries });
    }

    const { data: players, error } = await supabase
      .from('players')
      .select('username, chips, last_active')
      .order('chips', { ascending: false })
      .limit(10);
      
    if (error) throw error;
    
    const formattedLeaderboard = players.map(p => ({
      username: p.username,
      chips: p.chips,
      timestamp: new Date(p.last_active).getTime()
    }));
    
    res.json({ success: true, leaderboard: formattedLeaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Proxy Pollinations to bypass browser CORS and AdBlockers
app.get('/api/generate-pollinations', async (req, res) => {
  try {
    const { prompt } = req.query;
    if (!prompt) return res.status(400).send('Prompt is required');
    
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&nologo=true&model=turbo`;
    
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).send(`Pollinations API error: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Pollinations proxy error:', err);
    res.status(500).send('Proxy error');
  }
});

let hfKeyIndex = 0;
// Proxy HuggingFace to bypass browser AdBlockers
app.post('/api/generate-huggingface', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const keys = [
      process.env.VITE_HF_API_KEY_1,
      process.env.VITE_HF_API_KEY_2,
      process.env.VITE_HF_API_KEY_3,
    ].filter(Boolean);

    if (keys.length === 0) {
      return res.status(500).json({ error: 'No HuggingFace keys configured' });
    }

    const key = keys[hfKeyIndex % keys.length];
    hfKeyIndex++;

    const model = 'black-forest-labs/FLUX.1-schnell';
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: `HuggingFace API error: ${response.statusText}` });
    }

    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('HuggingFace proxy error:', err);
    res.status(500).json({ error: 'Proxy error', details: err.message, stack: err.stack });
  }
});

// --- WEBSOCKET SERVER ---
const server = createServer(app);
const wss = new WebSocketServer({ server });

let host = null;
const players = new Map(); // clientId -> { ws: WebSocket, username: string }

wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');
  
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  ws.clientId = clientId;
  
  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    timestamp: Date.now()
  }));
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'register-host':
          if (host && host !== ws) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Another host is already registered',
              timestamp: Date.now()
            }));
            return;
          }
          if (!host) {
            host = ws;
            ws.isHost = true;
            console.log(`Host registered: ${ws.clientId}`);
            
            broadcastToPlayers({ type: 'host-available', timestamp: Date.now() });
            
            if (players.size > 0) {
              host.send(JSON.stringify({
                type: 'player-list',
                players: Array.from(players.entries()).map(([id, player]) => ({
                  id,
                  username: player.username,
                  connected: true
                })),
                timestamp: Date.now()
              }));
            }
          }
          break;
          

          
        case 'player-join':
          if (ws.isHost) break;
          
          if (!players.has(ws.clientId)) {
            players.set(ws.clientId, {
              ws: ws,
              username: data.username || `Player ${ws.clientId.substring(0, 6)}`
            });
            console.log(`Player joined: ${ws.clientId} (${data.username || 'Unknown'})`);
            
            if (host && host.readyState === WebSocket.OPEN) {
              host.send(JSON.stringify({
                type: 'player-joined',
                clientId: ws.clientId,
                username: data.username || `Player ${ws.clientId.substring(0, 6)}`,
                timestamp: Date.now()
              }));
            }
            
            if (host) {
              ws.send(JSON.stringify({ type: 'host-available', timestamp: Date.now() }));
            }
          }
          break;
          
        case 'private-message':
          if (ws.isHost && data.targetPlayerId) {
            const player = players.get(data.targetPlayerId);
            if (player && player.ws.readyState === WebSocket.OPEN) {
              player.ws.send(JSON.stringify({
                type: 'chat',
                content: data.content,
                senderId: 'host',
                senderName: 'Host',
                isPrivate: true,
                timestamp: data.timestamp || Date.now()
              }));
            }
          }
          break;
          
        case 'player-private-message':
          if (host && host.readyState === WebSocket.OPEN) {
            const player = Array.from(players.values()).find(p => p.ws === ws);
            if (player) {
              host.send(JSON.stringify({
                type: 'chat',
                content: data.content,
                senderId: ws.clientId,
                senderName: data.senderName || player.username,
                isPrivate: true,
                timestamp: data.timestamp || Date.now(),
                targetPlayerId: 'host'
              }));
            }
          }
          break;
          
        case 'chat':
          if (ws.isHost) {
            broadcastToPlayers({
              type: 'chat',
              content: data.content,
              senderId: 'host',
              senderName: 'Host',
              isPrivate: false,
              timestamp: Date.now()
            });
            
            if (host && host.readyState === WebSocket.OPEN) {
              host.send(JSON.stringify({
                type: 'chat',
                content: data.content,
                senderId: 'host',
                senderName: 'Host',
                isPrivate: false,
                timestamp: Date.now()
              }));
            }
          } else {
            const player = Array.from(players.values()).find(p => p.ws === ws);
            if (player) {
              broadcast({
                type: 'chat',
                content: data.content,
                senderId: ws.clientId,
                senderName: player.username,
                timestamp: Date.now(),
                isPrivate: false
              });
            }
          }
          break;
          
        default:
          console.log('Unhandled message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  ws.on('close', () => {
    if (ws === host) {
      console.log('Host disconnected');
      host = null;
      broadcastToPlayers({ type: 'host-disconnected', timestamp: Date.now() });
    } else if (players.has(ws.clientId)) {
      const player = players.get(ws.clientId);
      console.log(`Player disconnected: ${ws.clientId} (${player.username})`);
      players.delete(ws.clientId);
      
      if (host && host.readyState === WebSocket.OPEN) {
        host.send(JSON.stringify({
          type: 'player-left',
          clientId: ws.clientId,
          username: player.username,
          timestamp: Date.now()
        }));
      }
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function broadcastToPlayers(message) {
  const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
  players.forEach(player => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(messageStr);
    }
  });
}

function broadcast(message, excludeWs = null) {
  const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
  
  if (host && host.readyState === WebSocket.OPEN && (!excludeWs || host !== excludeWs)) {
    host.send(messageStr);
  }
  
  players.forEach(player => {
    if (player.ws.readyState === WebSocket.OPEN && (!excludeWs || player.ws !== excludeWs)) {
      player.ws.send(messageStr);
    }
  });
}

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (HTTP + WebSockets)`);
});