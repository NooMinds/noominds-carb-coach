import React, { useState } from 'react';
import './index.css'; // Make sure our styles are imported

/**
 * NooMinds Carb Coach - Simple App Component
 * 
 * This is a simplified, self-contained version of the App to ensure the
 * build and deployment process is working correctly. It does not use
 * React Router or import other complex components.
 */
function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600">
            NooMinds Carb Coach
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Your gut training journey starts here!
          </p>
        </div>

        {/* Main Content Card */}
        <div className="card text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Deployment Successful!
          </h2>
          <p className="text-gray-700 mb-6">
            This is the foundational version of your NooMinds app. We've confirmed that the build process is working. Next, we will add the full dashboard, navigation, and AI features.
          </p>
          
          {/* Interactive Test Element */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="mb-3">Simple interactive test:</p>
            <button 
              className="btn btn-primary"
              onClick={() => setCount((c) => c + 1)}
            >
              Test Clicks: {count}
            </button>
          </div>
        </div>

        {/* Footer Message */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Next steps: Add the main dashboard layout and AI components.</p>
        </div>

      </div>
    </div>
  );
}

export default App;
