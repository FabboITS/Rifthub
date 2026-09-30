import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { Outlet, Route, Routes, useLocation } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import AIChat from "./pages/AIChat";
import { Login, Register } from "./pages/Auth";
import Coaching from "./pages/Coaching";
import Dashboard from "./pages/Dashboard";
import Draft from "./pages/Draft";
import FantaLol from "./pages/FantaLol";
import Scouting from "./pages/Scouting";
import ScoutingBrowse from "./pages/ScoutingBrowse";
import ScoutingMatches from "./pages/ScoutingMatches";
import Scrims from "./pages/Scrims";
import Shadow from "./pages/Shadow";
import TacticBoardPage from "./pages/TacticBoard";
import Tactics from "./pages/Tactics";
import TeamDetail from "./pages/TeamDetail";
import Teams from "./pages/Teams";
import TournamentDetail from "./pages/TournamentDetail";
import Tournaments from "./pages/Tournaments";
import VodDetail from "./pages/VodDetail";
import Vods from "./pages/Vods";

// Every page refetches its data periodically and when the browser tab regains focus.
const AUTO_REFRESH_MS = 15000;

function createQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: true, refetchInterval: AUTO_REFRESH_MS },
    },
    // Any successful write refreshes every page's data, so no manual reload is ever needed.
    mutationCache: new MutationCache({ onSuccess: () => client.invalidateQueries() }),
  });
  return client;
}

function Layout() {
  const { pathname } = useLocation();
  return (
    <ProtectedRoute>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </ProtectedRoute>
  );
}

function NotFound() {
  return <p className="p-8 text-center text-slate-400">Pagina non trovata.</p>;
}

export default function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ style: { background: "#1e293b", color: "#f0e6d2" } }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="teams" element={<Teams />} />
            <Route path="teams/:id" element={<TeamDetail />} />
            <Route path="scrims" element={<Scrims />} />
            <Route path="tournaments" element={<Tournaments />} />
            <Route path="tournaments/:id" element={<TournamentDetail />} />
            <Route path="scouting" element={<Scouting />} />
            <Route path="scouting/browse" element={<ScoutingBrowse />} />
            <Route path="scouting/matches" element={<ScoutingMatches />} />
            <Route path="tactics" element={<Tactics />} />
            <Route path="tactics/shadow/:sessionId" element={<Shadow />} />
            <Route path="tactics/:id" element={<TacticBoardPage />} />
            <Route path="vod" element={<Vods />} />
            <Route path="vod/:id" element={<VodDetail />} />
            <Route path="coaching" element={<Coaching />} />
            <Route path="draft" element={<Draft />} />
            <Route path="ai" element={<AIChat />} />
            <Route path="fantalol" element={<FantaLol />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  );
}
