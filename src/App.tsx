import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { GameScreen, Player, LeaderboardEntry } from './types';
import IntroScreen from './components/IntroScreen';
import RulesScreen from './components/RulesScreen';
import UsernameScreen from './components/UsernameScreen';
import ChipDisplay from './components/ChipDisplay';
import Round1 from './components/Round1';
import Round2 from './components/Round2';
import Round3 from './components/Round3';
import BonusRounds from './components/BonusRounds';
import Leaderboard from './components/Leaderboard';
import HostChatInterface from './host/HostChatInterface';
import OperatorSetup from './components/OperatorSetup';
import { network_manager } from './services/network';

const API_URL = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:8080`;

function App() {
  const [screen, setScreen] = useState<GameScreen>('intro');
  const [player, setPlayer] = useState<Player>({
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    username: '',
    chips: 50,
    round1Score: 0,
    round2Score: 0,
    round3Score: 0,
    bonusEarnings: 0,
    currentRound: 1,
    gameState: {},
  });
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);

  const handleStartGame = () => {
    setScreen('rules');
  };

  const handleContinueFromRules = () => {
    setScreen('username');
  };

  const saveProgressToDB = async (playerState: Player) => {
    if (!playerState.username) return;
    try {
      await fetch(`${API_URL}/api/player/${playerState.username}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chips: playerState.chips,
          current_round: playerState.currentRound,
          round1_score: playerState.round1Score,
          round2_score: playerState.round2Score,
          round3_score: playerState.round3Score,
          bonus_earnings: playerState.bonusEarnings
        })
      });
    } catch (error) {
      console.error('Failed to save progress to database:', error);
    }
  };

  const handleUsernameSubmit = async (username: string) => {
    try {
      // Fetch existing player state or create new player in DB
      const res = await fetch(`${API_URL}/api/player/${username}`);
      const data = await res.json();
      
      if (data.success && data.player) {
        const p = data.player;
        const loadedPlayer = {
          ...player,
          username,
          chips: p.chips ?? 50,
          currentRound: p.current_round ?? 1,
          round1Score: p.round1_score ?? 0,
          round2Score: p.round2_score ?? 0,
          round3Score: p.round3_score ?? 0,
          bonusEarnings: p.bonus_earnings ?? 0,
        };
        setPlayer(loadedPlayer);
        network_manager.set_username?.(username);
        
        // Jump to the correct screen based on saved round
        if (loadedPlayer.currentRound === 1) setScreen('round1');
        else if (loadedPlayer.currentRound === 1.5) setScreen('bonus');
        else if (loadedPlayer.currentRound === 2) setScreen('round2');
        else if (loadedPlayer.currentRound === 2.5) setScreen('bonus');
        else if (loadedPlayer.currentRound === 3) setScreen('round3');
        else if (loadedPlayer.currentRound === 4) setScreen('bonus');
        else setScreen('round1');
      } else {
        setPlayer({ ...player, username, chips: 50 });
        network_manager.set_username?.(username);
        setScreen('round1');
      }
    } catch (error) {
      console.error('Failed to connect to database. Falling back to local state:', error);
      setPlayer({ ...player, username, chips: 50 });
      network_manager.set_username?.(username);
      setScreen('round1');
    }
  };

  const handleRound1Complete = (score: number, bet: number) => {
    const correctCount = score;
    const wrongCount = 5 - correctCount;
    const earnings = correctCount * bet - wrongCount * bet;

    const newChips = player.chips + earnings;
    const updatedPlayer = {
      ...player,
      chips: newChips,
      round1Score: earnings,
      currentRound: 1.5, // Going to bonus round
    };
    setPlayer(updatedPlayer);
    saveProgressToDB(updatedPlayer);
    setScreen('bonus');
  };

  const handleBonus1Complete = (earnings: number) => {
    console.log('App: handleBonus1Complete called with earnings:', earnings);
    const finalChips = player.chips + earnings;
    console.log('App: Updating player chips from', player.chips, 'to', finalChips);
    const updatedPlayer = {
      ...player,
      chips: finalChips,
      bonusEarnings: player.bonusEarnings + earnings,
      currentRound: 2,
    };

    setPlayer(updatedPlayer);
    saveProgressToDB(updatedPlayer);
    setScreen('round2');
  };

  const handleRound2Complete = (score: number, bet: number) => {
    const correctCount = score;
    const wrongCount = 5 - correctCount;
    const earnings = correctCount * bet - wrongCount * bet;

    const newChips = player.chips + earnings;
    const updatedPlayer = {
      ...player,
      chips: newChips,
      round2Score: earnings,
      currentRound: 2.5, // Going to bonus round
    };
    setPlayer(updatedPlayer);
    saveProgressToDB(updatedPlayer);
    setScreen('bonus');
  };

  const handleBonus2Complete = (earnings: number) => {
    const finalChips = player.chips + earnings;
    const updatedPlayer = {
      ...player,
      chips: finalChips,
      bonusEarnings: player.bonusEarnings + earnings,
      currentRound: 3,
    };

    setPlayer(updatedPlayer);
    saveProgressToDB(updatedPlayer);
    setScreen('round3');
  };

  const handleRound3Complete = (score: number, bet: number) => {
    const correctCount = score;
    const wrongCount = 3 - correctCount; // Round 3 has 3 subrounds
    const earnings = correctCount * bet - wrongCount * bet;

    const newChips = player.chips + earnings;
    const updatedPlayer = {
      ...player,
      chips: newChips,
      round3Score: earnings,
      currentRound: 4, // Final bonus phase
    };
    setPlayer(updatedPlayer);
    saveProgressToDB(updatedPlayer);
    setScreen('bonus');
  };

  const handleBonusComplete = async (earnings: number) => {
    const finalChips = player.chips + earnings;
    const updatedPlayer = {
      ...player,
      chips: finalChips,
      bonusEarnings: player.bonusEarnings + earnings,
    };

    setPlayer(updatedPlayer);
    await saveProgressToDB(updatedPlayer);

    try {
      const res = await fetch(`${API_URL}/api/leaderboard`);
      const data = await res.json();
      if (data.success && data.leaderboard) {
        setLeaderboardEntries(data.leaderboard);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      // Fallback to local state if server fails
      const newEntry: LeaderboardEntry = {
        username: player.username,
        chips: finalChips,
        timestamp: Date.now(),
      };
      setLeaderboardEntries([...leaderboardEntries, newEntry]);
    }

    setScreen('leaderboard');
  };

  const handlePlayAgain = () => {
    setPlayer({
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username: '',
      chips: 50,
      round1Score: 0,
      round2Score: 0,
      round3Score: 0,
      bonusEarnings: 0,
      currentRound: 1,
      gameState: {},
    });
    setScreen('intro');
  };

  const handleChipUpdate = (chips: number) => {
    setPlayer(prev => ({ ...prev, chips }));
  };

  const showChipDisplay = ['round1', 'round2', 'round3', 'bonus'].includes(screen);

  // Render the game screen based on the current screen state
  const renderGameScreen = () => {
    switch (screen) {
      case 'intro':
        return <IntroScreen onStart={handleStartGame} />;
      case 'rules':
        return <RulesScreen onContinue={handleContinueFromRules} />;
      case 'username':
        return <UsernameScreen onSubmit={handleUsernameSubmit} />;
      case 'round1':
        return <Round1 currentChips={player.chips} onComplete={handleRound1Complete} />;
      case 'round2':
        return <Round2 currentChips={player.chips} onComplete={handleRound2Complete} />;
      case 'round3':
        return <Round3 currentChips={player.chips} onComplete={handleRound3Complete} username={player.username} />;
      case 'bonus':
        // Check if this is bonus after round 1, round 2, or round 3
        if (player.currentRound === 1.5) {
          return <BonusRounds currentChips={player.chips} onComplete={handleBonus1Complete} onChipUpdate={handleChipUpdate} currentRound={1.5} />;
        } else if (player.currentRound === 2.5) {
          return <BonusRounds currentChips={player.chips} onComplete={handleBonus2Complete} onChipUpdate={handleChipUpdate} currentRound={2.5} />;
        } else {
          return <BonusRounds currentChips={player.chips} onComplete={handleBonusComplete} onChipUpdate={handleChipUpdate} currentRound={3.5} />;
        }
      case 'leaderboard':
        return (
          <Leaderboard
            entries={leaderboardEntries}
            currentPlayer={{ username: player.username, chips: player.chips }}
            onPlayAgain={handlePlayAgain}
          />
        );
      default:
        return <IntroScreen onStart={handleStartGame} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-gray-900 text-white">
      {/* Main game routes */}
      <Routes>
        <Route path="/" element={
          <>
            {showChipDisplay && <ChipDisplay chips={player.chips} username={player.username} />}
            {renderGameScreen()}
          </>
        } />
        <Route path="/host" element={<HostChatInterface />} />
        <Route path="/operator-setup" element={<OperatorSetup />} />
      </Routes>
    </div>
  );
}

export default App;
