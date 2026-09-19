import React, { useRef, useState, useEffect } from 'react';

interface NeuralWheelProps {
  onBack: () => void;
  onSelectBonusBet: (amount: number, gameType: string) => void;
  onChipUpdate: (chips: number) => void;
  selectedBet: number | null;
  result: string;
  currentChips: number;
}

interface WheelSegment {
  color: string;
  result: string;
  multiplier: number;
  displayText: string;
}

const NeuralWheel: React.FC<NeuralWheelProps> = ({ onBack, onChipUpdate, currentChips }) => {
  const wheelRef = useRef<SVGSVGElement>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [wheelResult, setWheelResult] = useState<WheelSegment | null>(null);


  const wheelSegments: WheelSegment[] = [
    { color: '#FF6B6B', result: 'Lose Turn', multiplier: 0, displayText: 'LOSE' },
    { color: '#4ECDC4', result: '50 Points', multiplier: 50, displayText: '50' },
    { color: '#45B7D1', result: '20 Points', multiplier: 20, displayText: '20' },
    { color: '#96CEB4', result: '30 Points', multiplier: 30, displayText: '30' },
    { color: '#FFEAA7', result: '10 Points', multiplier: 10, displayText: '10' },
    { color: '#DDA0DD', result: 'Jackpot!', multiplier: 100, displayText: '100' },
    { color: '#FF7675', result: 'Try Again', multiplier: 0, displayText: 'TRY' },
    { color: '#74B9FF', result: '40 Points', multiplier: 40, displayText: '40' },
  ];

  // Debug logging
  useEffect(() => {
    console.log('NeuralWheel: Component mounted with', wheelSegments.length, 'segments');
    console.log('NeuralWheel: Wheel segments:', wheelSegments);
  }, []);

  useEffect(() => {
    console.log('NeuralWheel: isSpinning changed to', isSpinning);
  }, [isSpinning]);

  useEffect(() => {
    console.log('NeuralWheel: wheelResult changed to', wheelResult);
  }, [wheelResult]);

  useEffect(() => {
    console.log('NeuralWheel: Component is rendering');
  });

  useEffect(() => {
    console.log('NeuralWheel: Wheel segments loaded:', wheelSegments);
  }, []);

  const handleSpin = () => {
    if (isSpinning || hasSpun) return;

    console.log('NeuralWheel: Starting spin');
    setIsSpinning(true);

    setWheelResult(null);
    setHasSpun(true); // Prevent multiple spins

    // Generate a random spin (multiple rotations plus a random segment)
    const spins = 5 + Math.random() * 3; // 5-8 full rotations for more unpredictability
    const degreesPerSegment = 360 / wheelSegments.length;
    const randomSegment = Math.floor(Math.random() * wheelSegments.length);
    const totalDegrees = spins * 360 + randomSegment * degreesPerSegment;

    console.log('NeuralWheel: Spinning to segment', randomSegment, 'with total degrees:', totalDegrees);

    // Apply the rotation
    if (wheelRef.current) {
      // Force a style recalculation
      wheelRef.current.style.transform = 'rotate(0deg)';

      // Use requestAnimationFrame to ensure the style is applied before starting the animation
      requestAnimationFrame(() => {
        if (wheelRef.current) {
          wheelRef.current.style.transition = 'transform 4s cubic-bezier(0.2, 0.8, 0.3, 1)';
          wheelRef.current.style.transform = `rotate(${totalDegrees}deg)`;
          console.log('NeuralWheel: Applied rotation transform');
        }
      });
    }

    // After the animation, determine the result
    setTimeout(() => {
      const result = wheelSegments[randomSegment];
      console.log('NeuralWheel: Spin result:', result);
      setWheelResult(result);

      setIsSpinning(false);

      // Calculate and update earnings (no chip deduction for free play)
      let earnings = 0;
      if (result.multiplier > 0) {
        earnings = result.multiplier; // Use the actual multiplier value
        console.log('NeuralWheel: Free spin! Awarding', earnings, 'chips for', result.result);
        onChipUpdate(currentChips + earnings);
      } else {
        console.log('NeuralWheel: No earnings for', result.result, '- multiplier:', result.multiplier);
      }
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-yellow-900 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <h2 className="text-5xl font-black text-white mb-8">Neural Wheel</h2>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 mb-8">
          {/* Instructions */}
          <div className="bg-yellow-900/30 border border-yellow-400/30 rounded-xl p-6 mb-8">
            <h3 className="text-2xl font-bold text-white mb-3">How to Play:</h3>
            <div className="text-yellow-200 space-y-2 text-left">
              <p>1. Spin the wheel to win instant rewards</p>
              <p>2. Different segments give different chip amounts</p>
              <p>3. Jackpot gives the biggest reward!</p>
              <p>4. You can only play this once per bonus round</p>
            </div>
          </div>

          {/* Simple wheel with segments */}
          <div className="relative w-80 h-80 mx-auto mb-8 bg-gray-800 rounded-full border-4 border-gray-600 flex items-center justify-center">
            {wheelSegments.length > 0 ? (
              <svg
                ref={wheelRef}
                className="w-full h-full"
                viewBox="0 0 400 400"
                style={{
                  transformOrigin: 'center',
                  transition: isSpinning ? 'transform 4s cubic-bezier(0.2, 0.8, 0.3, 1)' : 'none'
                }}
              >
                {wheelSegments.map((segment, index) => {
                  const angle = (360 / wheelSegments.length) * index;
                  const nextAngle = (360 / wheelSegments.length) * (index + 1);

                  // Convert angles to radians for calculations
                  const startAngleRad = (angle * Math.PI) / 180;
                  const endAngleRad = (nextAngle * Math.PI) / 180;

                  // Calculate path coordinates
                  const outerRadius = 150;
                  const x1 = 200 + outerRadius * Math.cos(startAngleRad);
                  const y1 = 200 + outerRadius * Math.sin(startAngleRad);
                  const x2 = 200 + outerRadius * Math.cos(endAngleRad);
                  const y2 = 200 + outerRadius * Math.sin(endAngleRad);

                  return (
                    <g key={index}>
                      {/* Segment background */}
                      <path
                        d={`M 200 200 L ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 0 1 ${x2} ${y2} Z`}
                        fill={segment.color}
                        stroke="#333"
                        strokeWidth="2"
                      />

                      {/* Text label */}
                      <text
                        x={200 + 100 * Math.cos((angle + (360 / wheelSegments.length) / 2) * Math.PI / 180)}
                        y={200 + 100 * Math.sin((angle + (360 / wheelSegments.length) / 2) * Math.PI / 180)}
                        fill="white"
                        fontSize="16"
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        {segment.displayText}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="text-white text-center">
                <div className="text-2xl mb-4">Loading Wheel...</div>
                <div className="text-sm opacity-75">Segments: {wheelSegments.length}</div>
              </div>
            )}

            {/* Pointer */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
              <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-yellow-400 drop-shadow-lg"></div>
            </div>

            {/* Center circle */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full w-32 h-32 flex items-center justify-center shadow-lg">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                  <span className="text-yellow-600 font-black text-sm">SPIN</span>
                </div>
              </div>
            </div>

            {/* Spin animation overlay */}
            {isSpinning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full z-20">
                <div className="text-white text-xl font-bold animate-pulse">Spinning...</div>
              </div>
            )}
          </div>

          {wheelResult && (
            <div className="bg-black/50 rounded-xl p-6 mb-6">
              <p className="text-3xl font-bold mb-2" style={{ color: wheelResult.color }}>
                {wheelResult.result}
              </p>
              <p className="text-white/60 text-lg">
                {wheelResult.multiplier > 0
                  ? `You won ${wheelResult.multiplier} chips!`
                  : 'Better luck next time!'}
              </p>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            {!isSpinning && !wheelResult && (
              <button
                onClick={handleSpin}
                disabled={hasSpun}
                className={`px-12 py-5 text-2xl font-bold text-white bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full hover:scale-110 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                SPIN WHEEL
              </button>
            )}

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

export default NeuralWheel;
