import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, ArrowLeft } from 'lucide-react';
import { BetAmount } from '../types';
import BettingPanel from './BettingPanel';
import ChatInterface from './chat/ChatInterface';
import { network_manager } from '../services/network';
import { reset_conversation } from '../services/gemini_chat';


interface Round3Props {
  currentChips: number;
  onComplete: (score: number, bet: number) => void;
  username: string;
}

type ChatMode = 'ai' | 'human' | null;
type Phase = 'intro' | 'betting' | 'mode-select' | 'playing' | 'results';

const TOTAL_SUBROUNDS = 3;
const MESSAGES_PER_SUBROUND = 3;

export default function Round3({ currentChips, onComplete, username }: Round3Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentBet, setCurrentBet] = useState<number>(0);
  const [actualMode, setActualMode] = useState<ChatMode>(null); // The actual randomly selected mode
  const [roundScore, setRoundScore] = useState(0);
  const [currentRound, setCurrentRound] = useState(0); // subround index
  const [messagesSent, setMessagesSent] = useState(0);
  const [showGuess, setShowGuess] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [isConnected, setIsConnected] = useState(false);



  // Handle bet placement
  const handleBet = useCallback((amount: BetAmount) => {
    const bet = amount === 'ALL_IN' ? currentChips : amount;
    setCurrentBet(bet);
    setPhase('mode-select');
  }, [currentChips]);

  // Handle connection status changes
  useEffect(() => {
    const handleConnectionChange = (connected: boolean, message: string) => {
      console.log('Connection status:', connected, message);
      setIsConnected(connected);
      setConnectionError(connected ? '' : message);

      if (connected && actualMode === 'human') {
        setPhase('playing');
      } else if (!connected && actualMode === 'human') {
        // Connection failed, fall back to AI mode
        console.log('Connection failed, falling back to AI mode');
        setActualMode('ai');
        reset_conversation();
        setPhase('playing');
        setConnectionError('');
      }
    };

    network_manager.connection_callback = handleConnectionChange;

    return () => {
      network_manager.connection_callback = null;
    };
  }, [actualMode]);

  // Handle incoming messages
  useEffect(() => {
    const handleMessage = (message: any) => {
      console.log('Received message:', message);
      // Handle incoming chat messages
    };

    network_manager.message_callback = handleMessage;
    
    return () => {
      network_manager.message_callback = null;
    };
  }, []);

  // Randomly select AI or Human mode and set up connection
  const selectRandomMode = useCallback(async () => {
    // Randomly choose between AI and Human (70% AI, 30% Human chance)
    // TEMPORARILY FORCED TO 100% HUMAN FOR TESTING
    const randomMode: ChatMode = 'human'; // Math.random() < 0.7 ? 'ai' : 'human';
    setActualMode(randomMode);
    setConnectionError('');
    console.log('Selected mode (hidden from player):', randomMode);

    if (randomMode === 'human') {

      try {
        selectHumanChat();
      } catch (error: unknown) {
        console.error('Connection error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setConnectionError(`Failed to connect to host: ${errorMessage}`);
        // If connection fails, fall back to AI mode
        console.log('Falling back to AI mode due to connection failure');
        setActualMode('ai');
        reset_conversation();
        setPhase('playing');
      } finally {

      }
    } else {
      // AI mode - start immediately
      reset_conversation();
      setPhase('playing');
    }
  }, []);
  //If Human is selected
  const selectHumanChat = useCallback(async () => {
    setActualMode('human');
    setConnectionError('');

    try {
      if (!network_manager.is_connected()) {
        // Automatically connect to the WebSocket server
        const hostAddress = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:8080`;
        console.log(`Connecting to ${hostAddress}...`);
        network_manager.set_username?.(username || '');
        await network_manager.connect_to_host(hostAddress);

        console.log('✅ Successfully connected to WebSocket server');
      }
    } catch (error: unknown) {
      console.error('Connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setConnectionError(`Failed to connect to server: ${errorMessage}. Make sure the WebSocket server is running with "npm run host".`);

      // Fall back to AI mode (this will be handled by the connection callback)
      console.log('🔄 Human connection failed, connection callback will handle fallback to AI mode');
    } finally {

    }
  }, [username]);

  // Handle player's guess (AI or Human)
  const handleAnswer = useCallback(async (playerGuess: 'ai' | 'human') => {
    if (!actualMode) return;
    
    // Calculate score for this round
    const isCorrect = playerGuess === actualMode;
    const score = isCorrect ? 1 : 0;
    setRoundScore(prev => prev + score);

    try {
      // Disconnect if in human mode
      if (actualMode === 'human') {
        network_manager.disconnect();
      }
      
      if (currentRound < TOTAL_SUBROUNDS - 1) {
        // Next round
        setCurrentRound(prev => prev + 1);
        reset_conversation();
        setPhase('mode-select');
        setActualMode(null);
        setIsConnected(false);
      } else {
        // All rounds completed
        setPhase('results');
      }
    } catch (error) {
      console.error('Error during round completion:', error);
      setConnectionError('Failed to complete round. Please refresh the page.');
    }
  }, [currentRound, actualMode]);

  // Handle time up (auto-submit wrong guess)
  const handleTimeUp = useCallback(() => {
    if (actualMode) {
      // If time runs out, count it as a wrong guess
      handleAnswer(actualMode === 'ai' ? 'human' : 'ai');
    }
  }, [actualMode, handleAnswer]);

  // Finish the round
  const handleFinishRound = useCallback(() => {
    network_manager.disconnect();
    onComplete(roundScore, currentBet);
  }, [onComplete, roundScore, currentBet]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      network_manager.disconnect();
      network_manager.connection_callback = null;
      network_manager.message_callback = null;
    };
  }, []);

  // Auto-select random mode when entering mode-select phase
  useEffect(() => {
    if (phase === 'mode-select' && !actualMode) {
      const timer = setTimeout(() => {
        selectRandomMode();
      }, 1500); // Short delay for suspense

      return () => clearTimeout(timer);
    }
  }, [phase, actualMode, selectRandomMode]);

  // Intro Screen
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-pink-900 to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-3xl text-center">
          <div className="mb-8">
            <MessageCircle className="text-pink-400 mx-auto mb-4" size={64} />
            <h1 className="text-6xl font-black text-white mb-4">ROUND 3</h1>
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">
              The Turing Test
            </h2>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 mb-8">
            <p className="text-xl text-white/80 mb-4">
              You will chat with an unknown partner. After the chat, you must guess: 
              were you talking to an AI or a real human?
            </p>
            <p className="text-lg text-pink-400 font-semibold">
              The mode is randomly selected and hidden from you!
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8 text-white">
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-3xl font-bold text-pink-400">{TOTAL_SUBROUNDS}</div>
              <div className="text-sm">Rounds</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-3xl font-bold text-purple-400">2</div>
              <div className="text-sm">Minutes Each</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-3xl font-bold text-cyan-400">1</div>
              <div className="text-sm">Guess Per Round</div>
            </div>
          </div>

          <button
            onClick={() => setPhase('betting')}
            className="px-12 py-5 text-2xl font-bold text-white bg-gradient-to-r from-pink-500 to-purple-500 rounded-full hover:scale-110 transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,0,255,0.6)]"
          >
            CONTINUE
          </button>
        </div>
      </div>
    );
  }

  // Betting Screen
  if (phase === 'betting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-pink-900 to-slate-900 flex items-center justify-center px-4 pt-24">
        <div className="max-w-2xl w-full">
          <h2 className="text-4xl font-black text-white text-center mb-8">Place Your Bet</h2>
          <BettingPanel currentChips={currentChips} onBet={handleBet} />
        </div>
      </div>
    );
  }

  // Mode Selection Screen (random selection in progress)
  if (phase === 'mode-select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-pink-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <h2 className="text-2xl text-white">Finding your chat partner...</h2>
          <p className="text-pink-300 mt-2">Randomly selecting AI or Human</p>
          {connectionError && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-sm max-w-md">
              {connectionError}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Human Chat Connection Screen (when connecting to host)
  if (phase === 'playing' && actualMode === 'human' && !isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-pink-900 to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-md rounded-2xl p-8 border border-pink-900/50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">Connecting to chat partner...</h2>
            <p className="text-slate-300">Setting up secure connection</p>
            {connectionError && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-sm">
                {connectionError}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Handle guess after 3 messages
  const handleSubroundGuess = (playerGuess: 'ai' | 'human') => {
    setShowGuess(false);
    setMessagesSent(0);
    // Calculate score for this subround
    const isCorrect = playerGuess === actualMode;
    setRoundScore(prev => prev + (isCorrect ? 1 : 0));
    // Disconnect if in human mode
    if (actualMode === 'human') {
      network_manager.disconnect();
    }
    // Next subround or finish
    if (currentRound < TOTAL_SUBROUNDS - 1) {
      setCurrentRound(prev => prev + 1);
      reset_conversation();
      setPhase('mode-select');
      setActualMode(null);
      setIsConnected(false);
    } else {
      setPhase('results');
    }
  };

  // Chat Interface Screen - with 3-message limit and guess UI
  if (phase === 'playing' && actualMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-pink-900 to-slate-900 flex flex-col">
        <div className="bg-slate-800/50 backdrop-blur-md border-b border-pink-900/50 p-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center">
              <button 
                onClick={() => {
                  if (confirm('Are you sure you want to leave this chat? Your progress will be lost.')) {
                    network_manager.disconnect();
                    setPhase('mode-select');
                    setActualMode(null);
                  }
                }}
                className="text-pink-400 hover:text-white mr-4 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-xl font-bold text-white">
                Subround {currentRound + 1} of {TOTAL_SUBROUNDS} - Turing Test
              </h2>
            </div>
            <div className="text-sm text-slate-300">
              You can send {MESSAGES_PER_SUBROUND - messagesSent} message(s) this subround
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatInterface 
            mode={actualMode}
            onComplete={() => {}} // disable auto-complete
            timeLimit={120}
            onTimeUp={handleTimeUp}
            isConnected={actualMode === 'ai' ? true : isConnected}
            messageLimit={MESSAGES_PER_SUBROUND}
            messagesSent={messagesSent}
            onSendMessage={() => {
              setMessagesSent(m => m + 1);
              if (messagesSent + 1 >= MESSAGES_PER_SUBROUND) setShowGuess(true);
            }}
            disableInput={messagesSent >= MESSAGES_PER_SUBROUND}
          />
          {showGuess && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
              <div className="bg-white rounded-xl p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">Who was your chat partner?</h2>
                <button
                  className="px-6 py-3 bg-pink-500 text-white rounded-lg font-bold text-xl mr-4"
                  onClick={() => handleSubroundGuess('ai')}
                >AI</button>
                <button
                  className="px-6 py-3 bg-purple-500 text-white rounded-lg font-bold text-xl"
                  onClick={() => handleSubroundGuess('human')}
                >Human</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Results Screen
  if (phase === 'results') {
    const scorePercentage = Math.round((roundScore / TOTAL_SUBROUNDS) * 100);
    const winnings = Math.max(0, Math.floor(currentBet * (scorePercentage / 50)));

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-pink-900 to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full bg-slate-800/50 backdrop-blur-md rounded-2xl p-8 border border-pink-900/50">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-black text-white mb-2">Round Complete!</h2>
            <p className="text-pink-300 text-xl">Your Score: {scorePercentage}%</p>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-6 mb-8">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <p className="text-4xl font-bold text-pink-400">{roundScore}</p>
                <p className="text-slate-300">Correct Guesses</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <p className="text-4xl font-bold text-pink-400">
                  {TOTAL_SUBROUNDS - roundScore}
                </p>
                <p className="text-slate-300">Incorrect Guesses</p>
              </div>
            </div>

            <div className="bg-slate-800/30 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300">Your Bet:</span>
                <span className="font-mono text-lg">${currentBet}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Winnings:</span>
                <span className="font-mono text-xl font-bold text-pink-400">+${winnings}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleFinishRound}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-xl transition-all hover:shadow-lg hover:shadow-pink-500/20"
          >
            Continue to Next Round
          </button>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl text-white mb-4">Something went wrong</h2>
        <button
          onClick={() => {
            setPhase('intro');
            setActualMode(null);
            network_manager.disconnect();
          }}
          className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg"
        >
          Back to Start
        </button>
      </div>
    </div>
  );
}