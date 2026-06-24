import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { WarroomProvider } from "@/context/WarroomStateContext";
import { OSShell } from "@/components/OSShell";
import CommandScreen from "./pages/CommandScreen";
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
import RiskScreen from "./pages/RiskScreen";
import PolymarketScreen from "./pages/PolymarketScreen";

const queryClient = new QueryClient();

// All module routes share the persistent OS shell (left rail + top bar).
// Cosmos and legacy-home are full-screen nav screens — no shell.
const ShellLayout = () => (
  <OSShell><Outlet /></OSShell>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WarroomProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Full-screen nav screens — no OS shell */}
            <Route path="/cosmos" element={<Index />} />
            <Route path="/legacy-home" element={<Index />} />

            {/* Module routes — wrapped in persistent OS shell */}
            <Route element={<ShellLayout />}>
              <Route path="/" element={<CommandScreen />} />
              <Route path="/command" element={<CommandScreen />} />
              <Route path="/execution" element={<ExecutionScreen />} />
              <Route path="/intelligence" element={<IntelligenceScreen />} />
              <Route path="/markets" element={<MarketsScreen />} />
              <Route path="/analytics" element={<AnalyticsScreen />} />
              <Route path="/reports" element={<ReportsScreen />} />
              <Route path="/journal" element={<JournalScreen />} />
              <Route path="/alerts" element={<AlertsScreen />} />
              <Route path="/risk" element={<RiskScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/polymarket" element={<PolymarketScreen />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </WarroomProvider>
  </QueryClientProvider>
);

export default App;
