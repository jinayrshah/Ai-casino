import React, { useState, useEffect } from 'react';

interface MinesGameProps {
  onBack: () => void;
  onSelectBonusBet: (amount: number, gameType: string) => void;
  onChipUpdate: (chips: number) => void;
  selectedBet: number | null;
  result: string;
  currentChips: number;
}

interface Cell {
  index: number;
  revealed: boolean;
  isMine: boolean;
  content: string;
}

const MinesGame: React.FC<MinesGameProps> = ({ onBack, onSelectBonusBet, onChipUpdate, selectedBet, currentChips }) => {
  const [minesGrid, setMinesGrid] = useState<Cell[]>([]);
  const [mines, setMines] = useState<number[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const [diamondsFound, setDiamondsFound] = useState(0);
  const [hasDeductedBet, setHasDeductedBet] = useState(false);
  const [canCashOut, setCanCashOut] = useState(false);

  useEffect(() => {
    initGame();
  }, []);

  const initGame = () => {
    const gridSize = 25;
    const mineCount = 2; // Lowered from 5 to 2 so wipeouts are less common
    const newMines: number[] = [];

    // Place mines randomly
    while (newMines.length < mineCount) {
      const pos = Math.floor(Math.random() * gridSize);
      if (!newMines.includes(pos)) {
        newMines.push(pos);
      }
    }

    setMines(newMines);
    setGameOver(false);
    setGameWon(false);
    setRevealedCount(0);
    setDiamondsFound(0);
    setCanCashOut(false);
    setHasDeductedBet(false);

    // Create grid cells
    const grid: Cell[] = [];
    for (let i = 0; i < gridSize; i++) {
      grid.push({
        index: i,
        revealed: false,
        isMine: newMines.includes(i),
        content: ''
      });
    }
    setMinesGrid(grid);
  };

  const handleBetSelect = (amount: number) => {
    if (amount > currentChips) {
      alert(`You don't have enough chips! You need ${amount} chips but only have ${currentChips}.`);
      return;
    }

    // Deduct chips immediately when bet is placed
    console.log('MinesGame: Deducting', amount, 'chips for mines game');
    onChipUpdate(currentChips - amount);
    setHasDeductedBet(true);
    onSelectBonusBet(amount, 'mines');
  };

  const handleCellClick = (index: number) => {
    if (gameOver || gameWon || minesGrid[index].revealed || !selectedBet || !hasDeductedBet) return;

    const newGrid = [...minesGrid];
    newGrid[index].revealed = true;
    const newRevealedCount = revealedCount + 1;
    setRevealedCount(newRevealedCount);

    if (mines.includes(index)) {
      // Hit a mine - lose all chips
      newGrid[index].isMine = true;
      newGrid[index].content = '💣';
      setGameOver(true);

      // Reveal all mines
      mines.forEach(mineIndex => {
        newGrid[mineIndex].revealed = true;
        newGrid[mineIndex].isMine = true;
        newGrid[mineIndex].content = '💣';
      });

      // Lose all chips
      console.log('MinesGame: Player hit mine! Setting chips to 0');
      onChipUpdate(0);

      setMinesGrid(newGrid);
      return;
    } else {
      // Found a diamond - give immediate reward
      newGrid[index].content = '💎';
      const newDiamondsFound = diamondsFound + 1;
      setDiamondsFound(newDiamondsFound);
      setCanCashOut(true);

      // Give immediate chip reward for each diamond
      const diamondReward = Math.floor(selectedBet * 0.5); // 0.5x bet per diamond
      console.log('MinesGame: Found diamond! Awarding', diamondReward, 'chips');
      onChipUpdate(currentChips + diamondReward);

      setMinesGrid(newGrid);
    }
  };

  const handleCashOut = () => {
    if (!canCashOut || gameOver || gameWon) return;

    setGameWon(true);
    console.log('MinesGame: Player cashed out with', diamondsFound, 'diamonds found');
  };

  const getCellClass = (cell: Cell) => {
    let classes = 'w-16 h-16 flex items-center justify-center text-2xl font-bold border-2 transition-all duration-300 cursor-pointer select-none';

    if (cell.revealed) {
      if (cell.isMine) {
        classes += ' bg-gradient-to-br from-red-500 to-red-700 border-red-300 text-white shadow-lg transform scale-105';
      } else {
        classes += ' bg-gradient-to-br from-emerald-400 to-green-600 border-emerald-300 text-white shadow-lg transform scale-105';
      }
    } else {
      classes += ' bg-gradient-to-br from-slate-600 to-slate-700 border-slate-400 hover:from-slate-500 hover:to-slate-600 hover:border-slate-300 hover:shadow-md hover:scale-105 active:scale-95';
    }

    return classes;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-3xl w-full text-center">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 mb-8">
          <h2 className="text-5xl font-black text-white mb-4">Mines Game</h2>
          <p className="text-xl text-red-300 mb-8">Find all the gems and avoid the mines!</p>

          {/* Instructions */}
          <div className="bg-red-900/30 border border-red-400/30 rounded-xl p-6 mb-8">
            <h3 className="text-2xl font-bold text-white mb-3">How to Play:</h3>
            <div className="text-red-200 space-y-2 text-left">
              <p>1. Select your bet amount ($10, $20, or $30)</p>
              <p>2. Click on squares to reveal diamonds or mines</p>
              <p>3. Each diamond gives you 0.5x your bet instantly!</p>
              <p>4. Hit a mine and lose all your chips</p>
              <p>5. Cash out anytime to keep your winnings</p>
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
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">
                Progress: {diamondsFound} diamonds found
              </h3>
              {canCashOut && !gameOver && !gameWon && (
                <button
                  onClick={handleCashOut}
                  className="px-6 py-3 text-lg font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-full hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-green-500/30"
                >
                  CASH OUT ({Math.floor((selectedBet || 0) * 0.5 * diamondsFound)} chips)
                </button>
              )}
            </div>

            <div className="mines-grid grid grid-cols-5 gap-3 max-w-sm mx-auto mb-6 p-4 bg-slate-800/30 rounded-2xl border-2 border-slate-600/50 backdrop-blur-sm">
              {minesGrid.map((cell) => (
                <div
                  key={cell.index}
                  className={getCellClass(cell)}
                  onClick={() => handleCellClick(cell.index)}
                >
                  {cell.revealed ? (
                    <span className={`text-2xl ${cell.isMine ? 'animate-pulse' : 'drop-shadow-lg'}`}>
                      {cell.content}
                    </span>
                  ) : (
                    <span className="text-slate-300 text-xl font-bold">?</span>
                  )}
                </div>
              ))}
            </div>

            {/* Game Status */}
            {gameOver && (
              <div className="bg-red-900/50 border-2 border-red-400 text-red-300 text-2xl font-bold mb-6 p-6 rounded-xl">
                💥 Game Over! You hit a mine and lost all your chips! 💥
              </div>
            )}

            {gameWon && (
              <div className="bg-green-900/50 border-2 border-green-400 text-green-300 text-2xl font-bold mb-6 p-6 rounded-xl">
                <h3 className="text-3xl font-bold text-center">Congratulations!</h3>
                <div className="text-xl mt-2">
                  You secured {Math.floor((selectedBet || 0) * 0.5 * diamondsFound)} chips!
                </div>
              </div>
            )}

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
    </div>
  );
};

export default MinesGame;
