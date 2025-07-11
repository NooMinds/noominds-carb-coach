import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';

import './App.css';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Basic user profile information
 */
interface Client {
  name: string;                // Full name
  email: string;               // Email address
  age: number;                 // Age in years
  weight: number;              // Weight in kg
  height: number;              // Height in cm
  gender: string;              // 'Female' | 'Male' | 'Non-binary' | 'Prefer not to say'
  sport: string;               // Primary sport (e.g., 'Cycling', 'Running', 'Triathlon')
  experienceLevel: string;     // 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite'
  targetEvents: string[];      // Array of target event names
}

/**
 * Individual training session data
 */
interface Session {
  id: string;                  // Unique identifier
  date: string;                // ISO string date format
  sport: string;               // Sport type for this session
  duration: number;            // Session duration in minutes
  carbs: number;               // Total carbohydrates consumed in grams
  fluids: number;              // Total fluid intake in milliliters
  symptomSeverity: number;     // GI symptom severity on 0-10 scale
  rpe: number;                 // Rate of perceived exertion on 1-10 scale
  notes: string;               // Additional session notes
}

/**
 * Saved assessment output (used across components)
 */
interface AssessmentResult {
  /* Calculated results */
  targetCarbs: number;         // Recommended carbs in grams (total session)
  giSensitivity: string;       // 'none' | 'moderate' | 'high'
  recommendations: string[];   // Array of personalized recommendations
  /* Raw questionnaire data */
  symptoms: string[];          // Array of reported symptoms
  date: string;                // ISO timestamp of assessment completion
  name: string;                // User's name
  email: string;               // User's email
  age: number;                 // User's age in years
  weight: number;              // User's weight in kg
  height: number;              // User's height in cm
  gender: string;              // User's gender
  sport: string;               // User's primary sport
  experienceLevel: string;     // User's experience level
  targetEvents: string[];      // User's target events
  eventDate: string;           // Date of target event
  duration: number;            // Expected duration in minutes
  intensity: string;           // 'low' | 'moderate' | 'high'
}

/**
 * Race plan block for event planning
 */
interface RacePlanBlock {
  time: string;                // Time marker (e.g., "00:00", "01:00")
  carbs: string;               // Carb recommendation with units (e.g., "60 g")
  fluids: string;              // Fluid recommendation with units (e.g., "650 ml")
}

/**
 * Chat message for AI Carb Coach
 */
type ChatMessage = { 
  role: 'system' | 'user' | 'assistant'; 
  content: string 
};

// ============================================================================
// MOCK DATA
// ============================================================================

const mockClient: Client = {
  name: 'Sarah Johnson',
  email: 'sarah.j@example.com',
  age: 32,
  weight: 65, // kg
  height: 172, // cm
  gender: 'Female',
  sport: 'Triathlon',
  experienceLevel: 'Intermediate',
  targetEvents: ['London Marathon', 'Brighton Triathlon']
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ============================================================================
// CARB CALCULATION FUNCTIONS
// ============================================================================

function calculateTargetCarbs(
  weight: number,
  duration: number,
  intensity: string,
  giSensitivity: string
): number {
  // Base calculation based on scientific recommendations
  let baseRate = 0;
  
  // Set base carb rate based on intensity
  if (intensity === 'high') {
    baseRate = 75; // ~75g/hr for high intensity
  } else if (intensity === 'moderate') {
    baseRate = 60; // ~60g/hr for moderate intensity
  } else {
    baseRate = 40; // ~40g/hr for low intensity
  }
  
  // Adjust for duration (longer events may require more carbs)
  let durationFactor = 1.0;
  if (duration >= 150) { // 2.5+ hours
    durationFactor = 1.1; // 10% increase for longer events
  }
  /* ------------------------------------------------------------------
     GI sensitivity should NOT reduce the physiological carb requirement.
     It will be used purely for visual / tracking purposes elsewhere.
     ------------------------------------------------------------------ */
  // Calculate target carbs per hour (no GI penalty)
  const targetCarbsPerHour = baseRate * durationFactor;
  
  // Calculate total carbs for the session
  const totalSessionCarbs = targetCarbsPerHour * (duration / 60);
  
  return totalSessionCarbs;
}

function generateRecommendations(
  targetCarbs: number,
  duration: number,
  giSensitivity: string,
  symptoms: string[]
): string[] {
  const recommendations: string[] = [];
  const carbsPerHour = (targetCarbs / (duration / 60)).toFixed(1);
  
  // Core recommendation based on carb target
  recommendations.push(`Target ${carbsPerHour}g of carbs per hour during ${duration} minute sessions.`);
  
  // Recommendations based on GI sensitivity
  if (giSensitivity === 'high') {
    recommendations.push('Start with easily digestible carb sources like sports drinks and gels with glucose.');
    recommendations.push('Avoid high-fiber foods within 3 hours of training.');
    recommendations.push('Consider multiple carb sources (glucose + fructose) for better absorption.');
  } else if (giSensitivity === 'moderate') {
    recommendations.push('Mix carb sources between solid foods and liquids for variety.');
    recommendations.push('Test new products during shorter training sessions first.');
  } else {
    recommendations.push('You can likely tolerate a wide variety of carb sources during exercise.');
    recommendations.push('Experiment with solid foods, gels, and drinks to find your preference.');
  }
  
  // Symptom-specific recommendations
  if (symptoms.includes('bloating')) {
    recommendations.push('Try lower fructose options to reduce bloating.');
  }
  if (symptoms.includes('nausea')) {
    recommendations.push('Small, frequent carb intake may help reduce nausea compared to larger portions.');
  }
  if (symptoms.includes('cramping')) {
    recommendations.push('Ensure adequate sodium intake alongside carbs to minimize cramping.');
  }
  if (symptoms.includes('diarrhea')) {
    recommendations.push('Avoid high-fiber and high-fat foods before and during exercise.');
    recommendations.push('Consider a low FODMAP approach pre-exercise.');
  }
  
  // Training recommendations
  recommendations.push('Train your gut by gradually increasing carb intake during training sessions.');
  recommendations.push('Practice your race nutrition strategy during training sessions.');
  
  return recommendations;
}

// ============================================================================
// ASSESSMENT COMPONENT
// ============================================================================

const Assessment: React.FC<{ onBack: () => void; onComplete: () => void }> = ({ onBack, onComplete }) => {
  const [formData, setFormData] = useState({
    // Personal Details
    name: '',
    email: '',
    age: 30,
    gender: 'Female',
    height: 170,
    weight: 70,
    
    // Sport & Experience
    sport: 'Triathlon',
    experienceLevel: 'Intermediate',
    targetEvents: '',
    eventDate: new Date().toISOString().split('T')[0],
    
    // Exercise Details
    duration: 120,
    intensity: 'moderate',
    
    // GI History
    giHistory: 'none',
    symptoms: [] as string[],
  });
  const [showResults, setShowResults] = useState(false);
  const [targetCarbs, setTargetCarbs] = useState(0);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  // Input styling for white text on dark background
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
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      if (checkbox.checked) {
        setFormData(prev => ({
          ...prev,
          symptoms: [...prev.symptoms, value]
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          symptoms: prev.symptoms.filter(symptom => symptom !== value)
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? Number(value) : value
      }));
    }
  };
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('Calculating carbs with:', formData);
      
      // Calculate target carbs
      const calculatedTargetCarbs = calculateTargetCarbs(
        formData.weight,
        formData.duration,
        formData.intensity,
        formData.giHistory
      );
      
      // Round to 1 decimal place
      const roundedTargetCarbs = Math.round(calculatedTargetCarbs * 10) / 10;
      setTargetCarbs(roundedTargetCarbs);
      
      // Generate recommendations
      const generatedRecommendations = generateRecommendations(
        roundedTargetCarbs,
        formData.duration,
        formData.giHistory,
        formData.symptoms
      );
      setRecommendations(generatedRecommendations);
      
      // Split target events into array
      const targetEventsArray = formData.targetEvents
        ? formData.targetEvents.split(',').map(event => event.trim())
        : [];
      
      // Save assessment result to localStorage
      const assessmentResult: AssessmentResult = {
        targetCarbs: roundedTargetCarbs,
        giSensitivity: formData.giHistory,
        recommendations: generatedRecommendations,
        symptoms: formData.symptoms,
        date: new Date().toISOString(),
        name: formData.name,
        email: formData.email,
        age: formData.age,
        weight: formData.weight,
        height: formData.height,
        gender: formData.gender,
        sport: formData.sport,
        experienceLevel: formData.experienceLevel,
        targetEvents: targetEventsArray,
        eventDate: formData.eventDate,
        duration: formData.duration,
        intensity: formData.intensity
      };
      localStorage.setItem('noominds-assessment', JSON.stringify(assessmentResult));
      
      // Show results
      setShowResults(true);
      
      console.log('Calculation successful:', roundedTargetCarbs, generatedRecommendations);
    } catch (error) {
      console.error('Error in carb calculation:', error);
      alert('There was an error calculating your carb needs. Please try again.');
    }
  };
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Carb Needs Assessment</h1>
        <p className="text-xl text-slate-300">Calculate your personalized carbohydrate requirements</p>
      </div>
      {!showResults ? (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Details */}
          <div className="card">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
                <span className="text-white font-bold">1</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Personal Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label style={labelStyle}>Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleInputChange} 
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Age</label>
                <input 
                  type="number" 
                  name="age" 
                  value={formData.age} 
                  onChange={handleInputChange} 
                  style={inputStyle}
                  min="16"
                  max="100"
                  required
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
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Height (cm)</label>
                <input 
                  type="number" 
                  name="height" 
                  value={formData.height} 
                  onChange={handleInputChange} 
                  style={inputStyle}
                  min="100"
                  max="250"
                  required
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
                  min="30"
                  max="200"
                  required
                />
              </div>
            </div>
          </div>
          {/* Sport & Experience */}
          <div className="card">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
                <span className="text-white font-bold">2</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Sport & Experience</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label style={labelStyle}>Primary Sport</label>
                <select 
                  name="sport" 
                  value={formData.sport} 
                  onChange={handleInputChange} 
                  style={inputStyle}
                >
                  <option value="Triathlon">Triathlon</option>
                  <option value="Running">Running</option>
                  <option value="Cycling">Cycling</option>
                  <option value="Swimming">Swimming</option>
                  <option value="Ultra Running">Ultra Running</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Experience Level</label>
                <select 
                  name="experienceLevel" 
                  value={formData.experienceLevel} 
                  onChange={handleInputChange} 
                  style={inputStyle}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Elite">Elite</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Event Date</label>
                <input 
                  type="date" 
                  name="eventDate" 
                  value={formData.eventDate} 
                  onChange={handleInputChange} 
                  style={inputStyle}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label style={labelStyle}>Target Events (comma separated)</label>
                <input 
                  type="text" 
                  name="targetEvents" 
                  value={formData.targetEvents} 
                  onChange={handleInputChange} 
                  style={inputStyle}
                  placeholder="e.g., London Marathon, Brighton Triathlon"
                />
              </div>
            </div>
          </div>
          {/* Exercise Details */}
          <div className="card">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
                <span className="text-white font-bold">3</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Exercise Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label style={labelStyle}>Duration (minutes)</label>
                <input 
                  type="number" 
                  name="duration" 
                  value={formData.duration} 
                  onChange={handleInputChange} 
                  style={inputStyle}
                  min="30"
                  max="1440"
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Intensity</label>
                <select 
                  name="intensity" 
                  value={formData.intensity} 
                  onChange={handleInputChange} 
                  style={inputStyle}
                >
                  <option value="low">Low (Zone 1-2, easy conversation)</option>
                  <option value="moderate">Moderate (Zone 3-4, limited talking)</option>
                  <option value="high">High (Zone 5, race pace, no talking)</option>
                </select>
              </div>
            </div>
          </div>
          {/* GI History */}
          <div className="card">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
                <span className="text-white font-bold">4</span>
              </div>
              <h2 className="text-2xl font-bold text-white">GI Sensitivity</h2>
            </div>
            <div>
              <label style={labelStyle}>GI History</label>
              <select 
                name="giHistory" 
                value={formData.giHistory} 
                onChange={handleInputChange} 
                style={inputStyle}
              >
                <option value="none">None (Rarely experience GI issues)</option>
                <option value="moderate">Moderate (Occasional GI issues)</option>
                <option value="high">High (Frequent GI issues)</option>
              </select>
            </div>
            {formData.giHistory !== 'none' && (
              <div className="mt-6">
                <label style={labelStyle}>Common Symptoms (Select all that apply)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  {['bloating', 'nausea', 'cramping', 'diarrhea', 'reflux', 'vomiting'].map(symptom => (
                    <div key={symptom} className="flex items-center">
                      <input
                        type="checkbox"
                        id={symptom}
                        name="symptoms"
                        value={symptom}
                        checked={formData.symptoms.includes(symptom)}
                        onChange={handleInputChange}
                        className="w-5 h-5 rounded border-slate-600 text-orange-500 focus:ring-orange-500 mr-3"
                      />
                      <label htmlFor={symptom} className="text-white capitalize">{symptom}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-8">
            <button 
              type="button"
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
              type="submit"
              className="btn-primary text-lg px-8 py-4 shadow-lg"
            >
              Calculate My Carb Needs
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-8">
          {/* Results */}
          <div className="card text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Your Results</h2>
            <p className="text-slate-400 mb-8">Based on your {formData.duration} minute {formData.intensity} intensity session</p>
            
            <div className="bg-slate-800/50 rounded-xl p-6 mb-6">
              <h3 className="text-xl text-slate-300 mb-2">Total Carbs Needed</h3>
              <div className="text-5xl font-bold text-orange-500 mb-2">{targetCarbs}g</div>
              <p className="text-slate-400">For your entire session</p>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-6">
              <h3 className="text-xl text-slate-300 mb-2">Carbs Per Hour</h3>
              <div className="text-5xl font-bold text-orange-500 mb-2">
                {(targetCarbs / (formData.duration / 60)).toFixed(1)}g
              </div>
              <p className="text-slate-400">Recommended hourly intake</p>
            </div>
          </div>
          {/* Recommendations */}
          <div className="card">
            <h2 className="text-2xl font-bold text-white mb-6">Personalized Recommendations</h2>
            <ul className="space-y-4">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span className="text-slate-300">{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4">
            <button 
              onClick={() => setShowResults(false)} 
              style={{
                padding: '12px 24px',
                backgroundColor: '#475569',
                color: '#ffffff',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              ← Back to Assessment
            </button>
            <button 
              onClick={onComplete} 
              className="btn-primary text-lg px-8 py-4 shadow-lg"
            >
              Save & Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// DASHBOARD COMPONENT
// ============================================================================

const Dashboard: React.FC<{ client: Client; onNavigate: (view: string) => void }> = ({ client, onNavigate }) => {
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  // Load assessment and sessions from localStorage
  useEffect(() => {
    const savedAssessment = localStorage.getItem('noominds-assessment');
    if (savedAssessment) {
      setAssessmentResult(JSON.parse(savedAssessment));
    }
    
    const savedSessions = localStorage.getItem('noominds-sessions');
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions));
    }
  }, []);
  // Calculate metrics
  const calculateMetrics = () => {
    // Default values
    let eventReadiness = assessmentResult ? 'Ready' : 'Not Ready';
    let avgCarbs = 0;
    let avgSymptoms = 0;
    let consistency = 0;
    if (sessions.length > 0) {
      /* ---------- Average carbohydrate intake (g/hr) ---------- */
      avgCarbs =
        sessions.reduce(
          (sum, session) => sum + session.carbs / (session.duration / 60),
          0
        ) / sessions.length;
      /* ---------- Average symptom severity (0–10) ------------- */
      avgSymptoms =
        sessions.reduce(
          (sum, session) => sum + Number(session.symptomSeverity),
          0
        ) / sessions.length;
      // Clamp between 0 and 10
      avgSymptoms = Math.max(0, Math.min(10, avgSymptoms));
      /* ---------- Consistency: unique training days in last 7 d */
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      const recentSessions = sessions.filter(
        session => new Date(session.date) >= last7Days
      );
      // Use a set of YYYY-MM-DD strings to ensure uniqueness
      const uniqueDays = new Set(
        recentSessions.map(s => s.date.split('T')[0])
      );
      consistency = Math.min(100, (uniqueDays.size / 7) * 100); // Cap at 100%
    }
    /* ---------- Event readiness status rules ------------------ */
    if (!assessmentResult) {
      eventReadiness = 'Not Ready';
    } else {
      // target carb / hr from the latest assessment
      const targetCarbRate =
        assessmentResult.targetCarbs / (assessmentResult.duration / 60);
      const carbGap = Math.abs(targetCarbRate - avgCarbs);
      if (avgSymptoms > 5) {
        eventReadiness = 'Caution'; // high symptom burden
      } else if (sessions.length < 3) {
        eventReadiness = 'In Progress'; // not enough training data
      } else if (carbGap > 25) {
        eventReadiness = 'Caution'; // large gap between target & actual
      } else if (carbGap > 15) {
        eventReadiness = 'In Progress'; // moderate gap
      } else {
        eventReadiness = 'Ready'; // within acceptable range
      }
    }
    return {
      eventReadiness,
      avgCarbs: avgCarbs.toFixed(1),
      avgSymptoms: avgSymptoms.toFixed(1),
      consistency: Math.round(consistency),
    };
  };
  const metrics = calculateMetrics();
  // Calculate target carb rate from assessment
  const getTargetCarbRate = () => {
    if (!assessmentResult) return '0.0';
    return (assessmentResult.targetCarbs / (assessmentResult.duration / 60)).toFixed(1);
  };
  /* ------------------------------------------------------------------
     Build tooltip explaining the readiness status logic
  ------------------------------------------------------------------ */
  const targetRateNum =
    assessmentResult ? assessmentResult.targetCarbs / (assessmentResult.duration / 60) : 0;
  const avgCarbsNum = Number(metrics.avgCarbs);
  const carbGap = Math.abs(targetRateNum - avgCarbsNum);
  const avgSymptomsNum = Number(metrics.avgSymptoms);
  let statusTooltip = 'Complete assessment to set carb targets';
  if (assessmentResult) {
    if (avgSymptomsNum > 5) {
      statusTooltip = `Average symptoms ${avgSymptomsNum}/10 exceed threshold (5)`;
    } else if (sessions.length < 3) {
      statusTooltip = `Need more training sessions (have ${sessions.length}, need 3+)`;
    } else if (carbGap > 25) {
      statusTooltip = `Target: ${targetRateNum.toFixed(1)}g/hr, Actual: ${avgCarbsNum.toFixed(
        1
      )}g/hr, Gap: ${carbGap.toFixed(1)}g/hr exceeds 25g/hr threshold`;
    } else if (carbGap > 15) {
      statusTooltip = `Target: ${targetRateNum.toFixed(1)}g/hr, Actual: ${avgCarbsNum.toFixed(
        1
      )}g/hr, Gap: ${carbGap.toFixed(1)}g/hr exceeds 15g/hr threshold`;
    } else {
      statusTooltip = `Target: ${targetRateNum.toFixed(1)}g/hr, Actual: ${avgCarbsNum.toFixed(
        1
      )}g/hr, Gap: ${carbGap.toFixed(1)}g/hr within acceptable range`;
    }
  }
  /* ------------------------------------------------------------------
     DISPLAY INFO: Prefer real assessment data over mock client
  ------------------------------------------------------------------ */
  const displayName = assessmentResult?.name || client.name;
  const displaySport = assessmentResult?.sport || client.sport;
  const displayExperience = assessmentResult?.experienceLevel || client.experienceLevel;
  /* ------------------------------------------------------------------
     RESET DATA: Clear all stored data and reset dashboard state
  ------------------------------------------------------------------ */
  const handleResetData = () => {
    const confirmReset = window.confirm(
      '⚠️  This will permanently delete all saved assessments, sessions, and event plans. Are you sure you want to continue?'
    );
    if (!confirmReset) return;
    // Clear localStorage keys
    localStorage.removeItem('noominds-assessment');
    localStorage.removeItem('noominds-sessions');
    localStorage.removeItem('noominds-event-plans');
    // Reset component state
    setAssessmentResult(null);
    setSessions([]);
  };
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white">NooMinds Carb Coach</h1>
          <p className="text-slate-400 text-xl">Welcome back, {displayName}</p>
        </div>
        <div className="flex items-center mt-4 md:mt-0">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mr-3">
            <span className="text-white font-bold">{displayName.charAt(0)}</span>
          </div>
          <div>
            <p className="text-white font-semibold">{displaySport}</p>
            <p className="text-slate-400 text-sm">{displayExperience}</p>
          </div>
        </div>
      </div>
      {/* Event Readiness */}
      <div className="card mb-8">
        <h2 className="text-2xl font-bold text-white mb-6">Event Readiness</h2>
        <div className="space-y-6">
          {/* First row: 3 metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              className="bg-slate-800/50 rounded-xl p-5"
              title={statusTooltip}
            >
              <h3 className="text-slate-400 mb-2">Status</h3>
              <div className={`text-2xl font-bold ${
                metrics.eventReadiness === 'Ready' ? 'text-green-400' :
                metrics.eventReadiness === 'In Progress' ? 'text-yellow-400' : 
                metrics.eventReadiness === 'Caution' ? 'text-orange-400' : 'text-red-400'
              }`}>
                {metrics.eventReadiness}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-5">
              <h3 className="text-slate-400 mb-2">Target Carb Rate</h3>
              <div className="text-2xl font-bold text-orange-400">{getTargetCarbRate()} <span className="text-sm">g/hr</span></div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-5">
              <h3 className="text-slate-400 mb-2">Avg Carb Rate</h3>
              <div className="text-2xl font-bold text-orange-400">{metrics.avgCarbs} <span className="text-sm">g/hr</span></div>
            </div>
          </div>
          
          {/* Second row: 2 metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="bg-slate-800/50 rounded-xl p-5">
              <h3 className="text-slate-400 mb-2">Avg Symptoms</h3>
              <div className="text-2xl font-bold text-blue-400">{metrics.avgSymptoms} <span className="text-sm">/10</span></div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-5">
              <h3 className="text-slate-400 mb-2">Consistency</h3>
              <div className="text-2xl font-bold text-green-400">{metrics.consistency}%</div>
            </div>
          </div>
        </div>
      </div>
      {/* Reset Data Button */}
      <div className="flex justify-end mb-10">
        <button
          onClick={handleResetData}
          style={{
            padding: '12px 24px',
            backgroundColor: '#dc2626', // red-600
            color: '#ffffff',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer'
          }}
          className="hover:bg-red-700 transition-colors"
        >
          🗑️ Reset All Data
        </button>
      </div>
      {/* Feature Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Assessment Tile */}
        <div 
          className="card hover:bg-slate-800/80 transition-all cursor-pointer"
          onClick={() => onNavigate('assessment')}
        >
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Assessment</h2>
          <p className="text-slate-400">Calculate your personalized carb needs</p>
          
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-slate-500">
              {assessmentResult ? `Last: ${formatDate(assessmentResult.date)}` : 'Not completed'}
            </span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-500">
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>
        
        {/* Session Logger Tile */}
        <div 
          className="card hover:bg-slate-800/80 transition-all cursor-pointer"
          onClick={() => onNavigate('logger')}
        >
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Session Logger</h2>
          <p className="text-slate-400">Track your training sessions & gut response</p>
          
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-slate-500">
              {sessions.length > 0 ? `${sessions.length} sessions logged` : 'No sessions yet'}
            </span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-500">
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>
        
        {/* Event Planner Tile */}
        <div 
          className="card hover:bg-slate-800/80 transition-all cursor-pointer"
          onClick={() => onNavigate('event_planner')}
        >
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Event Planner</h2>
          <p className="text-slate-400">Create nutrition plans for your races</p>
          
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-slate-500">
              {assessmentResult && assessmentResult.eventDate ? `Event: ${formatDate(assessmentResult.eventDate)}` : 'No events planned'}
            </span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-500">
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>
        
        {/* AI Coach Tile */}
        <div 
          className="card hover:bg-slate-800/80 transition-all cursor-pointer"
          onClick={() => onNavigate('ai_coach')}
        >
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">AI Carb Coach</h2>
          <p className="text-slate-400">Get personalized nutrition advice</p>
          
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-slate-500">Ask anything about nutrition</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-500">
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SESSION LOGGER COMPONENT
// ============================================================================

const SessionLogger: React.FC<{ onBack: () => void; onSave: (session: Omit<Session, 'id'>) => void }> = ({ onBack, onSave }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    sport: 'Cycling',
    duration: 90,
    carbs: 60,
    fluids: 750,
    symptomSeverity: 0,
    rpe: 5,
    notes: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    const newSession = {
      ...formData,
      id: Date.now().toString()
    };
    const existingSessions = JSON.parse(localStorage.getItem('noominds-sessions') || '[]');
    existingSessions.push(newSession);
    localStorage.setItem('noominds-sessions', JSON.stringify(existingSessions));
    setShowSuccess(true);
    
    setFormData({
      date: new Date().toISOString().split('T')[0],
      sport: 'Cycling',
      duration: 90,
      carbs: 60,
      fluids: 750,
      symptomSeverity: 0,
      rpe: 5,
      notes: ''
    });
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };
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
  const carbRate = formData.duration > 0 ? (formData.carbs / (formData.duration / 60)).toFixed(1) : 0;
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Log Training Session</h1>
        <p className="text-xl text-slate-300">Track your fueling and gut response during training</p>
      </div>
      {showSuccess && (
        <div className="card bg-green-500/10 border-2 border-green-500/30 mb-8">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mr-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"></path>
                <circle cx="12" cy="12" r="10"></circle>
              </svg>
            </div>
            <div>
              <h3 className="text-green-400 font-bold text-lg">Session Logged Successfully!</h3>
              <p className="text-green-300">Your training data has been saved and will update your progress metrics.</p>
            </div>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="card">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
              <span className="text-white font-bold">1</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Session Details</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label style={labelStyle}>Date</label>
              <input 
                type="date" 
                name="date" 
                value={formData.date} 
                onChange={handleInputChange} 
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Sport</label>
              <select 
                name="sport" 
                value={formData.sport} 
                onChange={handleInputChange} 
                style={inputStyle}
              >
                <option value="Cycling">Cycling</option>
                <option value="Running">Running</option>
                <option value="Swimming">Swimming</option>
                <option value="Triathlon">Triathlon</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Duration (minutes)</label>
              <input 
                type="number" 
                name="duration" 
                value={formData.duration} 
                onChange={handleInputChange} 
                style={inputStyle}
                min="1"
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Rate of Perceived Exertion (1-10)</label>
              <div className="space-y-2">
                <input 
                  type="range" 
                  name="rpe" 
                  value={formData.rpe} 
                  onChange={handleInputChange} 
                  min="1" 
                  max="10" 
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  style={{accentColor: '#f97316'}}
                />
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Easy</span>
                  <span className="text-orange-400 font-bold text-lg">{formData.rpe}</span>
                  <span className="text-slate-400 text-sm">Max</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
              <span className="text-white font-bold">2</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Nutrition & Hydration</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label style={labelStyle}>Total Carbs Consumed (grams)</label>
              <input 
                type="number" 
                name="carbs" 
                value={formData.carbs} 
                onChange={handleInputChange} 
                style={inputStyle}
                min="0"
                required
              />
              <p className="text-slate-400 text-sm mt-1">
                Rate: <span className="text-orange-400 font-semibold">{carbRate}g/hr</span>
              </p>
            </div>
            <div>
              <label style={labelStyle}>Total Fluids Consumed (ml)</label>
              <input 
                type="number" 
                name="fluids" 
                value={formData.fluids} 
                onChange={handleInputChange} 
                style={inputStyle}
                min="0"
                required
              />
              <p className="text-slate-400 text-sm mt-1">
                Rate: <span className="text-blue-400 font-semibold">{formData.duration > 0 ? Math.round(formData.fluids / (formData.duration / 60)) : 0}ml/hr</span>
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
              <span className="text-white font-bold">3</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Gut Response</h2>
          </div>
          <div>
            <label style={labelStyle}>Overall Symptom Severity (0 = None, 10 = Severe)</label>
            <div className="space-y-4">
              <input 
                type="range" 
                name="symptomSeverity" 
                value={formData.symptomSeverity} 
                onChange={handleInputChange} 
                min="0" 
                max="10" 
                className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                style={{accentColor: formData.symptomSeverity <= 3 ? '#10b981' : formData.symptomSeverity <= 6 ? '#f59e0b' : '#ef4444'}}
              />
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">No symptoms</span>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    formData.symptomSeverity <= 3 ? 'text-green-400' :
                    formData.symptomSeverity <= 6 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {formData.symptomSeverity}
                  </div>
                  <div className={`text-xs ${
                    formData.symptomSeverity <= 3 ? 'text-green-400' :
                    formData.symptomSeverity <= 6 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {formData.symptomSeverity <= 3 ? 'Good' :
                     formData.symptomSeverity <= 6 ? 'Moderate' : 'Severe'}
                  </div>
                </div>
                <span className="text-slate-400 text-sm">Severe symptoms</span>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
              <span className="text-white font-bold">4</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Additional Notes</h2>
          </div>
          <div>
            <label style={labelStyle}>Session Notes (Optional)</label>
            <textarea 
              name="notes" 
              value={formData.notes} 
              onChange={handleInputChange} 
              placeholder="e.g., Used new gel brand, felt strong throughout, stomach issues after hour 2..."
              style={{...inputStyle, minHeight: '100px', resize: 'vertical'}}
              rows={4}
            />
          </div>
        </div>
        <div className="flex justify-between items-center pt-8">
          <button 
            type="button"
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
            type="submit"
            className="btn-primary text-lg px-8 py-4 shadow-lg"
          >
            Save Training Session
          </button>
        </div>
      </form>
    </div>
  );
};

// ============================================================================
// EVENT PLANNER COMPONENT
// ============================================================================

const EventPlanner: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  // pull assessment for target carb rate & GI flag
  const assessment: AssessmentResult | null = JSON.parse(
    localStorage.getItem('noominds-assessment') || 'null'
  );
  const targetRate =
    assessment && assessment.duration
      ? assessment.targetCarbs / (assessment.duration / 60)
      : 60; // sensible default
  const [formData, setFormData] = useState({
    raceName: '',
    duration: 180, // minutes
    aidInterval: 5, // km
    intensity: assessment ? assessment.intensity : 'moderate',
    temperature: 'normal',      // 'cold' | 'normal' | 'hot'
    humidity: 'normal'          // 'normal' | 'high'
  });
  const [plan, setPlan] = useState<RacePlanBlock[] | null>(null);
  const [saved, setSaved] = useState(false);
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
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };
  const handleGenerate = (e: FormEvent) => {
    e.preventDefault();
    const blocks: RacePlanBlock[] = [];
    /* -----------------------------------------
       Calculate hourly carb requirement on the fly
    ----------------------------------------- */
    let baseRate = 60;
    if (formData.intensity === 'high') baseRate = 75;
    else if (formData.intensity === 'low') baseRate = 40;
    let durationFactor = 1.0;
    if (formData.duration >= 150) durationFactor = 1.1; // 10 % bump
    const hourlyCarbs = baseRate * durationFactor;
    /* ---------------- Fluid calculation ---------------- */
    let fluidsPerHour = 650; // default for normal
    if (formData.temperature === 'cold') fluidsPerHour = 450;
    if (formData.temperature === 'hot')  fluidsPerHour = 900;
    if (formData.humidity === 'high')    fluidsPerHour += 150;
    /* -----------------------------------------------------------
       Create plan blocks every 60 minutes instead of every 20 min
       ----------------------------------------------------------- */
    const INTERVAL = 60; // minutes
    const totalBlocks = Math.ceil(formData.duration / INTERVAL);
    for (let i = 0; i < totalBlocks; i++) {
      const mins = i * INTERVAL;
      const timeLabel = `${Math.floor(mins / 60)
        .toString()
        .padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}`;
      blocks.push({
        time: timeLabel,
        /* full hourly carb target */
        carbs: `${hourlyCarbs.toFixed(0)} g`,
        /* ~650 ml fluids per hour (mid-point of 600-750 ml) */
        fluids: `${fluidsPerHour} ml`
      });
    }
    setPlan(blocks);
    setSaved(false);
  };
  const handleSave = () => {
    if (!plan) return;
    const stored = JSON.parse(localStorage.getItem('noominds-event-plans') || '[]');
    stored.push({
      ...formData,
      created: new Date().toISOString(),
      plan
    });
    localStorage.setItem('noominds-event-plans', JSON.stringify(stored));
    setSaved(true);
  };
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 4h18v18H3z"></path>
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Event Planner</h1>
        <p className="text-xl text-slate-300">Build your race-day nutrition plan</p>
      </div>
      {/* Form */}
      <form onSubmit={handleGenerate} className="space-y-8">
        <div className="card">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
              <span className="text-white font-bold">1</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Race Details</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label style={labelStyle}>Race Name</label>
              <input
                type="text"
                name="raceName"
                value={formData.raceName}
                onChange={handleChange}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Expected Duration (minutes)</label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                style={inputStyle}
                min={30}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Aid Station Interval (km)</label>
              <input
                type="number"
                name="aidInterval"
                value={formData.aidInterval}
                onChange={handleChange}
                style={inputStyle}
                min={2}
              />
            </div>
            <div>
              <label style={labelStyle}>Race Intensity</label>
              <select name="intensity" value={formData.intensity} onChange={handleChange} style={inputStyle}>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Expected Temperature</label>
              <select
                name="temperature"
                value={formData.temperature}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="cold">Cold (<10 °C)</option>
                <option value="normal">Normal (10 – 25 °C)</option>
                <option value="hot">Hot (>25 °C)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Humidity Level</label>
              <select
                name="humidity"
                value={formData.humidity}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-between">
          <button
            type="button"
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
          <button type="submit" className="btn-primary px-8 py-4 shadow-lg">
            Generate Plan
          </button>
        </div>
      </form>
      {/* Plan Preview */}
      {plan && (
        <div className="card mt-8">
          <h2 className="text-2xl font-bold text-white mb-4">Nutrition Timeline</h2>
          <div className="grid grid-cols-3 gap-4 text-slate-300 font-semibold">
            <span>Time</span>
            <span>Carbs</span>
            <span>Fluids</span>
            {plan.map(block => (
              <React.Fragment key={block.time}>
                <span>{block.time}</span>
                <span>{block.carbs}</span>
                <span>{block.fluids}</span>
              </React.Fragment>
            ))}
          </div>
          {assessment && (
            <p className="text-slate-400 mt-6">
              GI Sensitivity: {assessment.giSensitivity === 'high' ? '🔴 High' : assessment.giSensitivity === 'moderate' ? '🟠 Moderate' : '🟢 Low'}
            </p>
          )}
          <button
            onClick={handleSave}
            className="btn-primary mt-6 px-8 py-3 shadow-lg"
          >
            Save Plan
          </button>
          {saved && <p className="text-green-400 mt-3">Plan saved!</p>}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// AI CARB COACH COMPONENT
// ============================================================================

interface Message {
  id: string;
  type: 'user' | 'coach';
  text: string;
  timestamp: Date;
}

const AICarbCoach: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  /* ---------------- State ------------------ */
  const [apiKey, setApiKey] = useState<string>(
    localStorage.getItem('openai-api-key') || ''
  );
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hi! I'm your AI Carb Coach (GPT-4). Ask me anything about sports-nutrition and gut-training."
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  /* ------------ Helpers ------------ */
  const assessment: AssessmentResult | null = JSON.parse(
    localStorage.getItem('noominds-assessment') || 'null'
  );
  const sessions: Session[] = JSON.parse(
    localStorage.getItem('noominds-sessions') || '[]'
  );
  const buildSystemPrompt = (): string => {
    const name = assessment?.name || 'Athlete';
    const sport = assessment?.sport || 'endurance sport';
    const exp = assessment?.experienceLevel || 'intermediate';
    const targetRate = assessment
      ? (assessment.targetCarbs / (assessment.duration / 60)).toFixed(1)
      : '60';
    const gi = assessment?.giSensitivity || 'moderate';
    return `
You are "NooMinds AI Carb Coach", the world-leading authority on endurance gut-training and carbohydrate periodisation (15+ yrs practice, MSc, SENr, IOC Diploma, author of 60+ peer-reviewed papers).

MISSION: Deliver evidence-based, personalised, actionable advice while confidently correcting misconceptions and steering athletes toward best practice.

PERSONAL DATA:

- Name: ${name}

- Sport: ${sport}

- Experience: ${exp}

- Target carb rate: ${targetRate} g/hr

- GI sensitivity: ${gi}

- Logged sessions: ${sessions.length}

STYLE / LEADERSHIP:

- Authoritative & Respectful – lead the discussion, do not simply agree.

- Challenge Myths – if the user states "keto is best for marathons" or "I never need carbs under 2 h", politely but firmly correct with current literature (e.g., Burke 2018, Stellingwerff 2022).

- Offer Better Options – present superior, practical alternatives and explain why they outperform the user's idea.

- Evidence Citations – when correcting, reference study (Author Year) or guideline (e.g., ACSM 2023).

QUICK EXAMPLES OF PUSH-BACK:

1. User: "I'll just drink water, carbs upset my stomach."

   Coach: Briefly acknowledge, then explain gut-training protocol & cite Jeukendrup 2021 showing adaptation.

2. User: "I think 30 g/hr is enough for my 4 h ride."

   Coach: Explain 60-90 g/hr guidelines for >2.5 h, highlight performance delta.

RULES / SAFEGUARDS:

1. Cite current recommendations (2020-2024 research) when relevant.

2. Keep answers concise (≤ 300 words) using bullet-points where helpful.

3. If uncertain, state uncertainty and suggest a registered dietitian or GP.

4. End with a brief disclaimer: "General educational advice…".

5. No medical diagnosis or treatment.
`;
  };
  /* ------------ API Call ------------ */
  const callOpenAI = async (
    chatHistory: ChatMessage[]
  ): Promise<string | null> => {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // cheaper; change to 'gpt-4o' if desired
          messages: chatHistory,
          temperature: 0.7,
          max_tokens: 600
        })
      });
      if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };
  /* ------------ Send message ------------ */
  const sendMessage = async (text: string) => {
    if (!text.trim() || !apiKey) return;
    setIsLoading(true);
    const newMessages = [
      ...messages,
      { role: 'user', content: text } as ChatMessage
    ];
    setMessages(newMessages);
    setInputText('');
    const systemPrompt: ChatMessage = { role: 'system', content: buildSystemPrompt() };
    const reply = await callOpenAI([systemPrompt, ...newMessages]);
    if (reply) {
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } else {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            '❗ Sorry, there was a problem retrieving a response. Please check your API key or try again later.'
        }
      ]);
    }
    setIsLoading(false);
  };
  /* ------------ UI helpers ------------ */
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
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">AI Carb Coach</h1>
        <p className="text-xl text-slate-300">Get personalized nutrition advice for your training</p>
      </div>
      {/* API-Key Config */}
      {!apiKey && (
        <div className="card mb-6">
          <h2 className="text-xl text-white mb-2">Enter your OpenAI API Key</h2>
          <input
            type="password"
            placeholder="sk-..."
            style={inputStyle}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
          />
          <button
            className="btn-primary mt-4"
            onClick={() => {
              if (inputText.startsWith('sk-')) {
                localStorage.setItem('openai-api-key', inputText);
                setApiKey(inputText);
                setInputText('');
              } else alert('Please enter a valid key');
            }}
          >
            Save Key
          </button>
        </div>
      )}
      {/* Quick Questions */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          'How much should I eat before my race?',
          'Strategies to reduce GI distress?',
          'Hydration targets for hot races?',
          'Best carb sources for long rides?',
          'When should I start fueling?'
        ].map((question, index) => (
          <button
            key={index}
            onClick={() => sendMessage(question)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-full text-sm transition-colors"
          >
            {question}
          </button>
        ))}
      </div>
      {/* Chat Container */}
      <div className="card mb-6 p-4 h-96 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message, idx) => (
            <div 
              key={idx} 
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className="max-w-3xl rounded-2xl px-4 py-3"
                style={{
                  backgroundColor: message.role === 'user' ? '#f97316' : '#334155',
                  color: message.role === 'user' ? '#ffffff' : '#f1f5f9',
                  borderTopRightRadius: message.role === 'user' ? '0' : undefined,
                  borderTopLeftRadius: message.role === 'user' ? undefined : '0'
                }}
              >
                <p className="whitespace-pre-line">{message.content}</p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-center">
              <div className="bg-slate-700 text-slate-100 rounded-2xl rounded-tl-none px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Input Area */}
      <div className="flex mb-6">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage(inputText)}
          placeholder="Ask about your nutrition strategy..."
          className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 text-white rounded-l-lg focus:outline-none focus:border-orange-500"
        />
        <button
          onClick={() => sendMessage(inputText)}
          className={`px-4 py-3 rounded-r-lg ${
            inputText.trim() && !isLoading
              ? 'bg-orange-500 text-white' 
              : 'bg-slate-700 text-slate-400'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
      
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
    </div>
  );
};

export default AICarbCoach;
