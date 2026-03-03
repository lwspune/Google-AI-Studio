import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  CheckCircle2, 
  XCircle,
  BookOpen, 
  Trophy, 
  Cloud,
  CloudOff,
  RefreshCw,
  User,
  LogOut,
  Settings,
  Info,
  ExternalLink,
  BrainCircuit,
  BarChart3,
  PieChart as PieChartIcon,
  ListFilter,
  ArrowRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { VOCAB_DATA, VocabWord } from './data/vocab';

type MasteryStatus = 'learning' | 'reviewing' | 'mastered';

interface UserProgress {
  [wordId: string]: MasteryStatus;
}

export default function App() {
  const [currentDeck, setCurrentDeck] = useState<'common' | 'basic' | 'advanced' | 'daily' | null>(null);
  const [viewMode, setViewMode] = useState<'study' | 'quiz' | 'daily_quiz'>('study');
  const [sessionQueue, setSessionQueue] = useState<VocabWord[]>([]);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizAnswered, setQuizAnswered] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showVocabList, setShowVocabList] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [adminStats, setAdminStats] = useState<any[]>([]);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem('nda_vocab_user_email');
  });
  const [userName, setUserName] = useState<string | null>(() => {
    return localStorage.getItem('nda_vocab_user_name');
  });
  const [userPhone, setUserPhone] = useState<string | null>(() => {
    return localStorage.getItem('nda_vocab_user_phone');
  });
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'common' | 'basic' | 'advanced'>('all');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem('nda_vocab_progress');
    return saved ? JSON.parse(saved) : {};
  });

  // Initial Sync from Server
  useEffect(() => {
    if (!userEmail) return;
    
    const fetchProgress = async () => {
      setIsSyncing(true);
      try {
        const response = await fetch(`/api/progress/${userEmail}`);
        if (response.ok) {
          const data = await response.json();
          // Merge logic: prefer server progress if it exists
          if (data.progress && Object.keys(data.progress).length > 0) {
            setProgress(prev => ({ ...prev, ...data.progress }));
            setLastSynced(new Date());
          }
          if (data.profile) {
            if (data.profile.name) {
              setUserName(data.profile.name);
              localStorage.setItem('nda_vocab_user_name', data.profile.name);
            }
            if (data.profile.phone) {
              setUserPhone(data.profile.phone);
              localStorage.setItem('nda_vocab_user_phone', data.profile.phone);
            }
          }
        }
      } catch (error) {
        console.error("Sync fetch failed:", error);
      } finally {
        setIsSyncing(false);
      }
    };
    fetchProgress();
  }, [userEmail]);

  // Sync to Server on changes
  useEffect(() => {
    localStorage.setItem('nda_vocab_progress', JSON.stringify(progress));
    if (!userEmail) return;
    
    // Debounced sync to server
    const timeoutId = setTimeout(async () => {
      setIsSyncing(true);
      try {
        await fetch(`/api/progress/${userEmail}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            progress,
            profile: {
              name: userName,
              phone: userPhone
            }
          })
        });
        setLastSynced(new Date());
      } catch (error) {
        console.error("Sync push failed:", error);
      } finally {
        setIsSyncing(false);
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeoutId);
  }, [progress, userEmail]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    // Validation
    const email = emailInput.trim().toLowerCase();
    if (!email.endsWith('@gmail.com')) {
      setLoginError("Please enter a valid Gmail address (@gmail.com).");
      return;
    }

    if (nameInput.trim().length < 2) {
      setLoginError("Please enter your full name.");
      return;
    }

    if (phoneInput.trim().length < 10) {
      setLoginError("Please enter a valid phone number.");
      return;
    }

    setUserEmail(email);
    setUserName(nameInput.trim());
    setUserPhone(phoneInput.trim());
    
    localStorage.setItem('nda_vocab_user_email', email);
    localStorage.setItem('nda_vocab_user_name', nameInput.trim());
    localStorage.setItem('nda_vocab_user_phone', phoneInput.trim());
  };

  const handleLogout = () => {
    setUserEmail(null);
    setUserName(null);
    setUserPhone(null);
    localStorage.removeItem('nda_vocab_user_email');
    localStorage.removeItem('nda_vocab_user_name');
    localStorage.removeItem('nda_vocab_user_phone');
    setEmailInput('');
    setNameInput('');
    setPhoneInput('');
    setShowAdminDashboard(false);
  };

  const fetchAdminStats = async () => {
    setIsAdminLoading(true);
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setAdminStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
    } finally {
      setIsAdminLoading(false);
    }
  };

  useEffect(() => {
    if (showAdminDashboard) {
      fetchAdminStats();
    }
  }, [showAdminDashboard]);

  // Initialize session queue when deck is selected
  useEffect(() => {
    if (currentDeck) {
      let initialQueue: VocabWord[] = [];
      
      if (currentDeck === 'daily') {
        // Daily Quiz Logic: 15 random words, prioritizing learning/unstarted
        const allWords = [...VOCAB_DATA];
        const learning = allWords.filter(w => progress[w.id] === 'learning');
        const unstarted = allWords.filter(w => !progress[w.id]);
        const mastered = allWords.filter(w => progress[w.id] === 'mastered');
        
        // Combine and shuffle
        const pool = [...learning, ...unstarted, ...mastered];
        initialQueue = pool.slice(0, 15).sort(() => Math.random() - 0.5);
        setViewMode('daily_quiz');
      } else {
        const deckWords = VOCAB_DATA.filter(w => w.difficulty === currentDeck);
        // For Quiz, we might want all words or just unmastered ones
        const unmastered = deckWords.filter(w => progress[w.id] !== 'mastered');
        initialQueue = viewMode === 'quiz' 
          ? [...deckWords].sort(() => Math.random() - 0.5) // Shuffle for quiz
          : (unmastered.length > 0 ? unmastered : deckWords);
      }
      
      setSessionQueue(initialQueue);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsSessionComplete(false);
      setQuizScore(0);
      setQuizAnswered(null);
    } else {
      setSessionQueue([]);
      setIsSessionComplete(false);
    }
  }, [currentDeck, viewMode]);

  // Generate Quiz Options
  useEffect(() => {
    if ((viewMode === 'quiz' || viewMode === 'daily_quiz') && currentWord) {
      const pool = currentDeck === 'daily' ? VOCAB_DATA : VOCAB_DATA.filter(w => w.difficulty === currentDeck);
      const otherWords = pool.filter(w => w.id !== currentWord.id);
      const distractors = [...otherWords]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(w => w.definition);
      
      const options = [...distractors, currentWord.definition].sort(() => Math.random() - 0.5);
      setQuizOptions(options);
      setQuizAnswered(null);
    }
  }, [currentIndex, sessionQueue, viewMode]);

  const currentWord = sessionQueue[currentIndex];

  const handleMasteryUpdate = (status: MasteryStatus) => {
    if (!currentWord) return;

    setProgress(prev => ({
      ...prev,
      [currentWord.id]: status
    }));

    if (status === 'learning') {
      // SRS Logic: Re-queue the word at the end of the current session
      setSessionQueue(prev => [...prev, currentWord]);
    }

    // Auto-advance after small delay
    setTimeout(() => {
      handleNext();
    }, 300);
  };

  const handleQuizAnswer = (option: string) => {
    if (quizAnswered || !currentWord) return;
    setQuizAnswered(option);
    
    if (option === currentWord.definition) {
      setQuizScore(prev => prev + 1);
      // Mark as mastered if correct in quiz
      setProgress(prev => ({
        ...prev,
        [currentWord.id]: 'mastered'
      }));
    }
  };

  const handleNext = () => {
    if (currentIndex < sessionQueue.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      setIsSessionComplete(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  const resetDeck = () => {
    if (currentDeck) {
      const deckWords = VOCAB_DATA.filter(w => w.difficulty === currentDeck);
      setSessionQueue(deckWords);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsSessionComplete(false);
    }
  };

  const getMasteryCount = (deck: string) => {
    const deckWords = VOCAB_DATA.filter(w => w.difficulty === deck);
    return deckWords.filter(w => progress[w.id] === 'mastered').length;
  };

  const getLearningCount = (deck: string) => {
    const deckWords = VOCAB_DATA.filter(w => w.difficulty === deck);
    return deckWords.filter(w => progress[w.id] === 'learning').length;
  };

  const overallStats = useMemo(() => {
    const mastered = Object.values(progress).filter(s => s === 'mastered').length;
    const learning = Object.values(progress).filter(s => s === 'learning').length;
    const total = VOCAB_DATA.length;
    const unstarted = total - mastered - learning;

    const pieData = [
      { name: 'Mastered', value: mastered, color: '#10b981' },
      { name: 'Learning', value: learning, color: '#f59e0b' },
      { name: 'Unstarted', value: unstarted, color: '#e5e7eb' },
    ];

    const barData = (['common', 'basic', 'advanced'] as const).map(d => ({
      name: d.charAt(0).toUpperCase() + d.slice(1),
      mastered: getMasteryCount(d),
      learning: getLearningCount(d),
      total: VOCAB_DATA.filter(w => w.difficulty === d).length,
    }));

    const filteredVocab = VOCAB_DATA.filter(w => {
      const matchesSearch = w.word.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           w.definition.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDifficulty = filterDifficulty === 'all' || w.difficulty === filterDifficulty;
      return matchesSearch && matchesDifficulty;
    });

    return { mastered, learning, total, unstarted, pieData, barData, filteredVocab };
  }, [progress, searchTerm, filterDifficulty]);

  if (showAdminDashboard && userEmail === 'connect.lwspune@gmail.com') {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
        <header className="p-6 flex items-center justify-between border-b border-black/5 bg-white sticky top-0 z-20">
          <button 
            onClick={() => setShowAdminDashboard(false)}
            className="flex items-center gap-2 text-sm font-medium hover:text-emerald-600 transition-colors"
          >
            <ChevronLeft size={20} />
            Back
          </button>
          <h1 className="text-xl font-bold">Teacher Dashboard</h1>
          <div className="w-[100px] flex justify-end">
            <button 
              onClick={fetchAdminStats}
              className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-full transition-colors"
              title="Refresh Stats"
            >
              <RefreshCw size={20} className={isAdminLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-8">
          <div className="bg-white p-8 rounded-[40px] card-shadow overflow-hidden">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <User size={20} className="text-emerald-500" />
              Student Progress Overview
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="pb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Student Info</th>
                    <th className="pb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Mastered</th>
                    <th className="pb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Learning</th>
                    <th className="pb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Last Active</th>
                    <th className="pb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {adminStats.map((stat) => {
                    const total = VOCAB_DATA.length;
                    const percentage = Math.round((stat.mastered / total) * 100);
                    return (
                      <tr key={stat.email} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="py-4">
                          <div className="font-bold text-sm">{stat.name}</div>
                          <div className="text-xs text-muted-foreground">{stat.email}</div>
                          <div className="text-[10px] font-mono text-emerald-600 mt-1">{stat.phone}</div>
                        </td>
                        <td className="py-4 font-mono text-emerald-600 font-bold">{stat.mastered}</td>
                        <td className="py-4 font-mono text-amber-600 font-bold">{stat.learning}</td>
                        <td className="py-4 text-xs text-muted-foreground">
                          {new Date(stat.lastActive).toLocaleDateString()} {new Date(stat.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-4">
                          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-emerald-600 mt-1 block">{percentage}%</span>
                        </td>
                      </tr>
                    );
                  })}
                  {adminStats.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground">
                        No student progress data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F8F9FA]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-[40px] card-shadow max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <User size={40} className="text-emerald-600" />
          </div>
          <h1 className="text-3xl font-serif italic mb-2">Welcome, Student!</h1>
          <p className="text-muted-foreground mb-8">
            Complete your profile to sync your vocabulary progress.
          </p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="text-left">
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground ml-4 mb-1 block">
                  Full Name
                </label>
                <input 
                  type="text" 
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-6 py-4 bg-[#F8F9FA] border border-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div className="text-left">
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground ml-4 mb-1 block">
                  Gmail Address
                </label>
                <input 
                  type="email" 
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full px-6 py-4 bg-[#F8F9FA] border border-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div className="text-left">
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground ml-4 mb-1 block">
                  Phone Number
                </label>
                <input 
                  type="tel" 
                  required
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-6 py-4 bg-[#F8F9FA] border border-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            {loginError && (
              <p className="text-rose-500 text-xs font-medium">{loginError}</p>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
            >
              Start Mastering
              <ArrowRight size={18} />
            </button>
          </form>
          
          <p className="mt-8 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            NDA Preparation
          </p>
          
          {userEmail === 'connect.lwspune@gmail.com' && (
            <button 
              onClick={() => setShowAdminDashboard(true)}
              className="mt-6 text-[10px] font-mono uppercase tracking-widest text-emerald-600 hover:underline"
            >
              Teacher Dashboard
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  if (showVocabList) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
        <header className="p-6 flex items-center justify-between border-b border-black/5 bg-white sticky top-0 z-20">
          <button 
            onClick={() => setShowVocabList(false)}
            className="flex items-center gap-2 text-sm font-medium hover:text-emerald-600 transition-colors"
          >
            <ChevronLeft size={20} />
            Back to Home
          </button>
          <h1 className="text-xl font-bold">Vocabulary List</h1>
          <div className="w-[100px]"></div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-6">
          <div className="bg-white p-6 rounded-[32px] card-shadow space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <input 
                  type="text"
                  placeholder="Search words or definitions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-3 bg-[#F8F9FA] border border-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                <ListFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              </div>
              <div className="flex gap-2">
                {(['all', 'common', 'basic', 'advanced'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setFilterDifficulty(d)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                      filterDifficulty === d 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-[#F8F9FA] text-muted-foreground hover:bg-emerald-50'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
              Showing {overallStats.filteredVocab.length} of {VOCAB_DATA.length} words
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overallStats.filteredVocab.map((word) => (
              <div key={word.id} className="bg-white p-6 rounded-3xl card-shadow border-l-4 border-emerald-500 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-serif italic">{word.word}</h3>
                  <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md ${
                    word.difficulty === 'advanced' ? 'bg-rose-50 text-rose-600' :
                    word.difficulty === 'basic' ? 'bg-blue-50 text-blue-600' :
                    'bg-emerald-50 text-emerald-600'
                  }`}>
                    {word.difficulty}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{word.definition}</p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">({word.partOfSpeech})</span>
                  {progress[word.id] === 'mastered' && (
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }
  if (showSummary) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
        <header className="p-6 flex items-center justify-between border-b border-black/5 bg-white sticky top-0 z-20">
          <button 
            onClick={() => setShowSummary(false)}
            className="flex items-center gap-2 text-sm font-medium hover:text-emerald-600 transition-colors"
          >
            <ChevronLeft size={20} />
            Back to Home
          </button>
          <h1 className="text-xl font-bold">Mastery Summary</h1>
          <div className="w-[100px] flex justify-end gap-2">
            {userEmail === 'connect.lwspune@gmail.com' && (
              <button 
                onClick={() => setShowAdminDashboard(true)}
                className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-full transition-colors"
                title="Teacher Dashboard"
              >
                <User size={20} />
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-rose-50 text-rose-600 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-8">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl card-shadow border-b-4 border-emerald-500">
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="text-emerald-500" size={20} />
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Mastered</span>
              </div>
              <p className="text-4xl font-mono font-bold">{overallStats.mastered}</p>
              <p className="text-xs text-muted-foreground mt-1">Words fully learned</p>
            </div>
            <div className="bg-white p-6 rounded-3xl card-shadow border-b-4 border-amber-500">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="text-amber-500" size={20} />
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Learning</span>
              </div>
              <p className="text-4xl font-mono font-bold">{overallStats.learning}</p>
              <p className="text-xs text-muted-foreground mt-1">Words in progress</p>
            </div>
            <div className="bg-white p-6 rounded-3xl card-shadow border-b-4 border-gray-300">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="text-gray-400" size={20} />
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Total Words</span>
              </div>
              <p className="text-4xl font-mono font-bold">{overallStats.total}</p>
              <p className="text-xs text-muted-foreground mt-1">In your vocabulary list</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[40px] card-shadow">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <PieChartIcon size={20} className="text-emerald-500" />
                Mastery Distribution
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={overallStats.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {overallStats.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] card-shadow">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <BarChart3 size={20} className="text-emerald-500" />
                Progress by Deck
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overallStats.barData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="mastered" fill="#10b981" name="Mastered" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="learning" fill="#f59e0b" name="Learning" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Learning List */}
          <div className="bg-white p-8 rounded-[40px] card-shadow">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Clock size={20} className="text-amber-500" />
              Currently Learning
            </h3>
            {overallStats.learning > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {VOCAB_DATA.filter(w => progress[w.id] === 'learning').map(word => (
                  <div 
                    key={word.id}
                    className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center"
                  >
                    <p className="font-serif italic text-amber-900">{word.word}</p>
                    <p className="text-[10px] uppercase tracking-tighter text-amber-600 font-mono">{word.difficulty}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No words in the learning queue yet.</p>
                <button 
                  onClick={() => setShowSummary(false)}
                  className="mt-4 text-emerald-600 font-bold flex items-center gap-2 mx-auto"
                >
                  Start studying <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (!currentDeck) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F8F9FA]">
        {/* Sync Status Header */}
        <div className="absolute top-6 right-6 flex items-center gap-3 bg-white px-4 py-2 rounded-full card-shadow border border-black/5">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Sync Status</span>
            <span className="text-[11px] font-bold text-emerald-600 truncate max-w-[150px]">{userEmail}</span>
          </div>
          <div className="flex items-center gap-1 border-l border-black/5 pl-2 ml-1">
            {isSyncing ? (
              <RefreshCw size={16} className="text-emerald-600 animate-spin" />
            ) : (
              <Cloud size={16} className="text-emerald-600" />
            )}
            <button 
              onClick={handleLogout}
              className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <BrainCircuit className="text-emerald-600" size={48} />
          </div>
          <h1 className="text-5xl font-serif italic mb-4 text-[#1A1A1A]">NDA Vocab Master</h1>
          <p className="text-muted-foreground max-w-md mx-auto mb-2">
            Master high-frequency vocabulary for the National Defence Academy entrance exam.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-mono uppercase tracking-widest mb-8">
            <BookOpen size={12} />
            {VOCAB_DATA.length} Total Words Available
          </div>
          
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => setCurrentDeck('daily')}
              className="px-8 py-4 bg-emerald-600 text-white rounded-2xl flex items-center gap-3 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 group"
            >
              <Trophy size={24} />
              <div className="text-left">
                <p className="font-bold text-lg">Daily Mastery Quiz</p>
                <p className="text-[10px] uppercase tracking-widest opacity-80">15 Questions • Random Mix</p>
              </div>
              <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </button>

            <button 
              onClick={() => setShowVocabList(true)}
              className="px-8 py-4 bg-white card-shadow rounded-2xl flex items-center gap-3 hover:bg-emerald-50 transition-colors group"
            >
              <BookOpen size={24} className="text-emerald-600" />
              <div className="text-left">
                <p className="font-bold text-lg">Vocabulary List</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">View All {VOCAB_DATA.length} Words</p>
              </div>
            </button>

            <button 
              onClick={() => setShowSummary(true)}
              className="px-8 py-4 bg-white card-shadow rounded-2xl flex items-center gap-3 hover:bg-emerald-50 transition-colors group"
            >
              <BarChart3 size={24} className="text-emerald-600" />
              <div className="text-left">
                <p className="font-bold text-lg">Progress Stats</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">View Mastery Level</p>
              </div>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          {(['common', 'basic', 'advanced'] as const).map((difficulty) => {
            const mastered = getMasteryCount(difficulty);
            const total = VOCAB_DATA.filter(w => w.difficulty === difficulty).length;
            const percentage = Math.round((mastered / total) * 100);

            return (
              <motion.div
                key={difficulty}
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-3xl card-shadow text-left group relative overflow-hidden"
              >
                <div className="relative z-10">
                  <span className="text-xs font-mono uppercase tracking-widest text-emerald-600 mb-2 block">
                    {difficulty}
                  </span>
                  <h2 className="text-2xl font-bold capitalize mb-4">{difficulty} Words</h2>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-mono font-medium">{mastered}/{total}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-tighter">Mastered</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => { setViewMode('study'); setCurrentDeck(difficulty); }}
                        className="px-6 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                      >
                        Study Cards
                      </button>
                      <button 
                        onClick={() => { setViewMode('quiz'); setCurrentDeck(difficulty); }}
                        className="px-6 py-2 bg-white border-2 border-emerald-600 text-emerald-600 text-xs font-bold rounded-xl hover:bg-emerald-50 transition-colors"
                      >
                        Take Quiz
                      </button>
                    </div>
                  </div>
                </div>
                <div 
                  className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${percentage}%` }}
                />
              </motion.div>
            );
          })}
        </div>

        <footer className="mt-16 text-xs text-muted-foreground font-mono uppercase tracking-widest flex flex-col items-center gap-4">
          <div className="flex items-center gap-4">
            <span>NDA Preparation</span>
          </div>
          {userEmail === 'connect.lwspune@gmail.com' && (
            <button 
              onClick={() => setShowAdminDashboard(true)}
              className="text-emerald-600 hover:underline"
            >
              Teacher Dashboard
            </button>
          )}
        </footer>
      </div>
    );
  }

  if (isSessionComplete) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-[40px] card-shadow text-center max-w-md w-full"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy size={40} className="text-emerald-600" />
          </div>
          <h2 className="text-3xl font-serif italic mb-4">Session Complete!</h2>
          <p className="text-muted-foreground mb-8">
            Great job! You've worked through all the words in this session.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => setShowSummary(true)}
              className="w-full py-4 bg-emerald-50 text-emerald-700 rounded-2xl font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
            >
              <BarChart3 size={20} />
              View Mastery Summary
            </button>
            <button 
              onClick={() => {
                setIsSessionComplete(false);
                const deckWords = VOCAB_DATA.filter(w => w.difficulty === currentDeck);
                const unmastered = deckWords.filter(w => progress[w.id] !== 'mastered');
                setSessionQueue(unmastered.length > 0 ? unmastered : deckWords);
                setCurrentIndex(0);
              }}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-colors"
            >
              Start New Session
            </button>
            <button 
              onClick={() => setCurrentDeck(null)}
              className="w-full py-4 bg-white border border-black/5 rounded-2xl font-bold hover:bg-black/5 transition-colors"
            >
              Back to Decks
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center justify-between border-b border-black/5 bg-white">
        <button 
          onClick={() => setCurrentDeck(null)}
          className="flex items-center gap-2 text-sm font-medium hover:text-emerald-600 transition-colors"
        >
          <ChevronLeft size={20} />
          Back to Decks
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Current Deck</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold capitalize">{currentDeck === 'daily' ? 'Daily Mastery' : currentDeck} Words</span>
            {currentDeck !== 'daily' && (
              <div className="flex bg-[#F8F9FA] p-1 rounded-lg border border-black/5">
                <button 
                  onClick={() => setViewMode('study')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === 'study' ? 'bg-white shadow-sm text-emerald-600' : 'text-muted-foreground'}`}
                >
                  Study
                </button>
                <button 
                  onClick={() => setViewMode('quiz')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === 'quiz' ? 'bg-white shadow-sm text-emerald-600' : 'text-muted-foreground'}`}
                >
                  Quiz
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="w-[100px] flex justify-end gap-2">
          <div className="flex items-center gap-2 mr-2">
            {isSyncing ? (
              <RefreshCw size={14} className="text-emerald-600 animate-spin" />
            ) : (
              <Cloud size={14} className="text-emerald-600" />
            )}
          </div>
          <button 
            onClick={() => setShowSummary(true)}
            className="p-2 hover:bg-black/5 rounded-full transition-colors"
          >
            <BarChart3 size={20} />
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-black/5 w-full">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / sessionQueue.length) * 100}%` }}
          className="h-full bg-emerald-500"
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl perspective-1000">
          <AnimatePresence mode="wait">
            {currentWord && viewMode === 'study' && (
              <motion.div
                key={`study-${currentWord.id}-${currentIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="relative w-full aspect-[3/4] sm:aspect-[4/3]"
              >
                <motion.div
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className="w-full h-full relative preserve-3d cursor-pointer"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  {/* Front */}
                  <div className="absolute inset-0 backface-hidden bg-white rounded-[32px] sm:rounded-[40px] card-shadow flex flex-col items-center justify-center p-8 sm:p-12">
                    <span className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] text-emerald-600 mb-4 sm:6">
                      Card {currentIndex + 1} of {sessionQueue.length}
                    </span>
                    <h2 className="text-4xl sm:text-6xl font-serif italic text-center mb-4 break-words w-full">
                      {currentWord.word}
                    </h2>
                    <p className="text-xs sm:text-sm font-mono text-muted-foreground lowercase">
                      ({currentWord.partOfSpeech})
                    </p>
                    <div className="mt-8 sm:12 flex items-center gap-2 text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-widest">
                      <RotateCcw size={14} />
                      Tap to flip
                    </div>
                  </div>

                  {/* Back */}
                  <div 
                    className="absolute inset-0 backface-hidden bg-white rounded-[32px] sm:rounded-[40px] card-shadow p-6 sm:p-10 flex flex-col overflow-y-auto"
                    style={{ transform: 'rotateY(180deg)' }}
                  >
                    <div className="mb-4 sm:mb-6">
                      <h3 className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-emerald-600 mb-1 sm:2">Definition</h3>
                      <p className="text-lg sm:text-xl leading-relaxed">{currentWord.definition}</p>
                    </div>

                    <div className="mb-4 sm:mb-6">
                      <h3 className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-emerald-600 mb-1 sm:2">Example</h3>
                      <p className="text-xs sm:text-sm italic text-muted-foreground leading-relaxed">
                        "{currentWord.example}"
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto pt-4 border-t border-black/5">
                      <div>
                        <h3 className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-emerald-600 mb-1">Synonyms</h3>
                        <div className="flex flex-wrap gap-1">
                          {currentWord.synonyms.map(s => (
                            <span key={s} className="text-[10px] sm:text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{s}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-rose-600 mb-1">Antonyms</h3>
                        <div className="flex flex-wrap gap-1">
                          {currentWord.antonyms.map(a => (
                            <span key={a} className="text-[10px] sm:text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">{a}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {currentWord && (viewMode === 'quiz' || viewMode === 'daily_quiz') && (
              <motion.div
                key={`${viewMode}-${currentWord.id}-${currentIndex}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full bg-white rounded-[40px] card-shadow p-8 sm:p-12"
              >
                <div className="text-center mb-8">
                  <span className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] text-emerald-600 mb-4 block">
                    {viewMode === 'daily_quiz' ? 'Daily Quiz' : 'Practice Quiz'} • Question {currentIndex + 1} of {sessionQueue.length}
                  </span>
                  <h2 className="text-4xl sm:text-5xl font-serif italic mb-2">
                    {currentWord.word}
                  </h2>
                  <p className="text-xs font-mono text-muted-foreground">
                    Choose the correct definition:
                  </p>
                </div>

                <div className="space-y-3">
                  {quizOptions.map((option, idx) => {
                    const isCorrect = option === currentWord.definition;
                    const isSelected = quizAnswered === option;
                    
                    let bgClass = "bg-[#F8F9FA] border-black/5 hover:border-emerald-500";
                    if (quizAnswered) {
                      if (isCorrect) bgClass = "bg-emerald-100 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500 ring-offset-2";
                      else if (isSelected) bgClass = "bg-rose-100 border-rose-500 text-rose-900";
                      else bgClass = "bg-[#F8F9FA] border-black/5 opacity-50";
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleQuizAnswer(option)}
                        disabled={!!quizAnswered}
                        className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-start gap-4 ${bgClass}`}
                      >
                        <span className="font-mono text-xs mt-1 opacity-50">{String.fromCharCode(65 + idx)}.</span>
                        <span className="text-sm sm:text-base leading-snug">{option}</span>
                      </button>
                    );
                  })}
                </div>

                {quizAnswered && quizAnswered !== currentWord.definition && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl"
                  >
                    <h4 className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 mb-1">Explanation / Hint</h4>
                    <p className="text-sm italic text-emerald-900">
                      "{currentWord.example}"
                    </p>
                    {currentWord.synonyms.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-[10px] font-mono text-emerald-600 uppercase mr-1">Synonyms:</span>
                        {currentWord.synonyms.map(s => (
                          <span key={s} className="text-[10px] bg-white text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">{s}</span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                <div className="mt-8 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy size={18} className="text-emerald-500" />
                    <span className="text-sm font-bold">Score: {quizScore}</span>
                  </div>
                  {quizAnswered && (
                    <div className="flex flex-col items-end gap-2">
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`text-sm font-bold flex items-center gap-2 ${
                          quizAnswered === currentWord.definition ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {quizAnswered === currentWord.definition ? (
                          <>
                            <CheckCircle2 size={18} />
                            Correct!
                          </>
                        ) : (
                          <>
                            <XCircle size={18} />
                            Incorrect
                          </>
                        )}
                      </motion.div>
                      <button 
                        onClick={handleNext}
                        className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                      >
                        Next Word
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        {viewMode === 'study' && (
          <div className="mt-8 sm:12 flex flex-col sm:flex-row items-center gap-6 sm:gap-8 w-full max-w-xl">
            <div className="flex items-center justify-between w-full sm:w-auto sm:gap-8">
              <button 
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="p-4 rounded-full bg-white card-shadow disabled:opacity-30 active:scale-95 transition-all"
                aria-label="Previous word"
              >
                <ChevronLeft size={24} />
              </button>

              <div className="flex gap-2 sm:gap-3">
                <button 
                  onClick={() => handleMasteryUpdate('learning')}
                  className={`px-4 sm:px-6 py-3 rounded-2xl font-medium text-xs sm:text-sm transition-all active:scale-95 ${
                    progress[currentWord?.id] === 'learning' 
                    ? 'bg-amber-100 text-amber-700 border-2 border-amber-200' 
                    : 'bg-white card-shadow'
                  }`}
                >
                  Learning
                </button>
                <button 
                  onClick={() => handleMasteryUpdate('mastered')}
                  className={`px-4 sm:px-6 py-3 rounded-2xl font-medium text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 ${
                    progress[currentWord?.id] === 'mastered' 
                    ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-200' 
                    : 'bg-white card-shadow'
                  }`}
                >
                  <CheckCircle2 size={18} className="hidden sm:block" />
                  Mastered
                </button>
              </div>

              <button 
                onClick={handleNext}
                className="p-4 rounded-full bg-white card-shadow active:scale-95 transition-all"
                aria-label="Next word"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer Stats */}
      <footer className="p-4 sm:p-6 bg-white border-t border-black/5 flex items-center justify-around sm:justify-center gap-4 sm:gap-12">
        <div className="flex items-center gap-2 sm:gap-3">
          <BookOpen size={18} className="text-muted-foreground" />
          <div>
            <p className="text-[9px] sm:text-xs font-mono uppercase tracking-tighter text-muted-foreground">Session</p>
            <p className="text-xs sm:text-sm font-bold">{currentIndex + 1}/{sessionQueue.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Trophy size={18} className="text-emerald-500" />
          <div>
            <p className="text-[9px] sm:text-xs font-mono uppercase tracking-tighter text-muted-foreground">Mastered</p>
            <p className="text-sm font-bold text-emerald-600">{getMasteryCount(currentDeck)}</p>
          </div>
        </div>
        <button 
          onClick={resetDeck}
          className="flex items-center gap-1 sm:gap-2 text-[9px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-black transition-colors"
        >
          <RotateCcw size={14} />
          <span className="hidden xs:inline">Reset</span>
        </button>
      </footer>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
}
