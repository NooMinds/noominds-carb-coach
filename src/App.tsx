import React, { useState, ChangeEvent, FormEvent } from 'react';
import './index.css'; // Make sure our styles are imported

// ============================================================================
// Main App Component (View Controller)
// ============================================================================

/**
 * This is the main App component. It acts as a controller to switch
 * between the main Dashboard and the Assessment form.
 */
function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  const navigateToAssessment = () => setCurrentView('assessment');
  const navigateToDashboard = () => setCurrentView('dashboard');

  if (currentView === 'assessment') {
    return <AssessmentForm onBackToDashboard={navigateToDashboard} />;
  }

  return <Dashboard onStartAssessment={navigateToAssessment} />;
}

// ============================================================================
// Dashboard Component
// ============================================================================

interface DashboardProps {
  onStartAssessment: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onStartAssessment }) => {
  // Mock data for the dashboard stats
  const stats = {
    currentCarbIntake: 45,
    targetCarbIntake: 90,
    sessionsThisWeek: 2,
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
                <p className="text-3xl font-bold text-gray-800">{stats.sessionsThisWeek}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Get Started</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card flex flex-col items-center text-center">
                <h3 className="font-semibold mb-2">1. Start Your Assessment</h3>
                <p className="text-sm text-gray-600 flex-grow mb-4">Generate your personalized gut training plan with our AI-powered assessment.</p>
                <button onClick={onStartAssessment} className="btn btn-primary w-full">Start Assessment</button>
              </div>
              <div className="card flex flex-col items-center text-center">
                <h3 className="font-semibold mb-2">2. Log a Training Session</h3>
                <p className="text-sm text-gray-600 flex-grow mb-4">Track your nutrition, symptoms, and performance for each workout.</p>
                <button className="btn btn-outline w-full">Log Session</button>
              </div>
              <div className="card flex flex-col items-center text-center">
                <h3 className="font-semibold mb-2">3. View Your Progress</h3>
                <p className="text-sm text-gray-600 flex-grow mb-4">See how your carb tolerance improves over time with our detailed charts.</p>
                <button className="btn btn-outline w-full">View Progress</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// ============================================================================
// Assessment Form Component
// ============================================================================

interface AssessmentFormProps {
  onBackToDashboard: () => void;
}

const AssessmentForm: React.FC<AssessmentFormProps> = ({ onBackToDashboard }) => {
  const [formData, setFormData] = useState({
    // Personal Info
    name: 'Craig Elliott',
    email: 'craig@noominds.com',
    primarySport: 'Cycling',
    // Current Training
    weeklyVolume: '10',
    typicalSessionLength: '90',
    intensity: 'Moderate',
    // Target Event
    hasTargetEvent: false,
    eventDistance: '',
    eventDate: '',
    targetTime: '',
    // Fueling Habits
    currentCarbIntake: '45',
    fuelSources: ['Gels', 'Drinks'],
    // GI Symptoms
    hasGiSymptoms: true,
    symptomFrequency: 'Sometimes',
    symptomSeverity: '4',
    symptomTypes: ['Bloating'],
    // Goals & Experience
    targetCarbGoal: '90',
    gutTrainingExperience: 'Beginner',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      if (name === 'hasTargetEvent' || name === 'hasGiSymptoms') {
        setFormData(prev => ({ ...prev, [name]: checked }));
      } else {
        // Handle multi-checkbox for fuelSources and symptomTypes
        setFormData(prev => {
          const list = prev[name as 'fuelSources' | 'symptomTypes'] as string[];
          const newList = checked ? [...list, value] : list.filter(item => item !== value);
          return { ...prev, [name]: newList };
        });
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log('Assessment Submitted:', formData);
    setIsSubmitted(true);
  };

  // Render the results summary after submission
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8 text-center">
            <h1 className="text-blue-600">Assessment Results Summary</h1>
            <p className="mt-2 text-lg text-gray-600">Here is a summary of your submission for <span className="font-bold">{formData.name}</span>.</p>
          </header>
          <div className="card space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold border-b pb-2 mb-2">Personal & Training Profile</h3>
                <p><strong>Sport:</strong> {formData.primarySport}</p>
                <p><strong>Weekly Volume:</strong> {formData.weeklyVolume} hours</p>
                <p><strong>Typical Session:</strong> {formData.typicalSessionLength} mins at {formData.intensity} intensity</p>
              </div>
              <div>
                <h3 className="font-semibold border-b pb-2 mb-2">Goals & Experience</h3>
                <p><strong>Target Carb Intake:</strong> {formData.targetCarbGoal} g/hr</p>
                <p><strong>Gut Training Level:</strong> {formData.gutTrainingExperience}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold border-b pb-2 mb-2">Fueling & GI Health</h3>
              <p><strong>Current Intake:</strong> {formData.currentCarbIntake} g/hr</p>
              <p><strong>Preferred Fuels:</strong> {formData.fuelSources.join(', ')}</p>
              <p><strong>GI Symptom Severity:</strong> {formData.symptomSeverity}/10</p>
              <p><strong>Symptom Types:</strong> {formData.symptomTypes.join(', ')}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <h3 className="font-semibold text-blue-800">Next Steps</h3>
              <p className="text-blue-700 mt-2">An AI-generated personalized plan based on these results will be created for you. Check the "Training Plans" section on your dashboard soon!</p>
            </div>
          </div>
          <div className="text-center mt-6">
            <button onClick={() => setIsSubmitted(false)} className="btn btn-outline mr-4">Edit Submission</button>
            <button onClick={onBackToDashboard} className="btn btn-primary">Back to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  // Render the form
  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-blue-600">Athlete Assessment Form</h1>
          <p className="mt-2 text-lg text-gray-600">Complete this form to generate your personalized gut training plan.</p>
        </header>

        <form onSubmit={handleSubmit} className="card space-y-8">
          {/* Section 1: Personal & Training */}
          <fieldset>
            <legend className="text-xl font-semibold mb-4">1. About You & Your Training</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label" htmlFor="name">Full Name</label>
                <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="form-input" required />
              </div>
              <div>
                <label className="form-label" htmlFor="primarySport">Primary Sport</label>
                <select name="primarySport" id="primarySport" value={formData.primarySport} onChange={handleChange} className="form-select" required>
                  <option>Cycling</option>
                  <option>Running</option>
                  <option>Triathlon</option>
                  <option>Ultra Running</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="weeklyVolume">Weekly Training Volume (hours)</label>
                <input type="number" name="weeklyVolume" id="weeklyVolume" value={formData.weeklyVolume} onChange={handleChange} className="form-input" placeholder="e.g., 8" required />
              </div>
              <div>
                <label className="form-label" htmlFor="intensity">Typical Intensity</label>
                <select name="intensity" id="intensity" value={formData.intensity} onChange={handleChange} className="form-select" required>
                  <option>Low</option>
                  <option>Moderate</option>
                  <option>High</option>
                  <option>Mixed</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Section 2: Fueling & GI Symptoms */}
          <fieldset>
            <legend className="text-xl font-semibold mb-4">2. Fueling & Gut Health</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label" htmlFor="currentCarbIntake">Current Carb Intake (g/hr)</label>
                <input type="number" name="currentCarbIntake" id="currentCarbIntake" value={formData.currentCarbIntake} onChange={handleChange} className="form-input" placeholder="e.g., 30" required />
              </div>
              <div>
                <label className="form-label">Current Fuel Sources</label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {['Gels', 'Drinks', 'Bars', 'Chews', 'Real Food'].map(source => (
                    <label key={source} className="flex items-center">
                      <input type="checkbox" name="fuelSources" value={source} checked={formData.fuelSources.includes(source)} onChange={handleChange} className="form-checkbox" />
                      <span className="ml-2">{source}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label className="form-label">Do you experience GI symptoms during exercise?</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center"><input type="radio" name="hasGiSymptoms" value="yes" checked={formData.hasGiSymptoms} onChange={() => setFormData(f => ({...f, hasGiSymptoms: true}))} className="form-radio" /><span className="ml-2">Yes</span></label>
                <label className="flex items-center"><input type="radio" name="hasGiSymptoms" value="no" checked={!formData.hasGiSymptoms} onChange={() => setFormData(f => ({...f, hasGiSymptoms: false}))} className="form-radio" /><span className="ml-2">No</span></label>
              </div>
            </div>
            {formData.hasGiSymptoms && (
              <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg border">
                <div>
                  <label className="form-label" htmlFor="symptomSeverity">Symptom Severity (0=None, 10=Severe)</label>
                  <input type="range" min="0" max="10" name="symptomSeverity" id="symptomSeverity" value={formData.symptomSeverity} onChange={handleChange} className="w-full" />
                  <div className="text-center font-bold text-blue-600">{formData.symptomSeverity}</div>
                </div>
                <div>
                  <label className="form-label">Symptom Types</label>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {['Nausea', 'Bloating', 'Cramps', 'Reflux', 'Diarrhea', 'Urgency'].map(type => (
                      <label key={type} className="flex items-center">
                        <input type="checkbox" name="symptomTypes" value={type} checked={formData.symptomTypes.includes(type)} onChange={handleChange} className="form-checkbox" />
                        <span className="ml-2">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </fieldset>

          {/* Section 3: Goals */}
          <fieldset>
            <legend className="text-xl font-semibold mb-4">3. Your Goals</legend>
            <div>
              <label className="form-label">What is your target hourly carbohydrate intake?</label>
              <div className="flex flex-wrap gap-4 mt-2">
                {['60', '90', '120+'].map(goal => (
                  <label key={goal} className="flex items-center">
                    <input type="radio" name="targetCarbGoal" value={goal} checked={formData.targetCarbGoal === goal} onChange={handleChange} className="form-radio" />
                    <span className="ml-2">{goal} g/hr</span>
                  </label>
                ))}
              </div>
            </div>
          </fieldset>
          
          <div className="flex justify-between items-center pt-8 border-t">
            <button type="button" onClick={onBackToDashboard} className="btn btn-outline">Back to Dashboard</button>
            <button type="submit" className="btn btn-primary">Submit for Analysis</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
