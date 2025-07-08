import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  FormEvent,
} from 'react';
import jsPDF from 'jspdf';
import './index.css';

// ============================================================================
// Type Definitions
// ============================================================================
type AppView =
  | 'dashboard'
  | 'assessment'
  | 'logger'
  | 'progress'
  | 'event_planner'
  | 'ai_coach'
  | 'coach_dashboard'
  | 'client_view';

interface Session {
  id: string;
  date: string;
  duration: number;
  carbs: number;
  symptomSeverity: number;
  sport: string;
  rpe: number;
  fluids: number;
  notes: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

interface EventDetails {
  name: string;
  date: string;
  type: string;
  targetCarb: number;
}

interface ClientProfile {
  id: string;
  name: string;
  email: string;
  sport: string;
}

interface Client {
  profile: ClientProfile;
  sessions: Session[];
  event: EventDetails;
}

interface AssessmentData {
  age: number;
  weight: number;
  gender: 'male' | 'female';
  heightCm: number;
  eventName: string;
  eventDate: string;
  eventDuration: number;
  sport: 'cycling' | 'running' | 'triathlon' | 'swimming' | 'other';
  intensity: 'low' | 'moderate' | 'high' | 'mixed';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  currentCarbIntake: number;
  hasGiIssues: boolean;
  symptomHistory: string[];
  weeklyTrainingHours: number;
  longestSession: number;
  fuelingSources: string[];
}

interface AssessmentResult {
  targetCarbs: number;
  confidence: 'high' | 'medium' | 'low';
  recommendations: string[];
  challengeProtocol: {
    duration: number;
    carbsPerHour: number;
    testInstructions: string[];
  };
}

// ============================================================================
// Utilities
// ============================================================================
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

const niceDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });

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

// ============================================================================
// CARB CALCULATION (WITH FIXED DECIMALS)
// ============================================================================
function calculateTargetCarbs(assessment: AssessmentData): AssessmentResult {
  let baseCarbs = 50;
  
  if (assessment.eventDuration < 1.5) {
    baseCarbs = 35;
  } else if (assessment.eventDuration >= 1.5 && assessment.eventDuration <= 3) {
    baseCarbs = 55;
  } else if (assessment.eventDuration > 3 && assessment.eventDuration <= 6) {
    baseCarbs = 65;
  } else {
    baseCarbs = 75;
  }
  
  const intensityMultiplier = {
    'low': 0.75,
    'moderate': 0.9,
    'high': 1.2,
    'mixed': 1.05
  };
  baseCarbs *= intensityMultiplier[assessment.intensity];
  
  const weightFactor = assessment.weight / 70; 
  baseCarbs *= (0.9 + (weightFactor * 0.2));
  
  const sportAdjustment = {
    'cycling': 8,
    'triathlon': 5,
    'swimming': 2,
    'running': 0,
    'other': 3
  };
  baseCarbs += sportAdjustment[assessment.sport];
  
  const experienceAdjustment = {
    'beginner': -8,
    'intermediate': 0,
    'advanced': 5
  };
  baseCarbs += experienceAdjustment[assessment.experienceLevel];
  
  if (assessment.age > 40) {
    baseCarbs *= 0.95;
  }
  
  if (assessment.gender === 'female') {
    baseCarbs *= 0.98;
  }
  
  const finalCarbs = Math.min(Math.max(baseCarbs, 25), 100);
  
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (assessment.hasGiIssues || assessment.currentCarbIntake < (finalCarbs * 0.7)) {
    confidence = 'medium';
  }
  if (assessment.experienceLevel === 'beginner' && finalCarbs > 70) {
    confidence = 'low';
  }
  
  const recommendations = generateRecommendations(assessment, finalCarbs);
  
  return {
    targetCarbs: Math.round(finalCarbs),
    confidence,
    recommendations,
    challengeProtocol: {
      duration: 3,
      carbsPerHour: Math.round(finalCarbs),
      testInstructions: [
        `Hour 1: Consume ${Math.round(finalCarbs)}g carbs while training`,
        `Hour 2: Consume ${Math.round(finalCarbs)}g carbs while training`,
        `Hour 3: Consume ${Math.round(finalCarbs)}g carbs while training`,
        `Rate symptoms 0-10 each hour`,
        `Maintain race-day intensity throughout`,
        `Log results in NooMinds session tracker`
      ]
    }
  };
}

function generateRecommendations(assessment: AssessmentData, targetCarbs: number): string[] {
  const recommendations = [];
  
  if (assessment.currentCarbIntake < targetCarbs * 0.8) {
    recommendations.push(`Gradually increase from ${assessment.currentCarbIntake}g/hr to ${targetCarbs.toFixed(1)}g/hr over 8-12 weeks`);
  }
  
  if (assessment.sport === 'running' && targetCarbs > 70) {
    recommendations.push("Running puts more stress on the gut - test carb tolerance in training first");
  }
  
  if (assessment.hasGiIssues) {
    recommendations.push("Start with glucose/maltodextrin only, avoid fructose initially");
  }
  
  if (assessment.eventDuration > 4) {
    recommendations.push("Consider mixed carb sources (glucose + fructose) for ultra-distance events");
  }
  
  recommendations.push("Practice your race-day fueling strategy weekly in training");
  recommendations.push("Test the 3-hour gut challenge protocol before implementing");
  
  return recommendations;
}

// ============================================================================
// UI COMPONENTS - MODERN SPORTS DESIGN
// ============================================================================

const Header: React.FC<{ isCoachMode: boolean; onToggleCoachMode: () => void }> = ({ isCoachMode, onToggleCoachMode }) => (
  <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-2xl border-b border-slate-700">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">N</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">NooMinds</h1>
            <p className="text-sm text-slate-300">Carb Coach</p>
          </div>
        </div>
        
        <button 
          onClick={onToggleCoachMode}
          className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors border border-slate-600"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2-2v16"></path>
          </svg>
          <span className="text-sm font-medium">{isCoachMode ? 'Athlete View' : 'Coach View'}</span>
        </button>
      </div>
    </div>
  </header>
);

const MetricCard: React.FC<{ 
  title: string; 
  value: string | number; 
  unit?: string; 
  subtitle?: string;
  color?: 'orange' | 'blue' | 'green' | 'red' | 'purple';
  trend?: 'up' | 'down' | 'stable';
}> = ({ title, value, unit, subtitle, color = 'orange', trend }) => {
  const colorClasses = {
    orange: 'from-orange-500 to-orange-600',
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600'
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-slate-300 text-sm font-medium">{title}</h3>
        {trend && (
          <div className={`w-2 h-2 rounded-full ${
            trend === 'up' ? 'bg-green-500' : 
            trend === 'down' ? 'bg-red-500' : 
            'bg-slate-500'
          }`} />
        )}
      </div>
      
      <div className="flex items-baseline space-x-2">
        <span className={`text-3xl font-bold bg-gradient-to-r ${colorClasses[color]} bg-clip-text text-transparent`}>
          {value}
        </span>
        {unit && <span className="text-slate-400 text-lg">{unit}</span>}
      </div>
      
      {subtitle && (
        <p className="text-slate-400 text-xs mt-2">{subtitle}</p>
      )}
    </div>
  );
};

const ActionCard: React.FC<{ 
  title: string; 
  description: string; 
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}> = ({ title, description, icon, onClick, variant = 'secondary' }) => (
  <div className={`bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700 hover:border-slate-600 transition-all duration-300 cursor-pointer group ${
    variant === 'primary' ? 'ring-2 ring-orange-500/30' : ''
  }`} onClick={onClick}>
    <div className="flex items-start space-x-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
        variant === 'primary' 
          ? 'bg-gradient-to-br from-orange-500 to-orange-600' 
          : 'bg-slate-700 group-hover:bg-slate-600'
      } transition-colors`}>
        {icon}
      </div>
      
      <div className="flex-1">
        <h3 className="text-white font-semibold mb-2">{title}</h3>
        <p className="text-slate-300 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENTS
// ============================================================================

const Dashboard: React.FC<{ client: Client; onNavigate: (view: AppView) => void }> = ({ client, onNavigate }) => {
  const { avg: avgCarb, count: longSessionsCount } = calculateFilteredAvgCarb(client.sessions);
  const readiness = Math.min(100, Math.round((avgCarb / client.event.targetCarb) * 100));

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">{client.profile.name.charAt(0)}</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Welcome back, <span className="text-orange-500">{client.profile.name.split(' ')[0]}</span>
              </h1>
              <p className="text-slate-400 text-lg">Let's optimize your race-day fueling strategy</p>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <MetricCard
            title="Current Carb Intake"
            value={isNaN(avgCarb) || avgCarb === 0 ? '--' : Math.round(avgCarb)}
            unit="g/hr"
            subtitle={`from ${longSessionsCount} sessions > 60 min`}
            color="blue"
          />
          <MetricCard
            title="Target Carb Intake"
            value={client.event.targetCarb}
            unit="g/hr"
            subtitle={`for ${client.event.name}`}
            color="orange"
          />
          <MetricCard
            title="Event Readiness"
            value={readiness}
            unit="%"
            subtitle="gut training progress"
            color={readiness >= 90 ? 'green' : readiness >= 70 ? 'orange' : 'red'}
            trend={readiness >= 90 ? 'up' : readiness >= 70 ? 'stable' : 'down'}
          />
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ActionCard
            title="Start Your Assessment"
            description="Get your personalized carb strategy based on your profile, sport, and goals"
            variant="primary"
            onClick={() => onNavigate('assessment')}
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4"></path>
              <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
              <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
              <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3"></path>
              <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3"></path>
            </svg>}
          />
          
          <ActionCard
            title="Log Training Session"
            description="Track your fueling, symptoms, and performance for each workout"
            onClick={() => onNavigate('logger')}
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10,9 9,9 8,9"></polyline>
            </svg>}
          />
          
          <ActionCard
            title="Event Day Planner"
            description="Plan and track your readiness for your target event"
            onClick={() => onNavigate('event_planner')}
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>}
          />
          
          <ActionCard
            title="AI Carb Coach"
            description="Get personalized advice and answers from your AI nutrition coach"
            onClick={() => onNavigate('ai_coach')}
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="11" r="1"></circle>
              <circle cx="8" cy="11" r="1"></circle>
              <circle cx="16" cy="11" r="1"></circle>
            </svg>}
          />
        </div>
      </div>
    </div>
  );
};

// Rest of components would follow the same modern sports design pattern...
// [Assessment, SessionLogger, etc. components would be styled similarly]

// ============================================================================
// MOCK DATA
// ============================================================================
const mockClients: Client[] = [
  {
    profile: { id: 'client-1', name: 'Craig Elliott', email: 'craig@example.com', sport: 'Cycling' },
    sessions: [
      { id: 's1-1', date: '2025-07-01', duration: 120, carbs: 100, symptomSeverity: 2, sport: 'Cycling', rpe: 6, fluids: 1000, notes: 'Good session.' },
      { id: 's1-2', date: '2025-07-03', duration: 75, carbs: 60, symptomSeverity: 1, sport: 'Cycling', rpe: 7, fluids: 750, notes: 'Felt strong.' },
    ],
    event: { name: '100 Mile Sportive', date: '2025-09-15', type: 'Cycling', targetCarb: 75 },
  },
];

// ============================================================================
// MAIN APP
// ============================================================================
function App() {
  const [isCoachMode, setIsCoachMode] = useLocalStorage('noominds-coach-mode', false);
  const [clients] = useLocalStorage<Client[]>('noominds-clients', mockClients);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');

  const currentUser = clients[0];

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
      default:
        return <Dashboard client={currentUser} onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Header isCoachMode={isCoachMode} onToggleCoachMode={() => setIsCoachMode(prev => !prev)} />
      {renderContent()}
    </div>
  );
}

export default App;
