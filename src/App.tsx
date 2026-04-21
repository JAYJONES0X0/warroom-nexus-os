import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ExecutionScreen from "./pages/ExecutionScreen";
import IntelligenceScreen from "./pages/IntelligenceScreen";
import MarketsScreen from "./pages/MarketsScreen";
import AnalyticsScreen from "./pages/AnalyticsScreen";
import ReportsScreen from "./pages/ReportsScreen";
import JournalScreen from "./pages/JournalScreen";
import AlertsScreen from "./pages/AlertsScreen";
import SettingsScreen from "./pages/SettingsScreen";
import PolymarketScreen from "./pages/PolymarketScreen";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/execution" element={<ExecutionScreen />} />
          <Route path="/intelligence" element={<IntelligenceScreen />} />
          <Route path="/markets" element={<MarketsScreen />} />
          <Route path="/analytics" element={<AnalyticsScreen />} />
          <Route path="/reports" element={<ReportsScreen />} />
          <Route path="/journal" element={<JournalScreen />} />
          <Route path="/alerts" element={<AlertsScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/polymarket" element={<PolymarketScreen />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
