import React, { useState, useEffect } from 'react';

interface DataPatternGameProps {
  onBack: () => void;
  onSelectBonusBet: (amount: number, gameType: string) => void;
  onChipUpdate: (chips: number) => void;
  selectedBet: number | null;
  result: string;
  currentChips: number;
}

const DataPatternGame: React.FC<DataPatternGameProps> = ({ onBack, onChipUpdate, currentChips }) => {
  const [pattern, setPattern] = useState('');
  const [answer, setAnswer] = useState('');
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    initGame();
  }, []);

  const initGame = () => {
    const patterns = [
      { pattern: '101?101', answer: '0' },
      { pattern: '110?11', answer: '0' },
      { pattern: '01?010', answer: '1' },
      { pattern: '111?111', answer: '1' },
      { pattern: '00?000', answer: '0' }
    ];

    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    setPattern(selectedPattern.pattern);
    setAnswer(selectedPattern.answer);
    setUserInput('');
    setShowResult(false);
    setHasPlayed(false);
  };

  const handleSubmit = () => {
    if (hasPlayed) return;

    setShowResult(true);
    setHasPlayed(true);

    // Award chips for correct answer (free play)
    if (isCorrect) {
      const earnings = 10; // Fixed reward for correct answer
      console.log('DataPatternGame: Awarding', earnings, 'chips for correct answer');
      onChipUpdate(currentChips + earnings);
    }
  };

  const getRewardMessage = () => {
    if (!isCorrect) return "Try again next time!";

    return "Correct! You earned 10 chips!";
  };

  const getPatternDisplay = () => {
    if (!showResult) return pattern;
    return pattern.replace('?', answer);
  };

  const isCorrect = userInput === answer;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 mb-8">
          <h2 className="text-5xl font-black text-white mb-4">Data Dash</h2>
          <p className="text-xl text-cyan-300 mb-8">Complete the binary pattern!</p>

          {/* Instructions */}
          <div className="bg-cyan-900/30 border border-cyan-400/30 rounded-xl p-6 mb-8">
            <h3 className="text-2xl font-bold text-white mb-3">How to Play:</h3>
            <div className="text-cyan-200 space-y-2 text-left">
              <p>1. Look at the binary pattern with a missing digit (?)</p>
              <p>2. Figure out what digit (0 or 1) completes the pattern</p>
              <p>3. Enter your answer and submit</p>
              <p>4. Correct answer wins 10 chips!</p>
            </div>
          </div>

          {/* Game Area */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-6">Complete the Pattern</h3>

            <div className="text-6xl font-mono mb-8 text-cyan-400 bg-black/30 rounded-xl p-6">
              {getPatternDisplay()}
            </div>

            <div className="flex flex-col items-center">
              <label htmlFor="patternInput" className="block text-xl mb-4 text-white">
                Enter the missing digit (0 or 1):
              </label>
              <input
                id="patternInput"
                type="text"
                className="w-24 text-4xl p-4 text-center rounded-xl border-2 border-cyan-400 focus:border-cyan-300 focus:outline-none bg-white/10 text-white font-mono"
                maxLength={1}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value.replace(/[^01]/g, ''))}
                placeholder="?"
                disabled={showResult}
              />

              {!showResult && (
                <button
                  onClick={handleSubmit}
                  disabled={!userInput || hasPlayed}
                  className="mt-6 px-8 py-4 text-xl font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full hover:scale-110 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  SUBMIT ANSWER
                </button>
              )}
            </div>

            {/* Result Display */}
            {showResult && (
              <div className={`text-3xl font-bold mb-6 p-6 rounded-xl mt-8 ${
                isCorrect
                  ? 'bg-green-900/50 border-2 border-green-400 text-green-300'
                  : 'bg-red-900/50 border-2 border-red-400 text-red-300'
              }`}>
                {isCorrect ? '🎉 Correct! 🎉' : '❌ Incorrect! ❌'}
                <div className="text-xl mt-2">
                  {getRewardMessage()}
                </div>
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

export default DataPatternGame;
