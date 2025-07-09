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
// Get saved assessment results or use defaults
const getSavedAssessment = () => {
  try {
    const saved = localStorage.getItem('noominds-assessment-results');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.log('No saved assessment found');
  }
  return {
    targetCarb: 75,
    eventName: 'Your Next Event',
    eventType: 'Cycling',
    eventDate: '2025-12-31'
  };
};

const mockClient: Client = {
  profile: { id: 'user-1', name: 'Craig Elliott', email: 'craig@example.com', sport: 'Cycling' },
  sessions: [
    { id: 's1', date: '2025-07-01', duration: 120, carbs: 100, symptomSeverity: 2, sport: 'Cycling', rpe: 6, fluids: 1000, notes: 'Good session' },
    { id: 's2', date: '2025-07-03', duration: 90, carbs: 70, symptomSeverity: 1, sport: 'Cycling', rpe: 7, fluids: 800, notes: 'Felt strong' },
  ],
  event: {
    name: getSavedAssessment().eventName,
    date: getSavedAssessment().eventDate,
    type: getSavedAssessment().eventType,
    targetCarb: getSavedAssessment().targetCarb
  },
};

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
    
    // Save the assessment results to update Dashboard
    const updatedProfile = {
      targetCarb: calculatedResult.targetCarbs,
      eventName: formData.eventName || 'Your Event',
      eventType: formData.sport.charAt(0).toUpperCase() + formData.sport.slice(1),
      eventDate: formData.eventDate || '2025-12-31'
    };
    
    // Store in localStorage so Dashboard can read it
    localStorage.setItem('noominds-assessment-results', JSON.stringify(updatedProfile));
    
  } catch (error) {
    console.error("Calculation error:", error);
    alert("Error calculating carbs: " + error.message);
  }
};

  // Input style object
  const inputStyle = {
    width: '100%',
    backgroundColor: '#334155',
    border: '1px solid #475569',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#ffffff',
    fontSize: '16px',
    outline: 'none'
  };

  const labelStyle = {
    color: '#ffffff',
    fontWeight: '500',
    marginBottom: '8px',
    display: 'block'
  };

  if (result) {
    return (
      <div className="max-w-5xl mx-auto">
        {/* Results page stays the same */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4"></path>
              <circle cx="12" cy="12" r="10"></circle>
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Your Personalized Carb Strategy</h1>
          <p className="text-xl text-slate-300">Based on your assessment, here's your race-day nutrition plan</p>
        </div>

        <div className="space-y-8">
          {/* Main Result Card */}
          <div className="card text-center bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-orange-500/30">
            <div className="mb-8">
              <div className="text-6xl font-bold gradient-text mb-4">
                {result.targetCarbs}g
              </div>
              <div className="text-2xl text-slate-300 mb-2">carbs per hour</div>
              <div className="text-lg text-slate-400">Recommended for your {formData.eventName || 'event'}</div>
              
              <div className={`inline-block px-6 py-3 rounded-full text-sm font-bold mt-6 ${
                result.confidence === 'high' ? 'bg-green-500/20 text-green-400 border-2 border-green-500/40' :
                result.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/40' :
                'bg-red-500/20 text-red-400 border-2 border-red-500/40'
              }`}>
                {result.confidence.toUpperCase()} CONFIDENCE
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="card">
            <h3 className="text-2xl font-bold text-white mb-6">📋 Your Training Plan</h3>
            <div className="space-y-4">
              {result.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start bg-slate-700/30 rounded-lg p-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-white font-bold text-sm">{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-slate-200 leading-relaxed">{rec}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <button onClick={onBack} className="btn-primary text-lg px-8 py-4">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Assessment Form with WORKING inputs
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12l2 2 4-4"></path>
            <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
            <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Personalized Carb Assessment</h1>
        <p className="text-xl text-slate-300">Calculate your optimal race-day carb intake</p>
      </div>

      <div className="space-y-8">
        {/* Step 1: Personal Information */}
        <div className="card">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
              <span className="text-white font-bold">1</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Personal Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label style={labelStyle}>Age</label>
              <input 
                type="number" 
                name="age" 
                value={formData.age} 
                onChange={handleInputChange} 
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Weight (kg)</label>
              <input 
                type="number" 
                name="weight" 
                value={formData.weight} 
                onChange={handleInputChange} 
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Gender</label>
              <select 
                name="gender" 
                value={formData.gender} 
                onChange={handleInputChange} 
                style={inputStyle}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: Event Details */}
        <div className="card">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
              <span className="text-white font-bold">2</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Your Target Event</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label style={labelStyle}>Event Name</label>
              <input 
                type="text" 
                name="eventName" 
                value={formData.eventName} 
                onChange={handleInputChange} 
                placeholder="e.g., Ironman 70.3, London Marathon"
                style={{...inputStyle, color: formData.eventName ? '#ffffff' : '#94a3b8'}}
              />
            </div>
            <div>
              <label style={labelStyle}>Event Duration (hours)</label>
              <input 
                type="number" 
                step="0.5" 
                name="eventDuration" 
                value={formData.eventDuration} 
                onChange={handleInputChange} 
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Primary Sport</label>
              <select 
                name="sport" 
                value={formData.sport} 
                onChange={handleInputChange} 
                style={inputStyle}
              >
                <option value="cycling">Cycling</option>
                <option value="running">Running</option>
                <option value="triathlon">Triathlon</option>
                <option value="swimming">Swimming</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Expected Intensity</label>
              <select 
                name="intensity" 
                value={formData.intensity} 
                onChange={handleInputChange} 
                style={inputStyle}
              >
                <option value="low">Low (Easy/Recovery pace)</option>
                <option value="moderate">Moderate (Steady state)</option>
                <option value="high">High (Threshold/Race pace)</option>
                <option value="mixed">Mixed (Variable intensity)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Step 3: Experience & Current Status */}
        <div className="card">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
              <span className="text-white font-bold">3</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Experience & Current Fueling</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label style={labelStyle}>Experience Level</label>
              <select 
                name="experienceLevel" 
                value={formData.experienceLevel} 
                onChange={handleInputChange} 
                style={inputStyle}
              >
                <option value="beginner">Beginner (0-2 years)</option>
                <option value="intermediate">Intermediate (2-5 years)</option>
                <option value="advanced">Advanced (5+ years)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Current Comfortable Carb Intake (g/hr)</label>
              <input 
                type="number" 
                name="currentCarbIntake" 
                value={formData.currentCarbIntake} 
                onChange={handleInputChange} 
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Weekly Training Hours</label>
              <input 
                type="number" 
                name="weeklyTrainingHours" 
                value={formData.weeklyTrainingHours} 
                onChange={handleInputChange} 
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Longest Training Session (hours)</label>
              <input 
                type="number" 
                step="0.5" 
                name="longestSession" 
                value={formData.longestSession} 
                onChange={handleInputChange} 
                style={inputStyle}
              />
            </div>
          </div>
        </div>

       {/* Step 4: GI History - FIXED VERSION */}
<div className="card">
  <div className="flex items-center mb-6">
    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
      <span className="text-white font-bold">4</span>
    </div>
    <h2 className="text-2xl font-bold text-white">Gut Health History</h2>
  </div>
  <div className="space-y-6">
    <div>
      <label className="flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          name="hasGiIssues" 
          checked={formData.hasGiIssues} 
          onChange={handleCheckboxChange} 
          style={{
            width: '20px',
            height: '20px',
            marginRight: '12px',
            accentColor: '#f97316'
          }}
        />
        <span style={{color: '#ffffff', fontWeight: '500'}}>I have experienced GI issues during training or racing</span>
      </label>
    </div>
    
    {/* This section shows when checkbox is ticked */}
    {formData.hasGiIssues && (
      <div style={{
        backgroundColor: 'rgba(51, 65, 85, 0.3)',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #475569'
      }}>
        <label style={{...labelStyle, marginBottom: '16px'}}>What symptoms have you experienced? (Check all that apply)</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {['Nausea', 'Bloating', 'Cramps', 'Reflux', 'Diarrhea', 'Vomiting'].map(symptom => (
            <label key={symptom} className="flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                style={{
                  width: '16px',
                  height: '16px',
                  marginRight: '8px',
                  accentColor: '#f97316'
                }}
              />
              <span style={{color: '#ffffff', fontSize: '14px'}}>{symptom}</span>
            </label>
          ))}
        </div>
      </div>
    )}
  </div>
</div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-8">
          <button 
            onClick={onBack} 
            style={{
              padding: '12px 24px',
              backgroundColor: '#475569',
              color: '#ffffff',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ← Back to Dashboard
          </button>
          <button 
            onClick={handleSubmit} 
            className="btn-primary text-lg px-8 py-4 shadow-lg"
          >
            Calculate My Carb Strategy
          </button>
        </div>
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

        {/* 4 Feature Tiles */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-8">Get Started</h2>
          <div className="tiles-grid">
            
            {/* Assessment Tile */}
            <div className="action-tile" onClick={() => onNavigate('assessment')}>
              <div className="action-tile-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"></path>
                  <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                  <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
                </svg>
              </div>
              <h3>Assessment</h3>
              <p className="text-slate-400 text-sm">Calculate your personalized carb strategy</p>
            </div>

            {/* Session Tile */}
            <div className="action-tile" onClick={() => onNavigate('logger')}>
              <div className="action-tile-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                </svg>
              </div>
              <h3>Session</h3>
              <p className="text-slate-400 text-sm">Log your training sessions</p>
            </div>

            {/* Planner Tile */}
            <div className="action-tile" onClick={() => onNavigate('event_planner')}>
              <div className="action-tile-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                </svg>
              </div>
              <h3>Planner</h3>
              <p className="text-slate-400 text-sm">Plan your event strategy</p>
            </div>

            {/* AI Carb Coach Tile */}
            <div className="action-tile" onClick={() => onNavigate('ai_coach')}>
              <div className="action-tile-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  <circle cx="9" cy="12" r="1"></circle>
                  <circle cx="15" cy="12" r="1"></circle>
                </svg>
              </div>
              <h3>AI Carb Coach</h3>
              <p className="text-slate-400 text-sm">Get personalized advice</p>
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
