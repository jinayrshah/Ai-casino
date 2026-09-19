import React, { useState } from 'react';

interface DiceGameProps {
  onBack: () => void;
  onSelectBonusBet: (amount: number, gameType: string) => void;
  onChipUpdate: (chips: number) => void;
  selectedBet: number | null;
  result: string;
  currentChips: number;
}

const DiceGame: React.FC<DiceGameProps> = ({ onBack, onSelectBonusBet, onChipUpdate, selectedBet, currentChips }) => {
  const [dice1, setDice1] = useState<number | string>('?');
  const [dice2, setDice2] = useState<number | string>('?');
  const [rolling, setRolling] = useState(false);
  const [userGuess, setUserGuess] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [hasDeductedBet, setHasDeductedBet] = useState(false);

  const handleBetSelect = (amount: number) => {
    if (amount > currentChips) {
      alert(`You don't have enough chips! You need ${amount} chips but only have ${currentChips}.`);
      return;
    }

    // Deduct chips immediately when bet is placed
    console.log('DiceGame: Deducting', amount, 'chips for dice game');
    onChipUpdate(currentChips - amount);
    setHasDeductedBet(true);
    onSelectBonusBet(amount, 'dice');
  };

  const handleRoll = () => {
    if (!selectedBet || rolling || !userGuess || !hasDeductedBet) return;

    const guess = parseInt(userGuess);
    if (isNaN(guess) || guess < 2 || guess > 12) {
      alert('Please enter a valid sum between 2 and 12!');
      return;
    }

    setRolling(true);
    setShowResult(false);

    // Animate dice
    let rolls = 0;
    const rollInterval = setInterval(() => {
      setDice1(prev => typeof prev === 'string' ? 1 : (prev % 6) + 1);
      setDice2(prev => typeof prev === 'string' ? 6 : (prev % 6) + 1);
      rolls++;

      if (rolls > 10) {
        clearInterval(rollInterval);
        const newDice1 = Math.floor(Math.random() * 6) + 1;
        const newDice2 = Math.floor(Math.random() * 6) + 1;
        const sum = newDice1 + newDice2;

        setDice1(newDice1);
        setDice2(newDice2);
        setRolling(false);
        setShowResult(true);

        // Check if player won and reward chips
        if (sum === guess) {
          const winnings = selectedBet * 3; // 3x payout for correct guess
          console.log('DiceGame: Player won! Awarding', winnings, 'chips');
          onChipUpdate(currentChips + winnings);
          setIsWin(true);
        } else {
          setIsWin(false);
        }
      }
    }, 100);
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 mb-8">
          <h2 className="text-5xl font-black text-white mb-4">Dice Roll</h2>
          <p className="text-xl text-indigo-300 mb-8">Guess the sum of two dice!</p>

          {/* Instructions */}
          <div className="bg-indigo-900/30 border border-indigo-400/30 rounded-xl p-6 mb-8">
            <h3 className="text-2xl font-bold text-white mb-3">How to Play:</h3>
            <div className="text-indigo-200 space-y-2 text-left">
              <p>1. Select your bet amount ($10, $20, or $30)</p>
              <p>2. Guess what the sum of two dice will be (2-12)</p>
              <p>3. Watch the dice roll and see if you're right!</p>
              <p>4. Correct guess wins 3x your bet!</p>
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
            <h3 className="text-2xl font-bold text-white mb-6">Guess the Sum (2-12)</h3>

            {hasDeductedBet && (
              <div className="my-8 text-center">
                <label htmlFor="diceSumInput" className="block text-xl mb-2 text-white">
                  Your Guess:
                </label>
                <input
                  type="number"
                  id="diceSumInput"
                  className="w-24 text-2xl p-2 text-center rounded border-2 border-indigo-400 focus:border-indigo-300 focus:outline-none bg-white/10 text-white"
                  min="2"
                  max="12"
                  value={userGuess}
                  onChange={(e) => setUserGuess(e.target.value)}
                  disabled={rolling}
                  placeholder="?"
                />
              </div>
            )}

            <div className="flex justify-center items-center my-8">
              <div className={`dice ${rolling ? 'dice-rolling' : ''} mx-4 ${showResult ? 'bg-white text-black' : 'bg-gray-800 text-white'}`}>
                {dice1}
              </div>
              <div className={`dice ${rolling ? 'dice-rolling' : ''} mx-4 ${showResult ? 'bg-white text-black' : 'bg-gray-800 text-white'}`}>
                {dice2}
              </div>
            </div>

            {/* Result Display */}
            {showResult && (
              <div className={`text-3xl font-bold mb-6 p-6 rounded-xl ${
                isWin
                  ? 'bg-green-900/50 border-2 border-green-400 text-green-300'
                  : 'bg-red-900/50 border-2 border-red-400 text-red-300'
              }`}>
                {isWin ? '🎉 You Won! 🎉' : '😔 You Lost! 😔'}
                <div className="text-xl mt-2">
                  {isWin
                    ? `You won $${selectedBet ? selectedBet * 3 : 0} chips!`
                    : `Sum was ${parseInt(dice1.toString()) + parseInt(dice2.toString())}`}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              {hasDeductedBet && !showResult && (
                <button
                  onClick={handleRoll}
                  disabled={rolling || !userGuess}
                  className="px-8 py-4 text-xl font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full hover:scale-110 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rolling ? 'ROLLING...' : 'ROLL DICE'}
                </button>
              )}


              <button
                onClick={onBack}
                className="px-8 py-4 text-xl font-bold text-white bg-gradient-to-r from-slate-500 to-slate-600 rounded-full hover:scale-110 transition-all duration-300"
              >
                BACK TO MENU
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiceGame;
