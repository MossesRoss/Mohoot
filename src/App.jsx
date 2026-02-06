import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import {
  getFirestore, initializeFirestore, persistentLocalCache,
  persistentMultipleTabManager, doc, getDoc, updateDoc,
  onSnapshot, runTransaction
} from 'firebase/firestore';
import {
  CheckCircle2, XCircle, Loader2, Triangle, Hexagon, Circle, Square,
  LogOut, Zap, Trophy, User as UserIcon, Play, Hand, Lock, Send
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

// --- COSMIC THEME CONSTANTS ---
const THEME = {
  bg: 'bg-[#020617]', // Absolute deep slate
  card: 'bg-[#0F172A]/70 backdrop-blur-2xl border border-white/10 shadow-2xl', 
  primary: 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-900/20', 
  input: 'bg-[#020617] border border-white/10 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 placeholder-slate-600',
  textGradient: 'text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400',
  shapes: [
    { id: 0, color: 'bg-gradient-to-br from-rose-700 to-rose-900', border: 'border-rose-600/50', hover: 'hover:scale-[0.98]', icon: Triangle },
    { id: 1, color: 'bg-gradient-to-br from-blue-700 to-blue-900', border: 'border-blue-600/50', hover: 'hover:scale-[0.98]', icon: Hexagon },
    { id: 2, color: 'bg-gradient-to-br from-amber-700 to-amber-900', border: 'border-amber-600/50', hover: 'hover:scale-[0.98]', icon: Circle },
    { id: 3, color: 'bg-gradient-to-br from-emerald-700 to-emerald-900', border: 'border-emerald-600/50', hover: 'hover:scale-[0.98]', icon: Square },
  ]
};

// --- GLOBAL COMPONENTS ---
const Button = ({ children, onClick, className = '', disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`active:scale-95 transition-all flex items-center justify-center font-bold shadow-lg rounded-2xl ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);

const GlobalExitButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="fixed top-4 left-4 z-50 p-2 rounded-full bg-black/20 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-all backdrop-blur-md border border-white/5 hover:border-rose-500/30 group"
    title="Emergency Exit"
  >
    <XCircle size={20} className="group-hover:scale-110 transition-transform" />
  </button>
);

// --- MODIFIED STATS VIEW ---
const StatsView = ({ onBack, db, user, onSignOut }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    StatsService.loadStats(db, appId, user.uid).then(setStats);
  }, [db, user]);

  if (!stats) return (
    <div className={`min-h-screen ${THEME.bg} flex items-center justify-center text-violet-500`}>
      <Loader2 className="animate-spin" size={48} />
    </div>
  );
  
  const wlr = stats.totalGamesPlayed > 0 
    ? ((stats.totalGamesWon / stats.totalGamesPlayed) * 100).toFixed(1) 
    : "0.0";
    
  return (
    <div className={`min-h-screen ${THEME.bg} flex items-center justify-center p-6 font-sans text-white`}>
       <div className={`${THEME.card} w-full max-w-sm p-8 rounded-[2rem] relative animate-in zoom-in duration-300 flex flex-col`}>
         <button onClick={onBack} className="absolute top-4 right-4 text-slate-500 hover:text-white transition">
           <XCircle size={24} />
         </button>
         
         <div className="text-center mb-8">
            <h2 className={`text-3xl font-black ${THEME.textGradient}`}>My Record</h2>
         </div>
         
         <div className="space-y-4 flex-1">
           <div className="flex justify-between items-center p-4 bg-[#020617]/50 rounded-xl border border-white/5">
             <span className="text-slate-500 font-bold uppercase text-xs tracking-wider">Games Played</span>
             <span className="text-2xl font-black">{stats.totalGamesPlayed}</span>
           </div>
           
           <div className="flex flex-col items-center justify-center p-6 bg-[#020617]/50 rounded-xl border border-white/5 shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="text-slate-500 font-bold uppercase text-xs tracking-wider mb-2 z-10">Win/Loss Ratio</span>
              <span className="text-4xl font-black text-violet-400 z-10">{wlr}%</span>
           </div>

           <div className="flex justify-between items-center p-4 bg-[#020617]/50 rounded-xl border border-white/5">
             <span className="text-slate-500 font-bold uppercase text-xs tracking-wider">Victories</span>
             <span className="text-2xl font-black text-yellow-500 drop-shadow-sm">{stats.totalGamesWon}</span>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center">
                 <div className="text-2xl font-black text-emerald-400">{stats.totalCorrectAnswers}</div>
                 <div className="text-[10px] uppercase font-bold text-emerald-600/70">Correct</div>
              </div>
              <div className="p-4 bg-rose-500/10 rounded-xl border border-rose-500/20 text-center">
                 <div className="text-2xl font-black text-rose-400">{stats.totalIncorrectAnswers}</div>
                 <div className="text-[10px] uppercase font-bold text-rose-600/70">Incorrect</div>
              </div>
           </div>

           <div className="flex justify-between items-center p-4 bg-violet-500/10 rounded-xl border border-violet-500/20">
             <span className="text-violet-400 font-bold uppercase text-xs tracking-wider">Total Score</span>
             <span className="text-2xl font-black text-violet-300">{stats.totalScore}</span>
           </div>
         </div>

         <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 text-slate-300 bg-[#020617] px-4 py-2 rounded-full border border-white/5">
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
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Game State
  const [hasAnswered, setHasAnswered] = useState(false);
  const [currentRoundId, setCurrentRoundId] = useState(null);
  const [result, setResult] = useState(null);
  const [gameProcessed, setGameProcessed] = useState(false);
  const [typingAnswer, setTypingAnswer] = useState("");
  
  const joinTimeRef = useRef(Date.now());
  const lastKnownScoreRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser?.displayName) {
        setNickname(currentUser.displayName);
      }
      setLoading(false);
      setIsLoggingIn(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
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
      
      const verifyAndJoin = async () => {
          try {
              const ref = doc(db, 'artifacts', appId, 'sessions', savedPin);
              const snap = await getDoc(ref);
              if (snap.exists()) {
                   joinGameInternal(savedPin, nickname || user.displayName);
              } else {
                   localStorage.removeItem('mohoot_player_pin');
              }
          } catch(e) {
               localStorage.removeItem('mohoot_player_pin');
          }
      };
      verifyAndJoin();
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
      setTypingAnswer(""); // Reset typing
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
      
      const playtime = Math.round((Date.now() - joinTimeRef.current) / 1000);

      StatsService.updateStats(db, appId, user.uid, {
        incrementGamesPlayed: true,
        incrementGamesWon: amIWinner,
        incrementPlaytime: playtime
      });
      
      setShowStats(true);
      handleBack(); 
    }

  }, [session, currentRoundId, user, gameProcessed, nickname]);

  // --- DETECT HOST-AWARDED POINTS (BUZZER) ---
  useEffect(() => {
    if (!session || !user) {
        lastKnownScoreRef.current = null;
        return;
    }

    const currentScore = session.players[user.uid]?.score || 0;

    if (lastKnownScoreRef.current === null) {
        lastKnownScoreRef.current = currentScore;
        return;
    }

    if (currentScore > lastKnownScoreRef.current) {
        const diff = currentScore - lastKnownScoreRef.current;
        const qIndex = session.currentQuestionIndex;
        const questions = session.quizSnapshot?.questions;
        
        if (questions && questions[qIndex]) {
             const qType = questions[qIndex].type || 'CHOICE';
             if (qType === 'BUZZER') {
                 StatsService.updateStats(db, appId, user.uid, {
                    incrementQuestionsAnswered: true,
                    incrementCorrectAnswers: true,
                    addScore: diff
                 });
             }
        }
    }
    lastKnownScoreRef.current = currentScore;
  }, [session, user]);
  
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
      joinTimeRef.current = Date.now(); 

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

  const handleBuzzer = async () => {
      // Transaction to claim buzzer safely
      const sessionRef = doc(db, 'artifacts', appId, 'sessions', pin);
      try {
          await runTransaction(db, async (transaction) => {
              const sfDoc = await transaction.get(sessionRef);
              if (!sfDoc.exists()) throw "Document does not exist!";
              
              const data = sfDoc.data();
              if (data.buzzedPlayer === null) {
                  transaction.update(sessionRef, { 
                      buzzedPlayer: { uid: user.uid, timestamp: Date.now() } 
                  });
              }
          });
      } catch (e) {
          console.log("Buzzer contention:", e);
      }
  };

  const submitAnswer = async (answer) => {
    if (hasAnswered) return;
    setHasAnswered(true);

    const currentQ = session.quizSnapshot.questions[session.currentQuestionIndex];
    const qType = currentQ.type || 'CHOICE';
    
    let isCorrect = false;
    
    if (qType === 'CHOICE') {
         isCorrect = answer === currentQ.correct;
    } else if (qType === 'TYPING') {
         const correctText = currentQ.correctText || "";
         isCorrect = answer.trim().toLowerCase() === correctText.trim().toLowerCase();
    }

    const timeLeft = session.endTime - Date.now();
    const duration = currentQ.duration * 1000;

    const bonus = isCorrect ? Math.round(5 + (5 * (Math.max(0, timeLeft) / duration))) : 0;
    setResult({ correct: isCorrect, score: bonus });

    StatsService.updateStats(db, appId, user.uid, {
        incrementQuestionsAnswered: true,
        incrementCorrectAnswers: isCorrect,
        incrementIncorrectAnswers: !isCorrect,
        addScore: bonus
    });

    const sessionRef = doc(db, 'artifacts', appId, 'sessions', pin);
    const updatePayload = {
      [`players.${user.uid}.lastAnswerIdx`]: qType === 'CHOICE' ? answer : -1, // -1 for text/buzzer
      [`players.${user.uid}.lastAnsweredRoundId`]: session.roundId
    };

    if (isCorrect) {
      updatePayload[`players.${user.uid}.score`] = (session.players[user.uid]?.score || 0) + bonus;
    }

    await updateDoc(sessionRef, updatePayload);
  };

  if (loading) return <div className={`${THEME.bg} h-screen flex items-center justify-center`}><Loader2 className="animate-spin text-violet-500" size={48} /></div>;

  // --- LOGIN SCREEN ---
  if (!user) {
    return (
      <div className={`min-h-screen ${THEME.bg} flex flex-col items-center justify-center p-6 font-sans overflow-hidden relative`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-600/10 rounded-full blur-[80px]"></div>

        <div className={`${THEME.card} w-full max-w-sm p-10 rounded-[2rem] text-center animate-in fade-in zoom-in duration-500 relative z-10`}>
          <h1 className={`text-5xl font-black ${THEME.textGradient} tracking-tighter mb-4`}>Mohoot!</h1>
          <p className="text-slate-400 font-medium mb-10 text-xs uppercase tracking-[0.3em]">Player Access</p>

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-bold py-4 px-6 rounded-xl transition-all group disabled:opacity-70 disabled:cursor-wait"
          >
            {isLoggingIn ? (
               <>
                 <Loader2 className="animate-spin text-slate-900" size={24} />
                 <span>Connecting...</span>
               </>
            ) : (
               <>
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
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

  if (showStats) return <StatsView onBack={() => setShowStats(false)} db={db} user={user} onSignOut={() => signOut(auth)} />;

  // --- JOIN SCREEN ---
  if (step === 'JOIN') return (
    <div className={`min-h-screen ${THEME.bg} flex items-center justify-center p-6 font-sans relative`}>
      <div className="absolute top-6 right-6">
        <button 
          onClick={() => setShowStats(true)} 
          className="relative group rounded-full focus:outline-none"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
          <div className="relative rounded-full ring-2 ring-white/10 group-hover:ring-transparent bg-[#020617] p-0.5 transition-all">
            {user.photoURL ? (
                <img src={user.photoURL} className="w-10 h-10 rounded-full object-cover" alt="Profile" />
            ) : (
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-white">
                    <UserIcon size={20} />
                </div>
            )}
          </div>
        </button>
      </div>

      <div className={`${THEME.card} w-full max-w-sm p-8 rounded-[2rem] space-y-8 animate-in fade-in duration-500`}>

        <div className="text-center">
          <h1 className={`text-5xl font-black ${THEME.textGradient} tracking-tighter mb-2`}>Mohoot!</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em]">by Mosses</p>
        </div>

        <div className="space-y-4">
          <input
            className={`w-full p-4 rounded-xl font-bold text-center text-xl outline-none transition-all ${THEME.input}`}
            placeholder="Game PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            type="tel"
          />
          <input
            className={`w-full p-4 rounded-xl font-bold text-center text-xl outline-none transition-all ${THEME.input}`}
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

        <Button onClick={() => joinGameInternal(pin, nickname)} disabled={isJoining} className={`w-full py-4 text-lg ${THEME.primary}`}>
          {isJoining ? <Loader2 className="animate-spin" /> : "ENTER GAME"}
        </Button>
      </div>
    </div>
  );

  if (!session) return (
    <div className={`h-screen flex flex-col items-center justify-center ${THEME.bg} text-white`}>
      <GlobalExitButton onClick={handleBack} />
      <Loader2 size={48} className="animate-spin mb-4 text-violet-500" />
      <div className="font-bold text-xl tracking-tight animate-pulse text-violet-200">Syncing with Host...</div>
      <button onClick={handleBack} className="mt-8 text-slate-500 hover:text-white underline text-sm">Cancel</button>
    </div>
  );

  // --- LOBBY SCREEN ---
  if (session.status === 'LOBBY') return (
    <div className={`h-screen ${THEME.bg} text-white flex flex-col items-center justify-center p-6 text-center relative overflow-hidden`}>
      <GlobalExitButton onClick={handleBack} />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-screen"></div>
      
      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        <div className="mb-8 p-4 bg-violet-500/10 rounded-full border border-violet-500/20 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
          <Zap size={48} className="text-violet-400" />
        </div>
        <h1 className="text-4xl font-black mb-2 tracking-tight">You're In!</h1>
        <div className="text-lg font-medium mb-12 text-slate-500">Watch the main screen</div>

        <div className="bg-[#1e293b]/50 border border-violet-500/30 px-12 py-6 rounded-2xl font-black text-3xl shadow-xl transform hover:scale-105 transition-transform text-violet-200 backdrop-blur-md">
          {nickname}
        </div>
      </div>

      <button onClick={handleBack} className="absolute bottom-8 text-slate-500 hover:text-white transition flex items-center gap-2 font-bold text-sm">
        <LogOut size={16} /> Leave Game
      </button>
    </div>
  );

  if (session.status === 'QUESTION') {
    const qType = session.quizSnapshot.questions[session.currentQuestionIndex].type || 'CHOICE';
    const amLocked = session.lockedPlayers?.includes(user.uid);
    const buzzedPlayer = session.buzzedPlayer;
    
    // --- BUZZER MODE UI ---
    if (qType === 'BUZZER') {
        if (amLocked) return (
            <div className={`h-screen ${THEME.bg} flex flex-col items-center justify-center text-white p-6 text-center`}>
                <GlobalExitButton onClick={handleBack} />
                <div className="bg-rose-500/10 p-8 rounded-full mb-6 border border-rose-500/20">
                    <Lock size={64} className="text-rose-500" />
                </div>
                <h2 className="text-3xl font-black mb-2 text-rose-400">Locked Out</h2>
                <p className="text-slate-500 font-bold">Incorrect attempt. Wait for next round.</p>
            </div>
        );

        if (buzzedPlayer) {
            if (buzzedPlayer.uid === user.uid) {
                return (
                    <div className={`h-screen ${THEME.bg} flex flex-col items-center justify-center text-white p-6 text-center animate-pulse`}>
                        <GlobalExitButton onClick={handleBack} />
                        <div className="bg-emerald-500/10 p-8 rounded-full mb-6 border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                            <Hand size={64} className="text-emerald-500" />
                        </div>
                        <h2 className="text-4xl font-black mb-2 text-emerald-400">You're Live!</h2>
                        <p className="text-white font-bold text-xl">Answer the Host now!</p>
                    </div>
                )
            } else {
                return (
                    <div className={`h-screen ${THEME.bg} flex flex-col items-center justify-center text-white p-6 text-center opacity-50`}>
                        <GlobalExitButton onClick={handleBack} />
                        <div className="bg-slate-800 p-8 rounded-full mb-6 border border-slate-700">
                            <Hand size={64} className="text-slate-500" />
                        </div>
                        <h2 className="text-2xl font-black mb-2 text-slate-400">Locked</h2>
                        <p className="text-slate-500 font-bold">Someone else buzzed in...</p>
                    </div>
                )
            }
        }

        return (
             <div className={`h-screen ${THEME.bg} flex flex-col items-center justify-center p-6`}>
                 <GlobalExitButton onClick={handleBack} />
                 <button 
                    onClick={handleBuzzer}
                    className="w-72 h-72 rounded-full bg-gradient-to-b from-red-700 to-red-900 border-b-8 border-red-950 active:border-b-0 active:translate-y-2 active:bg-red-800 text-white shadow-[0_0_60px_rgba(153,27,27,0.4)] flex flex-col items-center justify-center gap-4 transition-all hover:scale-105"
                 >
                     <span className="text-4xl font-black tracking-widest drop-shadow-lg">BUZZ!</span>
                 </button>
                 <div className="mt-12 text-slate-500 font-bold text-sm uppercase tracking-widest">Tap first to answer</div>
             </div>
        );
    }
    
    // --- STANDARD / TYPING FINISHED STATE ---
    if (hasAnswered) return (
      <div className={`h-screen ${THEME.bg} flex flex-col items-center justify-center text-white animate-in fade-in duration-300 relative`}>
        <GlobalExitButton onClick={handleBack} />
        <div className="bg-violet-500/10 p-8 rounded-full mb-6 border border-violet-500/20">
          <Loader2 size={64} className="animate-spin text-violet-400" />
        </div>
        <h2 className="text-3xl font-black mb-2">Answer Locked</h2>
        <p className="text-slate-500 font-bold">Good luck, {nickname}!</p>
        <button onClick={handleBack} className="absolute bottom-8 text-slate-500 hover:text-white text-xs uppercase font-bold tracking-widest">Quit</button>
      </div>
    );

    // --- TYPING MODE UI ---
    if (qType === 'TYPING') return (
        <div className={`h-screen ${THEME.bg} flex flex-col items-center justify-center p-6`}>
            <GlobalExitButton onClick={handleBack} />
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <h2 className="text-2xl font-black text-white mb-2">Type your answer</h2>
                    <p className="text-slate-500 text-sm">Case insensitive match</p>
                </div>
                <div className="flex flex-col gap-4">
                    <input 
                        value={typingAnswer}
                        onChange={(e) => setTypingAnswer(e.target.value)}
                        className="w-full p-6 text-2xl font-black text-center rounded-2xl bg-[#0F172A] border-2 border-slate-700 text-white focus:border-blue-500 outline-none transition-all placeholder-slate-700"
                        placeholder="..."
                    />
                    <Button 
                        onClick={() => submitAnswer(typingAnswer)}
                        className="w-full py-5 text-xl bg-blue-600 hover:bg-blue-500 text-white"
                        disabled={!typingAnswer.trim()}
                    >
                        SUBMIT <Send size={20} className="ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );

    // --- STANDARD CHOICE UI ---
    return (
      <div className={`h-screen grid grid-cols-2 gap-4 p-4 ${THEME.bg} relative`}>
        <GlobalExitButton onClick={handleBack} />
        {THEME.shapes.map((s, i) => (
          <Button key={i} className={`${s.color} border-b-4 ${s.border} ${s.hover} h-full w-full text-white shadow-none text-6xl active:border-b-0 active:translate-y-1 transition-all`} onClick={() => submitAnswer(i)}>
          </Button>
        ))}
      </div>
    );
  }

  // --- RESULT SCREEN ---
  // Note: Buzzer mode results are handled differently (real-time score update) but for uniformity we show this screen when state changes
  const isCorrect = result?.correct;
  // If result is null but we are in this view, it usually means time ran out without answer
  const bgClass = result === null ? 'bg-slate-900' : (isCorrect ? 'bg-emerald-600' : 'bg-rose-600');

  return (
    <div className={`h-screen flex flex-col items-center justify-center text-white p-6 text-center ${bgClass} transition-colors duration-500 relative`}>
      <GlobalExitButton onClick={handleBack} />
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
  
    </div>
  );
}