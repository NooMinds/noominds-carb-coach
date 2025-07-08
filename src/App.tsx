import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  FormEvent,
} from 'react';
import jsPDF from 'jspdf';
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
  | 'ai_coach'
  | 'coach_dashboard'
  | 'client_view';

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
  date: string; // ISO
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

// Assessment Types
interface AssessmentData {
  // Personal Information
  age: number;
  weight: number;
  gender: 'male' | 'female';
  heightCm: number;
  
  // Event Details
  eventName: string;
  eventDate: string;
  eventDuration: number; // hours
  sport: 'cycling' | 'running' | 'triathlon' | 'swimming' | 'other';
  intensity: 'low' | 'moderate' | 'high' | 'mixed';
  
  // Experience & History
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  currentCarbIntake: number; // g/hr currently comfortable with
  hasGiIssues: boolean;
  symptomHistory: string[];
  
  // Training Background
  weeklyTrainingHours: number;
  longestSession: number; // hours
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

// ============================================================================+
// CARB CALCULATION ALGORITHM                                                  +
// ============================================================================+

function calculateTargetCarbs(assessment: AssessmentData): AssessmentResult {
  let baseCarbs = 60; // Starting baseline g/hr
  
  // Duration factor (most important)
  if (assessment.eventDuration < 2) {
    baseCarbs = 45; // Shorter events
  } else if (assessment.eventDuration >= 2 && assessment.eventDuration <= 3) {
    baseCarbs = 75; // Medium duration
  } else {
    baseCarbs = 90; // Long duration events
  }
  
  // Intensity adjustments
  const intensityMultiplier = {
    'low': 0.85,
    'moderate': 1.0,
    'high': 1.15,
    'mixed': 1.05
  };
  baseCarbs *= intensityMultiplier[assessment.intensity];
  
  // Body weight factor (1g per kg as rough guide)
  const weightFactor = assessment.weight / 70; // 70kg as reference
  baseCarbs *= (0.8 + (weightFactor * 0.4)); // Scale between 80-120% based on weight
  
  // Sport-specific tolerance
  const sportAdjustment = {
    'cycling': 15,      // Highest tolerance
    'triathlon': 10,    // High tolerance
    'swimming': 5,      // Medium tolerance
    'running': 0,       // Baseline (hardest on gut)
    'other': 5          // Medium tolerance
  };
  baseCarbs += sportAdjustment[assessment.sport];
  
  // Experience level
  const experienceAdjustment = {
    'beginner': -10,
    'intermediate': 0,
    'advanced': 10
  };
  baseCarbs += experienceAdjustment[assessment.experienceLevel];
  
  // Age factor (slight reduction over 40)
  if (assessment.age > 40) {
    baseCarbs *= 0.95;
  }
  
  // Gender factor (very slight difference)
  if (assessment.gender === 'female') {
    baseCarbs *= 0.98;
  }
  
  // Cap at physiological limits
  const finalCarbs = Math.min(Math.max(baseCarbs, 30), 120);
  
  // Confidence calculation
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (assessment.hasGiIssues || assessment.currentCarbIntake < (finalCarbs * 0.7)) {
    confidence = 'medium';
  }
  if (assessment.experienceLevel === 'beginner' && finalCarbs > 70) {
    confidence = 'low';
  }
  
  // Generate recommendations
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
    recommendations.push(`Gradually increase from ${assessment.currentCarbIntake}g/hr to ${targetCarbs}g/hr over 8-12 weeks`);
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

// ============================================================================+
// PDF EXPORT UTILITY                                                          +
// ============================================================================+

function generateAthletePDF(client: Client) {
  const { avg } = calculateFilteredAvgCarb(client.sessions);
  const readiness = Math.min(
    100,
    Math.round((avg / client.event.targetCarb) * 100)
  );

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  const lineGap = 8;
  let y = 20;

  // --- Branding Header ---
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

  // --- Client Profile ---
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Athlete: ${client.profile.name}`, 10, y);
  y += lineGap;
  doc.text(`Sport: ${client.profile.sport}`, 10, y);
  y += lineGap;
  doc.text(`Event: ${client.event.name} (${client.event.type})`, 10, y);
  y += lineGap;

  // --- Key Metrics ---
  doc.setFontSize(12);
  doc.setTextColor(239, 106, 62);
  doc.text('Current Metrics', 10, (y += lineGap));
  doc.setTextColor(0);
  y += 2;
  doc.setFontSize(10);
  doc.text(`• Avg Carb Intake: ${avg.toFixed(0)} g/hr`, 12, (y += lineGap));
  doc.text(
    `• Target Carb Intake: ${client.event.targetCarb} g/hr`,
    12,
    (y += lineGap)
  );
  doc.text(`• Readiness: ${readiness}%`, 12, (y += lineGap));
  y += lineGap;

  // --- Recent Sessions ---
  doc.setFontSize(12);
  doc.setTextColor(239, 106, 62);
  doc.text('Recent Sessions (≤5)', 10, (y += lineGap));
  doc.setFontSize(10);
  doc.setTextColor(0);
  const recent = [...client.sessions]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 5);
  if (recent.length === 0) {
    doc.text('No sessions logged yet.', 12, (y += lineGap));
  } else {
    recent.forEach((s) => {
      const rate = (s.carbs / (s.duration / 60)).toFixed(0);
      doc.text(
        `${niceDate(s.date)}  •  ${s.sport.padEnd(8)}  •  ${s.duration} min  •  ${rate} g/hr  •  Symptom ${s.symptomSeverity}/10`,
        12,
        (y += lineGap)
      );
    });
  }
  y += lineGap;

  // --- Recommendations placeholder ---
  doc.setFontSize(12);
  doc.setTextColor(239, 106, 62);
  doc.text('Coach Recommendations', 10, (y += lineGap));
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(
    '- Increase carb intake by 5-10 g/hr on next >90 min session.\n- Focus on hydration: ≥600 ml/hr with 400-600 mg Na.\n- Practice race-day nutrition plan weekly.',
    12,
    (y += lineGap),
    { maxWidth: 180 }
  );

  // --- Footer ---
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(
    'Generated by NooMinds Carb Coach • www.noominds.com',
    105,
    287,
    { align: 'center' }
  );

  doc.save(`${client.profile.name.replace(/\\s+/g, '_')}_Report.pdf`);
}

// ============================================================================
// MOCK CLIENT DATA
// ============================================================================
const mockClients: Client[] = [
  {
    profile: { id: 'client-1', name: 'Alex Johnson', email: 'alex.j@example.com', sport: 'Triathlon' },
    sessions: [
      { id: 's1-1', date: '2025-07-01', duration: 120, carbs: 100, symptomSeverity: 2, sport: 'Cycling', rpe: 6, fluids: 1000, notes: 'Good session.' },
      { id: 's1-2', date: '2025-07-03', duration: 75, carbs: 60, symptomSeverity: 1, sport: 'Running', rpe: 7, fluids: 750, notes: 'Felt strong.' },
    ],
    event: { name: 'Ironman 70.3', date: '2025-09-15', type: 'Triathlon', targetCarb: 90 },
  },
  {
    profile: { id: 'client-2', name: 'Maria Garcia', email: 'maria.g@example.com', sport: 'Ultra Running' },
    sessions: [
      { id: 's2-1', date: '2025-06-28', duration: 180, carbs: 150, symptomSeverity: 4, sport: 'Running', rpe: 5, fluids: 1500, notes: 'Stomach felt a bit off.' },
      { id: 's2-2', date: '2025-07-05', duration: 240, carbs: 180, symptomSeverity: 5, sport: 'Running', rpe: 6, fluids: 2000, notes: 'Tough, but managed the fueling.' },
    ],
    event: { name: 'UTMB', date: '2025-08-30', type: 'Ultra Running', targetCarb: 75 },
  },
  {
    profile: { id: 'client-3', name: 'Ben Carter', email: 'ben.c@example.com', sport: 'Cycling' },
    sessions: [
      { id: 's3-1', date: '2025-07-02', duration: 90, carbs: 85, symptomSeverity: 1, sport: 'Cycling', rpe: 7, fluids: 1000, notes: 'Felt great, ready for more.' },
      { id: 's3-2', date: '2025-07-06', duration: 150, carbs: 150, symptomSeverity: 0, sport: 'Cycling', rpe: 6, fluids: 1500, notes: 'Hit 60g/hr with no issues!' },
    ],
    event: { name: 'Majorca 312', date: '2025-10-25', type: 'Cycling', targetCarb: 65 },
  },
   {
    profile: { id: 'client-4', name: 'Chloe Davis', email: 'chloe.d@example.com', sport: 'Marathon' },
    sessions: [],
    event: { name: 'London Marathon', date: '2026-04-26', type: 'Running', targetCarb: 80 },
  },
];

// ============================================================================
// Branding & Layout Components
// ============================================================================

const Header: React.FC<{ isCoachMode: boolean; onToggleCoachMode: () => void }> = ({ isCoachMode, onToggleCoachMode }) => (
  <header className="bg-slate-800 text-white shadow-md">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
      <div className="flex items-center">
        <div className="w-8 h-8 mr-3 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{backgroundColor: '#EF6A3E'}}>
          N
        </div>
        <span className="text-2xl font-bold">NooMinds</span>
      </div>
      <button onClick={onToggleCoachMode} className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-slate-700 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
        <span>{isCoachMode ? 'Athlete View' : 'Coach View'}</span>
      </button>
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

const Layout: React.FC<{ children: React.ReactNode; isCoachMode: boolean; onToggleCoachMode: () => void }> = ({ children, isCoachMode, onToggleCoachMode }) => (
  <div className="min-h-screen bg-slate-50">
    <Header isCoachMode={isCoachMode} onToggleCoachMode={onToggleCoachMode} />
    <main className="p-4 sm:p-6 lg:p-8">
      {children}
    </main>
    <Footer />
  </div>
);

// ============================================================================
// ASSESSMENT COMPONENT
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
    const calculatedResult = calculateTargetCarbs(formData);
    setResult(calculatedResult);
  };

  if (result) {
    return (
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-slate-900">Your Personalized Carb Recommendation</h1>
          <p className="mt-2 text-lg text-slate-600">Based on your assessment, here's your race-day carb strategy.</p>
        </header>

        <div className="space-y-6">
          {/* Results Card */}
          <div className="card">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-2" style={{color: '#EF6A3E'}}>
                {result.targetCarbs}g carbs/hour
              </h2>
              <p className="text-slate-600">Recommended for your {formData.eventName || 'event'}</p>
              <div className={`inline-block px-3 py-1 rounded-full text-sm ${
                result.confidence === 'high' ? 'bg-green-100 text-green-800' :
                result.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {result.confidence.toUpperCase()} CONFIDENCE
              </div>
            </div>
          </div>

          {/* Challenge Protocol */}
          <div className="card" style={{backgroundColor: 'rgba(239, 106, 62, 0.1)', borderColor: 'rgba(239, 106, 62, 0.3)', borderWidth: '1px', borderStyle: 'solid'}}>
            <h3 className="font-bold mb-4" style={{color: '#EF6A3E'}}>🧪 But Can Your Gut Handle It?</h3>
            <p className="mb-4 text-slate-700">Before race day, test if your gut can actually handle this intake:</p>
            
            <div className="bg-white p-4 rounded-lg mb-4">
              <h4 className="font-semibold mb-2">3-Hour Gut Challenge Protocol:</h4>
              <ol className="list-decimal list-inside space-y-1">
                {result.challengeProtocol.testInstructions.map((instruction, index) => (
                  <li key={index} className="text-sm">{instruction}</li>
                ))}
              </ol>
            </div>

            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Reality Check:</strong> Most athletes can only handle 60g/hr comfortably. 
                If you score 4+ on symptoms during this test, your gut needs training.
              </p>
            </div>
          </div>

          {/* Recommendations */}
          <div className="card">
            <h3 className="font-semibold mb-4">📋 Your Personalized Recommendations:</h3>
            <ul className="space-y-2">
              {result.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2" style={{color: '#EF6A3E'}}>•</span>
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="text-center">
            <button onClick={onBack} className="btn btn-primary">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-slate-900">Personalized Carb Assessment</h1>
        <p className="mt-2 text-lg text-slate-600">
          Let's calculate your optimal race-day carb intake based on science and your individual profile.
        </p>
      </header>

      <form className="card space-y-8">
        {/* Step 1: Personal Information */}
        <fieldset>
          <legend>1. Personal Information</legend>
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
        <fieldset>
          <legend>2. Your Target Event</legend>
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
        <fieldset>
          <legend>3. Experience & Current Fueling</legend>
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
        <fieldset>
          <legend>4. Gut Health History</legend>
          <div className="space-y-4">
            <div>
              <label className="flex items-center">
                <input type="checkbox" name="hasGiIssues" checked={formData.hasGiIssues} 
                       onChange={handleCheckboxChange} className="form-checkbox mr-2" />
                I have experienced GI issues during training or racing
              </label>
            </div>
            {formData.hasGiIssues && (
              <div>
                <label className="form-label">What symptoms have you experienced? (Check all that apply)</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {['Nausea', 'Bloating', 'Cramps', 'Reflux', 'Diarrhea', 'Vomiting'].map(symptom => (
                    <label key={symptom} className="flex items-center">
                      <input type="checkbox" className="form-checkbox mr-2" />
                      {symptom}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </fieldset>

        <div className="flex justify-between items-center pt-8 border-t">
          <button type="button" onClick={onBack} className="btn btn-outline">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} className="btn btn-primary">
            Calculate My Carb Needs
          </button>
        </div>
      </form>
    </div>
  );
};

// ============================================================================
// Page Components
// ============================================================================

interface DashboardProps {
  client: Client;
  onNavigate: (view: AppView) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ client, onNavigate }) => {
  const { avg: avgCarb, count: longSessionsCount } = calculateFilteredAvgCarb(client.sessions);

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-slate-900">NooMinds Focus, Energy, Performance</h1>
        <p className="mt-2 text-lg text-slate-600">
          Welcome back, <span className="font-bold" style={{color: '#EF6A3E'}}>{client.profile.name}</span>! Let's optimize your fueling.
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
              <p className="text-3xl font-bold" style={{color: '#EF6A3E'}}>{client.event.targetCarb}<span className="text-lg font-medium text-slate-500">g/hr</span></p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-slate-500">Sessions Logged</p>
              <p className="text-3xl font-bold text-slate-800">{client.sessions.length}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-slate-700">Get Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card flex flex-col items-center text-center">
              <h3 className="font-semibold mb-2">1. Start Your Assessment</h3>
              <p className="text-sm text-slate-600 flex-grow mb-4">Calculate your personalized carb needs and gut training plan.</p>
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

const AICoach: React.FC<{ client: Client; onBack: () => void }> = ({ client, onBack }) => {
  const [messages, setMessages] = useLocalStorage<Message[]>(`noominds-chat-${client.profile.id}`, []);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  const isApiConfigured = OPENAI_API_KEY && OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        text: `Hi ${client.profile.name.split(' ')[0]}! I'm your AI Carb Coach. How can I help you today?`,
        sender: 'ai',
        timestamp: new Date().toISOString()
      }]);
    }
  }, [setMessages, client.profile.name, messages.length]);

  const getAIResponse = async (userInput: string): Promise<string> => {
    if (!isApiConfigured) {
       return "That's a great question. For specific product recommendations or complex issues, consulting a human sports nutritionist is best. I can help you analyze your logged sessions and plan your progression. (DEMO MODE)";
    }
    // Real API call logic would go here
    return "This is where a real AI response would appear.";
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
        <h1 className="text-slate-900">AI Carb Coach for {client.profile.name}</h1>
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
              {msg.sender === 'user' && <div className="w-8 h-8 rounded-full text-white flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{backgroundColor: '#EF6A3E'}}>{client.profile.name.charAt(0)}</div>}
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

const SessionLogger: React.FC<{ onAddSession: (session: Omit<Session, 'id'>) => void; onBack: () => void }> = ({ onAddSession, onBack }) => {
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
    onAddSession(formState);
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

const EventDayPlanner: React.FC<{ client: Client; onBack: () => void }> = ({
  client,
  onBack,
}) => {
  // persist event details
  const [event, setEvent] = useLocalStorage<EventDetails>(`noominds-event-${client.profile.id}`, client.event);

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
  const { avg: avgCarb, count: longSessionsCount } = calculateFilteredAvgCarb(client.sessions);

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
        <h1 className="text-slate-900">Event Day Planner for {client.profile.name}</h1>
        <p className="mt-2 text-lg text-slate-600">
          Track readiness for their upcoming event.
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

const CoachDashboard: React.FC<{ clients: Client[]; onSelectClient: (id: string) => void }> = ({ clients, onSelectClient }) => {
  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-slate-900">Coach Dashboard</h1>
        <p className="mt-2 text-lg text-slate-600">
          Manage your athletes and track their progress at a glance.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map(client => {
          const { avg, count } = calculateFilteredAvgCarb(client.sessions);
          const readiness = Math.min(100, Math.round((avg / client.event.targetCarb) * 100));
          const daysUntil = client.event.date ? Math.ceil((new Date(client.event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : NaN;
          
          let statusColor = 'border-red-500';
          if (readiness >= 90) statusColor = 'border-green-500';
          else if (readiness >= 70) statusColor = 'border-yellow-500';

          return (
            <div key={client.profile.id} className={`card !p-0 flex flex-col border-t-4 ${statusColor}`}>
              <div className="p-4">
                <h3 className="font-bold text-slate-800">{client.profile.name}</h3>
                <p className="text-sm text-slate-500">{client.event.name}</p>
                <p className="text-xs text-slate-400">{isNaN(daysUntil) ? 'No date set' : `${daysUntil} days to go`}</p>
              </div>
              <div className="p-4 bg-slate-50">
                <p className="text-xs text-slate-500 mb-1">Event Readiness</p>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full" style={{ backgroundColor: '#EF6A3E', width: `${readiness}%` }} />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span>{avg.toFixed(0)} g/hr</span>
                  <span className="font-bold">{readiness}%</span>
                </div>
              </div>
              <div className="p-4 mt-auto border-t">
                <button onClick={() => onSelectClient(client.profile.id)} className="btn btn-primary w-full text-sm">View Details</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ClientDetailView: React.FC<{ client: Client; onBackToCoachDashboard: () => void }> = ({ client, onBackToCoachDashboard }) => {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  
  const addSession = (newSession: Omit<Session, 'id'>) => {
    // In a real app, you'd update the client's session list here
    console.log("Adding session for client:", client.profile.id, newSession);
    alert("Session logged for " + client.profile.name);
  };

  const renderView = () => {
     switch (currentView) {
      case 'assessment':
        return <Assessment onBack={() => setCurrentView('dashboard')} onComplete={() => setCurrentView('dashboard')} />;
      case 'logger':
        return <SessionLogger onAddSession={addSession} onBack={() => setCurrentView('dashboard')} />;
      case 'progress':
        return <PlaceholderPage title={`Progress for ${client.profile.name}`} onBack={() => setCurrentView('dashboard')} />;
      case 'event_planner':
        return <EventDayPlanner client={client} onBack={() => setCurrentView('dashboard')} />;
      case 'ai_coach':
        return <AICoach client={client} onBack={() => setCurrentView('dashboard')} />;
      case 'dashboard':
      default:
        return <Dashboard client={client} onNavigate={setCurrentView} />;
    }
  };
  
  return (
    <div>
      {/* Top action bar */}
      <div className="max-w-6xl mx-auto mb-6 flex flex-wrap gap-3">
        <button
          onClick={onBackToCoachDashboard}
          className="btn btn-outline text-sm"
        >
          &larr; Back to Coach Dashboard
        </button>

        {/* Coach-only PDF export */}
        <button
          onClick={() => generateAthletePDF(client)}
          className="btn btn-secondary text-sm flex items-center gap-1"
          title="Export Athlete PDF (coach only)"
        >
          {/* simple download icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export PDF
        </button>
      </div>

      {renderView()}
    </div>
  );
};

// ============================================================================+
// Main App Component - FIXED ATHLETE NAVIGATION                               +
// ============================================================================+

function App() {
  const [isCoachMode, setIsCoachMode] = useLocalStorage('noominds-coach-mode', false);
  const [clients] = useLocalStorage<Client[]>('noominds-clients', mockClients);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [athleteView, setAthleteView] = useState<AppView>('dashboard');

  const handleSelectClient = (id: string) => setSelectedClientId(id);
  const handleBackToCoachDashboard = () => setSelectedClientId(null);

  const addAthleteSession = (newSession: Omit<Session, 'id'>) => {
    console.log("Adding session for athlete:", newSession);
    alert("Session logged successfully!");
    setAthleteView('dashboard');
  };

  const renderContent = () => {
    if (isCoachMode) {
      const selectedClient = clients.find(c => c.profile.id === selectedClientId);
      if (selectedClient) {
        return (
          <ClientDetailView
            client={selectedClient}
            onBackToCoachDashboard={handleBackToCoachDashboard}
          />
        );
      }
      return (
        <CoachDashboard
          clients={clients}
          onSelectClient={handleSelectClient}
        />
      );
    }

    // Athlete view with proper navigation
    const currentUser = clients[0];
    
    switch (athleteView) {
      case 'assessment':
        return <Assessment onBack={() => setAthleteView('dashboard')} onComplete={() => setAthleteView('dashboard')} />;
      case 'logger':
        return <SessionLogger onAddSession={addAthleteSession} onBack={() => setAthleteView('dashboard')} />;
      case 'progress':
        return <PlaceholderPage title="Progress Charts" onBack={() => setAthleteView('dashboard')} />;
      case 'event_planner':
        return <EventDayPlanner client={currentUser} onBack={() => setAthleteView('dashboard')} />;
      case 'ai_coach':
        return <AICoach client={currentUser} onBack={() => setAthleteView('dashboard')} />;
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
