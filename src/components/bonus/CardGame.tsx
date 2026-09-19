import React, { useState, useEffect } from 'react';

interface CardGameProps {
  onBack: () => void;
  onSelectBonusBet: (amount: number, gameType: string) => void;
  onChipUpdate: (chips: number) => void;
  selectedBet: number | null;
  result: string;
  currentChips: number;
}

const CardGame: React.FC<CardGameProps> = ({ onBack, onSelectBonusBet, onChipUpdate, selectedBet, currentChips }) => {
  const [winningCard, setWinningCard] = useState('');
  const [selectedCard, setSelectedCard] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [hasDeductedBet, setHasDeductedBet] = useState(false);

  useEffect(() => {
    initGame();
  }, []);

  const initGame = () => {
    const newWinningCard = Math.random() > 0.5 ? 'spade' : 'heart';
    setWinningCard(newWinningCard);
    setSelectedCard('');
    setShowResult(false);
    setHasDeductedBet(false);
  };

  const handleBetSelect = (amount: number) => {
    if (amount > currentChips) {
      alert(`You don't have enough chips! You need ${amount} chips but only have ${currentChips}.`);
      return;
    }

    // Deduct chips immediately when bet is placed
    console.log('CardGame: Deducting', amount, 'chips for card game');
    onChipUpdate(currentChips - amount);
    setHasDeductedBet(true);
    onSelectBonusBet(amount, 'card');
  };

  const handleCardSelect = (cardType: string) => {
    if (!selectedBet || showResult || !hasDeductedBet) return;

    setSelectedCard(cardType);
    setShowResult(true);

    // Check if player won and reward chips
    if (cardType === winningCard) {
      const winnings = selectedBet * 2;
      console.log('CardGame: Player won! Awarding', winnings, 'chips');
      onChipUpdate(currentChips + winnings); // Current chips already had bet deducted
    }
  };

  const getCardClass = (cardType: string) => {
    let classes = 'w-32 h-48 flex items-center justify-center text-6xl rounded-xl m-4 transition-all duration-300 cursor-pointer border-4';
    if (showResult) {
      if (cardType === 'spade') {
        classes += ' bg-black text-white border-gray-800';
      } else {
        classes += ' bg-red-600 text-white border-red-800';
      }
      if (cardType === selectedCard) {
        classes += selectedCard === winningCard
          ? ' ring-4 ring-green-400 shadow-lg shadow-green-400/50'
          : ' ring-4 ring-red-400 shadow-lg shadow-red-400/50';
      }
    } else {
      classes += ' bg-gradient-to-br from-gray-800 to-gray-900 text-gray-400 hover:from-gray-700 hover:to-gray-800 border-gray-600 hover:border-gray-400';
    }
    return classes;
  };

  const getCardContent = (cardType: string) => {
    if (!showResult) return '?';
    return cardType === 'spade' ? '♠' : '♥';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 mb-8">
          <h2 className="text-5xl font-black text-white mb-4">Card Flip</h2>
          <p className="text-xl text-purple-300 mb-8">Choose a card and try to match the winning card!</p>

          {/* Instructions */}
          <div className="bg-purple-900/30 border border-purple-400/30 rounded-xl p-6 mb-8">
            <h3 className="text-2xl font-bold text-white mb-3">How to Play:</h3>
            <div className="text-purple-200 space-y-2 text-left">
              <p>1. Select your bet amount ($10, $20, or $30)</p>
              <p>2. Click on one of the cards to flip it</p>
              <p>3. If your card matches the winning card, you win 2x your bet!</p>
              <p>4. The winning card is randomly chosen each game</p>
            </div>
          </div>

          {/* Betting Options */}
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

          {/* Game Area */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-6">Flip a Card!</h3>
            <div className="flex justify-center items-center">
              <div
                className={getCardClass('spade')}
                onClick={() => handleCardSelect('spade')}
              >
                {getCardContent('spade')}
              </div>
              <div
                className={getCardClass('heart')}
                onClick={() => handleCardSelect('heart')}
              >
                {getCardContent('heart')}
              </div>
            </div>
          </div>

          {/* Result Display */}
          {showResult && (
            <div className={`text-3xl font-bold mb-6 p-6 rounded-xl ${
              selectedCard === winningCard
                ? 'bg-green-900/50 border-2 border-green-400 text-green-300'
                : 'bg-red-900/50 border-2 border-red-400 text-red-300'
            }`}>
              {selectedCard === winningCard ? '🎉 You Won! 🎉' : '😔 You Lost! 😔'}
              <div className="text-xl mt-2">
                {selectedCard === winningCard
                  ? `You won $${selectedBet ? selectedBet * 2 : 0} chips!`
                  : 'Better luck next time!'}
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
  );
};

export default CardGame;
