import "./App.css";
import { AuthProvider, useAuth } from "./lib/auth-context";
import LoginPage from "./components/LoginPage";
import { RecoveryModal } from "./components/RecoveryModal";
import { Loader2 } from "lucide-react";

function AppContent() {
  const { view, profile, recoveryWords } = useAuth();

  // Loading state
  if (view === "loading") {
    return (
      <div className="w-full h-screen bg-[#110f14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground font-story text-lg">
            Yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  // Login / Signup
  if (view === "login") {
    return (
      <main className="w-full h-screen bg-[#110f14]">
        <LoginPage />
      </main>
    );
  }

  // Recovery words modal (after encrypted account creation)
  if (view === "recovery" && recoveryWords && profile) {
    return (
      <main className="w-full h-screen bg-[#110f14] flex items-center justify-center dark">
        <RecoveryModal username={profile.username} words={recoveryWords} />
      </main>
    );
  }

  // Dashboard
  if (view === "dashboard" && profile) {
    return (
      <div className="dark bg-background text-foreground w-full min-h-screen">
        <Dashboard />
      </div>
    );
  }

  // Fallback
  return (
    <main className="w-full h-screen bg-[#110f14]">
      <LoginPage />
    </main>
  );
}

import { Dashboard } from "./components/Dashboard";

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;