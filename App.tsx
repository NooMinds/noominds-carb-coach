import React, { useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, NavLink } from 'react-router-dom';
import {
  Menu,
  X,
  Home,
  LineChart,
  Calendar,
  BookOpen,
  Cog,
  Award,
  Clipboard,
  Beaker,
  Target,
  BrainCircuit,
  User,
} from 'lucide-react';

// Lazy load the heavy components for better initial load performance
const SmartAssessment = lazy(() => import('./components/SmartAssessment'));
const AICoach = lazy(() => import('./components/AICoach'));

/**
 * NooMinds Carb Coach - Main App Component
 * 
 * This component sets up the routing and the main layout for the application.
 * It includes a responsive sidebar navigation, a header, and renders the
 * content for each page based on the current URL.
 */

// ============================================================================
// Placeholder Page Components
// ============================================================================

const Dashboard = () => (
  <div className="animate-fade-in space-y-8">
    <div>
      <h1 className="text-3xl font-bold text-primary-800 mb-2">Welcome to NooMinds Carb Coach</h1>
      <p className="text-neutral-600">Your personalized gut training journey starts here. Let's optimize your fueling for peak performance.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="card card-hover">
        <div className="flex items-center mb-3">
          <Clipboard size={20} className="text-primary-600 mr-2" />
          <h3 className="text-xl font-semibold">1. Start Your Assessment</h3>
        </div>
        <p className="text-neutral-600 mb-4">Complete our AI-powered assessment to generate your personalized gut training plan.</p>
        <NavLink to="/assessment" className="btn btn-primary w-full">Start Assessment</NavLink>
      </div>
      <div className="card card-hover">
        <div className="flex items-center mb-3">
          <BrainCircuit size={20} className="text-primary-600 mr-2" />
          <h3 className="text-xl font-semibold">2. Chat with Your AI Coach</h3>
        </div>
        <p className="text-neutral-600 mb-4">"Coach Noo" is ready to answer your questions and provide real-time guidance.</p>
        <NavLink to="/coach" className="btn btn-outline w-full">Talk to Coach Noo</NavLink>
      </div>
      <div className="card card-hover">
        <div className="flex items-center mb-3">
          <Award size={20} className="text-primary-600 mr-2" />
          <h3 className="text-xl font-semibold">3. View Your Plan</h3>
        </div>
        <p className="text-neutral-600 mb-4">Once your assessment is complete, your tailored training plan will appear here.</p>
        <NavLink to="/plans" className="btn btn-outline w-full cursor-not-allowed opacity-50">View Plans</NavLink>
      </div>
    </div>
  </div>
);

const AssessmentPage = () => (
  <div className="animate-fade-in">
    <Suspense fallback={<LoadingSpinner text="Loading Smart Assessment..." />}>
      <SmartAssessment />
    </Suspense>
  </div>
);

const CoachPage = () => (
  <div className="animate-fade-in h-[calc(100vh-10rem)]">
    <Suspense fallback={<LoadingSpinner text="Waking up Coach Noo..." />}>
      <AICoach />
    </Suspense>
  </div>
);

const PlaceholderPage = ({ title, description, buttonText }: { title: string, description: string, buttonText: string }) => (
  <div className="animate-fade-in">
    <h1 className="text-3xl font-bold text-primary-800 mb-6">{title}</h1>
    <div className="card max-w-4xl text-center mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Coming Soon!</h2>
      <p className="text-neutral-600 mb-6">{description}</p>
      <div className="bg-neutral-100 rounded-lg p-8">
        <p className="text-neutral-500 italic">This section is under construction.</p>
      </div>
      <button className="btn btn-primary mt-6">{buttonText}</button>
    </div>
  </div>
);

const LoadingSpinner = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
    <p className="text-primary-700">{text}</p>
  </div>
);


// ============================================================================
// Main Layout Component
// ============================================================================

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: "/dashboard", name: "Dashboard", icon: <Home size={20} /> },
    { path: "/assessment", name: "Assessment", icon: <Clipboard size={20} /> },
    { path: "/coach", name: "AI Coach", icon: <BrainCircuit size={20} /> },
    { path: "/plans", name: "Training Plans", icon: <Award size={20} /> },
    { path: "/sessions", name: "Log Session", icon: <Calendar size={20} /> },
    { path: "/progress", name: "Progress", icon: <LineChart size={20} /> },
    { path: "/race-planner", name: "Race Planner", icon: <Target size={20} /> },
    { path: "/learn", name: "Learn", icon: <BookOpen size={20} /> },
    { path: "/settings", name: "Settings", icon: <Cog size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-neutral-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
            <div className="flex items-center">
              <Beaker className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-neutral-800">NooMinds</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 lg:hidden"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`
                    }
                    onClick={() => {
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                  >
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-neutral-200 p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                CE
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-neutral-900">Craig Elliott</p>
                <p className="text-xs text-neutral-500">Athlete</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="bg-white shadow-sm z-10">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 lg:hidden"
            >
              <Menu size={24} />
            </button>
            <div className="flex-1"></div> {/* Spacer */}
            <div className="flex items-center">
              <p className="text-sm font-medium text-neutral-700 hidden sm:block">
                NooMinds Carb Coach
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

// ============================================================================
// Main App Component with Routing
// ============================================================================

const App: React.FC = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/assessment" element={<AssessmentPage />} />
        <Route path="/coach" element={<CoachPage />} />
        <Route path="/plans" element={<PlaceholderPage title="Training Plans" description="Create and manage your gut training plans here. Each plan will progressively increase your carbohydrate intake to reach your target goals." buttonText="Create New Plan" />} />
        <Route path="/sessions" element={<PlaceholderPage title="Training Sessions" description="Log and track your training sessions here. Record your nutrition intake, any GI symptoms, and performance metrics." buttonText="Log New Session" />} />
        <Route path="/progress" element={<PlaceholderPage title="Progress Tracking" description="Track your progress towards your carbohydrate intake goals and monitor the frequency and severity of GI symptoms over time." buttonText="View Progress" />} />
        <Route path="/race-planner" element={<PlaceholderPage title="Race Day Planner" description="Create detailed nutrition and hydration plans for your upcoming races. Include timing, specific products, and contingency plans." buttonText="Create Race Plan" />} />
        <Route path="/learn" element={<PlaceholderPage title="Educational Resources" description="Learn the science behind gut training, carbohydrate metabolism, hydration, and more." buttonText="Browse Articles" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" description="Manage your profile, preferences, and account settings here." buttonText="Edit Profile" />} />
        
        {/* Default and fallback routes */}
        <Route path="/" element={<Navigate replace to="/dashboard" />} />
        <Route path="*" element={<Navigate replace to="/dashboard" />} />
      </Routes>
    </Layout>
  );
};

export default App;
