import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig, motion } from "motion/react";
import { useLayoutEffect, useState } from "react";
import toast, { Toaster, resolveValue } from "react-hot-toast";
import { Navigate, Route, Routes, useLocation, useOutlet } from "react-router-dom";
import { Toast } from "./components/ds";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import RiftBackground from "./components/RiftBackground";
import { PageTransition } from "./components/Transitions";
import { AuthProvider } from "./context/AuthContext";
import AIChat from "./pages/AIChat";
import { Login, Register } from "./pages/Auth";
import Coaching from "./pages/Coaching";
import Dashboard from "./pages/Dashboard";
import Draft from "./pages/Draft";
import FantaLol from "./pages/FantaLol";
import Home from "./pages/Home";
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
  const outlet = useOutlet();
  // Graffe obbligatorie: in alcuni browser scrollTo restituisce una Promise, che React tratterebbe come cleanup (crash).
  useLayoutEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <ProtectedRoute>
      <RiftBackground intensity="calm" />
      <Navbar />
      <main className="relative z-[1] mx-auto max-w-[1320px] px-5 pb-20 pt-10">
        <PageTransition id={pathname}>
          <ErrorBoundary key={pathname}>{outlet}</ErrorBoundary>
        </PageTransition>
      </main>
    </ProtectedRoute>
  );
}

/** Sezioni di primo livello: cambiarle sostituisce l'intero guscio (home ↔ accesso ↔ app). */
const section = (p) => (p === "/" ? "home" : p === "/login" || p === "/register" ? "auth" : "app");

const TOAST_TONE = { success: "success", error: "danger" };

/** react-hot-toast rendered with the design-system Toast; an icon option of "🏆" etc. marks a reward. */
function DsToast({ t }) {
  const tone = t.icon ? "reward" : TOAST_TONE[t.type] || "info";
  return (
    <div style={{ animation: `${t.visible ? "rhToastIn" : "rhToastOut"} calc(var(--rh-k) * 380ms) var(--ease-out) both` }}>
      <Toast tone={tone} title={resolveValue(t.message, t)} onClose={() => toast.dismiss(t.id)} />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-start gap-3 py-16">
      <h1 style={{ margin: 0, font: "900 clamp(48px,8vw,96px)/.9 var(--font-display)" }}>Fuori mappa</h1>
      <p style={{ margin: 0, maxWidth: 420 }}>Questa pagina non esiste. Torna alla dashboard dal menu in alto.</p>
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  return (
    <motion.div key={section(location.pathname)} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.4, delay: 0.15 } }}>
      <Routes location={location}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route index element={<Home />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
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
    </motion.div>
  );
}

export default function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <Toaster position="top-right" containerStyle={{ top: 80, right: 20, zIndex: 95 }}>{(t) => <DsToast t={t} />}</Toaster>
          <AppRoutes />
        </AuthProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
