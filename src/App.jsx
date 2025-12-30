import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, updateProfile } from 'firebase/auth';
import {
  getFirestore, initializeFirestore, persistentLocalCache,
  persistentMultipleTabManager, doc, getDoc, updateDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  CheckCircle2, XCircle, Loader2, Triangle, Hexagon, Circle, Square,
  LogOut, Zap, Trophy, User
} from 'lucide-react';
import { StatsService } from './services/statsService';

// --- CONFIG ---
const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const firebaseConfig = (typeof __firebase_config !== 'undefined')
  ? JSON.parse(__firebase_config)
  : envConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
const appId = typeof __app_id !== 'undefined' ? __app_id : 'mohoot-prod';

// --- AESTHETICS: "Cosmic Night" Theme ---
const COLORS = {
  bg: 'bg-slate-900', // Deep dark base
  card: 'bg-slate-800/50', // Glassmorphism card
  primary: 'bg-indigo-600 hover:bg-indigo-500', // Primary Action
  accent: 'text-cyan-400', // Highlights
  text: 'text-white',
  input: 'bg-slate-950 border-slate-700 text-white focus:border-indigo-500',
  shapes: [
    { id: 0, color: 'bg-rose-600', hover: 'hover:bg-rose-500', icon: Triangle },
    { id: 1, color: 'bg-blue-600', hover: 'hover:bg-blue-500', icon: Hexagon },
    { id: 2, color: 'bg-amber-500', hover: 'hover:bg-amber-400', icon: Circle },
    { id: 3, color: 'bg-emerald-600', hover: 'hover:bg-emerald-500', icon: Square },
  ]
};

const Button = ({ children, onClick, className = '', disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`active:scale-95 transition-all flex items-center justify-center font-bold shadow-lg rounded-2xl ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);

const StatsView = ({ onBack }) => {
  const stats = StatsService.loadStats();
  
  return (
    <div className={`min-h-screen ${COLORS.bg} flex items-center justify-center p-6 font-sans text-white`}>
       <div className={`${COLORS.card} backdrop-blur-xl border border-slate-700 w-full max-w-sm p-8 rounded-3xl shadow-2xl relative`}>
         <button onClick={onBack} className="absolute top-4 right-4 text-slate-400 hover:text-white">
           <XCircle size={24} />
         </button>
         <h2 className="text-3xl font-black mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">My Stats</h2>
         
         <div className="space-y-4">
           <div className="flex justify-between items-center p-4 bg-slate-900/50 rounded-xl border border-slate-700">
             <span className="text-slate-400 font-bold uppercase text-xs tracking-wider">Games Played</span>
             <span className="text-2xl font-black">{stats.totalGamesPlayed}</span>
           </div>
           <div className="flex justify-between items-center p-4 bg-slate-900/50 rounded-xl border border-slate-700">
             <span className="text-slate-400 font-bold uppercase text-xs tracking-wider">Games Won 🏆</span>
             <span className="text-2xl font-black text-yellow-400">{stats.totalGamesWon}</span>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-900/20 rounded-xl border border-emerald-500/20 text-center">
                 <div className="text-2xl font-black text-emerald-400">{stats.totalCorrectAnswers}</div>
                 <div className="text-[10px] uppercase font-bold text-emerald-600">Correct</div>
              </div>
              <div className="p-4 bg-rose-900/20 rounded-xl border border-rose-500/20 text-center">
                 <div className="text-2xl font-black text-rose-400">{stats.totalIncorrectAnswers}</div>
                 <div className="text-[10px] uppercase font-bold text-rose-600">Incorrect</div>
              </div>
           </div>

           <div className="flex justify-between items-center p-4 bg-indigo-900/20 rounded-xl border border-indigo-500/20">
             <span className="text-indigo-400 font-bold uppercase text-xs tracking-wider">Total Score</span>
             <span className="text-2xl font-black text-indigo-300">{stats.totalScore}</span>
           </div>
         </div>
       </div>
    </div>
  );
};

export default function PlayerApp() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('JOIN');
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [session, setSession] = useState(null);
  const [showStats, setShowStats] = useState(false);

  // Game State
  const [hasAnswered, setHasAnswered] = useState(false);
  const [currentRoundId, setCurrentRoundId] = useState(null);
  const [result, setResult] = useState(null);
  
  // Track game completion to prevent double counting
  const [gameProcessed, setGameProcessed] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // 1. Auth Listener
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    return onAuthStateChanged(auth, u => {
      if (u) {
        setUser(u);
        if (u.displayName) setNickname(u.displayName);
      }
    });
  }, []);

  // 2. Auto-Rejoin
  useEffect(() => {
    const savedPin = localStorage.getItem('mohoot_player_pin');
    if (savedPin && user) {
      setPin(savedPin);
      joinGameInternal(savedPin, nickname);
    }
  }, [user]);

  // 3. CORE SYNC LOGIC (The Fix: Decoupled from Logic)
  useEffect(() => {
    if (step === 'JOIN' || !pin || !user) return;

    // Only subscribe to the DOC. Do not depend on roundId here.
    const unsub = onSnapshot(doc(db, 'artifacts', appId, 'sessions', pin), (snap) => {
      if (!snap.exists()) {
        handleBack();
        setErrorMsg("Host ended the game.");
        return;
      }
      setSession(snap.data()); // Just sync data. Logic handled in next effect.
    }, (err) => {
      console.error(err);
      handleBack();
      setErrorMsg("Connection lost.");
    });

    return () => unsub();
  }, [step, pin, user]); // Removed currentRoundId from dependencies

  // 4. LOGIC HANDLER (Reacts to Session Updates)
  useEffect(() => {
    if (!session || !user) return;

    // Detect New Round
    if (session.roundId !== undefined && session.roundId !== currentRoundId) {
      setCurrentRoundId(session.roundId);
      setHasAnswered(false);
      setResult(null);
    }

    // Refresh Protection
    const myData = session.players[user.uid];
    if (myData?.lastAnsweredRoundId === session.roundId) {
      setHasAnswered(true);
    }
    
    // Stats: Game Finished Logic
    if (session.status === 'FINISHED' && !gameProcessed) {
      setGameProcessed(true);
      const players = Object.values(session.players || {});
      const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
      const myRank = sorted.findIndex(p => p.nickname === nickname); // Approximation by nickname/score since uid might not be in sorted array cleanly if object values
      // Better: find by score since we have myData
      
      const amIWinner = sorted.length > 0 && session.players[user.uid]?.score === sorted[0].score;

      StatsService.updateStats({
        incrementGamesPlayed: true,
        incrementGamesWon: amIWinner
      });
    }

  }, [session, currentRoundId, user, gameProcessed, nickname]);

  const joinGameInternal = async (targetPin, targetName) => {
    if (!user || !targetPin) return;
    setIsJoining(true);
    setErrorMsg('');
    try {
      const ref = doc(db, 'artifacts', appId, 'sessions', targetPin);
      const snap = await getDoc(ref);

      if (!snap.exists()) throw new Error("Game not found");

      if (user.displayName !== targetName) await updateProfile(user, { displayName: targetName });

      const currentPlayers = snap.data().players || {};
      const existingData = currentPlayers[user.uid] || {};

      const playerData = {
        nickname: targetName,
        photo: user.photoURL,
        score: existingData.score || 0,
        lastAnswerIdx: existingData.lastAnswerIdx || null,
        lastAnsweredRoundId: existingData.lastAnsweredRoundId || null
      };

      await updateDoc(ref, { [`players.${user.uid}`]: playerData });
      localStorage.setItem('mohoot_player_pin', targetPin);

      // Clear previous game state explicitly before entering lobby
      setSession(null);
      setCurrentRoundId(null);
      setResult(null);
      setHasAnswered(false);
      setGameProcessed(false); // Reset stats tracking for new game

      setStep('LOBBY');
    } catch (e) {
      setErrorMsg(e.message);
      localStorage.removeItem('mohoot_player_pin');
    } finally {
      setIsJoining(false); // Ensure loader turns off
    }
  };

  const handleBack = () => {
    localStorage.removeItem('mohoot_player_pin');
    setStep('JOIN');
    setSession(null);
    setHasAnswered(false);
    setResult(null);
    setCurrentRoundId(null);
    setGameProcessed(false);
    setIsJoining(false);
    // Note: We keep the PIN in the input for convenience, or you can clear it with setPin('')
  };

  const submitAnswer = async (idx) => {
    if (hasAnswered) return;
    setHasAnswered(true);

    const currentQ = session.quizSnapshot.questions[session.currentQuestionIndex];
    const isCorrect = idx === currentQ.correct;
    const timeLeft = session.endTime - Date.now();
    const duration = currentQ.duration * 1000;

    const bonus = isCorrect ? Math.round(500 + (500 * (Math.max(0, timeLeft) / duration))) : 0;
    setResult({ correct: isCorrect, score: bonus });

    // Update Local Stats
    StatsService.updateStats({
        incrementQuestionsAnswered: true,
        incrementCorrectAnswers: isCorrect,
        incrementIncorrectAnswers: !isCorrect,
        addScore: bonus
    });

    const sessionRef = doc(db, 'artifacts', appId, 'sessions', pin);
    const updatePayload = {
      [`players.${user.uid}.lastAnswerIdx`]: idx,
      [`players.${user.uid}.lastAnsweredRoundId`]: session.roundId
    };

    if (isCorrect) {
      updatePayload[`players.${user.uid}.score`] = (session.players[user.uid]?.score || 0) + bonus;
    }

    await updateDoc(sessionRef, updatePayload);
  };

  if (!user) return <div className={`${COLORS.bg} h-screen flex items-center justify-center`}><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  if (showStats) return <StatsView onBack={() => setShowStats(false)} />;

  // --- JOIN SCREEN ---
  if (step === 'JOIN') return (
    <div className={`min-h-screen ${COLORS.bg} flex items-center justify-center p-6 font-sans relative`}>
      <button 
        onClick={() => setShowStats(true)} 
        className="absolute top-6 right-6 p-3 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-indigo-600 transition-all shadow-lg"
        title="My Stats"
      >
        <User size={24} />
      </button>

      <div className={`${COLORS.card} backdrop-blur-xl border border-slate-700 w-full max-w-sm p-8 rounded-3xl shadow-2xl space-y-8`}>

        <div className="text-center">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tighter mb-2">Mohoot!</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em]">Player Zone</p>
        </div>

        <div className="space-y-4">
          <input
            className={`w-full p-4 rounded-xl font-black text-center text-2xl outline-none transition-all ring-offset-2 ring-offset-slate-900 focus:ring-2 focus:ring-indigo-500 ${COLORS.input}`}
            placeholder="Game PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            type="tel"
          />
          <input
            className={`w-full p-4 rounded-xl font-bold text-center text-lg outline-none transition-all ring-offset-2 ring-offset-slate-900 focus:ring-2 focus:ring-indigo-500 ${COLORS.input}`}
            placeholder="Nickname"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
          />
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2">
            <XCircle size={16} /> {errorMsg}
          </div>
        )}

        <Button onClick={() => joinGameInternal(pin, nickname)} disabled={isJoining} className={`w-full py-4 text-white text-lg ${COLORS.primary}`}>
          {isJoining ? <Loader2 className="animate-spin" /> : "Enter Game"}
        </Button>
      </div>
    </div>
  );

  if (!session) return (
    <div className={`h-screen flex flex-col items-center justify-center ${COLORS.bg} ${COLORS.text}`}>
      <Loader2 size={48} className="animate-spin mb-4 text-indigo-500" />
      <div className="font-bold text-xl tracking-tight animate-pulse">Syncing with Host...</div>
    </div>
  );

  // --- LOBBY SCREEN ---
  if (session.status === 'LOBBY') return (
    <div className={`h-screen ${COLORS.bg} ${COLORS.text} flex flex-col items-center justify-center p-6 text-center relative overflow-hidden`}>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        <div className="mb-8 p-4 bg-indigo-500/10 rounded-full">
          <Zap size={48} className="text-indigo-400" />
        </div>
        <h1 className="text-4xl font-black mb-2 tracking-tight">You're In!</h1>
        <div className="text-lg font-medium mb-12 text-slate-400">See your name on screen?</div>

        <div className="bg-slate-800 border border-slate-700 px-12 py-6 rounded-2xl font-black text-3xl shadow-2xl transform hover:scale-105 transition-transform text-indigo-400">
          {nickname}
        </div>
      </div>

      <button onClick={handleBack} className="absolute bottom-8 text-slate-500 hover:text-white transition flex items-center gap-2 font-bold text-sm">
        <LogOut size={16} /> Leave Game
      </button>
    </div>
  );

  // --- QUESTION SCREEN ---
  if (session.status === 'QUESTION') {
    if (hasAnswered) return (
      <div className={`h-screen ${COLORS.bg} flex flex-col items-center justify-center ${COLORS.text} animate-in fade-in duration-300`}>
        <div className="bg-indigo-500/10 p-8 rounded-full mb-6">
          <Loader2 size={64} className="animate-spin text-indigo-400" />
        </div>
        <h2 className="text-3xl font-black mb-2">Answer Locked</h2>
        <p className="text-slate-400 font-bold">Good luck, {nickname}!</p>
      </div>
    );
    return (
      <div className="h-screen grid grid-cols-2 gap-4 p-4 bg-slate-900">
        {COLORS.shapes.map((s, i) => (
          <Button key={i} className={`${s.color} ${s.hover} h-full w-full text-white shadow-none text-6xl`} onClick={() => submitAnswer(i)}>
            {React.createElement(s.icon, { size: 80, fill: "currentColor", className: "drop-shadow-lg" })}
          </Button>
        ))}
      </div>
    );
  }

  // --- RESULT / FINISHED SCREEN ---
  const isCorrect = result?.correct;
  const bgClass = result === null ? 'bg-slate-800' : (isCorrect ? 'bg-emerald-600' : 'bg-rose-600');

  return (
    <div className={`h-screen flex flex-col items-center justify-center text-white p-6 text-center ${bgClass} transition-colors duration-500`}>
      <div className="bg-white/20 p-8 rounded-full mb-6 backdrop-blur-md shadow-2xl ring-4 ring-white/10">
        {result === null ? <LogOut size={60} /> : (isCorrect ? <CheckCircle2 size={60} /> : <XCircle size={60} />)}
      </div>

      <h2 className="text-6xl font-black mb-4 tracking-tighter drop-shadow-md">
        {result === null ? "Time's Up!" : (isCorrect ? "Correct!" : "Incorrect")}
      </h2>

      {isCorrect && (
        <div className="text-4xl font-black bg-black/20 px-8 py-3 rounded-2xl mb-8 backdrop-blur-sm border border-white/10">
          +{result?.score}
        </div>
      )}

      <div className="mt-8 bg-black/40 border border-white/5 w-full max-w-xs p-6 rounded-2xl backdrop-blur-xl">
        <div className="text-xs font-bold uppercase tracking-widest mb-1 text-white/60">Total Score</div>
        <div className="text-5xl font-black">{session.players[user.uid]?.score || 0}</div>
      </div>

      {session.status === 'FINISHED' && (
        <div className="mt-12 space-y-4 w-full max-w-xs animate-in slide-in-from-bottom-10">
          <div className="flex items-center justify-center gap-2 text-xl font-bold opacity-90">
            <Trophy size={24} /> Game Over
          </div>
          <Button onClick={handleBack} className="w-full bg-white text-slate-900 py-4 hover:bg-slate-200">Exit Game</Button>
        </div>
      )}
    </div>
  );
}