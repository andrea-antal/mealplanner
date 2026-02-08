import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { WorkspaceGuard } from "@/components/workspace/WorkspaceGuard";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { shouldShowReleaseNotes, markReleaseNotesAsSeen } from "@/lib/releaseNotes";
import { ReleaseNotesModal } from "@/components/ReleaseNotesModal";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AuthVerify from "./pages/AuthVerify";
import AuthCallback from "./pages/AuthCallback";
import MealPlans from "./pages/MealPlans";
import MealPlansMockup from "./pages/MealPlansMockup";
import MealPlanPlayground from "./pages/MealPlanPlayground";
import Recipes from "./pages/Recipes";
import Household from "./pages/Household";
import Groceries from "./pages/Groceries";
import CookingPreferences from "./pages/CookingPreferences";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Auth routes where release notes should NOT show
const AUTH_ROUTES = ['/login', '/signup', '/auth/callback', '/auth/verify'];

/**
 * Handles release notes display logic.
 * Only shows when user is authenticated and NOT on auth routes.
 */
function ReleaseNotesHandler() {
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Don't show on auth routes
    if (AUTH_ROUTES.some(route => location.pathname.startsWith(route))) {
      return;
    }

    // Don't show while auth is loading or if not authenticated
    if (isLoading || !isAuthenticated) {
      return;
    }

    // Check if we should show release notes after a short delay
    const timer = setTimeout(() => {
      if (shouldShowReleaseNotes()) {
        setShowReleaseNotes(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, location.pathname]);

  const handleClose = () => {
    markReleaseNotesAsSeen();
    setShowReleaseNotes(false);
  };

  return (
    <ReleaseNotesModal
      open={showReleaseNotes}
      onOpenChange={handleClose}
    />
  );
}

const App = () => {

  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout>
            <Routes>
              {/* Public route - shows WorkspaceSelector if needed */}
              <Route path="/" element={<Index />} />

              {/* Auth routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/auth/verify" element={<AuthVerify />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Protected routes - require workspace to be set */}
              <Route path="/cook" element={<WorkspaceGuard><CookingPreferences /></WorkspaceGuard>} />
              <Route path="/plan" element={<WorkspaceGuard><MealPlans /></WorkspaceGuard>} />
              <Route path="/household" element={<WorkspaceGuard><Household /></WorkspaceGuard>} />

              {/* Legacy routes for backwards compatibility - also protected */}
              <Route path="/groceries" element={<WorkspaceGuard><Groceries /></WorkspaceGuard>} />
              <Route path="/recipes" element={<WorkspaceGuard><Recipes /></WorkspaceGuard>} />
              <Route path="/meal-plans" element={<WorkspaceGuard><MealPlans /></WorkspaceGuard>} />
              <Route path="/meal-plans-mockup" element={<WorkspaceGuard><MealPlansMockup /></WorkspaceGuard>} />
              <Route path="/playground" element={<MealPlanPlayground />} />

              {/* Admin route - global view, no workspace required */}
              <Route path="/a" element={<Admin />} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>

          {/* Release notes - only shows when authenticated and not on auth routes */}
          <ReleaseNotesHandler />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
