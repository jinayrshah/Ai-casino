import { useState, useEffect } from 'react';
import { Image as ImageIcon, Sparkles, Send } from 'lucide-react';
import { BetAmount } from '../types';
import BettingPanel from './BettingPanel';
import { generateImage, GeneratedImage } from '../services/huggingFaceService';

interface Round1Props {
  currentChips: number;
  onComplete: (score: number, bet: number) => void;
}

// Original images for the challenge
const originalImages = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&auto=format&fit=crop',
    description: 'A beautiful landscape',
    keywords: ['landscape', 'mountain', 'lake', 'sunset', 'water', 'clouds', 'nature', 'beautiful', 'scenic']
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500&auto=format&fit=crop',
    description: 'A cute animal',
    keywords: ['animal', 'fox', 'wildlife', 'cute', 'nature', 'orange', 'furry', 'forest', 'snow']
  },
  {
    id: 3,
    url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=500&auto=format&fit=crop',
    description: 'A scenic view',
    keywords: ['scenic', 'view', 'field', 'green', 'grass', 'trees', 'sky', 'summer', 'meadow']
  },
  {
    id: 4,
    url: '/images/round1-img4.jpg',
    description: 'A beautiful ocean view with trees',
    keywords: ['blue', 'ocean', 'green', 'trees', 'clear', 'sky', 'white', 'clouds', 'sea', 'water', 'island']
  },
  {
    id: 5,
    url: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=500&auto=format&fit=crop',
    description: 'A peaceful setting',
    keywords: ['red', 'poppies', 'flower', 'field', 'green', 'grass', 'nature', 'sky', 'summer', 'meadow']
  }
];

export default function Round1({ currentChips, onComplete }: Round1Props) {
  const [phase, setPhase] = useState<'intro' | 'betting' | 'playing' | 'prompt' | 'generating' | 'comparison' | 'results'>('intro');
  const [currentBet, setCurrentBet] = useState<number>(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [userPrompt, setUserPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [currentOriginalImage, setCurrentOriginalImage] = useState(originalImages[0]);
  const [promptTimeLeft, setPromptTimeLeft] = useState(60); // 1 minute for prompt phase
  const [totalScore, setTotalScore] = useState(0);

  // Timer for prompt phase
  useEffect(() => {
    if (phase === 'prompt' && promptTimeLeft > 0) {
      const timer = setInterval(() => {
        setPromptTimeLeft((prev) => {
          if (prev <= 1) {
            // Time's up - auto-submit with empty prompt or move to next phase
            if (userPrompt.trim()) {
              handlePromptSubmit();
            } else {
              handleNextRound();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [phase, promptTimeLeft, userPrompt]);

  const handleBet = (amount: BetAmount) => {
    const bet = amount === 'ALL_IN' ? currentChips : amount;
    setCurrentBet(bet);
    setPhase('playing');
  };

  const handleImageSelect = () => {
    setPhase('prompt');
    setPromptTimeLeft(60); // Reset timer when entering prompt phase
  };

  const handlePromptSubmit = async () => {
    if (!userPrompt.trim()) return;

    setPhase('generating');

    try {
      const image = await generateImage(userPrompt, currentOriginalImage.id);
      setGeneratedImage(image);
      setPhase('comparison');
    } catch (error) {
      console.error('Failed to generate image:', error);
      // For now, just move to comparison with null generated image
      setPhase('comparison');
    }
  };

  const handleNextRound = () => {
    // Calculate programmatic score based on keywords
    const promptWords = userPrompt.toLowerCase().split(/\s+/);
    const keywords = currentOriginalImage.keywords || [];
    let matches = 0;
    keywords.forEach(kw => {
      if (promptWords.some(word => word.includes(kw))) matches++;
    });
    const accuracy = Math.min(100, Math.round((matches / Math.max(3, keywords.length / 2)) * 100));
    const pointsGained = accuracy >= 50 ? 1 : 0;
    setTotalScore(prev => prev + pointsGained);

    if (currentImageIndex < originalImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      setCurrentOriginalImage(originalImages[currentImageIndex + 1]);
      setUserPrompt('');
      setGeneratedImage(null);
      setPhase('playing');
    } else {
      setPhase('results');
    }
  };

  const handleFinishRound = () => {
    onComplete(totalScore, currentBet); // Give actual calculated score based on prompt accuracy
  };

  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-3xl text-center">
          <div className="mb-8">
            <ImageIcon className="text-yellow-400 mx-auto mb-4" size={64} />
            <h1 className="text-6xl font-black text-white mb-4">ROUND 1</h1>
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500">
              The AI Image Challenge
            </h2>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 mb-8">
            <p className="text-xl text-white/80 mb-4">
              We'll show you 5 images. Your challenge: write a text prompt to recreate them using AI.
            </p>
            <p className="text-lg text-cyan-400">
              The more accurate your prompt, the more points you score!
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8 text-white">
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-3xl font-bold text-yellow-400">5</div>
              <div className="text-sm">Image Challenges</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-3xl font-bold text-cyan-400">60s</div>
              <div className="text-sm">Per Prompt</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-3xl font-bold text-pink-400">1pt</div>
              <div className="text-sm">Per Accurate Recreation</div>
            </div>
          </div>

          <button
            onClick={() => setPhase('betting')}
            className="px-12 py-5 text-2xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-full hover:scale-110 transition-all duration-300 hover:shadow-[0_0_40px_rgba(192,132,252,0.6)]"
          >
            Start Round 1
          </button>

          {/* Development skip button */}
          <button
            onClick={() => {
              // Skip to results with 0 score for testing
              handleFinishRound();
            }}
            className="mt-4 px-6 py-3 text-sm font-bold text-white/60 bg-gray-600/50 rounded-full hover:bg-gray-600/70 transition-all duration-300"
          >
            Skip Round 1 (Dev)
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'betting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-2xl w-full bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6 text-center">Place Your Bet</h1>
          <p className="text-white/70 mb-6 sm:mb-8 text-center">
            How many chips would you like to bet on this round? You'll win or lose based on your accuracy.
          </p>
          
          <BettingPanel 
            currentChips={currentChips} 
            onBet={handleBet} 
            minBet={10}
            maxBet={Math.min(100, currentChips)}
          />
        </div>
      </div>
    );
  }


  if (phase === 'playing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Image {currentImageIndex + 1} of {originalImages.length}
            </h2>
            <p className="text-white/70 mb-6">
              Look at this image and describe what you want the AI to generate
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8 mb-8">
            <div className="aspect-video bg-black/20 rounded-xl overflow-hidden mb-6">
              <img
                src={currentOriginalImage.url}
                alt="Original image"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="text-center">
              <button
                onClick={handleImageSelect}
                className="px-8 py-4 text-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-full hover:scale-110 transition-all duration-300"
              >
                I understand this image
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'prompt') {
    const minutes = Math.floor(promptTimeLeft / 60);
    const seconds = promptTimeLeft % 60;
    const isTimeRunningOut = promptTimeLeft <= 10;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Describe what you want the AI to generate
            </h2>
            <div className={`text-2xl font-bold mb-2 ${isTimeRunningOut ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            <p className={`text-white/70 ${isTimeRunningOut ? 'text-red-300' : ''}`}>
              {isTimeRunningOut ? 'Time running out!' : 'Write a detailed prompt describing the image you want the AI to create'}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8 mb-8">
            <div className="mb-6">
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Describe the image you want the AI to generate... (e.g., 'A serene mountain landscape at sunset with a lake in the foreground')"
                className="w-full h-32 p-4 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="text-center">
              <button
                onClick={handlePromptSubmit}
                disabled={!userPrompt.trim()}
                className="px-8 py-4 text-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-full hover:scale-110 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="inline mr-2" size={20} />
                Generate Image
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'generating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-3xl text-center">
          <div className="mb-8">
            <Sparkles className="text-yellow-400 mx-auto mb-4 animate-spin" size={64} />
            <h1 className="text-4xl font-black text-white mb-4">Generating Image</h1>
            <p className="text-xl text-white/80">
              Creating your AI image based on the prompt...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'comparison') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Compare the Images
            </h2>
            <p className="text-white/70 mb-6">
              How well does the AI-generated image match what you expected?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8">
              <h3 className="text-xl font-bold text-white mb-4">Original Image</h3>
              <div className="aspect-video bg-black/20 rounded-xl overflow-hidden mb-4">
                <img
                  src={currentOriginalImage.url}
                  alt="Original image"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-white/70 text-sm">{currentOriginalImage.description}</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8">
              <h3 className="text-xl font-bold text-white mb-4">AI Generated Image</h3>
              <div className="aspect-video bg-black/20 rounded-xl overflow-hidden mb-4">
                {generatedImage ? (
                  <img
                    src={generatedImage.data}
                    alt="AI generated image"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/50">
                    Failed to generate image
                  </div>
                )}
              </div>
              <p className="text-white/70 text-sm">Generated from: "{userPrompt}"</p>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleNextRound}
              className="px-8 py-4 text-xl font-bold text-white bg-gradient-to-r from-green-600 to-blue-600 rounded-full hover:scale-110 transition-all duration-300"
            >
              {currentImageIndex < originalImages.length - 1 ? 'Next Image' : 'See Results'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center">
          <h2 className="text-4xl font-black text-white mb-6">Round 1 Complete!</h2>
          <p className="text-xl text-white/80 mb-8">
            You successfully recreated {totalScore} out of 5 images accurately!
          </p>
          <button
            onClick={handleFinishRound}
            className="px-12 py-5 text-2xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-full hover:scale-110 transition-all duration-300 shadow-[0_0_20px_rgba(192,132,252,0.4)]"
          >
            Collect Winnings & Continue
          </button>
        </div>
      </div>
    );
  }

  return null;
}
