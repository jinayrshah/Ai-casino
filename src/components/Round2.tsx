import { useState, useEffect, useRef } from 'react';
import { Video, CheckCircle, XCircle } from 'lucide-react';
import { round2Videos } from '../gameData';
import { BetAmount } from '../types';
import BettingPanel from './BettingPanel';

interface Round2Props {
  currentChips: number;
  onComplete: (score: number, bet: number) => void;
}

export default function Round2({ currentChips, onComplete }: Round2Props) {
  // State declarations at the top
  const [phase, setPhase] = useState<'intro' | 'betting' | 'playing' | 'results'>('intro');
  const [currentBet, setCurrentBet] = useState<number>(0);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [roundTimeLeft, setRoundTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Timer effect
  useEffect(() => {
    if (phase === 'playing') {
      if (roundTimeLeft === 0) {
        setPhase('results');
        return;
      }
      
      const timer = setInterval(() => {
        setRoundTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [phase, roundTimeLeft]);
  
  // Video cleanup effect
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, []);

  const handleBet = (amount: BetAmount) => {
    const bet = amount === 'ALL_IN' ? currentChips : amount;
    setCurrentBet(bet);
    setPhase('playing');
    setRoundTimeLeft(60); // Reset timer when starting the round
  };

  const handleAnswer = (answer: 'real' | 'ai') => {
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);
    setShowResult(true);
    setIsPlaying(false);
    
    if (videoRef.current) {
      videoRef.current.pause();
    }

    const nextVideoIndex = currentVideoIndex + 1;
    const hasMoreVideos = nextVideoIndex < round2Videos.length;

    setTimeout(() => {
      setShowResult(false);
      if (hasMoreVideos) {
        setCurrentVideoIndex(nextVideoIndex);
        // The video will auto-play from the video element's autoplay prop
      } else {
        setPhase('results');
      }
    }, 2000);
  };

  const handleFinishRound = () => {
    const correctCount = answers.filter((answer, idx) => {
      const video = round2Videos[idx];
      return (answer === 'ai' && video.isAI) || (answer === 'real' && !video.isAI);
    }).length;
    onComplete(correctCount, currentBet);
  };

  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-3xl text-center">
          <div className="mb-8">
            <Video className="text-cyan-400 mx-auto mb-4" size={64} />
            <h1 className="text-6xl font-black text-white mb-4">ROUND 2</h1>
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              The Reality Bet
            </h2>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 mb-8">
            <p className="text-xl text-white/80 mb-4">
              Watch 5 videos carefully. Your challenge: identify which ones are real and which are AI-generated.
            </p>
            <p className="text-lg text-cyan-400">
              Trust your instincts. Look for subtle tells!
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8 text-white">
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-3xl font-bold text-cyan-400">5</div>
              <div className="text-sm">Videos</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-3xl font-bold text-blue-400">2</div>
              <div className="text-sm">Choices</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-3xl font-bold text-purple-400">8</div>
              <div className="text-sm">Minutes</div>
            </div>
          </div>

          <button
            onClick={() => setPhase('betting')}
            className="px-12 py-5 text-2xl font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full hover:scale-110 transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,255,255,0.6)]"
          >
            CONTINUE
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'betting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4 pt-24">
        <div className="max-w-2xl w-full">
          <h2 className="text-4xl font-black text-white text-center mb-8">Place Your Bet</h2>
          <BettingPanel currentChips={currentChips} onBet={handleBet} />
          <button
            onClick={() => setPhase('results')}
            className="mt-8 w-full py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold rounded-lg hover:scale-105 transition-all duration-200"
          >
            Skip Dev (Demo/Test)
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'playing') {
    const currentVideo = round2Videos[currentVideoIndex];
    const hasAnswered = answers[currentVideoIndex] !== undefined;
    const isCorrect = hasAnswered &&
      ((answers[currentVideoIndex] === 'ai' && currentVideo.isAI) ||
       (answers[currentVideoIndex] === 'real' && !currentVideo.isAI));
    const minutes = Math.floor(roundTimeLeft / 60);
    const seconds = roundTimeLeft % 60;
    const isTimeRunningOut = roundTimeLeft <= 10;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="text-white">
              <span className="text-2xl font-bold">
                Video {currentVideoIndex + 1} / {round2Videos.length}
              </span>
            </div>
            <div className={`text-2xl font-bold ${isTimeRunningOut ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
              {minutes}:{seconds.toString().padStart(2, '0')}
              {isTimeRunningOut && <div className="text-sm text-red-300">Time running out!</div>}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 mb-8">
            <div className="aspect-video bg-black/50 rounded-xl overflow-hidden mb-6 flex items-center justify-center">
              <video
                ref={videoRef}
                src={`/Videos/${currentVideo.isAI ? 'AI' : 'REAL'} ${currentVideoIndex + 1}.mp4`}
                className="w-full h-full object-contain"
                playsInline
                autoPlay
                muted
                loop={false}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />
            </div>

            <p className="text-white/60 text-center">
              {isPlaying ? 'Video is playing...' : 'Click the video to play'}
            </p>
          </div>

          {showResult ? (
            <div className={`bg-gradient-to-r ${isCorrect ? 'from-green-900/50 to-blue-900/50 border-green-500/30' : 'from-red-900/50 to-orange-900/50 border-red-500/30'} border rounded-2xl p-8 text-center`}>
              {isCorrect ? (
                <>
                  <CheckCircle className="text-green-400 mx-auto mb-4" size={64} />
                  <p className="text-3xl font-bold text-green-400">Correct!</p>
                  <p className="text-white/60 mt-2">
                    This video is {currentVideo.isAI ? 'AI-generated' : 'real'}
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="text-red-400 mx-auto mb-4" size={64} />
                  <p className="text-3xl font-bold text-red-400">Wrong!</p>
                  <p className="text-white/60 mt-2">
                    This video is actually {currentVideo.isAI ? 'AI-generated' : 'real'}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <button
                onClick={() => handleAnswer('real')}
                className="px-8 py-12 text-2xl font-bold text-white bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl hover:scale-105 transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,255,0,0.4)]"
              >
                <div className="flex flex-col items-center gap-3">
                  <CheckCircle size={48} />
                  <span>REAL</span>
                </div>
              </button>

              <button
                onClick={() => handleAnswer('ai')}
                className="px-8 py-12 text-2xl font-bold text-white bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl hover:scale-105 transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,0,255,0.4)]"
              >
                <div className="flex flex-col items-center gap-3">
                  <Video size={48} />
                  <span>AI</span>
                </div>
              </button>
            </div>
          )}

          <div className="mt-6 flex gap-2 justify-center">
            {round2Videos.map((_, idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full ${
                  idx < currentVideoIndex
                    ? 'bg-green-400'
                    : idx === currentVideoIndex
                    ? 'bg-cyan-400 animate-pulse'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    const correctCount = answers.filter((answer, idx) => {
      const video = round2Videos[idx];
      return (answer === 'ai' && video.isAI) || (answer === 'real' && !video.isAI);
    }).length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center">
          <h2 className="text-5xl font-black text-white mb-8">Round 2 Complete!</h2>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 mb-8">
            <div className="text-6xl font-black text-cyan-400 mb-4">{correctCount}/5</div>
            <div className="text-white/60 text-xl mb-6">Correct Guesses</div>

            <div className="space-y-2">
              {round2Videos.map((video, idx) => {
                const userAnswer = answers[idx];
                const isCorrect = (userAnswer === 'ai' && video.isAI) || (userAnswer === 'real' && !video.isAI);

                return (
                  <div key={idx} className="flex items-center justify-between bg-black/30 rounded-lg p-4">
                    <span className="text-white">{video.title}</span>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        You: {userAnswer ? userAnswer.toUpperCase() : 'SKIPPED'}
                      </span>
                      <span className="text-white/60">
                        Actually: {video.isAI ? 'AI' : 'REAL'}
                      </span>
                      {userAnswer ? (
                        isCorrect ? (
                          <CheckCircle className="text-green-400" size={20} />
                        ) : (
                          <XCircle className="text-red-400" size={20} />
                        )
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleFinishRound}
            className="px-12 py-5 text-2xl font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full hover:scale-110 transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,255,255,0.6)]"
          >
            CONTINUE TO ROUND 3
          </button>
        </div>
      </div>
    );
  }

  return null;
}
