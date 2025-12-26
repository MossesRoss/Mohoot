import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, updateProfile } from 'firebase/auth';
import {
  getFirestore, initializeFirestore, persistentLocalCache,
  persistentMultipleTabManager, doc, getDoc, updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { CheckCircle2, XCircle, Loader2, Triangle, Hexagon, Circle, Square } from 'lucide-react';

// --- CONFIG ---
// Ensure your .env file has these VITE_FIREBASE_... keys
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
const appId = 'mohoot-prod';

const SHAPES = [
  { id: 0, color: 'bg-[#EA4335]', icon: Triangle },
  { id: 1, color: 'bg-[#4285F4]', icon: Hexagon },
  { id: 2, color: 'bg-[#FBBC04]', icon: Circle },
  { id: 3, color: 'bg-[#34A853]', icon: Square },
];

const Button = ({ children, onClick, className = '', disabled = false }) => (
  <button onClick={onClick} disabled={disabled} className={`active:scale-95 transition-all flex items-center justify-center font-bold shadow-md rounded-xl ${className}`}>
    {children}
  </button>
);

export default function PlayerApp() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('JOIN');
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [session, setSession] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Anon Auth for Player
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    return onAuthStateChanged(auth, u => {
      if (u) {
        setUser(u);
        if (u.displayName) setNickname(u.displayName);
      }
    });
  }, []);

  // Rejoin Logic
  useEffect(() => {
    const savedPin = localStorage.getItem('mohoot_player_pin');
    if (savedPin && user) {
      setPin(savedPin);
      joinGameInternal(savedPin, nickname);
    }
  }, [user]);

  // Game Sync Listener
  useEffect(() => {
    if (step === 'JOIN' || !pin) return;
    return onSnapshot(doc(db, 'artifacts', appId, 'sessions', pin), (snap) => {
      if (!snap.exists()) { handleBack(); return; }
      const data = snap.data();
      setSession(data);
      if (data.status === 'QUESTION' && data.players[user.uid]?.lastAnswerIdx === null) {
        setHasAnswered(false);
        setResult(null);
      }
    }, (err) => {
      console.error(err);
      handleBack();
      setErrorMsg("Connection lost.");
    });
  }, [step, pin, user]);

  const joinGameInternal = async (targetPin, targetName) => {
    if (!user || !targetPin) return;
    setIsJoining(true);
    setErrorMsg('');
    try {
      const ref = doc(db, 'artifacts', appId, 'sessions', targetPin);
      const snap = await getDoc(ref);

      if (!snap.exists()) throw new Error("Game not found");

      // Update nickname in Auth and DB
      if (user.displayName !== targetName) await updateProfile(user, { displayName: targetName });

      const currentPlayers = snap.data().players || {};
      const playerData = {
        nickname: targetName,
        photo: user.photoURL,
        lastAnswerIdx: null,
        score: currentPlayers[user.uid]?.score || 0
      };

      await updateDoc(ref, { [`players.${user.uid}`]: playerData });
      localStorage.setItem('mohoot_player_pin', targetPin);
      setStep('LOBBY');
    } catch (e) {
      setErrorMsg(e.message);
      setIsJoining(false);
      localStorage.removeItem('mohoot_player_pin');
    }
  };

  const handleBack = () => {
    localStorage.removeItem('mohoot_player_pin');
    setStep('JOIN');
    setSession(null);
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

    const sessionRef = doc(db, 'artifacts', appId, 'sessions', pin);
    const updatePayload = { [`players.${user.uid}.lastAnswerIdx`]: idx };
    if (isCorrect) updatePayload[`players.${user.uid}.score`] = (session.players[user.uid]?.score || 0) + bonus;

    await updateDoc(sessionRef, updatePayload);
  };

  if (!user) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (step === 'JOIN') return (
    <div className="h-screen bg-[#46178F] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-sm p-6 rounded-lg shadow-xl space-y-4">
        <h1 className="text-center text-3xl font-black text-[#46178F] mb-6">Mohoot!</h1>
        <input className="w-full p-3 border-2 border-[#ccc] rounded font-bold text-center text-lg placeholder-gray-400 focus:border-[#46178F] outline-none"
          placeholder="Game PIN" value={pin} onChange={e => setPin(e.target.value)} type="tel" />
        <input className="w-full p-3 border-2 border-[#ccc] rounded font-bold text-center text-lg placeholder-gray-400 focus:border-[#46178F] outline-none"
          placeholder="Nickname" value={nickname} onChange={e => setNickname(e.target.value)} />
        {errorMsg && <div className="text-red-500 text-sm font-bold text-center">{errorMsg}</div>}
        <Button onClick={() => joinGameInternal(pin, nickname)} disabled={isJoining} className="w-full py-3 bg-[#333] text-white">
          {isJoining ? "Connecting..." : "Enter"}
        </Button>
      </div>
    </div>
  );

  if (!session) return <div className="h-screen flex items-center justify-center bg-[#46178F] text-white font-bold">Connecting...</div>;

  if (session.status === 'LOBBY') return (
    <div className="h-screen bg-[#46178F] text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-bold mb-4">You're In!</h1>
      <div className="text-xl font-medium mb-8">See your name on screen?</div>
      <div className="bg-white/10 px-8 py-3 rounded-full font-bold text-xl">{nickname}</div>
      <button onClick={handleBack} className="absolute bottom-8 text-sm opacity-50 underline">Leave Game</button>
    </div>
  );

  if (session.status === 'QUESTION') {
    if (hasAnswered) return (
      <div className="h-screen bg-white flex flex-col items-center justify-center text-[#46178F]">
        <Loader2 size={48} className="animate-spin mb-4" />
        <h2 className="text-2xl font-bold">Answer Locked</h2>
        <p>Wait for the result...</p>
      </div>
    );
    return (
      <div className="h-screen grid grid-cols-2 gap-4 p-4 bg-white">
        {SHAPES.map((s, i) => (
          <Button key={i} className={`${s.color} h-full w-full text-white`} onClick={() => submitAnswer(i)}>
            {React.createElement(s.icon, { size: 40, fill: "white" })}
          </Button>
        ))}
      </div>
    );
  }

  // Finished or Leaderboard
  const isCorrect = result?.correct;
  return (
    <div className={`h-screen flex flex-col items-center justify-center text-white p-6 text-center ${isCorrect ? 'bg-[#34A853]' : 'bg-[#EA4335]'}`}>
      <div className="bg-white/20 p-8 rounded-full mb-6">
        {isCorrect ? <CheckCircle2 size={60} /> : <XCircle size={60} />}
      </div>
      <h2 className="text-4xl font-black mb-2">{isCorrect ? "Correct" : "Incorrect"}</h2>
      {isCorrect && <div className="text-2xl font-medium">+{result?.score}</div>}
      <div className="mt-12 bg-black/20 px-8 py-4 rounded-xl">
        <div className="text-xs font-bold uppercase tracking-widest mb-1 opacity-75">Score</div>
        <div className="text-3xl font-black">{session.players[user.uid]?.score}</div>
      </div>
      {session.status === 'FINISHED' && (
        <Button onClick={handleBack} className="mt-12 bg-white text-black px-8 py-3">Exit Game</Button>
      )}
    </div>
  );
}