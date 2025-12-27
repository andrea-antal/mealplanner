import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import MealPlans from "./pages/MealPlans";
import MealPlansMockup from "./pages/MealPlansMockup";
import Recipes from "./pages/Recipes";
import Household from "./pages/Household";
import Groceries from "./pages/Groceries";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Groceries />} />
            <Route path="/cook" element={<Recipes />} />
            <Route path="/plan" element={<MealPlans />} />
            <Route path="/household" element={<Household />} />
            {/* Legacy routes for backwards compatibility */}
            <Route path="/groceries" element={<Groceries />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/meal-plans" element={<MealPlans />} />
            <Route path="/meal-plans-mockup" element={<MealPlansMockup />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
