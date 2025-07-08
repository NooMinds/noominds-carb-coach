// ============================================================================+
// Main App Component - FIXED ATHLETE NAVIGATION                               +
// ============================================================================+

function App() {
  const [isCoachMode, setIsCoachMode] = useLocalStorage('noominds-coach-mode', false);
  const [clients] = useLocalStorage<Client[]>('noominds-clients', mockClients);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  
  // ADD THIS: Athlete view navigation state
  const [athleteView, setAthleteView] = useState<AppView>('dashboard');

  const handleSelectClient = (id: string) => setSelectedClientId(id);
  const handleBackToCoachDashboard = () => setSelectedClientId(null);

  // ADD THIS: Athlete session handler
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

    // FIXED: Athlete view with proper navigation
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
