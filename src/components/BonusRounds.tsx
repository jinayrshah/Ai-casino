import { useState } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import { NeuralWheel, DataPatternGame, CardGame, DiceGame, MinesGame, NumberGuessGame } from './bonus';

interface BonusRoundsProps {
  currentChips: number;
  onComplete: (earnings: number) => void;
  onChipUpdate: (chips: number) => void;
  currentRound?: number;
}

export default function BonusRounds({ currentChips, onComplete, onChipUpdate, currentRound }: BonusRoundsProps) {
  const [screen, setScreen] = useState<'menu' | 'wheel' | 'cardgame' | 'datadash' | 'dicegame' | 'minesgame' | 'numberguess' | 'results'>('menu');
  const [selectedBet, setSelectedBet] = useState<number | null>(null);

  const [playedGames, setPlayedGames] = useState<Set<string>>(new Set());

  const handleSelectBonusBet = (amount: number, _gameType?: string) => {
    setSelectedBet(amount);
  };

  const markGameAsPlayed = (gameName: string) => {
    setPlayedGames(prev => new Set([...prev, gameName]));
  };

  const handleWheelBack = () => {
    setScreen('menu');
    setSelectedBet(null);

    markGameAsPlayed('wheel');
  };

  const handleCardGameBack = () => {
    setScreen('menu');
    setSelectedBet(null);
    markGameAsPlayed('cardgame');
  };

  const handleDataDashBack = () => {
    setScreen('menu');
    setSelectedBet(null);
    markGameAsPlayed('datadash');
  };

  const handleDiceGameBack = () => {
    setScreen('menu');
    setSelectedBet(null);
    markGameAsPlayed('dicegame');
  };

  const handleMinesGameBack = () => {
    setScreen('menu');
    setSelectedBet(null);
    markGameAsPlayed('minesgame');
  };

  const handleNumberGuessBack = () => {
    setScreen('menu');
    setSelectedBet(null);
    markGameAsPlayed('numberguess');
  };

  if (screen === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-yellow-900 to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-3xl w-full text-center">
          <h1 className="text-6xl font-black text-white mb-4">BONUS ROUNDS</h1>
          <p className="text-2xl text-yellow-400 mb-12">Risk it for the biscuit!</p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Round 1: Neural Wheel and Card Game */}
            {currentRound === 1.5 && (
              <>
                <button
                  onClick={() => setScreen('wheel')}
                  disabled={playedGames.has('wheel')}
                  className={`bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-2xl p-8 hover:scale-105 transition-all duration-300 group ${
                    playedGames.has('wheel')
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:scale-105'
                  }`}
                >
                  <Sparkles className="text-yellow-400 mx-auto mb-4 group-hover:scale-110 transition-transform" size={48} />
                  <h3 className="text-2xl font-bold text-white mb-2">Neural Wheel</h3>
                  <p className="text-white/60 mb-4">Spin for instant rewards</p>
                  <div className="bg-black/30 rounded-lg p-3">
                    <p className="text-yellow-400 font-bold text-xl">FREE TO PLAY</p>
                  </div>
                </button>

                <button
                  onClick={() => setScreen('cardgame')}
                  disabled={playedGames.has('cardgame')}
                  className={`bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/50 rounded-2xl p-8 hover:scale-105 transition-all duration-300 group ${
                    playedGames.has('cardgame')
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:scale-105'
                  }`}
                >
                  <Zap className="text-cyan-400 mx-auto mb-4 group-hover:scale-110 transition-transform" size={48} />
                  <h3 className="text-2xl font-bold text-white mb-2">Card Game</h3>
                  <p className="text-white/60 mb-4">Beat the dealer</p>
                  <div className="bg-black/30 rounded-lg p-3">
                    <p className="text-cyan-400 font-bold text-xl">PLAY NOW</p>
                  </div>
                </button>
              </>
            )}

            {/* Round 2: Data Dash and Dice Game */}
            {currentRound === 2.5 && (
              <>
                <button
                  onClick={() => setScreen('datadash')}
                  disabled={playedGames.has('datadash')}
                  className={`bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/50 rounded-2xl p-8 hover:scale-105 transition-all duration-300 group ${
                    playedGames.has('datadash')
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:scale-105'
                  }`}
                >
                  <Zap className="text-cyan-400 mx-auto mb-4 group-hover:scale-110 transition-transform" size={48} />
                  <h3 className="text-2xl font-bold text-white mb-2">Data Dash</h3>
                  <p className="text-white/60 mb-4">Solve the pattern</p>
                  <div className="bg-black/30 rounded-lg p-3">
                    <p className="text-cyan-400 font-bold text-xl">FREE TO PLAY</p>
                  </div>
                </button>

                <button
                  onClick={() => setScreen('dicegame')}
                  disabled={playedGames.has('dicegame')}
                  className={`bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 rounded-2xl p-8 hover:scale-105 transition-all duration-300 group ${
                    playedGames.has('dicegame')
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:scale-105'
                  }`}
                >
                  <Zap className="text-purple-400 mx-auto mb-4 group-hover:scale-110 transition-transform" size={48} />
                  <h3 className="text-2xl font-bold text-white mb-2">Dice Game</h3>
                  <p className="text-white/60 mb-4">Roll for rewards</p>
                  <div className="bg-black/30 rounded-lg p-3">
                    <p className="text-purple-400 font-bold text-xl">PLAY NOW</p>
                  </div>
                </button>
              </>
            )}

            {/* Round 3: Mines Game and Number Guess */}
            {currentRound !== 1.5 && currentRound !== 2.5 && (
              <>
                <button
                  onClick={() => setScreen('minesgame')}
                  disabled={playedGames.has('minesgame')}
                  className={`bg-gradient-to-br from-red-500/20 to-orange-500/20 border-2 border-red-500/50 rounded-2xl p-8 hover:scale-105 transition-all duration-300 group ${
                    playedGames.has('minesgame')
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:scale-105'
                  }`}
                >
                  <Zap className="text-red-400 mx-auto mb-4 group-hover:scale-110 transition-transform" size={48} />
                  <h3 className="text-2xl font-bold text-white mb-2">Mines Game</h3>
                  <p className="text-white/60 mb-4">Avoid the mines</p>
                  <div className="bg-black/30 rounded-lg p-3">
                    <p className="text-red-400 font-bold text-xl">PLAY NOW</p>
                  </div>
                </button>

                <button
                  onClick={() => setScreen('numberguess')}
                  disabled={playedGames.has('numberguess')}
                  className={`bg-gradient-to-br from-green-500/20 to-teal-500/20 border-2 border-green-500/50 rounded-2xl p-8 hover:scale-105 transition-all duration-300 group ${
                    playedGames.has('numberguess')
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:scale-105'
                  }`}
                >
                  <Zap className="text-green-400 mx-auto mb-4 group-hover:scale-110 transition-transform" size={48} />
                  <h3 className="text-2xl font-bold text-white mb-2">Number Guess</h3>
                  <p className="text-white/60 mb-4">Guess the number</p>
                  <div className="bg-black/30 rounded-lg p-3">
                    <p className="text-green-400 font-bold text-xl">PLAY NOW</p>
                  </div>
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => onComplete(0)}
            className="px-12 py-5 text-2xl font-bold text-white bg-gradient-to-r from-green-500 to-emerald-500 rounded-full hover:scale-110 transition-all duration-300 hover:shadow-[0_0_40px_RGBA(0,255,0,0.6)]"
          >
            SKIP TO RESULTS
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'wheel') {
    return (
      <NeuralWheel
        onBack={handleWheelBack}
        onSelectBonusBet={handleSelectBonusBet}
        onChipUpdate={onChipUpdate}
        selectedBet={selectedBet}
        result=""
        currentChips={currentChips}
      />
    );
  }

  if (screen === 'datadash') {
    return (
      <DataPatternGame
        onBack={handleDataDashBack}
        onSelectBonusBet={handleSelectBonusBet}
        onChipUpdate={onChipUpdate}
        selectedBet={selectedBet}
        result=""
        currentChips={currentChips}
      />
    );
  }

  if (screen === 'cardgame') {
    return (
      <CardGame
        onBack={handleCardGameBack}
        onSelectBonusBet={handleSelectBonusBet}
        onChipUpdate={onChipUpdate}
        selectedBet={selectedBet}
        result=""
        currentChips={currentChips}
      />
    );
  }

  if (screen === 'dicegame') {
    return (
      <DiceGame
        onBack={handleDiceGameBack}
        onSelectBonusBet={handleSelectBonusBet}
        onChipUpdate={onChipUpdate}
        selectedBet={selectedBet}
        result=""
        currentChips={currentChips}
      />
    );
  }

  if (screen === 'minesgame') {
    return (
      <MinesGame
        onBack={handleMinesGameBack}
        onSelectBonusBet={handleSelectBonusBet}
        onChipUpdate={onChipUpdate}
        selectedBet={selectedBet}
        result=""
        currentChips={currentChips}
      />
    );
  }

  if (screen === 'numberguess') {
    return (
      <NumberGuessGame
        onBack={handleNumberGuessBack}
        onSelectBonusBet={handleSelectBonusBet}
        onChipUpdate={onChipUpdate}
        selectedBet={selectedBet}
        result=""
        currentChips={currentChips}
      />
    );
  }

  return null;
}