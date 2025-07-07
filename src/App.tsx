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
type AppView =
  | 'dashboard'
  | 'assessment'
  | 'logger'
  | 'progress'
  | 'event_planner'
  | 'ai_coach';

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
  fluids: number; // Added for comprehensive logging
  notes: string; // Added for qualitative feedback
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

// Helper function to calculate average carb rate ONLY for sessions > 60 minutes
const calculateFilteredAvgCarb = (sessions: Session[]): { avg: number; count: number } => {
  const longSessions = sessions.filter(s => s.duration > 60);
  if (longSessions.length === 0) {
    return { avg: 0, count: 0 };
  }
  const totalCarbRate = longSessions.reduce((sum, s) => {
    return sum + (s.carbs / (s.duration / 60));
  }, 0);
  return {
    avg: totalCarbRate / longSessions.length,
    count: longSessions.length,
  };
};

// Mock sessions so AI has something to analyse
const mockSessions: Session[] = [
  { id: '1', date: '2025-07-05', duration: 90, carbs: 70, symptomSeverity: 3, sport: 'Cycling', rpe: 6, fluids: 900, notes: "Felt strong, slight stomach awareness late on." },
  { id: '2', date: '2025-07-06', duration: 60, carbs: 45, symptomSeverity: 2, sport: 'Running', rpe: 7, fluids: 600, notes: "Tempo run. This session should be ignored in avg calc." },
  { id: '3', date: '2025-07-07', duration: 120, carbs: 100, symptomSeverity: 1, sport: 'Cycling', rpe: 5, fluids: 1200, notes: "Long ride, fueling felt great." },
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
  sessionsCount: number;
  avgCarb: number;
  longSessionsCount: number;
}

const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  sessionsCount,
  avgCarb,
  longSessionsCount,
}) => {
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
              <p className="text-3xl font-bold text-slate-800">
                {isNaN(avgCarb) || avgCarb === 0 ? '--' : avgCarb.toFixed(0)}
                <span className="text-lg font-medium text-slate-500">g/hr</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">(from {longSessionsCount} sessions &gt; 60 min)</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-slate-500">Target Carb Intake</p>
              <p className="text-3xl font-bold" style={{color: '#EF6A3E'}}>90<span className="text-lg font-medium text-slate-500">g/hr</span></p>
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
              <h3 className="font-semibold mb-2">3. Event Day Planner</h3>
              <p className="text-sm text-slate-600 flex-grow mb-4">Track readiness for your goal event.</p>
              <button onClick={() => onNavigate('event_planner')} className="btn btn-outline w-full">Open Planner</button>
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
      const { avg } = calculateFilteredAvgCarb(mockSessions);
      return `Your current average is around ${avg.toFixed(0)} g/hr. A good next step is to target about ${Number(avg.toFixed(0)) + 5} g/hr in your next long session. Remember to increase gradually!`;
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
• Respond in **3-5 bullet points, max 100 words total**.  
• Each bullet = clear action item or key takeaway.  
• Mobile-friendly wording (short sentences).  
• Reference the athlete’s data when relevant.  
• Close with **one short motivational line**.

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

const SessionLogger: React.FC<{ onAddSession: (session: Session) => void; onBack: () => void }> = ({ onAddSession, onBack }) => {
  const [formState, setFormState] = useState<Omit<Session, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    sport: 'Cycling',
    duration: 90,
    carbs: 60,
    fluids: 750,
    symptomSeverity: 0,
    rpe: 5,
    notes: '',
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isNumeric = ['duration', 'carbs', 'fluids', 'symptomSeverity', 'rpe'].includes(name);
    setFormState(prev => ({ ...prev, [name]: isNumeric ? Number(value) : value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onAddSession({ ...formState, id: new Date().toISOString() });
    alert('Session logged successfully!');
    onBack();
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
            <div><label className="form-label">Sport</label><select name="sport" value={formState.sport} onChange={handleChange} className="form-select"><option>Cycling</option><option>Running</option><option>Swimming</option><option>Triathlon</option><option>Other</option></select></div>
            <div><label className="form-label">Duration (minutes)</label><input type="number" name="duration" value={formState.duration} onChange={handleChange} className="form-input" /></div>
            <div><label className="form-label">Rate of Perceived Exertion (RPE, 1-10)</label><input type="range" min="1" max="10" name="rpe" value={formState.rpe} onChange={handleChange} className="w-full" /><div className="text-center font-bold" style={{color: '#EF6A3E'}}>{formState.rpe}</div></div>
          </div>
        </fieldset>

        <fieldset>
          <legend>2. Nutrition & Hydration</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="form-label">Total Carbs Consumed (grams)</label><input type="number" name="carbs" value={formState.carbs} onChange={handleChange} className="form-input" /></div>
            <div><label className="form-label">Total Fluids Consumed (ml)</label><input type="number" name="fluids" value={formState.fluids} onChange={handleChange} className="form-input" /></div>
          </div>
        </fieldset>

        <fieldset>
          <legend>3. GI Symptoms</legend>
          <div><label className="form-label">Overall Symptom Severity (0=None, 10=Severe)</label><input type="range" min="0" max="10" name="symptomSeverity" value={formState.symptomSeverity} onChange={handleChange} className="w-full" /><div className="text-center font-bold" style={{color: '#EF6A3E'}}>{formState.symptomSeverity}</div></div>
        </fieldset>
        
        <fieldset>
          <legend>4. Notes</legend>
          <div><label className="form-label">Any other observations?</label><textarea name="notes" value={formState.notes} onChange={handleChange} className="form-input" rows={4} placeholder="e.g., What specific products did you use? How was your energy?" /></div>
        </fieldset>
        
        <div className="flex justify-between items-center pt-8 border-t">
          <button type="button" onClick={onBack} className="btn btn-outline">Cancel</button>
          <button type="submit" className="btn btn-primary">Log Session</button>
        </div>
      </form>
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

interface EventDetails {
  name: string;
  date: string; // ISO
  type: string;
  targetCarb: number;
}

const EventDayPlanner: React.FC<{ sessions: Session[]; onBack: () => void }> = ({
  sessions,
  onBack,
}) => {
  // persist event details
  const [event, setEvent] = useLocalStorage<EventDetails>('noominds-event', {
    name: '',
    date: '',
    type: 'Cycling',
    targetCarb: 90,
  });

  // form local state for edits
  const [draft, setDraft] = useState<EventDetails>(event);
  const [editing, setEditing] = useState(!event.name); // if empty, open edit mode

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setDraft((p) => ({ ...p, [name]: name === 'targetCarb' ? Number(value) : value }));
  };

  const saveEvent = () => {
    setEvent(draft);
    setEditing(false);
  };

  // --- metrics ---
  const { avg: avgCarb, count: longSessionsCount } = calculateFilteredAvgCarb(sessions);

  const target = draft.targetCarb || 1; // avoid /0
  const readiness = Math.min(100, Math.round((avgCarb / target) * 100));

  const daysUntil =
    draft.date
      ? Math.ceil(
          (new Date(draft.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      : NaN;

  let statusColor = 'bg-red-500';
  if (avgCarb >= target) statusColor = 'bg-green-600';
  else if (target - avgCarb <= 10) statusColor = 'bg-yellow-500';

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-slate-900">Event Day Planner</h1>
        <p className="mt-2 text-lg text-slate-600">
          Track readiness for your upcoming event.
        </p>
      </header>

      {editing ? (
        <div className="card space-y-6">
          <div>
            <label className="form-label">Event Name</label>
            <input
              type="text"
              name="name"
              value={draft.name}
              onChange={handleChange}
              className="form-input w-full"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Event Date</label>
              <input
                type="date"
                name="date"
                value={draft.date}
                onChange={handleChange}
                className="form-input w-full"
              />
            </div>
            <div>
              <label className="form-label">Event Type</label>
              <select
                name="type"
                value={draft.type}
                onChange={handleChange}
                className="form-select w-full"
              >
                <option>Cycling</option>
                <option>Running</option>
                <option>Triathlon</option>
                <option>Swimming</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">
              Target Carb Intake (g/hr)
            </label>
            <input
              type="number"
              name="targetCarb"
              value={draft.targetCarb}
              onChange={handleChange}
              className="form-input w-full"
            />
          </div>
          <div className="flex justify-between pt-4 border-t">
            <button
              className="btn btn-outline"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
            <button className="btn btn-primary" onClick={saveEvent}>
              Save Event
            </button>
          </div>
        </div>
      ) : (
        <div className="card space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              {event.name || 'Unnamed Event'}
            </h2>
            <button
              className="text-sm underline"
              style={{ color: '#EF6A3E' }}
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-100">
              <p className="text-sm text-slate-500">Days Until Event</p>
              <p className="text-3xl font-bold text-slate-800">
                {isNaN(daysUntil) ? '--' : daysUntil}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-100">
              <p className="text-sm text-slate-500">Target Carb Rate</p>
              <p className="text-3xl font-bold text-slate-800">
                {event.targetCarb}
                <span className="text-lg font-medium text-slate-500">
                  g/hr
                </span>
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-slate-500">
              Current Avg. vs Target (from {longSessionsCount} sessions &gt; 60 min)
            </p>
            <div className="w-full h-6 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${statusColor}`}
                style={{ width: `${readiness}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span>{avgCarb.toFixed(0)} g/hr</span>
              <span>{readiness}% ready</span>
            </div>
          </div>

          <div
            className={`p-3 rounded-md text-white text-center ${
              statusColor === 'bg-green-600'
                ? 'bg-green-600'
                : statusColor === 'bg-yellow-500'
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
          >
            {statusColor === 'bg-green-600'
              ? '✅ You are event-ready!'
              : statusColor === 'bg-yellow-500'
              ? '⚠️ Almost there – keep pushing!'
              : '🚨 Need more gut training – increase carbs steadily.'}
          </div>
        </div>
      )}

      <div className="text-center mt-6">
        <button onClick={onBack} className="btn btn-primary">
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

function App() {
  // This state controls which "page" is visible.
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [sessions, setSessions] = useLocalStorage<Session[]>('noominds-sessions', mockSessions);

  const addSession = (newSession: Session) => {
    setSessions(prev => [...prev, newSession]);
  };

  // --- derived average carb intake ---
  const { avg: avgCarb, count: longSessionsCount } = calculateFilteredAvgCarb(sessions);

  const navigateTo = (view: AppView) => setCurrentView(view);

  // This function decides which component to render based on the currentView state.
  const renderView = () => {
    switch (currentView) {
      case 'assessment':
        return <PlaceholderPage title="Athlete Assessment" onBack={() => navigateTo('dashboard')} />;
      case 'logger':
        return <SessionLogger onAddSession={addSession} onBack={() => navigateTo('dashboard')} />;
      case 'progress':
        return <PlaceholderPage title="Your Progress" onBack={() => navigateTo('dashboard')} />;
      case 'event_planner':
        return (
          <EventDayPlanner sessions={sessions} onBack={() => navigateTo('dashboard')} />
        );
      case 'ai_coach':
        return <AICoach onBack={() => navigateTo('dashboard')} />;
      case 'dashboard':
      default:
        return (
          <Dashboard
            onNavigate={navigateTo}
            sessionsCount={sessions.length}
            avgCarb={avgCarb}
            longSessionsCount={longSessionsCount}
          />
        );
    }
  };

  return (
    <Layout>
      {renderView()}
    </Layout>
  );
}

export default App;
