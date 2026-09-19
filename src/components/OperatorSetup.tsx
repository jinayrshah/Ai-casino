import { useState, useEffect } from 'react';
import { ensurePuterAuth } from '../services/huggingFaceService';

export default function OperatorSetup() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  const checkAuth = async () => {
    if (window.puter) {
      const signedIn = typeof window.puter.auth?.isSignedIn === 'function' 
        ? window.puter.auth.isSignedIn() 
        : window.puter.isSignedIn();
      
      setIsSignedIn(signedIn);
      
      if (signedIn) {
        try {
          const user = typeof window.puter.auth?.getUser === 'function'
            ? await window.puter.auth.getUser()
            : await window.puter.getUser();
          setUsername(user?.username || 'Unknown');
        } catch (error) {
          console.error("Failed to fetch user", error);
        }
      }
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleSignIn = async () => {
    try {
      await ensurePuterAuth();
      await checkAuth();
    } catch (e) {
      console.error("Sign in error:", e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8 text-pink-500">Operator Setup - Puter Auth</h1>
      
      <div className="bg-slate-800 p-8 rounded-xl shadow-xl w-full max-w-md text-center">
        <div className="mb-6">
          <p className="text-lg mb-2">Status:</p>
          {isSignedIn ? (
            <div className="text-2xl font-bold text-green-400">Signed in ✅</div>
          ) : (
            <div className="text-2xl font-bold text-red-400">Not signed in ❌</div>
          )}
        </div>

        {isSignedIn && username && (
          <div className="mb-6 text-slate-300">
            Current account: <span className="text-white font-mono">{username}</span>
          </div>
        )}

        <button
          onClick={handleSignIn}
          className="w-full py-4 bg-pink-600 hover:bg-pink-700 rounded-lg text-white font-bold text-lg transition-colors"
        >
          Sign in to Puter
        </button>

        <div className="mt-8 text-sm text-slate-400 text-left">
          <h3 className="font-bold text-white mb-2">Instructions:</h3>
          <ul className="list-disc pl-4 space-y-1">
            <li>Click the button above to sign in to Puter.</li>
            <li>This must be done <strong>before the event</strong> on each PC.</li>
            <li>The session stays active across the whole game automatically.</li>
            <li><strong>Do not use Incognito/Private browsing</strong>, or the session will clear when closed.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
