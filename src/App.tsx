import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  FormEvent,
} from 'react';
import './index.css'; // We need this for the basic layout and component styles.

// ============================================================================
// Type Definitions
// ============================================================================
type AppView = 'dashboard' | 'assessment' | 'logger' | 'progress' | 'ai_coach';

// ============================================================================+
// Additional Types & Utilities                                                +
// ============================================================================+

interface Session {
  id: string;
  date: string;
  duration: number;
  carbs: number;
  symptomSeverity: number;
  sport: string;
  rpe: number;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

// Minimal localStorage hook for chat/session data
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

// Quick date helper
const niceDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });

// Mock sessions so AI has something to analyse
const mockSessions: Session[] = [
  { id: '1', date: '2025-07-05', duration: 90, carbs: 70, symptomSeverity: 3, sport: 'Cycling', rpe: 6 },
  { id: '2', date: '2025-07-06', duration: 60, carbs: 45, symptomSeverity: 2, sport: 'Running', rpe: 7 },
];

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
    </div>
  </header>
);

const Footer: React.FC = () => (
  <footer className="bg-slate-800 text-slate-400 text-xs text-center py-4 mt-12">
    <p>&copy; {new Date().getFullYear()} NooMinds Ltd. All Rights Reserved.</p>
    <a href="https://www.noominds.com" target="_blank" rel="noopener noreferrer" className="transition-colors" style={{color: '#EF6A3E'}}>
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
// Page Components
// ============================================================================

interface DashboardProps {
  onNavigate: (view: AppView) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
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
              <p className="text-3xl font-bold text-slate-800">45<span className="text-lg font-medium text-slate-500">g/hr</span></p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-slate-500">Target Carb Intake</p>
              <p className="text-3xl font-bold" style={{color: '#EF6A3E'}}>90<span className="text-lg font-medium text-slate-500">g/hr</span></p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-slate-500">Sessions Logged</p>
              <p className="text-3xl font-bold text-slate-800">{mockSessions.length}</p>
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
              <h3 className="font-semibold mb-2" style={{color: '#EF6A3E'}}>4. Talk to AI Carb Coach</h3>
              <p className="text-sm flex-grow mb-4" style={{color: '#C2410C'}}>Get real-time guidance and answers from your AI coach.</p>
              <button onClick={() => onNavigate('ai_coach')} className="btn btn-primary w-full">Ask AI Coach</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AICoach: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [messages, setMessages] = useLocalStorage<Message[]>('noominds-chat', []);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- 1. SECURE API KEY HANDLING ---
  // Vite exposes environment variables prefixed with "VITE_" on the `import.meta.env` object.
  // To set this up:
  //   1. Create a file named `.env` in the root of your project.
  //   2. Add this line to it: VITE_OPENAI_API_KEY="sk-your-actual-key-here"
  //   3. Restart your development server.
  //   4. Add `.env` to your `.gitignore` file to keep your key secret!
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  const isApiConfigured = OPENAI_API_KEY && OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        text: "Hi Craig! I'm your AI Carb Coach. I have access to your training data. How can I help you today?",
        sender: 'ai',
        timestamp: new Date().toISOString()
      }]);
    }
  }, [setMessages]);

  const getFallbackResponse = (userInput: string): string => {
    const lowerCaseInput = userInput.toLowerCase();
    if (lowerCaseInput.includes("last session")) {
      const last = mockSessions[mockSessions.length - 1];
      const carbRate = last.duration > 0 ? (last.carbs / (last.duration / 60)).toFixed(0) : 'N/A';
      return `Looking at your last session on ${niceDate(last.date)}:\n- Sport: ${last.sport}\n- Carb Rate: ~${carbRate} g/hr\n- Symptom Score: ${last.symptomSeverity}/10\nThis was a solid session with manageable symptoms. How did your energy feel?`;
    }
    if (lowerCaseInput.includes("bloated") || lowerCaseInput.includes("cramps")) {
      return "Bloating is common when adapting. Try these tips:\n1. **Split your intake**: Half a gel every 20 mins instead of a full one.\n2. **Dilute drinks**: If your drink is too concentrated, it can slow stomach emptying.\n3. **Check carb type**: Some people tolerate maltodextrin/glucose better than fructose initially.";
    }
    if (lowerCaseInput.includes("next target")) {
      const avgCarbRate = mockSessions.reduce((sum, s) => sum + (s.carbs / (s.duration / 60)), 0) / mockSessions.length;
      return `Your current average is around ${avgCarbRate.toFixed(0)} g/hr. A good next step is to target about ${Number(avgCarbRate.toFixed(0)) + 5} g/hr in your next long session. Remember to increase gradually!`;
    }
    return "That's a great question. For specific product recommendations or complex issues, consulting a human sports nutritionist is best. I can help you analyze your logged sessions and plan your progression.";
  };

  const getAIResponse = async (userInput: string): Promise<string> => {
    if (!isApiConfigured) {
      return getFallbackResponse(userInput);
    }

    try {
      const recent = mockSessions.slice(-3).map(s => ({
        date: s.date, sport: s.sport, duration: s.duration, carbs: s.carbs, symptom: s.symptomSeverity
      }));

      const prompt = `
You are AI Carb Coach, the digital extension of Craig Elliott – lead Sports Nutritionist at NooMinds Ltd.
Craig specialises in gut-training endurance athletes to tolerate 60-120 g/h carbohydrates.
Areas of expertise you must cover clearly:
• Progressive gut training protocols (frequency, timelines, overload of CHO)  
• Race-day fueling strategies and pacing of intake  
• Hydration & electrolyte guidelines (practical mg Na/hr ranges)  
• Product recommendations (Maurten, SiS Beta Fuel, Precision, etc.) with reasoning  
• GI-symptom troubleshooting (bloating, cramps, nausea)  
• Behavioural coaching – encouragement, next-step targets.

When you answer:
• Be concise, actionable & professional, like a paid consultation.  
• Reference the athlete’s data when relevant.  
• Use bullet-points where helpful.  
• End with a motivating closing line.

Athlete’s recent sessions (latest 3):
${JSON.stringify(recent, null, 2)}

User question: "${userInput}"
      `;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'system', content: 'You are AI Carb Coach – expert sports-nutrition assistant.' }, { role: 'user', content: prompt }],
          temperature: 0.7, max_tokens: 400,
        }),
      });

      const data = await response.json();
      const answer = data?.choices?.[0]?.message?.content?.trim();
      if (!answer) throw new Error('Empty response from OpenAI');
      return answer;
    } catch (err) {
      console.error('OpenAI error → using fallback:', err);
      return getFallbackResponse(userInput) + `\n\n_(Real-AI temporarily unavailable – showing basic advice.)_`;
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    const userMessage: Message = { id: Date.now().toString(), text, sender: 'user', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    
    setIsTyping(true);
    const aiResponseText = await getAIResponse(text);
    setIsTyping(false);

    const aiMessage: Message = { id: (Date.now() + 1).toString(), text: aiResponseText, sender: 'ai', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, aiMessage]);
  };

  const suggestionPrompts = ["Analyze my last session", "What's my next carb target?", "What should I do if I feel bloated?"];

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-slate-900">AI Carb Coach</h1>
        <p className="mt-2 text-lg text-slate-600">Ask me anything about your gut training journey.</p>
      </header>
      <div className="card h-[70vh] flex flex-col">
        {!isApiConfigured && (
          <div className="p-2 text-center bg-yellow-100 text-yellow-800 text-xs rounded-md mb-4 border border-yellow-200">
            <strong>Demonstration Mode:</strong> API key not configured. Responses are pre-programmed.
          </div>
        )}
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
              <div className="max-w-md p-3 rounded-lg bg-slate-100"><div className="flex items-center gap-1"><span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span><span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span><span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span></div></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="pt-4 mt-4 border-t">
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestionPrompts.map(prompt => <button key={prompt} onClick={() => handleSend(prompt)} className="btn btn-outline text-xs !py-1 !px-2">{prompt}</button>)}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleSend(input); setInput(''); }} className="flex gap-2">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question..." className="form-input flex-grow" disabled={isTyping} />
            <button type="submit" className="btn btn-primary" disabled={isTyping || !input.trim()}>Send</button>
          </form>
        </div>
      </div>
      <div className="text-center mt-6">
        <button onClick={onBack} className="btn btn-primary">Back to Dashboard</button>
      </div>
    </div>
  );
};

// Placeholder for other pages to ensure navigation works
const PlaceholderPage: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <div className="max-w-4xl mx-auto">
    <header className="mb-8">
      <h1 className="text-slate-900">{title}</h1>
      <p className="mt-2 text-lg text-slate-600">This feature is coming soon!</p>
    </header>
    <div className="card text-center">
      <p className="text-slate-500 italic">This section is under construction.</p>
      <div className="mt-6">
        <button onClick={onBack} className="btn btn-primary">Back to Dashboard</button>
      </div>
    </div>
  </div>
);

// ============================================================================
// Main App Component (View Controller)
// ============================================================================

function App() {
  // This state controls which "page" is visible.
  const [currentView, setCurrentView] = useState<AppView>('dashboard');

  const navigateTo = (view: AppView) => setCurrentView(view);

  // This function decides which component to render based on the currentView state.
  const renderView = () => {
    switch (currentView) {
      case 'assessment':
        return <PlaceholderPage title="Athlete Assessment" onBack={() => navigateTo('dashboard')} />;
      case 'logger':
        return <PlaceholderPage title="Log a Session" onBack={() => navigateTo('dashboard')} />;
      case 'progress':
        return <PlaceholderPage title="Your Progress" onBack={() => navigateTo('dashboard')} />;
      case 'ai_coach':
        return <AICoach onBack={() => navigateTo('dashboard')} />;
      case 'dashboard':
      default:
        return <Dashboard onNavigate={navigateTo} />;
    }
  };

  return (
    <Layout>
      {renderView()}
    </Layout>
  );
}

export default App;
