import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import './index.css'; // Make sure our styles are imported

// ============================================================================
// Type Definitions
// ============================================================================

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

type AppView = 'dashboard' | 'assessment' | 'logger' | 'progress';

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
// Main App Component (View Controller)
// ============================================================================

function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [sessions, setSessions] = useLocalStorage<Session[]>('noominds-sessions', mockSessions);

  const addSession = (newSession: Session) => {
    setSessions(prevSessions => [...prevSessions, newSession]);
  };

  const navigateTo = (view: AppView) => setCurrentView(view);

  switch (currentView) {
    case 'assessment':
      return <AssessmentForm onBackToDashboard={() => navigateTo('dashboard')} />;
    case 'logger':
      return <SessionLogger onAddSession={addSession} onBackToDashboard={() => navigateTo('dashboard')} />;
    case 'progress':
      return <ProgressCharts sessions={sessions} onBackToDashboard={() => navigateTo('dashboard')} />;
    case 'dashboard':
    default:
      return <Dashboard onNavigate={navigateTo} sessionsCount={sessions.length} />;
  }
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
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-blue-600">NooMinds Carb Coach</h1>
          <p className="mt-2 text-lg text-gray-600">
            Welcome back, <span className="font-bold">Craig Elliott</span>! Let's optimize your fueling.
          </p>
        </header>

        <main className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Your Weekly Snapshot</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card text-center">
                <p className="text-sm text-gray-500">Current Carb Intake</p>
                <p className="text-3xl font-bold text-gray-800">{stats.currentCarbIntake}<span className="text-lg font-medium">g/hr</span></p>
              </div>
              <div className="card text-center">
                <p className="text-sm text-gray-500">Target Carb Intake</p>
                <p className="text-3xl font-bold text-blue-600">{stats.targetCarbIntake}<span className="text-lg font-medium">g/hr</span></p>
              </div>
              <div className="card text-center">
                <p className="text-sm text-gray-500">Sessions Logged</p>
                <p className="text-3xl font-bold text-gray-800">{sessionsCount}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Get Started</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card flex flex-col items-center text-center">
                <h3 className="font-semibold mb-2">1. Start Your Assessment</h3>
                <p className="text-sm text-gray-600 flex-grow mb-4">Generate your personalized gut training plan with our AI-powered assessment.</p>
                <button onClick={() => onNavigate('assessment')} className="btn btn-primary w-full">Start Assessment</button>
              </div>
              <div className="card flex flex-col items-center text-center">
                <h3 className="font-semibold mb-2">2. Log a Training Session</h3>
                <p className="text-sm text-gray-600 flex-grow mb-4">Track your nutrition, symptoms, and performance for each workout.</p>
                <button onClick={() => onNavigate('logger')} className="btn btn-outline w-full">Log Session</button>
              </div>
              <div className="card flex flex-col items-center text-center">
                <h3 className="font-semibold mb-2">3. View Your Progress</h3>
                <p className="text-sm text-gray-600 flex-grow mb-4">See how your carb tolerance improves over time with our detailed charts.</p>
                <button onClick={() => onNavigate('progress')} className="btn btn-outline w-full">View Progress</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// ============================================================================
// Assessment Form Component (from previous step)
// ============================================================================

const AssessmentForm: React.FC<{ onBackToDashboard: () => void; }> = ({ onBackToDashboard }) => {
    // This is the full assessment form from the previous step.
    // It is kept here for completeness of the single-file app.
    const [formData, setFormData] = useState({ name: 'Craig Elliott', primarySport: 'Cycling', weeklyVolume: '10', intensity: 'Moderate', currentCarbIntake: '45', fuelSources: ['Gels', 'Drinks'], hasGiSymptoms: true, symptomSeverity: '4', symptomTypes: ['Bloating'], targetCarbGoal: '90' });
    const [isSubmitted, setIsSubmitted] = useState(false);
    const handleSubmit = (e: FormEvent) => { e.preventDefault(); setIsSubmitted(true); };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-gray-100 p-8">
                <div className="max-w-4xl mx-auto">
                    <header className="mb-8 text-center"><h1 className="text-blue-600">Assessment Results Summary</h1></header>
                    <div className="card"><p>Summary of results for {formData.name}...</p></div>
                    <div className="text-center mt-6"><button onClick={onBackToDashboard} className="btn btn-primary">Back to Dashboard</button></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8"><h1 className="text-blue-600">Athlete Assessment Form</h1></header>
                <form onSubmit={handleSubmit} className="card space-y-8">
                    <p>Full assessment form fields would be here...</p>
                    <div className="flex justify-between items-center pt-8 border-t">
                        <button type="button" onClick={onBackToDashboard} className="btn btn-outline">Back to Dashboard</button>
                        <button type="submit" className="btn btn-primary">Submit for Analysis</button>
                    </div>
                </form>
            </div>
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
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-blue-600">Log a Training Session</h1>
          <p className="mt-2 text-lg text-gray-600">Track your fueling and symptoms to see your progress.</p>
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
            <div><label className="form-label">Overall Symptom Severity (0=None, 10=Severe)</label><input type="range" min="0" max="10" name="symptomSeverity" value={formState.symptomSeverity} onChange={handleChange} className="w-full" /><div className="text-center font-bold text-blue-600">{formState.symptomSeverity}</div></div>
            <div>
                <label className="form-label">Symptom Types</label>
                <div className="flex flex-wrap gap-4 mt-2">
                    {['Nausea', 'Bloating', 'Cramps', 'Reflux', 'Diarrhea'].map(type => (
                        <label key={type}><input type="checkbox" value={type} checked={formState.symptomTypes.includes(type)} onChange={handleSymptomChange} className="form-checkbox" /> {type}</label>
                    ))}
                </div>
            </div>
            <div><label className="form-label">Rate of Perceived Exertion (RPE, 1-10)</label><input type="range" min="1" max="10" name="rpe" value={formState.rpe} onChange={handleChange} className="w-full" /><div className="text-center font-bold text-blue-600">{formState.rpe}</div></div>
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
    </div>
  );
};


// ============================================================================
// Progress Charts Component (FIXED)
// ============================================================================

interface ProgressChartsProps {
  sessions: Session[];
  onBackToDashboard: () => void;
}

const ProgressCharts: React.FC<ProgressChartsProps> = ({ sessions, onBackToDashboard }) => {
  // DEBUGGING: Log the received sessions data every time the component renders.
  // You can view this in your browser's developer console (F12).
  useEffect(() => {
    console.log("ProgressCharts received updated sessions:", sessions);
  }, [sessions]);

  // Ensure sessions are sorted by date for a proper timeline
  const sortedSessions = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const totalSessions = sortedSessions.length;
  
  // Calculate averages safely, avoiding division by zero
  const avgCarbs = totalSessions > 0 ? (sortedSessions.reduce((sum, s) => {
    const carbRate = s.duration > 0 ? s.carbs / (s.duration / 60) : 0;
    return sum + carbRate;
  }, 0) / totalSessions).toFixed(1) : 0;
  
  const avgSymptoms = totalSessions > 0 ? (sortedSessions.reduce((sum, s) => sum + s.symptomSeverity, 0) / totalSessions).toFixed(1) : 0;
  
  // Determine the maximum value for chart scaling. Use a sensible default if no sessions.
  const maxCarbRate = sortedSessions.length > 0 ? Math.max(...sortedSessions.map(s => s.duration > 0 ? s.carbs / (s.duration / 60) : 0), 90) : 90;
  const maxSymptomScore = 10;

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-blue-600">Your Progress</h1>
          <p className="mt-2 text-lg text-gray-600">Track your gut training journey and celebrate your milestones.</p>
        </header>

        <main className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card text-center"><p className="text-sm text-gray-500">Total Sessions</p><p className="text-3xl font-bold">{totalSessions}</p></div>
            <div className="card text-center"><p className="text-sm text-gray-500">Avg. Carb Rate</p><p className="text-3xl font-bold">{avgCarbs} <span className="text-lg">g/hr</span></p></div>
            <div className="card text-center"><p className="text-sm text-gray-500">Avg. Symptom Score</p><p className="text-3xl font-bold">{avgSymptoms}<span className="text-lg">/10</span></p></div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4">Carb Intake Trend (g/hr)</h3>
            {/* FIX: Add a key that changes when the data does, forcing a re-render */}
            <div key={`carb-chart-${sessions.length}`} className="h-48 bg-gray-50 rounded p-2 flex items-end justify-around border">
              {sortedSessions.map(session => {
                const carbRate = session.duration > 0 ? session.carbs / (session.duration / 60) : 0;
                const barHeight = `${(carbRate / maxCarbRate) * 100}%`;
                return (
                  <div key={session.id} className="w-1/2 flex flex-col items-center justify-end" title={`Carb Rate: ${carbRate.toFixed(0)} g/hr on ${session.date}`}>
                    <div className="w-4 bg-blue-500 rounded-t" style={{ height: barHeight }}></div>
                    <div className="text-xs mt-1">{new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4">GI Symptom Severity Trend (0-10)</h3>
            {/* FIX: Add a key that changes when the data does, forcing a re-render */}
            <div key={`symptom-chart-${sessions.length}`} className="h-48 bg-gray-50 rounded p-2 flex items-end justify-around border">
              {sortedSessions.map(session => {
                const barHeight = `${(session.symptomSeverity / maxSymptomScore) * 100}%`;
                return (
                  <div key={session.id} className="w-1/2 flex flex-col items-center justify-end" title={`Symptom Score: ${session.symptomSeverity}/10 on ${session.date}`}>
                    <div className="w-4 bg-red-500 rounded-t" style={{ height: barHeight }}></div>
                    <div className="text-xs mt-1">{new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-center">
            <button onClick={onBackToDashboard} className="btn btn-primary">Back to Dashboard</button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
