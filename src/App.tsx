
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { HomePage } from './pages/principal/HomePage';
import { TutorialPage } from './pages/principal/TutorialPage';
import { FormPage } from './pages/principal/FormPage';
import { ThemeSwitch } from './components/ThemeSwitch';
import { LoginPage } from './pages/admin/LoginPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { ParticipantsPage } from './pages/admin/ParticipantsPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { CoursesPage } from './pages/principal/CoursesPage';
import { LearnerProvider } from './context/LearnerContext';
import Navigation from './components/Navigation';



function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="/criar-cv" element={<FormPage />} />
        <Route path="/cursos" element={<CoursesPage />} />
        <Route path="/admin" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/participants" element={<ParticipantsPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function AppShell() {
  const location = useLocation();
  const hideNav = location.pathname.startsWith('/admin') && location.pathname === '/admin';

  return (
    <div className="min-h-[100svh] bg-theme-base transition-colors duration-300">
      <ThemeSwitch />
      {!hideNav && <Navigation />}
      <main className={`bg-transparent transition-all duration-500 ${!hideNav ? 'md:pl-24' : ''}`}>
        <AnimatedRoutes />
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <LearnerProvider>
          <AppShell />
        </LearnerProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
