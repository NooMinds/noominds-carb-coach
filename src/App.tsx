
import React, { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import './index.css'; // Make sure our styles are imported

// ============================================================================
// Type Definitions
// ============================================================================

// Utility: consistent short-date formatter (e.g., “Jun 20”)
const formatShortDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

interface Session {
  id: string;
  date: string;
  sport: string;
  duration: number; // in minutes
  intensity: 'Low' | 'Moderate' | 'High' | 'Mixed';
  carbs: number; // in grams
  fluids: number; // in ml
  symptomSeverity: number; // 0-10
  symptomTypes: string[];
  rpe: number; // 1-10
  notes: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

type AppView = 'dashboard' | 'assessment' | 'logger' | 'progress' | 'ai_coach';

// ============================================================================
// Mock Data & LocalStorage Hook
// ============================================================================

const mockSessions: Session[] = [
  { id: '1', date: '2025-06-20', sport: 'Cycling', duration: 120, intensity: 'Moderate', carbs: 80, fluids: 1000, symptomSeverity: 3, symptomTypes: ['Bloating'], rpe: 6, notes: 'Felt pretty good, slight bloating after 90 mins.' },
  { id: '2', date: '2025-06-22', sport: 'Running', duration: 60, intensity: 'High', carbs: 60, fluids: 750, symptomSeverity: 2, symptomTypes: [], rpe: 8, notes: 'Hard interval session. Fueling felt solid.' },
  { id: '3', date: '2025-06-25', sport: 'Cycling', duration: 150, intensity: 'Moderate', carbs: 125, fluids: 1250, symptomSeverity: 4, symptomTypes: ['Bloating', 'Cramps'], rpe: 7, notes: 'Pushed the carbs to 50g/hr. Felt it a bit.' },
  { id: '4', date: '2025-06-28', sport: 'Cycling', duration: 90, intensity: 'Low', carbs: 50, fluids: 800, symptomSeverity: 1, symptomTypes: [], rpe: 4, notes: 'Easy spin, focused on consistent sipping.' },
];

// Custom hook to manage state with localStorage
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

// ============================================================================
// Branding & Layout Components
// ============================================================================

const Header: React.FC = () => (
  <header className="bg-slate-800 text-white shadow-md">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
      <div className="flex items-center">
        <div className="w-8 h-8 mr-3 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{backgroundColor: '#EF6A3E'}}>
          N
        </div>
        <span className="text-2xl font-bold">NooMinds</span>
      </div>
      {/* Tagline removed as per user request */}
    </div>
  </header>
);

const Footer: React.FC = () => (
  <footer className="bg-slate-800 text-slate-400 text-xs text-center py-4 mt-12">
    <p>&copy; {new Date().getFullYear()} NooMinds Ltd. All Rights Reserved.</p>
    <a href="https://www.noominds.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-orange transition-colors" style={{color: '#EF6A3E'}}>
      www.noominds.com
    </a>
  </footer>
);

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-slate-50">
    <Header />
    <main className="p-4 sm:p-6 lg:p-8">
      {children}
    </main>
    <Footer />
  </div>
);


// ============================================================================
// Main App Component (View Controller)
// ============================================================================

function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [sessions, setSessions] = useLocalStorage<Session[]>('noominds-sessions', mockSessions);

  const addSession = (newSession: Session) => {
    setSessions(prevSessions => [...prevSessions, newSession]);
  };

  const navigateTo = (view: AppView) => setCurrentView(view);

  let viewComponent;
  switch (currentView) {
    case 'assessment':
      viewComponent = <AssessmentForm onBackToDashboard={() => navigateTo('dashboard')} />;
      break;
    case 'logger':
      viewComponent = <SessionLogger onAddSession={addSession} onBackToDashboard={() => navigateTo('dashboard')} />;
      break;
    case 'progress':
      viewComponent = <ProgressCharts sessions={sessions} onBackToDashboard={() => navigateTo('dashboard')} />;
      break;
    case 'ai_coach':
      viewComponent = <AICoach sessions={sessions} onBackToDashboard={() => navigateTo('dashboard')} />;
      break;
    case 'dashboard':
    default:
      viewComponent = <Dashboard onNavigate={navigateTo} sessionsCount={sessions.length} />;
      break;
  }

  return <Layout>{viewComponent}</Layout>;
}

// ============================================================================
// Dashboard Component
// ============================================================================

interface DashboardProps {
  onNavigate: (view: AppView) => void;
  sessionsCount: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, sessionsCount }) => {
  const stats = {
    currentCarbIntake: 45,
    targetCarbIntake: 90,
  };

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-slate-900">NooMinds Focus, Energy, Performance</h1>
        <p className="mt-2 text-lg text-slate-600">
          Welcome back, <span className="font-bold" style={{color: '#EF6A3E'}}>Craig Elliott</span>! Let's optimize your fueling.
        </p>
      </header>

      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-slate-700">Your Weekly Snapshot</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-sm text-slate-500">Current Carb Intake</p>
              <p className="text-3xl font-bold text-slate-800">{stats.currentCarbIntake}<span className="text-lg font-medium text-slate-500">g/hr</span></p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-slate-500">Target Carb Intake</p>
              <p className="text-3xl font-bold" style={{color: '#EF6A3E'}}>{stats.targetCarbIntake}<span className="text-lg font-medium text-slate-500">g/hr</span></p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-slate-500">Sessions Logged</p>
              <p className="text-3xl font-bold text-slate-800">{sessionsCount}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-slate-700">Get Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card flex flex-col items-center text-center">
              <h3 className="font-semibold mb-2">1. Start Your Assessment</h3>
              <p className="text-sm text-slate-600 flex-grow mb-4">Generate your personalized gut training plan.</p>
              <button onClick={() => onNavigate('assessment')} className="btn btn-primary w-full">Start Assessment</button>
            </div>
            <div className="card flex flex-col items-center text-center">
              <h3 className="font-semibold mb-2">2. Log a Training Session</h3>
              <p className="text-sm text-slate-600 flex-grow mb-4">Track your nutrition, symptoms, and performance.</p>
              <button onClick={() => onNavigate('logger')} className="btn btn-outline w-full">Log Session</button>
            </div>
            <div className="card flex flex-col items-center text-center">
              <h3 className="font-semibold mb-2">3. View Your Progress</h3>
              <p className="text-sm text-slate-600 flex-grow mb-4">See how your carb tolerance improves over time.</p>
              <button onClick={() => onNavigate('progress')} className="btn btn-outline w-full">View Progress</button>
            </div>
            <div className="card flex flex-col items-center text-center" style={{backgroundColor: 'rgba(239, 106, 62, 0.1)', borderColor: 'rgba(239, 106, 62, 0.3)', borderWidth: '1px', borderStyle: 'solid'}}>
              <h3 className="font-semibold mb-2" style={{color: '#EF6A3E'}}>4. Talk to AI Coach</h3>
              <p className="text-sm flex-grow mb-4" style={{color: '#C2410C'}}>Get real-time guidance and answers from your AI coach.</p>
              <button onClick={() => onNavigate('ai_coach')} className="btn btn-primary w-full">Ask Coach Noo</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// AI Chat Coach Component
// ============================================================================

interface AICoachProps {
  sessions: Session[];
  onBackToDashboard: () => void;
}

const AICoach: React.FC<AICoachProps> = ({ sessions, onBackToDashboard }) => {
  const [messages, setMessages] = useLocalStorage<Message[]>('noominds-chat-history', []);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);
  
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        text: "Hi Craig! I'm Coach Noo, your AI gut training assistant. I have access to your training data. How can I help you today?",
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const getAIResponse = async (userInput: string, userSessions: Session[]): Promise<string> => {
    const lastSession = userSessions.length > 0 ? userSessions[userSessions.length - 1] : null;
    const lowerCaseInput = userInput.toLowerCase();
    
    const avgCarbRate = userSessions.length > 0 ? 
      (userSessions.reduce((sum, s) => sum + (s.duration > 0 ? s.carbs / (s.duration / 60) : 0), 0) / userSessions.length) : 45;
    const avgSymptoms = userSessions.length > 0 ? 
      (userSessions.reduce((sum, s) => sum + s.symptomSeverity, 0) / userSessions.length) : 0;
    const recentSessions = userSessions.slice(-3);
    const improvementTrend = recentSessions.length >= 2 ? 
      recentSessions[recentSessions.length - 1].symptomSeverity - recentSessions[0].symptomSeverity : 0;

    // --- Placeholder for real OpenAI API call ---
    /*
    const OPENAI_API_KEY = 'YOUR_API_KEY_HERE';
    const prompt = `
      You are Coach Noo, an expert sports nutrition AI specializing in gut training for endurance athletes.
      User question: "${userInput}"
      
      User's profile:
      - Average carb rate: ${avgCarbRate.toFixed(1)} g/hr
      - Average symptom severity: ${avgSymptoms.toFixed(1)}/10
      - Recent trend: ${improvementTrend > 0 ? 'symptoms increasing' : improvementTrend < 0 ? 'symptoms improving' : 'stable'}
      - Total sessions logged: ${userSessions.length}
      
      Recent training data: ${JSON.stringify(recentSessions, null, 2)}
      
      Provide expert, personalized advice based on current gut training research.
    `;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'user', content: prompt }] }),
      });
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      return "I'm having trouble connecting right now. Please try again later.";
    }
    */

    // --- Enhanced AI Response Logic ---
    if (lowerCaseInput.includes("analyze") && lowerCaseInput.includes("last session")) {
      if (lastSession) {
        const carbRate = lastSession.duration > 0 ? (lastSession.carbs / (lastSession.duration / 60)).toFixed(0) : 'N/A';
        const performance = lastSession.rpe <= 5 ? "easy" : lastSession.rpe <= 7 ? "moderate" : "hard";
        const sessionFeedback = lastSession.symptomSeverity <= 2 ? "excellent tolerance" : lastSession.symptomSeverity <= 5 ? "manageable symptoms" : "challenging session";
        return `📊 **Analysis of your ${formatShortDate(lastSession.date)} session:**\n\n**The Numbers:**\n- ${lastSession.sport} for ${lastSession.duration} mins (${performance} effort)\n- Carb rate: ${carbRate} g/hr\n- Hydration: ${lastSession.fluids}ml\n- Symptom score: ${lastSession.symptomSeverity}/10 (${sessionFeedback})\n\n**What this tells me:**\n${carbRate !== 'N/A' && Number(carbRate) >= 60 ? `✅ Strong carb intake rate - you're in the optimal range for endurance performance.` : `⚠️ Room to increase carb intake - aim for 60-90g/hr for sessions over 90 mins.`}\n\n${lastSession.symptomSeverity <= 3 ? `🎯 Your gut handled this well! Consider pushing carbs by 5-10g/hr next time.` : `🔧 Some GI stress noted. Next session, try smaller, more frequent doses.`}\n\n**Next steps:** ${lastSession.symptomSeverity <= 2 ? "You're ready to progress!" : "Focus on consistency at this level first."}`;
      }
      return "Log a session first, and I'll provide detailed analysis!";
    }

    if (lowerCaseInput.includes("bloated") || lowerCaseInput.includes("nausea") || lowerCaseInput.includes("stomach")) {
      const commonIssues = lowerCaseInput.includes("bloated") ? "bloating" : lowerCaseInput.includes("nausea") ? "nausea" : "stomach issues";
      return `💡 **Dealing with ${commonIssues}? Here's your action plan:**\n\n**Immediate fixes:**\n1. **Slow your intake pace** - Try 15-20g every 15 mins instead of larger doses\n2. **Dilute your drinks** - Too concentrated = slower gastric emptying\n3. **Check the temperature** - Cool (not ice cold) fluids empty faster\n\n**Product strategy:**\n- Stick to glucose/maltodextrin for now (easier to digest)\n- Avoid fructose until your gut adapts\n\nYour symptoms are normal during gut training - you're literally teaching your gut to work harder! 💪`;
    }

    if (lowerCaseInput.includes("product") || lowerCaseInput.includes("recommend")) {
      return `🥤 **Fueling product recommendations for your ${avgCarbRate.toFixed(0)}g/hr target:**\n\n**Sports Drinks:**\n- Maurten 320: 79g carbs per 500ml\n- SiS Beta Fuel: 80g per 500ml (2:1 ratio)\n\n**Gels:**\n- Maurten Gel 100: 25g carbs\n- SiS Beta Fuel gel: 40g carbs\n\n**For your current level:**\n${avgCarbRate < 50 ? "Start with 1 gel every 30 mins + sports drink" : "Try 1 gel every 20 mins + concentrated sports drink"}\n\n**Pro tip:** Test everything in training first!`;
    }

    if (lowerCaseInput.includes("target") || lowerCaseInput.includes("next") || lowerCaseInput.includes("goal")) {
      const nextTarget = Math.min(Number(avgCarbRate) + 10, 120);
      return `🎯 **Your personalized progression plan:**\n\n**Current status:** ${avgCarbRate.toFixed(0)}g/hr average\n**Next target:** ${nextTarget}g/hr\n**Strategy:** ${nextTarget <= 60 ? "Add 1 extra gel per long session" : "Increase drink concentration + maintain gel frequency"}\n\n${improvementTrend < 0 ? "🔥 Great news - your symptoms are improving! You're adapting well." : "📈 You're maintaining good consistency. Ready to progress!"}`;
    }

    if (lowerCaseInput.includes("race") || lowerCaseInput.includes("event")) {
      const raceRate = Math.min(avgCarbRate * 0.9, 90);
      return `🏁 **Race day fueling strategy:**\n\n**Your race carb target:** ${raceRate.toFixed(0)}g/hr\n\n**Pre-race (2-3 hours before):**\n- 1-4g carbs per kg body weight\n- Familiar foods only\n\n**During race:**\n- Start at 15-20 minutes\n- Set watch alarms every 15-20 minutes as reminders\n\nNever try anything new on race day!`;
    }

    if (lowerCaseInput.includes("why") || lowerCaseInput.includes("how") || lowerCaseInput.includes("science")) {
      return `🧠 **The science of gut training:**\n\nWhen you gut train, you increase SGLT1 transporters (more "doors" for glucose), speed up gastric emptying, and improve glucose oxidation. This allows you to absorb more carbs (90-120g/hr with multiple types like glucose + fructose) and perform better. Your body is literally learning to be more efficient!`;
    }
    
    return `🤔 **Interesting question!** I'm best at:\n- **Training analysis:** "Analyze my last session"\n- **Progression planning:** "What's my next target?" \n- **Problem solving:** "I'm getting bloated"\n- **Product advice:** "What gels work best?"\n\nHow can I help you fuel smarter? 🚀`;
  };

  const handleSend = async (messageText?: string) => {
    const text = messageText || input;
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const aiResponseText = await getAIResponse(text, sessions);
    
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1200);
  };

  const suggestionPrompts = [
    "Analyze my last session",
    "What's my next carb target?",
    "What should I do if I feel bloated?",
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-slate-900">AI Chat Coach</h1>
        <p className="mt-2 text-lg text-slate-600">Ask "Coach Noo" anything about your gut training journey.</p>
      </header>

      <div className="card h-[70vh] flex flex-col">
        <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
              {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">AI</div>}
              <div className={`max-w-md p-3 rounded-lg ${msg.sender === 'user' ? 'text-white' : 'bg-slate-100'}`} style={msg.sender === 'user' ? {backgroundColor: '#EF6A3E'} : {}}>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                <p className="text-xs opacity-70 mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              {msg.sender === 'user' && <div className="w-8 h-8 rounded-full text-white flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{backgroundColor: '#EF6A3E'}}>CE</div>}
            </div>
          ))}
          {isTyping && (
            <div className="flex items-end gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">AI</div>
              <div className="max-w-md p-3 rounded-lg bg-slate-100">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="pt-4 mt-4 border-t">
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestionPrompts.map(prompt => (
              <button key={prompt} onClick={() => handleSend(prompt)} className="btn btn-outline text-xs !py-1 !px-2">{prompt}</button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="form-input flex-grow"
              disabled={isTyping}
            />
            <button type="submit" className="btn btn-primary" disabled={isTyping || !input.trim()}>Send</button>
          </form>
        </div>
      </div>
       <div className="text-center mt-6">
        <button onClick={onBackToDashboard} className="btn btn-primary">Back to Dashboard</button>
      </div>
    </div>
  );
};


// ============================================================================
// Assessment Form Component (from previous step)
// ============================================================================

const AssessmentForm: React.FC<{ onBackToDashboard: () => void; }> = ({ onBackToDashboard }) => {
    const [formData, setFormData] = useState({ name: 'Craig Elliott', primarySport: 'Cycling', weeklyVolume: '10', intensity: 'Moderate', currentCarbIntake: '45', fuelSources: ['Gels', 'Drinks'], hasGiSymptoms: true, symptomSeverity: '4', symptomTypes: ['Bloating'], targetCarbGoal: '90' });
    const [isSubmitted, setIsSubmitted] = useState(false);
    const handleSubmit = (e: FormEvent) => { e.preventDefault(); setIsSubmitted(true); };

    if (isSubmitted) {
        return (
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 text-center"><h1 className="text-slate-900">Assessment Results Summary</h1></header>
                <div className="card"><p>Summary of results for {formData.name}...</p></div>
                <div className="text-center mt-6"><button onClick={onBackToDashboard} className="btn btn-primary">Back to Dashboard</button></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-8"><h1 className="text-slate-900">Athlete Assessment Form</h1></header>
            <form onSubmit={handleSubmit} className="card space-y-8">
                <p>Full assessment form fields would be here...</p>
                <div className="flex justify-between items-center pt-8 border-t">
                    <button type="button" onClick={onBackToDashboard} className="btn btn-outline">Back to Dashboard</button>
                    <button type="submit" className="btn btn-primary">Submit for Analysis</button>
                </div>
            </form>
        </div>
    );
};


// ============================================================================
// Session Logger Component
// ============================================================================

interface SessionLoggerProps {
  onAddSession: (session: Session) => void;
  onBackToDashboard: () => void;
}

const SessionLogger: React.FC<SessionLoggerProps> = ({ onAddSession, onBackToDashboard }) => {
  const [formState, setFormState] = useState<Omit<Session, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    sport: 'Cycling',
    duration: 90,
    intensity: 'Moderate',
    carbs: 60,
    fluids: 750,
    symptomSeverity: 0,
    symptomTypes: [],
    rpe: 5,
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formState, string>>>({});

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isNumeric = ['duration', 'carbs', 'fluids', 'symptomSeverity', 'rpe'].includes(name);
    setFormState(prev => ({ ...prev, [name]: isNumeric ? Number(value) : value }));
  };

  const handleSymptomChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormState(prev => {
      const currentSymptoms = prev.symptomTypes;
      if (checked) {
        return { ...prev, symptomTypes: [...currentSymptoms, value] };
      } else {
        return { ...prev, symptomTypes: currentSymptoms.filter(symptom => symptom !== value) };
      }
    });
  };

  const validate = () => {
    const newErrors: typeof errors = {};
    if (formState.duration <= 0) newErrors.duration = "Duration must be positive.";
    if (formState.carbs < 0) newErrors.carbs = "Carbs cannot be negative.";
    if (formState.fluids < 0) newErrors.fluids = "Fluids cannot be negative.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onAddSession({ ...formState, id: new Date().toISOString() });
      alert('Session logged successfully!');
      onBackToDashboard();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-slate-900">Log a Training Session</h1>
        <p className="mt-2 text-lg text-slate-600">Track your fueling and symptoms to see your progress.</p>
      </header>

      <form onSubmit={handleSubmit} className="card space-y-8">
        <fieldset>
          <legend>1. Session Details</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="form-label">Date</label><input type="date" name="date" value={formState.date} onChange={handleChange} className="form-input" /></div>
            <div><label className="form-label">Sport</label><select name="sport" value={formState.sport} onChange={handleChange} className="form-select"><option>Cycling</option><option>Running</option><option>Triathlon</option><option>Other</option></select></div>
            <div><label className="form-label">Duration (minutes)</label><input type="number" name="duration" value={formState.duration} onChange={handleChange} className="form-input" /><p className="text-red-500 text-xs">{errors.duration}</p></div>
            <div><label className="form-label">Intensity</label><select name="intensity" value={formState.intensity} onChange={handleChange} className="form-select"><option>Low</option><option>Moderate</option><option>High</option><option>Mixed</option></select></div>
          </div>
        </fieldset>

        <fieldset>
          <legend>2. Nutrition & Hydration</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="form-label">Total Carbs Consumed (grams)</label><input type="number" name="carbs" value={formState.carbs} onChange={handleChange} className="form-input" /><p className="text-red-500 text-xs">{errors.carbs}</p></div>
            <div><label className="form-label">Total Fluids Consumed (ml)</label><input type="number" name="fluids" value={formState.fluids} onChange={handleChange} className="form-input" /><p className="text-red-500 text-xs">{errors.fluids}</p></div>
          </div>
        </fieldset>

        <fieldset>
          <legend>3. GI Symptoms & Performance</legend>
          <div><label className="form-label">Overall Symptom Severity (0=None, 10=Severe)</label><input type="range" min="0" max="10" name="symptomSeverity" value={formState.symptomSeverity} onChange={handleChange} className="w-full" /><div className="text-center font-bold" style={{color: '#EF6A3E'}}>{formState.symptomSeverity}</div></div>
          <div>
              <label className="form-label">Symptom Types</label>
              <div className="flex flex-wrap gap-4 mt-2">
                  {['Nausea', 'Bloating', 'Cramps', 'Reflux', 'Diarrhea'].map(type => (
                      <label key={type}><input type="checkbox" value={type} checked={formState.symptomTypes.includes(type)} onChange={handleSymptomChange} className="form-checkbox" /> {type}</label>
                  ))}
              </div>
          </div>
          <div><label className="form-label">Rate of Perceived Exertion (RPE, 1-10)</label><input type="range" min="1" max="10" name="rpe" value={formState.rpe} onChange={handleChange} className="w-full" /><div className="text-center font-bold" style={{color: '#EF6A3E'}}>{formState.rpe}</div></div>
        </fieldset>

        <fieldset>
          <legend>4. Notes</legend>
          <div><label className="form-label">Any other observations?</label><textarea name="notes" value={formState.notes} onChange={handleChange} className="form-input" rows={4} placeholder="e.g., What specific products did you use? How was your energy?" /></div>
        </fieldset>
        
        <div className="flex justify-between items-center pt-8 border-t">
          <button type="button" onClick={onBackToDashboard} className="btn btn-outline">Cancel</button>
          <button type="submit" className="btn btn-primary">Log Session</button>
        </div>
      </form>
    </div>
  );
};


// ============================================================================
// Progress Charts Component (FIXED AND IMPROVED)
// ============================================================================

interface ProgressChartsProps {
  sessions: Session[];
  onBackToDashboard: () => void;
}

const ProgressCharts: React.FC<ProgressChartsProps> = ({ sessions, onBackToDashboard }) => {
  const sortedSessions = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const totalSessions = sortedSessions.length;
  
  const avgCarbs = totalSessions > 0 ? (sortedSessions.reduce((sum, s) => {
    const carbRate = s.duration > 0 ? s.carbs / (s.duration / 60) : 0;
    return sum + carbRate;
  }, 0) / totalSessions).toFixed(1) : 0;
  
  const avgSymptoms = totalSessions > 0 ? (sortedSessions.reduce((sum, s) => sum + s.symptomSeverity, 0) / totalSessions).toFixed(1) : 0;
  
  const maxCarbRate = sortedSessions.length > 0 ? Math.max(...sortedSessions.map(s => s.duration > 0 ? s.carbs / (s.duration / 60) : 0), 90) : 90;
  const maxSymptomScore = 10;

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-slate-900">Your Progress</h1>
        <p className="mt-2 text-lg text-slate-600">Track your gut training journey and celebrate your milestones.</p>
      </header>

      <main className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card text-center"><p className="text-sm text-slate-500">Total Sessions</p><p className="text-3xl font-bold">{totalSessions}</p></div>
          <div className="card text-center"><p className="text-sm text-slate-500">Avg. Carb Rate</p><p className="text-3xl font-bold">{avgCarbs} <span className="text-lg">g/hr</span></p></div>
          <div className="card text-center"><p className="text-sm text-slate-500">Avg. Symptom Score</p><p className="text-3xl font-bold">{avgSymptoms}<span className="text-lg">/10</span></p></div>
        </div>

        {/* Carb Intake Chart */}
        <div className="card">
          <h3 className="font-semibold mb-4" style={{color: '#EF6A3E'}}>Carb Intake Trend (g/hr)</h3>
          <div key={`carb-chart-${sessions.length}`} className="h-48 bg-slate-50 rounded p-2 flex items-end justify-around border relative">
            {sortedSessions.map(session => {
              const carbRate = session.duration > 0 ? session.carbs / (session.duration / 60) : 0;
              const barHeight = `${(carbRate / maxCarbRate) * 100}%`;
              return (
                <div key={session.id} className="w-1/2 flex flex-col items-center justify-end" title={`Carb Rate: ${carbRate.toFixed(0)} g/hr on ${session.date}`}>
                  <div className="text-xs font-bold mb-1" style={{color: '#EF6A3E'}}>{carbRate.toFixed(0)}</div>
                  <div className="w-6 rounded-t" style={{ height: barHeight, backgroundColor: '#EF6A3E' }}></div>
                  <div className="text-xs mt-1">{formatShortDate(session.date)}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-xs text-slate-600">
            <h4 className="font-semibold mb-1">Data Points:</h4>
            <table className="w-full text-left"><thead><tr><th className="p-1 border-b">Date</th><th className="p-1 border-b">Value (g/hr)</th></tr></thead>
              <tbody>{sortedSessions.map(s => <tr key={s.id}><td className="p-1 border-b">{formatShortDate(s.date)}</td><td className="p-1 border-b">{(s.duration > 0 ? s.carbs / (s.duration / 60) : 0).toFixed(1)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>

        {/* Symptom Severity Chart */}
        <div className="card">
          <h3 className="font-semibold mb-4 text-red-700">GI Symptom Severity Trend (0-10)</h3>
          <div key={`symptom-chart-${sessions.length}`} className="h-48 bg-slate-50 rounded p-2 flex items-end justify-around border">
            {sortedSessions.map(session => {
              const barHeight = `${(session.symptomSeverity / maxSymptomScore) * 100}%`;
              return (
                <div key={session.id} className="w-1/2 flex flex-col items-center justify-end" title={`Symptom Score: ${session.symptomSeverity}/10 on ${session.date}`}>
                  <div className="text-xs font-bold text-red-600 mb-1">{session.symptomSeverity}/10</div>
                  <div className="w-6 bg-red-500 rounded-t" style={{ height: barHeight }}></div>
                  <div className="text-xs mt-1">{formatShortDate(session.date)}</div>
                </div>
              );
            })}
          </div>
           <div className="mt-4 text-xs text-slate-600">
            <h4 className="font-semibold mb-1">Data Points:</h4>
            <table className="w-full text-left"><thead><tr><th className="p-1 border-b">Date</th><th className="p-1 border-b">Value (Score)</th></tr></thead>
              <tbody>{sortedSessions.map(s => <tr key={s.id}><td className="p-1 border-b">{formatShortDate(s.date)}</td><td className="p-1 border-b">{s.symptomSeverity}</td></tr>)}</tbody>
            </table>
           </div>
        </div>

        <div className="text-center">
          <button onClick={onBackToDashboard} className="btn btn-primary">Back to Dashboard</button>
        </div>
      </main>
    </div>
  );
};

export default App;
```
