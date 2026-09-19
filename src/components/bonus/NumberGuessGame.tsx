import React, { useState, useEffect, useCallback } from 'react';

interface NumberGuessGameProps {
  onBack: () => void;
  onSelectBonusBet: (amount: number, gameType: string) => void;
  onChipUpdate: (chips: number) => void;
  selectedBet: number | null;
  result: string;
  currentChips: number;
}

const NumberGuessGame: React.FC<NumberGuessGameProps> = ({
  onBack,
  onSelectBonusBet,
  onChipUpdate,
  selectedBet,
  currentChips,
}) => {
  const [targetNumber, setTargetNumber] = useState<number>(0);
  const [userGuess, setUserGuess] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('');
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [attempts, setAttempts] = useState<number>(0);
  const [hasDeductedBet, setHasDeductedBet] = useState(false);

  const maxAttempts = 5;

  const handleBetSelect = (amount: number) => {
    if (amount > currentChips) {
      alert(`You don't have enough chips! You need ${amount} chips but only have ${currentChips}.`);
      return;
    }

    // Deduct chips immediately when bet is placed
    console.log('NumberGuessGame: Deducting', amount, 'chips for number guess game');
    onChipUpdate(currentChips - amount);
    setHasDeductedBet(true);
    onSelectBonusBet(amount, 'number');
  };

  const startNewGame = useCallback(() => {
    const newTarget = Math.floor(Math.random() * 10) + 1;
    setTargetNumber(newTarget);
    setUserGuess(null);
    setMessage('Guess a number between 1 and 10');
    setGameOver(false);
    setAttempts(0);
    setHasDeductedBet(false);
    onSelectBonusBet(0, 'number'); // Reset selected bet
  }, []);

  const handleGuess = useCallback((guess: number) => {
    if (gameOver || !selectedBet || !hasDeductedBet) return;

    const newAttempts = attempts + 1;
    setUserGuess(guess);
    setAttempts(newAttempts);

    if (guess === targetNumber) {
      const winnings = selectedBet * 2;
      setMessage(`Correct! You won $${winnings}!`);
      onChipUpdate(currentChips + winnings);
      setGameOver(true);
    } else if (newAttempts >= maxAttempts) {
      setMessage(`Game Over! The number was ${targetNumber}`);
      setGameOver(true);
    } else {
      setMessage(guess > targetNumber ? 'Try lower!' : 'Try higher!');
    }
  }, [attempts, gameOver, onSelectBonusBet, selectedBet, targetNumber, hasDeductedBet, onChipUpdate, currentChips]);

  const renderNumberButtons = () => {
    return Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
      <button
        key={num}
        onClick={() => handleGuess(num)}
        disabled={gameOver}
        className={`w-16 h-16 m-2 rounded-full text-xl font-bold transition-all duration-200 ${
          userGuess === num
            ? 'bg-green-600 text-white scale-110 ring-4 ring-green-400'
            : 'bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 hover:scale-105'
        } ${gameOver ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {num}
      </button>
    ));
  };

  // Initialize the game on component mount
  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-3xl w-full text-center">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 mb-8">
          <h2 className="text-5xl font-black text-white mb-4">Number Guess</h2>
          <p className="text-xl text-green-300 mb-8">Guess the secret number and win!</p>

          {/* Instructions */}
          <div className="bg-green-900/30 border border-green-400/30 rounded-xl p-6 mb-8">
            <h3 className="text-2xl font-bold text-white mb-3">How to Play:</h3>
            <div className="text-green-200 space-y-2 text-left">
              <p>1. Select your bet amount ($10, $20, or $30)</p>
              <p>2. Guess a number between 1-10</p>
              <p>3. You have 5 attempts to guess correctly</p>
              <p>4. Win 2x your bet if you guess correctly!</p>
            </div>
          </div>

          {/* Betting Options */}
          {!hasDeductedBet && (
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-4">Select Your Bet</h3>
              <div className="flex gap-4 justify-center">
                <button
                  className={`px-8 py-4 rounded-xl font-bold text-xl transition-all ${
                    selectedBet === 10
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg scale-105'
                      : 'bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 hover:scale-105'
                  } ${currentChips < 10 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => currentChips >= 10 && handleBetSelect(10)}
                  disabled={currentChips < 10}
                >
                  $10
                </button>
                <button
                  className={`px-8 py-4 rounded-xl font-bold text-xl transition-all ${
                    selectedBet === 20
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg scale-105'
                      : 'bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 hover:scale-105'
                  } ${currentChips < 20 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => currentChips >= 20 && handleBetSelect(20)}
                  disabled={currentChips < 20}
                >
                  $20
                </button>
                <button
                  className={`px-8 py-4 rounded-xl font-bold text-xl transition-all ${
                    selectedBet === 30
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg scale-105'
                      : 'bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 hover:scale-105'
                  } ${currentChips < 30 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => currentChips >= 30 && handleBetSelect(30)}
                  disabled={currentChips < 30}
                >
                  $30
                </button>
              </div>
            </div>
          )}

          {/* Game Area */}
          <div className="mb-8">
            <div className="flex justify-center items-center mb-6">
              <div className="text-white text-xl">
                Attempts: {attempts} / {maxAttempts}
              </div>
            </div>

            {selectedBet && hasDeductedBet && (
              <div className="mb-6">
                <p className="text-xl font-semibold text-white mb-4">
                  Guess a number between 1 and 10
                </p>
              </div>
            )}

            {hasDeductedBet && (
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {renderNumberButtons()}
              </div>
            )}

            {message && (
              <div
                className={`text-lg font-semibold my-4 p-4 rounded-xl ${
                  gameOver && userGuess === targetNumber
                    ? 'bg-green-900/50 border-2 border-green-400 text-green-300'
                    : gameOver
                      ? 'bg-red-900/50 border-2 border-red-400 text-red-300'
                      : 'bg-blue-900/50 border-2 border-blue-400 text-blue-300'
                }`}
              >
                {message}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={onBack}
              className="px-8 py-4 text-xl font-bold text-white bg-gradient-to-r from-gray-500 to-gray-600 rounded-full hover:scale-110 transition-all duration-300"
            >
              BACK TO MENU
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NumberGuessGame;
