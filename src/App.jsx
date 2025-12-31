import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import {
  getFirestore, initializeFirestore, persistentLocalCache,
  persistentMultipleTabManager, doc, getDoc, updateDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  CheckCircle2, XCircle, Loader2, Triangle, Hexagon, Circle, Square,
  LogOut, Zap, Trophy, User as UserIcon, Play
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

// --- AESTHETICS: "Deep Focus" Theme ---
const COLORS = {
  bg: 'bg-app-bg', 
  card: 'bg-slate-800/50', 
  primary: 'bg-brand-primary hover:opacity-90', 
  accent: 'text-brand-accent', 
  text: 'text-white',
  input: 'bg-slate-950 border-slate-700 text-white focus:border-brand-primary',
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

// --- MODIFIED STATS VIEW ---
const StatsView = ({ onBack, db, user, onSignOut }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    StatsService.loadStats(db, appId, user.uid).then(setStats);
  }, [db, user]);

  // FIX: Added COLORS.bg here to prevent white flash
  if (!stats) return (
    <div className={`min-h-screen ${COLORS.bg} flex items-center justify-center text-indigo-500`}>
      <Loader2 className="animate-spin" size={48} />
    </div>
  );
  
  return (
    <div className={`min-h-screen ${COLORS.bg} flex items-center justify-center p-6 font-sans text-white`}>
       <div className={`${COLORS.card} backdrop-blur-xl border border-slate-700 w-full max-w-sm p-8 rounded-3xl shadow-2xl relative animate-in zoom-in duration-300 flex flex-col`}>
         <button onClick={onBack} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">
           <XCircle size={24} />
         </button>
         
         <div className="text-center mb-6">
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">My Stats</h2>
         </div>
         
         <div className="space-y-4 flex-1">
           <div className="flex justify-between items-center p-4 bg-app-bg/50 rounded-xl border border-slate-700">
             <span className="text-slate-400 font-bold uppercase text-xs tracking-wider">Games Played</span>
             <span className="text-2xl font-black">{stats.totalGamesPlayed}</span>
           </div>
           <div className="flex justify-between items-center p-4 bg-app-bg/50 rounded-xl border border-slate-700">
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

         {/* FIX: User Email & Log Out moved here */}
         <div className="mt-8 pt-6 border-t border-slate-700 flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 text-slate-300 bg-app-bg/50 px-4 py-2 rounded-full">
                {user.photoURL ? (
                    <img src={user.photoURL} alt="User" className="w-6 h-6 rounded-full" />
                ) : (
                    <UserIcon size={16} />
                )}
                <span className="text-sm font-medium">{user.email}</span>
            </div>
            
            <button 
                onClick={onSignOut}
                className="flex items-center gap-2 text-rose-400 hover:text-rose-300 text-sm font-bold uppercase tracking-wide transition-colors"
            >
                <LogOut size={16} /> Sign Out
            </button>
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
  const [loading, setLoading] = useState(true);
  
  // FIX: New state for login loading
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Game State
  const [hasAnswered, setHasAnswered] = useState(false);
  const [currentRoundId, setCurrentRoundId] = useState(null);
  const [result, setResult] = useState(null);
  const [gameProcessed, setGameProcessed] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser?.displayName) {
        setNickname(currentUser.displayName);
      }
      setLoading(false);
      // Reset logging in state if auth state changes
      setIsLoggingIn(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    // FIX: Trigger loading immediately
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error("Login failed:", error);
      setErrorMsg(error.message);
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    const savedPin = localStorage.getItem('mohoot_player_pin');
    if (savedPin && user) {
      setPin(savedPin);
      joinGameInternal(savedPin, nickname);
    }
  }, [user]);

  useEffect(() => {
    if (step === 'JOIN' || !pin || !user) return;
    const unsub = onSnapshot(doc(db, 'artifacts', appId, 'sessions', pin), (snap) => {
      if (!snap.exists()) {
        handleBack();
        setErrorMsg("Host ended the game.");
        return;
      }
      setSession(snap.data()); 
    }, (err) => {
      console.error(err);
      handleBack();
      setErrorMsg("Connection lost.");
    });
    return () => unsub();
  }, [step, pin, user]); 

  useEffect(() => {
    if (!session || !user) return;

    if (session.roundId !== undefined && session.roundId !== currentRoundId) {
      setCurrentRoundId(session.roundId);
      setHasAnswered(false);
      setResult(null);
    }

    const myData = session.players[user.uid];
    if (myData?.lastAnsweredRoundId === session.roundId) {
      setHasAnswered(true);
    }
    
    if (session.status === 'FINISHED' && !gameProcessed) {
      setGameProcessed(true);
      const players = Object.values(session.players || {});
      const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
      const amIWinner = sorted.length > 0 && session.players[user.uid]?.score === sorted[0].score;

      StatsService.updateStats(db, appId, user.uid, {
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

      setSession(null);
      setCurrentRoundId(null);
      setResult(null);
      setHasAnswered(false);
      setGameProcessed(false); 

      setStep('LOBBY');
    } catch (e) {
      setErrorMsg(e.message);
      localStorage.removeItem('mohoot_player_pin');
    } finally {
      setIsJoining(false); 
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

    StatsService.updateStats(db, appId, user.uid, {
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

  if (loading) return <div className={`${COLORS.bg} h-screen flex items-center justify-center`}><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  // --- LOGIN SCREEN ---
  if (!user) {
    return (
      <div className={`min-h-screen ${COLORS.bg} flex flex-col items-center justify-center p-6 font-sans`}>
        <div className={`${COLORS.card} backdrop-blur-xl border border-slate-700 w-full max-w-sm p-10 rounded-3xl shadow-2xl text-center animate-in fade-in zoom-in duration-500`}>
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tighter mb-4">Mohoot!</h1>
          <p className="text-slate-400 font-medium mb-10 text-sm uppercase tracking-widest">Player Zone</p>

          <button
            onClick={handleLogin}
            disabled={isLoggingIn} // Disable while logging in
            className="w-full flex items-center justify-center gap-4 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-900 font-bold py-4 px-6 rounded-2xl transition-all group disabled:opacity-70 disabled:cursor-wait"
          >
            {isLoggingIn ? (
               // FIX: Show loader inside button
               <>
                 <Loader2 className="animate-spin text-slate-900" size={24} />
                 <span>Connecting...</span>
               </>
            ) : (
               <>
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Login with Google</span>
               </>
            )}
          </button>
          
          {errorMsg && (
            <div className="mt-4 text-rose-400 text-xs font-bold bg-rose-500/10 p-2 rounded-lg">{errorMsg}</div>
          )}
        </div>
      </div>
    );
  }

  // Pass user and signout handler to StatsView
  if (showStats) return <StatsView onBack={() => setShowStats(false)} db={db} user={user} onSignOut={() => signOut(auth)} />;

  // --- JOIN SCREEN ---
  if (step === 'JOIN') return (
    <div className={`min-h-screen ${COLORS.bg} flex items-center justify-center p-6 font-sans relative`}>
      <div className="absolute top-6 right-6">
        {/* FIX: Only Avatar Icon shown here */}
        <button 
          onClick={() => setShowStats(true)} 
          className="p-1 bg-slate-800/50 hover:bg-slate-700 rounded-full border border-slate-600 transition-all shadow-lg flex items-center justify-center group"
        >
          {user.photoURL ? (
              <img src={user.photoURL} className="w-10 h-10 rounded-full border-2 border-transparent group-hover:border-brand-primary transition-all" alt="Profile" />
          ) : (
              <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center text-white">
                  <UserIcon size={20} />
              </div>
          )}
        </button>
      </div>

      <div className={`${COLORS.card} backdrop-blur-xl border border-slate-700 w-full max-w-sm p-8 rounded-3xl shadow-2xl space-y-8 animate-in fade-in duration-500`}>

        <div className="text-center">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tighter mb-2">Mohoot!</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em]">Player Zone</p>
        </div>

        <div className="space-y-4">
          {/* FIX: Standardized styling for both inputs (text-xl font-bold) */}
          <input
            className={`w-full p-4 rounded-xl font-bold text-center text-xl outline-none transition-all ring-offset-2 ring-offset-slate-900 focus:ring-2 focus:ring-indigo-500 ${COLORS.input}`}
            placeholder="Game PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            type="tel"
          />
          <input
            className={`w-full p-4 rounded-xl font-bold text-center text-xl outline-none transition-all ring-offset-2 ring-offset-slate-900 focus:ring-2 focus:ring-indigo-500 ${COLORS.input}`}
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

  // ... (Rest of the component remains the same for LOBBY, QUESTION, RESULT)
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
      <div className="h-screen grid grid-cols-2 gap-4 p-4 bg-app-bg">
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