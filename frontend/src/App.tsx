import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { WorkspaceGuard } from "@/components/workspace/WorkspaceGuard";
import { shouldShowReleaseNotes, markReleaseNotesAsSeen } from "@/lib/releaseNotes";
import { ReleaseNotesModal } from "@/components/ReleaseNotesModal";
import Index from "./pages/Index";
import MealPlans from "./pages/MealPlans";
import MealPlansMockup from "./pages/MealPlansMockup";
import Recipes from "./pages/Recipes";
import Household from "./pages/Household";
import Groceries from "./pages/Groceries";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);

  useEffect(() => {
    // Check if we should show release notes after a short delay
    // Delay ensures workspace is loaded first
    const timer = setTimeout(() => {
      if (shouldShowReleaseNotes()) {
        setShowReleaseNotes(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleReleaseNotesClose = () => {
    markReleaseNotesAsSeen();
    setShowReleaseNotes(false);
  };

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            {/* Public route - shows WorkspaceSelector if needed */}
            <Route path="/" element={<Index />} />

            {/* Protected routes - require workspace to be set */}
            <Route path="/cook" element={<WorkspaceGuard><Recipes /></WorkspaceGuard>} />
            <Route path="/plan" element={<WorkspaceGuard><MealPlans /></WorkspaceGuard>} />
            <Route path="/household" element={<WorkspaceGuard><Household /></WorkspaceGuard>} />

            {/* Legacy routes for backwards compatibility - also protected */}
            <Route path="/groceries" element={<WorkspaceGuard><Groceries /></WorkspaceGuard>} />
            <Route path="/recipes" element={<WorkspaceGuard><Recipes /></WorkspaceGuard>} />
            <Route path="/meal-plans" element={<WorkspaceGuard><MealPlans /></WorkspaceGuard>} />
            <Route path="/meal-plans-mockup" element={<WorkspaceGuard><MealPlansMockup /></WorkspaceGuard>} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>

      {/* Release notes modal - shows automatically after version updates */}
      <ReleaseNotesModal
        open={showReleaseNotes}
        onOpenChange={handleReleaseNotesClose}
      />
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
