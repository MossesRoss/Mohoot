import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  addDoc, 
  serverTimestamp,
  increment,
  deleteDoc
} from 'firebase/firestore';
import { 
  Users, Plus, Trash2, LogOut, LayoutGrid, 
  CheckCircle2, XCircle, Triangle, Circle, Hexagon, Square, 
  Loader2, Edit3, Image as ImageIcon
} from 'lucide-react';

// ==========================================
// CONFIGURATION
// ==========================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const appId = 'mohoot-prod'; 

// ==========================================
// UI COMPONENTS
// ==========================================
const SHAPES = [
  { id: 0, color: 'bg-[#EA4335]', icon: Triangle, label: 'Triangle' },
  { id: 1, color: 'bg-[#4285F4]', icon: Hexagon, label: 'Diamond' },
  { id: 2, color: 'bg-[#FBBC04]', icon: Circle, label: 'Circle' },
  { id: 3, color: 'bg-[#34A853]', icon: Square, label: 'Square' },
];

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, loading = false }) => {
  const base = "font-medium tracking-wide transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 font-sans";
  const variants = {
    primary: "bg-[#1A73E8] text-white hover:bg-[#1557B0] hover:shadow-md rounded px-6 py-2.5 shadow-sm text-sm",
    secondary: "bg-white text-[#1A73E8] border border-[#DADCE0] hover:bg-[#F8F9FA] rounded px-6 py-2.5 text-sm",
    danger: "bg-[#EA4335] text-white hover:shadow-md rounded px-6 py-2.5 shadow-sm text-sm",
    shape: "h-full w-full rounded-xl shadow-md active:shadow-inner text-white flex flex-col items-center justify-center transform hover:scale-[1.02] transition-transform"
  };
  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${base} ${variants[variant]} ${className}`}>
      {loading ? <Loader2 className="animate-spin" size={18} /> : children}
    </button>
  );
};

const Input = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div className="w-full group">
    {label && <label className="block text-xs font-bold text-[#5F6368] uppercase tracking-wider mb-2 ml-1">{label}</label>}
    <input 
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white border border-[#DADCE0] p-3 rounded focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all font-medium text-[#202124] group-hover:border-[#202124]"
      placeholder={placeholder}
    />
  </div>
);

// ==========================================
// MAIN LOGIC
// ==========================================

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('LANDING');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#host') setView('HOST');
      else if (hash === '#play') setView('PLAYER');
      else setView('LANDING');
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (newView) => {
    if (newView === 'HOST') window.location.hash = 'host';
    else if (newView === 'PLAYER') window.location.hash = 'play';
    else window.location.hash = '';
    setView(newView);
  }

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        try {
          const userRef = doc(db, 'users', u.uid);
          await setDoc(userRef, {
            email: u.email,
            name: u.displayName,
            photo: u.photoURL,
            lastLogin: serverTimestamp(),
            loginCount: increment(1)
          }, { merge: true });
        } catch (e) {
          console.error("User Stats Error:", e);
        }
      } else {
        setUser(null);
      }
    });
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
      alert("Login failed: " + error.message);
    }
  };

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white">
        <div className="text-center space-y-6 animate-fade-in p-8 rounded-2xl">
          <h1 className="text-6xl font-black text-[#202124] tracking-tighter mb-2">Mohoot<span className="text-[#EA4335]">!</span></h1>
          <p className="text-[#5F6368] text-lg max-w-md mx-auto">The ruthless knowledge engine.</p>
          <Button onClick={handleLogin} className="w-full py-4 text-lg rounded-full">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6 mr-2 bg-white rounded-full p-0.5" />
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#202124] font-sans">
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-bold">{user.displayName}</div>
          <div className="text-xs text-[#5F6368]">{user.email}</div>
        </div>
        <img 
            src={user.photoURL} 
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-full border border-[#DADCE0]" 
            alt="Profile"
        />
        <button onClick={() => signOut(auth)} className="p-2 hover:bg-[#E8EAED] rounded-full text-[#5F6368]">
          <LogOut size={20} />
        </button>
      </div>

      {view === 'LANDING' && (
        <div className="h-screen flex flex-col items-center justify-center p-6 max-w-5xl mx-auto">
           <h1 className="text-5xl font-black mb-12 text-[#202124] tracking-tighter">Mohoot<span className="text-[#EA4335]">!</span></h1>
          <div className="grid md:grid-cols-2 gap-8 w-full">
            <div onClick={() => navigate('HOST')} className="group bg-white p-10 rounded-2xl shadow border border-[#DADCE0] hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer">
              <div className="bg-[#E8F0FE] w-16 h-16 rounded-xl flex items-center justify-center text-[#1967D2] mb-6">
                <LayoutGrid size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Host</h2>
              <p className="text-[#5F6368]">Create quizzes and dominate the room.</p>
            </div>

            <div onClick={() => navigate('PLAYER')} className="group bg-white p-10 rounded-2xl shadow border border-[#DADCE0] hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer">
              <div className="bg-[#E6F4EA] w-16 h-16 rounded-xl flex items-center justify-center text-[#188038] mb-6">
                <Users size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Play</h2>
              <p className="text-[#5F6368]">Join a game and prove your worth.</p>
            </div>
          </div>
        </div>
      )}

      {view === 'HOST' && <HostApp user={user} onBack={() => navigate('LANDING')} />}
      {view === 'PLAYER' && <PlayerApp user={user} onBack={() => navigate('LANDING')} />}
    </div>
  );
}

// ==========================================
// HOST APP
// ==========================================

const HostApp = ({ user, onBack }) => {
  const [subView, setSubView] = useState('DASHBOARD');
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [editingQuiz, setEditingQuiz] = useState(null);

  useEffect(() => {
    if (!user) return;
    const qRef = collection(db, 'artifacts', appId, 'users', user.uid, 'quizzes');
    return onSnapshot(qRef, (snap) => {
      setQuizzes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  const createNewQuiz = () => {
    setEditingQuiz({
      title: "Untitled Quiz",
      questions: [{ text: "", image: "", answers: ["", "", "", ""], correct: 0, duration: 20 }]
    });
    setSubView('EDITOR');
  };

  const handleSaveQuiz = async (quizData) => {
    try {
      const qRef = collection(db, 'artifacts', appId, 'users', user.uid, 'quizzes');
      if (quizData.id) {
         await updateDoc(doc(qRef, quizData.id), quizData);
      } else {
         await addDoc(qRef, { ...quizData, createdAt: serverTimestamp() });
      }
      setSubView('DASHBOARD');
    } catch (error) {
      console.error("Save Error:", error);
      throw error; // Propagate to child
    }
  };

  return (
    <div className="max-w-6xl mx-auto pt-20 px-6">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="secondary" onClick={subView === 'DASHBOARD' ? onBack : () => setSubView('DASHBOARD')}>Back</Button>
        <h2 className="text-2xl font-bold text-[#202124]">{subView}</h2>
      </div>

      {subView === 'DASHBOARD' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={createNewQuiz}><Plus size={20} /> Create New Quiz</Button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {quizzes.map(q => (
              <div key={q.id} className="bg-white p-6 rounded-xl border border-[#DADCE0] shadow-sm hover:shadow-md transition-all">
                <h3 className="font-bold text-lg mb-2 truncate">{q.title}</h3>
                <p className="text-sm text-[#5F6368] mb-4">{q.questions?.length} Questions</p>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => { setActiveQuizId(q.id); setSubView('LOBBY'); }}>Launch</Button>
                  <button onClick={() => { setEditingQuiz(q); setSubView('EDITOR'); }} className="p-2 hover:bg-[#F1F3F4] rounded"><Edit3 size={18} className="text-[#5F6368]"/></button>
                  <button onClick={async () => { if(confirm('Delete?')) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'quizzes', q.id)); }} className="p-2 hover:bg-[#FCE8E6] rounded"><Trash2 size={18} className="text-[#EA4335]"/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {subView === 'EDITOR' && <QuizEditor initialData={editingQuiz} onSave={handleSaveQuiz} onCancel={() => setSubView('DASHBOARD')} />}
      {subView === 'LOBBY' && <HostGameEngine quizId={activeQuizId} hostId={user.uid} onExit={() => setSubView('DASHBOARD')} allQuizzes={quizzes} />}
    </div>
  );
};

// --- QUIZ EDITOR ---
const QuizEditor = ({ initialData, onSave, onCancel }) => {
  const [quiz, setQuiz] = useState(initialData);
  const [idx, setIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const updateQ = (field, val) => {
    const qs = [...quiz.questions];
    qs[idx] = { ...qs[idx], [field]: val };
    setQuiz({ ...quiz, questions: qs });
  };
  
  const updateAns = (aIdx, text) => {
    const qs = [...quiz.questions];
    qs[idx].answers[aIdx] = text;
    setQuiz({ ...quiz, questions: qs });
  };

  const handleSaveClick = async () => {
      setIsSaving(true);
      try {
        await onSave(quiz);
        // Parent unmounts us on success, so we don't need to stop loading
      } catch (error) {
        alert("Failed to save: " + error.message);
        setIsSaving(false);
      }
  };

  return (
    <div className="flex gap-6 h-[80vh]">
      <div className="w-64 bg-white border border-[#DADCE0] rounded-xl overflow-y-auto p-2">
        {quiz.questions.map((q, i) => (
          <div key={i} onClick={() => setIdx(i)} className={`p-3 rounded mb-2 cursor-pointer text-sm font-medium ${i === idx ? 'bg-[#E8F0FE] text-[#1967D2]' : 'hover:bg-[#F1F3F4]'}`}>
            {i + 1}. {q.text || "New Question"}
          </div>
        ))}
        <Button variant="secondary" className="w-full mt-2" onClick={() => {
          setQuiz({...quiz, questions: [...quiz.questions, { text: "", image: "", answers: ["", "", "", ""], correct: 0, duration: 20 }]});
          setIdx(quiz.questions.length);
        }}>Add Question</Button>
      </div>

      <div className="flex-1 bg-white border border-[#DADCE0] rounded-xl p-8 overflow-y-auto">
        <Input label="Quiz Title" value={quiz.title} onChange={v => setQuiz({...quiz, title: v})} />
        <div className="h-8" />
        <div className="space-y-4">
            <Input label="Question Text" value={quiz.questions[idx].text} onChange={v => updateQ('text', v)} />
            <div className="flex items-center gap-2">
                <ImageIcon size={20} className="text-gray-400" />
                <Input 
                    label="Image URL (Optional)" 
                    value={quiz.questions[idx].image || ''} 
                    onChange={v => updateQ('image', v)} 
                    placeholder="https://..."
                />
            </div>
            {quiz.questions[idx].image && (
                <img src={quiz.questions[idx].image} alt="Preview" className="h-40 rounded-lg object-contain border border-gray-200" />
            )}
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-6">
          {quiz.questions[idx].answers.map((ans, i) => (
            <div key={i} className="flex items-center gap-2">
              <div onClick={() => updateQ('correct', i)} className={`w-8 h-8 rounded flex items-center justify-center cursor-pointer ${quiz.questions[idx].correct === i ? SHAPES[i].color : 'bg-gray-200'}`}>
                 <CheckCircle2 size={16} className="text-white" />
              </div>
              <Input value={ans} onChange={v => updateAns(i, v)} placeholder={`Answer ${i+1}`} />
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-end gap-4">
          <Input type="number" label="Seconds" value={quiz.questions[idx].duration} onChange={v => updateQ('duration', parseInt(v))} />
          <div className="flex-1"></div>
          <Button variant="secondary" onClick={onCancel} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSaveClick} loading={isSaving}>Save All</Button>
        </div>
      </div>
    </div>
  );
};

// --- HOST GAME ENGINE ---
const HostGameEngine = ({ quizId, hostId, onExit, allQuizzes }) => {
  const [pin, setPin] = useState(null);
  const [session, setSession] = useState(null);
  const [qData, setQData] = useState(null);

  useEffect(() => {
    const init = async () => {
      const quiz = allQuizzes.find(q => q.id === quizId);
      setQData(quiz);
      const newPin = Math.floor(100000 + Math.random() * 900000).toString();
      setPin(newPin);
      
      // Path: artifacts/{appId}/sessions/{pin}
      await setDoc(doc(db, 'artifacts', appId, 'sessions', newPin), {
        hostId, quizId, status: 'LOBBY', currentQuestionIndex: 0, players: {}, quizSnapshot: quiz
      });
    };
    init();
  }, []);

  useEffect(() => {
    if (!pin) return;
    return onSnapshot(doc(db, 'artifacts', appId, 'sessions', pin), (s) => setSession(s.data()));
  }, [pin]);

  const updateStatus = async (status, extra = {}) => {
    await updateDoc(doc(db, 'artifacts', appId, 'sessions', pin), { status, ...extra });
  };

  const nextQ = async () => {
    const nextIdx = session.currentQuestionIndex + 1;
    if (nextIdx < qData.questions.length) {
      await updateStatus('QUESTION', {
        currentQuestionIndex: nextIdx,
        startTime: Date.now() + 2000,
        endTime: Date.now() + 2000 + (qData.questions[nextIdx].duration * 1000)
      });
    } else {
      await updateStatus('FINISHED');
    }
  };

  if (!session) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (session.status === 'LOBBY') return (
    <div className="text-center pt-20">
      <h1 className="text-9xl font-black text-[#202124] mb-4">{pin}</h1>
      <p className="text-[#5F6368] mb-12 uppercase tracking-widest font-bold">Join at mohoot.app</p>
      <div className="flex flex-wrap gap-4 justify-center max-w-4xl mx-auto mb-12">
        {Object.values(session.players || {}).map((p, i) => (
          <div key={i} className="bg-white px-6 py-3 rounded-full shadow-sm border border-[#DADCE0] font-bold animate-pop-in">{p.nickname}</div>
        ))}
      </div>
      <Button onClick={() => updateStatus('QUESTION', { startTime: Date.now() + 2000, endTime: Date.now() + 2000 + (qData.questions[0].duration * 1000) })}>Start Game</Button>
    </div>
  );

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex justify-between items-center mb-8">
        <span className="font-bold text-gray-400">Q{session.currentQuestionIndex + 1}/{qData.questions.length}</span>
        <div className="text-3xl font-black">{session.status}</div>
      </div>
      {session.status === 'QUESTION' ? (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col justify-center items-center mb-8">
            {qData.questions[session.currentQuestionIndex].image && (
                <img 
                    src={qData.questions[session.currentQuestionIndex].image} 
                    className="max-h-[40vh] object-contain rounded-lg shadow-md mb-8"
                    alt="Question"
                />
            )}
            <h2 className="text-4xl font-medium text-center">{qData.questions[session.currentQuestionIndex].text}</h2>
          </div>
          <div className="grid grid-cols-2 gap-6 h-64">
            {qData.questions[session.currentQuestionIndex].answers.map((a, i) => (
               <div key={i} className={`${SHAPES[i].color} rounded-2xl flex items-center px-8 text-white text-2xl font-bold shadow-md`}>
                 <span className="mr-6 bg-black/20 w-12 h-12 flex items-center justify-center rounded-lg">{i+1}</span> {a}
               </div>
            ))}
          </div>
          <div className="mt-8 text-center"><Button variant="secondary" onClick={() => updateStatus('LEADERBOARD')}>Show Results</Button></div>
        </div>
      ) : (
        <div className="max-w-xl mx-auto w-full space-y-4">
          {Object.values(session.players || {}).sort((a,b) => b.score - a.score).map((p, i) => (
             <div key={i} className="bg-white p-4 rounded-xl border border-[#DADCE0] flex justify-between items-center shadow-sm">
                <span className="font-bold">#{i+1} {p.nickname}</span>
                <span className="font-mono bg-[#E8F0FE] text-[#1967D2] px-3 py-1 rounded">{p.score}</span>
             </div>
          ))}
          <div className="pt-8 flex justify-center gap-4">
             {session.status !== 'FINISHED' && <Button onClick={nextQ}>Next</Button>}
             <Button variant="secondary" onClick={onExit}>End Game</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// PLAYER APP
// ==========================================

const PlayerApp = ({ user, onBack }) => {
  const [step, setStep] = useState('JOIN');
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState(user.displayName || '');
  const [session, setSession] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (step === 'JOIN') return;
    return onSnapshot(doc(db, 'artifacts', appId, 'sessions', pin), (snap) => {
       if (!snap.exists()) { setStep('JOIN'); return; }
       const data = snap.data();
       setSession(data);
       if (data.status === 'QUESTION' && data.players[user.uid]?.lastAnswerIdx === null) {
          setHasAnswered(false);
          setResult(null);
       }
    });
  }, [step, pin]);

  const joinGame = async () => {
    setErrorMsg('');
    setIsJoining(true);
    try {
      // Path: artifacts/{appId}/sessions/{pin}
      const ref = doc(db, 'artifacts', appId, 'sessions', pin);
      const snap = await getDoc(ref);
      
      if (!snap.exists()) {
          setErrorMsg("Game not found. Check PIN.");
          setIsJoining(false);
          return;
      }
      
      // Initial Player Record
      await updateDoc(ref, {
        [`players.${user.uid}`]: { nickname, score: 0, lastAnswerIdx: null, photo: user.photoURL }
      });
      setStep('LOBBY');
    } catch (e) {
      console.error(e);
      setErrorMsg("Error: " + e.message);
    } finally {
      setIsJoining(false);
    }
  };

  const submitAnswer = async (idx) => {
    if (hasAnswered) return;
    setHasAnswered(true);
    const now = Date.now();
    
    // 1. Calculate Score
    const currentQ = session.quizSnapshot.questions[session.currentQuestionIndex];
    const isCorrect = idx === currentQ.correct;
    const timeLeft = session.endTime - now;
    const duration = currentQ.duration * 1000;
    const bonus = isCorrect ? Math.round(500 + (500 * (Math.max(0, timeLeft) / duration))) : 0;
    
    setResult({ correct: isCorrect, score: bonus });

    // 2. Update Session State
    const sessionRef = doc(db, 'artifacts', appId, 'sessions', pin);
    const updatePayload = {};
    updatePayload[`players.${user.uid}.lastAnswerIdx`] = idx;
    if (isCorrect) updatePayload[`players.${user.uid}.score`] = (session.players[user.uid]?.score || 0) + bonus;
    await updateDoc(sessionRef, updatePayload);

    // 3. Log Statistical Data
    const statsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'history');
    await addDoc(statsRef, {
      quizId: session.quizId,
      questionText: currentQ.text,
      timestamp: serverTimestamp(),
      timeTakenMs: duration - timeLeft,
      isCorrect: isCorrect,
      pointsEarned: bonus
    });
    
    // 4. Update Global User Stats
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      totalScore: increment(bonus),
      questionsAnswered: increment(1),
      correctAnswers: increment(isCorrect ? 1 : 0)
    });
  };

  if (step === 'JOIN') return (
    <div className="max-w-md mx-auto pt-20 p-6">
      <Button variant="secondary" onClick={onBack} className="mb-8">Back</Button>
      <div className="bg-white p-8 rounded-2xl shadow border border-[#DADCE0] space-y-6">
        <h2 className="text-2xl font-bold">Join Game</h2>
        <Input label="Game PIN" value={pin} onChange={setPin} type="tel" placeholder="000000" />
        {errorMsg && <p className="text-[#EA4335] text-sm font-bold bg-red-50 p-2 rounded">{errorMsg}</p>}
        <Input label="Nickname" value={nickname} onChange={setNickname} />
        <Button onClick={joinGame} className="w-full" loading={isJoining}>Enter</Button>
      </div>
    </div>
  );

  if (!session) return <div className="p-8 text-center">Syncing to Mohoot mainframe...</div>;

  if (session.status === 'LOBBY') return (
    <div className="h-screen bg-[#4285F4] text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-bold mb-4">You're In.</h1>
      <p className="opacity-80">Eyes on the screen.</p>
      <div className="mt-8 bg-white/20 px-8 py-3 rounded-full font-bold text-xl">{nickname}</div>
    </div>
  );

  if (session.status === 'QUESTION') {
    if (hasAnswered) return (
      <div className="h-screen bg-[#F8F9FA] flex flex-col items-center justify-center">
         <Loader2 size={48} className="text-[#1967D2] animate-spin mb-4" />
         <h2 className="text-xl font-bold text-[#202124]">Answer Locked</h2>
      </div>
    );
    return (
       <div className="h-screen grid grid-cols-2 gap-4 p-4 bg-white">
          {SHAPES.map((s, i) => (
             <Button key={i} variant="shape" className={s.color} onClick={() => submitAnswer(i)}>
                <div className="bg-black/20 w-20 h-20 rounded-full flex items-center justify-center">
                   {React.createElement(s.icon, { size: 40, fill: "white" })}
                </div>
             </Button>
          ))}
       </div>
    );
  }

  if (session.status === 'LEADERBOARD' || session.status === 'FINISHED') {
    const isCorrect = result?.correct;
    return (
       <div className={`h-screen flex flex-col items-center justify-center text-white ${isCorrect ? 'bg-[#34A853]' : 'bg-[#EA4335]'}`}>
          <div className="bg-white/20 p-8 rounded-full mb-6">
             {isCorrect ? <CheckCircle2 size={80} /> : <XCircle size={80} />}
          </div>
          <h2 className="text-4xl font-black mb-2">{isCorrect ? "Correct" : "Miss"}</h2>
          {isCorrect && <div className="text-2xl font-medium">+{result?.score}</div>}
          <div className="mt-12 bg-black/10 px-10 py-5 rounded-2xl backdrop-blur-md text-center">
             <span className="opacity-75 text-xs font-bold uppercase tracking-widest block mb-2">Current Score</span>
             <span className="text-4xl font-black">{session.players[user.uid]?.score}</span>
          </div>
       </div>
    );
  }
  return <div>Wait...</div>;
};