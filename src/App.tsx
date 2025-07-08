import React, { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import './index.css';

// ============================================================================
// TYPES
// ============================================================================
type AppView = 'dashboard' | 'assessment' | 'logger' | 'progress' | 'event_planner' | 'ai_coach';

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

interface Client {
  profile: { id: string; name: string; email: string; sport: string };
  sessions: Session[];
  event: { name: string; date: string; type: string; targetCarb: number };
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
// UTILITIES
// ============================================================================
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });
  
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  
  return [value, setValue];
}

const calculateFilteredAvgCarb = (sessions: Session[]): { avg: number; count: number } => {
  const longSessions = sessions.filter(s => s.duration > 60);
  if (longSessions.length === 0) return { avg: 0, count: 0 };
  
  const totalCarbRate = longSessions.reduce((sum, s) => sum + (s.carbs / (s.duration / 60)), 0);
  return { avg: totalCarbRate / longSessions.length, count: longSessions.length };
};

// ============================================================================
// CARB CALCULATION (FIXED DECIMALS)
// ============================================================================
function calculateTargetCarbs(assessment: AssessmentData): AssessmentResult {
  let baseCarbs = 50;
  
  if (assessment.eventDuration < 1.5) baseCarbs = 35;
  else if (assessment.eventDuration <= 3) baseCarbs = 55;
  else if (assessment.eventDuration <= 6) baseCarbs = 65;
  else baseCarbs = 75;
  
  const intensityMultiplier = { low: 0.75, moderate: 0.9, high: 1.2, mixed: 1.05 };
  baseCarbs *= intensityMultiplier[assessment.intensity];
  
  const weightFactor = assessment.weight / 70;
  baseCarbs *= (0.9 + (weightFactor * 0.2));
  
  const sportAdjustment = { cycling: 8, triathlon: 5, swimming: 2, running: 0, other: 3 };
  baseCarbs += sportAdjustment[assessment.sport];
  
  const experienceAdjustment = { beginner: -8, intermediate: 0, advanced: 5 };
  baseCarbs += experienceAdjustment[assessment.experienceLevel];
  
  if (assessment.age > 40) baseCarbs *= 0.95;
  if (assessment.gender === 'female') baseCarbs *= 0.98;
  
  const finalCarbs = Math.min(Math.max(baseCarbs, 25), 100);
  
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (assessment.hasGiIssues || assessment.currentCarbIntake < (finalCarbs * 0.7)) confidence = 'medium';
  if (assessment.experienceLevel === 'beginner' && finalCarbs > 70) confidence = 'low';
  
  return {
    targetCarbs: Math.round(finalCarbs),
    confidence,
    recommendations: generateRecommendations(assessment, finalCarbs),
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
// COMPONENTS
// ============================================================================
const Header: React.FC = () => (
  <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 shadow-2xl">
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-2xl">N</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">NooMinds</h1>
            <p className="text-orange-400 font-medium">Carb Coach</p>
          </div>
        </div>
        <div className="hidden md:flex items-center space-x-2 text-slate-300">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm">Training Active</span>
        </div>
      </div>
    </div>
  </header>
);

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: 'orange' | 'blue' | 'green' | 'red';
}> = ({ title, value, unit, subtitle, trend, color = 'orange' }) => {
  const trendColors = {
    up: 'bg-green-500',
    down: 'bg-red-500',
    stable: 'bg-yellow-500'
  };
  
  const valueColors = {
    orange: 'gradient-text',
    blue: 'text-blue-400',
    green: 'text-green-400',
    red: 'text-red-400'
  };

  return (
    <div className="metric-card">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-slate-300 font-medium text-sm uppercase tracking-wide">{title}</h3>
        {trend && <div className={`w-2 h-2 rounded-full ${trendColors[trend]}`}></div>}
      </div>
      
      <div className="flex items-baseline space-x-2 mb-2">
        <span className={`text-4xl font-bold ${valueColors[color]}`}>{value}</span>
        {unit && <span className="text-slate-400 text-lg font-medium">{unit}</span>}
      </div>
      
      {subtitle && <p className="text-slate-400 text-sm">{subtitle}</p>}
    </div>
  );
};

const ActionCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  isPrimary?: boolean;
}> = ({ title, description, icon, onClick, isPrimary = false }) => (
  <div 
    className={`action-card ${isPrimary ? 'action-card-primary' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-start space-x-4">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${
        isPrimary 
          ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg'
          : 'bg-slate-700 text-orange-400 group-hover:bg-orange-500 group-hover:text-white'
      }`}>
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
        <p className="text-slate-300 leading-relaxed">{description}</p>
      </div>
    </div>
  </div>
);

const Dashboard: React.FC<{ client: Client; onNavigate: (view: AppView) => void }> = ({ client, onNavigate }) => {
  const { avg: avgCarb, count: longSessionsCount } = calculateFilteredAvgCarb(client.sessions);
  const readiness = Math.min(100, Math.round((avgCarb / client.event.targetCarb) * 100));

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="flex items-center space-x-6 mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl">
              <span className="text-white font-bold text-3xl">{client.profile.name.charAt(0)}</span>
            </div>
            <div>
              <h1 className="text-5xl font-bold text-white mb-2">
                Welcome back, <span className="gradient-text">{client.profile.name.split(' ')[0]}</span>
              </h1>
              <p className="text-slate-400 text-xl">Let's optimize your race-day fueling strategy</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold">Event Readiness</h3>
              <span className="text-2xl font-bold gradient-text">{readiness}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${readiness}%` }}></div>
            </div>
            <p className="text-slate-400 text-sm mt-2">Target: {client.event.name} • {client.event.type}</p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="metrics-grid mb-12">
          <MetricCard
            title="Current Intake"
            value={isNaN(avgCarb) || avgCarb === 0 ? '--' : Math.round(avgCarb)}
            unit="g/hr"
            subtitle={`${longSessionsCount} sessions > 60 min`}
            color="blue"
            trend={avgCarb > 0 ? 'up' : 'stable'}
          />
          <MetricCard
            title="Target Intake"
            value={client.event.targetCarb}
            unit="g/hr"
            subtitle={`for ${client.event.name}`}
            color="orange"
          />
          <MetricCard
            title="Sessions Logged"
            value={client.sessions.length}
            unit="total"
            subtitle="this month"
            color="green"
            trend="up"
          />
        </div>

        {/* Action Cards */}
        <div className="actions-grid mb-12">
          <ActionCard
            title="Start Your Assessment"
            description="Get your personalized carb strategy based on your profile, sport, and goals using our advanced algorithm"
            isPrimary
            onClick={() => onNavigate('assessment')}
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"></path>
                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
              </svg>
            }
          />
          
          <ActionCard
            title="Log Training Session"
            description="Track your fueling, symptoms, and performance data for each workout to optimize your strategy"
            onClick={() => onNavigate('logger')}
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14,2 14,8 20,8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
              </svg>
            }
          />
          
          <ActionCard
            title="Event Day Planner"
            description="Plan your race-day nutrition strategy and track your readiness for your target event"
            onClick={() => onNavigate('event_planner')}
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
              </svg>
            }
          />
          
          <ActionCard
            title="AI Carb Coach"
            description="Get personalized advice and real-time answers from your AI-powered nutrition coach"
            onClick={() => onNavigate('ai_coach')}
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                <circle cx="9" cy="12" r="1"></circle>
                <circle cx="15" cy="12" r="1"></circle>
              </svg>
            }
          />
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-white font-semibold text-xl mb-4">Recent Activity</h3>
          {client.sessions.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No training sessions logged yet. Start by logging your first session!</p>
          ) : (
            <div className="space-y-4">
              {client.sessions.slice(0, 3).map(session => (
                <div key={session.id} className="bg-slate-700 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <h4 className="text-white font-medium">{session.sport}</h4>
                    <p className="text-slate-400 text-sm">{session.date} • {session.duration} min</p>
                  </div>
                  <div className="text-right">
                    <p className="text-orange-400 font-semibold">{Math.round(session.carbs / (session.duration / 60))}g/hr</p>
                    <p className="text-slate-400 text-sm">Symptoms: {session.symptomSeverity}/10</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PlaceholderPage: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <div className="min-h-screen bg-slate-900">
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="card text-center">
        <h1 className="text-3xl font-bold text-white mb-4">{title}</h1>
        <p className="text-slate-400 text-xl mb-8">This feature is coming soon!</p>
        <button onClick={onBack} className="btn btn-primary">
          Back to Dashboard
        </button>
      </div>
    </div>
  </div>
);

// ============================================================================
// MOCK DATA
// ============================================================================
const mockClient: Client = {
  profile: { id: 'user-1', name: 'Craig Elliott', email: 'craig@example.com', sport: 'Cycling' },
  sessions: [
    { id: 's1', date: '2025-07-01', duration: 120, carbs: 100, symptomSeverity: 2, sport: 'Cycling', rpe: 6, fluids: 1000, notes: 'Good session' },
    { id: 's2', date: '2025-07-03', duration: 90, carbs: 70, symptomSeverity: 1, sport: 'Cycling', rpe: 7, fluids: 800, notes: 'Felt strong' },
  ],
  event: { name: '100 Mile Sportive', date: '2025-09-15', type: 'Cycling', targetCarb: 75 },
};

// ============================================================================
// MAIN APP
// ============================================================================
function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');

  const renderContent = () => {
    switch (currentView) {
      case 'assessment':
        return <PlaceholderPage title="Assessment" onBack={() => setCurrentView('dashboard')} />;
      case 'logger':
        return <PlaceholderPage title="Session Logger" onBack={() => setCurrentView('dashboard')} />;
      case 'event_planner':
        return <PlaceholderPage title="Event Planner" onBack={() => setCurrentView('dashboard')} />;
      case 'ai_coach':
        return <PlaceholderPage title="AI Coach" onBack={() => setCurrentView('dashboard')} />;
      case 'dashboard':
      default:
        return <Dashboard client={mockClient} onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      {renderContent()}
    </div>
  );
}

export default App;
