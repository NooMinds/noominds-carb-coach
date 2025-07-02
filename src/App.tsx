import React, { useState } from 'react';
import './index.css'; // Make sure our styles are imported

/**
 * NooMinds Carb Coach - Main App Component
 * 
 * This component renders the main dashboard for the application.
 * It provides a central hub for users to view their status and
 * access key features.
 */
function App() {
  // State for the interactive test element
  const [count, setCount] = useState(0);

  // Mock data for the dashboard stats
  const stats = {
    currentCarbIntake: 45,
    targetCarbIntake: 90,
    sessionsThisWeek: 2,
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header Section */}
        <header className="mb-8">
          <h1 className="text-blue-600">NooMinds Carb Coach</h1>
          <p className="mt-2 text-lg text-gray-600">
            Welcome back, <span className="font-bold">Craig Elliott</span>! Let's optimize your fueling.
          </p>
        </header>

        <main className="space-y-8">

          {/* Quick Stats Section */}
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

          {/* Action Cards Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Get Started</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card flex flex-col items-center text-center">
                <h3 className="font-semibold mb-2">1. Start Your Assessment</h3>
                <p className="text-sm text-gray-600 flex-grow mb-4">Generate your personalized gut training plan with our AI-powered assessment.</p>
                <button className="btn btn-primary w-full">Start Assessment</button>
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

          {/* Recent Activity Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="card">
              <p className="text-gray-500 italic text-center">Your recent training sessions and achievements will appear here.</p>
            </div>
          </div>

          {/* Interactive Test Element */}
          <div className="card bg-gray-200 border border-gray-300">
            <p className="mb-3 text-sm font-medium">Deployment Test Element:</p>
            <button 
              className="btn btn-primary"
              onClick={() => setCount((c) => c + 1)}
            >
              Test Clicks: {count}
            </button>
          </div>
        </main>

      </div>
    </div>
  );
}

export default App;
