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
// PDF EXPORT
// ============================================================================
function generateAthletePDF(client: Client) {
  const { avg } = calculateFilteredAvgCarb(client.sessions);
  const readiness = Math.min(100, Math.round((avg / client.event.targetCarb) * 100));

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  const lineGap = 8;
  let y = 20;

  // Header
  doc.setFillColor(239, 106, 62);
  doc.rect(0, 0, 210, 15, 'F');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('NooMinds Athlete Report', 105, 10, { align: 'center' });

  // Date
  doc.setFontSize(10);
  doc.setTextColor(100);
  const today = new Date().toLocaleDateString();
  doc.text(`Date: ${today}`, 180, 18, { align: 'right' });

  // Client info
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Athlete: ${client.profile.name}`, 10, y);
  y += lineGap;
  doc.text(`Sport: ${client.profile.sport}`, 10, y);
  y += lineGap;
  doc.text(`Event: ${client.event.name}`, 10, y);
  y += lineGap;

  // Metrics
  doc.setFontSize(12);
  doc.setTextColor(239, 106, 62);
  doc.text('Current Metrics', 10, (y += lineGap));
  doc.setTextColor(0);
  y += 2;
  doc.setFontSize(10);
  doc.text(`• Avg Carb Intake: ${avg.toFixed(0)} g/hr`, 12, (y += lineGap));
  doc.text(`• Target Carb Intake: ${client.event.targetCarb} g/hr`, 12, (y += lineGap));
  doc.text(`• Readiness: ${readiness}%`, 12, (y += lineGap));

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text('Generated by NooMinds Carb Coach • www.noominds.com', 105, 287, { align: 'center' });

  doc.save(`${client.profile.name.replace(/\s+/g, '_')}_Report.pdf`);
}

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
// MODERN COMPONENTS
// ============================================================================
const Header: React.FC<{ isCoachMode: boolean; onToggleCoachMode: () => void }> = ({ isCoachMode, onToggleCoachMode }) => (
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
        
        <button 
          onClick={onToggleCoachMode}
          className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors border border-slate-600"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2-2v16"></path>
          </svg>
          <span className="text-sm font-medium text-white">{isCoachMode ? 'Athlete View' : 'Coach View'}</span>
        </button>
      </div>
    </div>
  </header>
);

const Footer: React.FC = () => (
  <footer className="bg-slate-800 border-t border-slate-700 text-slate-400 text-xs text-center py-6 mt-12">
    <p>&copy; {new Date().getFullYear()} NooMinds Ltd. All Rights Reserved.</p>
    <a href="https://www.noominds.com" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 transition-colors">
      www.noominds.com
    </a>
  </footer>
);

const Layout: React.FC<{ children: React.ReactNode; isCoachMode: boolean; onToggleCoachMode: () => void }> = ({ children, isCoachMode, onToggleCoachMode }) => (
  <div className="min-h-screen bg-slate-900">
    <Header isCoachMode={isCoachMode} onToggleCoachMode={onToggleCoachMode} />
    <main className="p-4 sm:p-6 lg:p-8">
      {children}
    </main>
    <Footer />
  </div>
);

// ============================================================================
// ASSESSMENT COMPONENT (COMPLETE WITH MODERN STYLING)
// ============================================================================
const Assessment: React.FC<{ onBack: () => void; onComplete: (result: AssessmentResult) => void }> = ({ onBack, onComplete }) => {
  const [formData, setFormData] = useState<AssessmentData>({
    age: 30,
    weight: 70,
    gender: 'male',
    heightCm: 175,
    eventName: '',
    eventDate: '',
    eventDuration: 3,
    sport: 'cycling',
    intensity: 'moderate',
    experienceLevel: 'intermediate',
    currentCarbIntake: 50,
    hasGiIssues: false,
    symptomHistory: [],
    weeklyTrainingHours: 10,
    longestSession: 3,
    fuelingSources: ['Gels']
  });

  const [result, setResult] = useState<AssessmentResult | null>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = () => {
    try {
      console.log("Button clicked!");
      console.log("Form data:", formData);
      const calculatedResult = calculateTargetCarbs(formData);
      console.log("Calculated result:", calculatedResult);
      setResult(calculatedResult);
    } catch (error) {
      console.error("Calculation error:", error);
      alert("Error calculating carbs: " + error.message);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Your Personalized Carb Recommendation</h1>
            <p className="text-xl text-slate-300">Based on your assessment, here's your race-day carb strategy.</p>
          </header>

          <div className="space-y-6">
            {/* Results Card */}
            <div className="card">
              <div className="text-center mb-6">
                <h2 className="text-5xl font-bold gradient-text mb-4">
                  {result.targetCarbs}g carbs/hour
                </h2>
                <p className="text-slate-300 text-lg">Recommended for your {formData.eventName || 'event'}</p>
                <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium mt-4 ${
                  result.confidence === 'high' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                  result.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                  'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {result.confidence.toUpperCase()} CONFIDENCE
                </div>
              </div>
            </div>

            {/* Challenge Protocol */}
            <div className="card bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/30">
              <h3 className="text-2xl font-bold text-orange-400 mb-4">🧪 But Can Your Gut Handle It?</h3>
              <p className="mb-4 text-slate-300 text-lg">Before race day, test if your gut can actually handle this intake:</p>
              
              <div className="bg-slate-800 p-6 rounded-lg mb-4 border border-slate-700">
                <h4 className="font-semibold mb-4 text-white text-lg">3-Hour Gut Challenge Protocol:</h4>
                <ol className="list-decimal list-inside space-y-2">
                  {result.challengeProtocol.testInstructions.map((instruction, index) => (
                    <li key={index} className="text-slate-300">{instruction}</li>
                  ))}
                </ol>
              </div>

              <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <p className="text-yellow-400">
                  <strong>Reality Check:</strong> Most athletes can only handle 60g/hr comfortably. 
                  If you score 4+ on symptoms during this test, your gut needs training.
                </p>
              </div>
            </div>

            {/* Recommendations */}
            <div className="card">
              <h3 className="text-xl font-semibold mb-4 text-white">📋 Your Personalized Recommendations:</h3>
              <ul className="space-y-3">
                {result.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-3 text-orange-400 text-lg">•</span>
                    <span className="text-slate-300">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="text-center">
              <button onClick={onBack} className="btn btn-primary text-lg px-8 py-4">
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Personalized Carb Assessment</h1>
          <p className="text-xl text-slate-300">
            Let's calculate your optimal race-day carb intake based on science and your individual profile.
          </p>
        </header>

        <form className="card space-y-8">
          {/* Step 1: Personal Information */}
          <fieldset className="space-y-4">
            <legend className="text-2xl font-bold text-orange-400 mb-4">1. Personal Information</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Age</label>
                <input type="number" name="age" value={formData.age} onChange={handleInputChange} className="form-input" />
              </div>
              <div>
                <label className="form-label">Weight (kg)</label>
                <input type="number" name="weight" value={formData.weight} onChange={handleInputChange} className="form-input" />
              </div>
              <div>
                <label className="form-label">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleInputChange} className="form-select">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Step 2: Event Details */}
          <fieldset className="space-y-4">
            <legend className="text-2xl font-bold text-orange-400 mb-4">2. Your Target Event</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Event Name</label>
                <input type="text" name="eventName" value={formData.eventName} onChange={handleInputChange} 
                       placeholder="e.g., Ironman 70.3" className="form-input" />
              </div>
              <div>
                <label className="form-label">Event Duration (hours)</label>
                <input type="number" step="0.5" name="eventDuration" value={formData.eventDuration} 
                       onChange={handleInputChange} className="form-input" />
              </div>
              <div>
                <label className="form-label">Primary Sport</label>
                <select name="sport" value={formData.sport} onChange={handleInputChange} className="form-select">
                  <option value="cycling">Cycling</option>
                  <option value="running">Running</option>
                  <option value="triathlon">Triathlon</option>
                  <option value="swimming">Swimming</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="form-label">Expected Intensity</label>
                <select name="intensity" value={formData.intensity} onChange={handleInputChange} className="form-select">
                  <option value="low">Low (Easy/Recovery pace)</option>
                  <option value="moderate">Moderate (Steady state)</option>
                  <option value="high">High (Threshold/Race pace)</option>
                  <option value="mixed">Mixed (Variable intensity)</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Step 3: Experience & Current Status */}
          <fieldset className="space-y-4">
            <legend className="text-2xl font-bold text-orange-400 mb-4">3. Experience & Current Fueling</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Experience Level</label>
                <select name="experienceLevel" value={formData.experienceLevel} onChange={handleInputChange} className="form-select">
                  <option value="beginner">Beginner (0-2 years)</option>
                  <option value="intermediate">Intermediate (2-5 years)</option>
                  <option value="advanced">Advanced (5+ years)</option>
                </select>
              </div>
              <div>
                <label className="form-label">Current Comfortable Carb Intake (g/hr)</label>
                <input type="number" name="currentCarbIntake" value={formData.currentCarbIntake} 
                       onChange={handleInputChange} className="form-input" />
              </div>
              <div>
                <label className="form-label">Weekly Training Hours</label>
                <input type="number" name="weeklyTrainingHours" value={formData.weeklyTrainingHours} 
                       onChange={handleInputChange} className="form-input" />
              </div>
              <div>
                <label className="form-label">Longest Training Session (hours)</label>
                <input type="number" step="0.5" name="longestSession" value={formData.longestSession} 
                       onChange={handleInputChange} className="form-input" />
              </div>
            </div>
          </fieldset>

          {/* Step 4: GI History */}
          <fieldset className="space-y-4">
            <legend className="text-2xl font-bold text-orange-400 mb-4">4. Gut Health History</legend>
            <div className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input type="checkbox" name="hasGiIssues" checked={formData.hasGiIssues} 
                         onChange={handleCheckboxChange} className="form-checkbox mr-3" />
                  <span className="text-slate-300">I have experienced GI issues during training or racing</span>
                </label>
              </div>
              {formData.hasGiIssues && (
                <div>
                  <label className="form-label">What symptoms have you experienced? (Check all that apply)</label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {['Nausea', 'Bloating', 'Cramps', 'Reflux', 'Diarrhea', 'Vomiting'].map(symptom => (
                      <label key={symptom} className="flex items-center">
                        <input type="checkbox" className="form-checkbox mr-2" />
                        <span className="text-slate-300">{symptom}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </fieldset>

          <div className="flex justify-between items-center pt-8 border-t border-slate-700">
            <button type="button" onClick={onBack} className="btn btn-outline">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} className="btn btn-primary text-lg px-8 py-4">
              Calculate My Carb Needs
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// DASHBOARD COMPONENT (MODERN STYLING)
// ============================================================================
const Dashboard: React.FC<{ client: Client; onNavigate: (view: AppView) => void }> = ({ client, onNavigate }) => {
  const { avg: avgCarb, count: longSessionsCount } = calculateFilteredAvgCarb(client.sessions);
  const readiness = Math.min(100, Math.round((avgCarb / client.event.targetCarb) * 100));

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-12">
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
      </header>

      <div className="space-y-12">
        {/* Progress Section */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Event Readiness</h2>
            <span className="text-3xl font-bold gradient-text">{readiness}%</span>
          </div>
          <div className="progress-bar mb-4">
            <div className="progress-fill" style={{ width: `${readiness}%` }}></div>
          </div>
          <p className="text-slate-400">Target: {client.event.name} • {client.event.type}</p>
        </div>

        {/* Metrics Grid */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-slate-300 font-medium text-sm uppercase tracking-wide">Current Carb Intake</h3>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
            <div className="flex items-baseline space-x-2 mb-2">
              <span className="text-4xl font-bold text-blue-400">
                {isNaN(avgCarb) || avgCarb === 0 ? '--' : Math.round(avgCarb)}
              </span>
              <span className="text-slate-400 text-lg font-medium">g/hr</span>
            </div>
            <p className="text-slate-400 text-sm">from {longSessionsCount} sessions &gt; 60 min</p>
          </div>

          <div className="metric-card">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-slate-300 font-medium text-sm uppercase tracking-wide">Target Carb Intake</h3>
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            </div>
            <div className="flex items-baseline space-x-2 mb-2">
              <span className="text-4xl font-bold gradient-text">{client.event.targetCarb}</span>
              <span className="text-slate-400 text-lg font-medium">g/hr</span>
            </div>
            <p className="text-slate-400 text-sm">for {client.event.name}</p>
          </div>

          <div className="metric-card">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-slate-300 font-medium text-sm uppercase tracking-wide">Sessions Logged</h3>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex items-baseline space-x-2 mb-2">
              <span className="text-4xl font-bold text-green-400">{client.sessions.length}</span>
              <span className="text-slate-400 text-lg font-medium">total</span>
            </div>
            <p className="text-slate-400 text-sm">this month</p>
          </div>
        </div>

        {/* Action Cards */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-8">Get Started</h2>
          <div className="actions-grid">
            <div className="action-card action-card-primary" onClick={() => onNavigate('assessment')}>
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4"></path>
                    <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg mb-2">1. Start Your Assessment</h3>
                  <p className="text-slate-300 leading-relaxed">Get your personalized carb strategy based on your profile, sport, and goals</p>
                </div>
              </div>
            </div>

            <div className="action-card" onClick={() => onNavigate('logger')}>
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-slate-700 rounded-xl flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg mb-2">2. Log Training Session</h3>
                  <p className="text-slate-300 leading-relaxed">Track your fueling, symptoms, and performance for each workout</p>
                </div>
              </div>
            </div>

            <div className="action-card" onClick={() => onNavigate('event_planner')}>
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-slate-700 rounded-xl flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg mb-2">3. Event Day Planner</h3>
                  <p className="text-slate-300 leading-relaxed">Plan and track your readiness for your target event</p>
                </div>
              </div>
            </div>

            <div className="action-card" onClick={() => onNavigate('ai_coach')}>
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-slate-700 rounded-xl flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    <circle cx="9" cy="12" r="1"></circle>
                    <circle cx="15" cy="12" r="1"></circle>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg mb-2">4. AI Carb Coach</h3>
                  <p className="text-slate-300 leading-relaxed">Get personalized advice from your AI nutrition coach</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PLACEHOLDER COMPONENTS (MODERN STYLING)
// ============================================================================
const PlaceholderPage: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <div className="min-h-screen bg-slate-900">
    <div className="max-w-4xl mx-auto">
      <div className="card text-center">
        <h1 className="text-4xl font-bold text-white mb-4">{title}</h1>
        <p className="text-slate-400 text-xl mb-8">This feature is coming soon!</p>
        <button onClick={onBack} className="btn btn-primary text-lg px-8 py-4">
          Back to Dashboard
        </button>
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
function App() {
  const [isCoachMode, setIsCoachMode] = useLocalStorage('noominds-coach-mode', false);
  const [clients] = useLocalStorage<Client[]>('noominds-clients', mockClients);
  const [athleteView, setAthleteView] = useState<AppView>('dashboard');

  const currentUser = clients[0];

  const renderContent = () => {
    switch (athleteView) {
      case 'assessment':
        return <Assessment onBack={() => setAthleteView('dashboard')} onComplete={() => setAthleteView('dashboard')} />;
      case 'logger':
        return <PlaceholderPage title="Session Logger" onBack={() => setAthleteView('dashboard')} />;
      case 'progress':
        return <PlaceholderPage title="Progress Charts" onBack={() => setAthleteView('dashboard')} />;
      case 'event_planner':
        return <PlaceholderPage title="Event Planner" onBack={() => setAthleteView('dashboard')} />;
      case 'ai_coach':
        return <PlaceholderPage title="AI Coach" onBack={() => setAthleteView('dashboard')} />;
      case 'dashboard':
      default:
        return <Dashboard client={currentUser} onNavigate={setAthleteView} />;
    }
  };

  return (
    <Layout
      isCoachMode={isCoachMode}
      onToggleCoachMode={() => setIsCoachMode(prev => !prev)}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;
