
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { HomePage } from './pages/HomePage';
import { TutorialPage } from './pages/TutorialPage';
import { FormPage } from './pages/FormPage';
import { ThemeSwitch } from './components/ThemeSwitch';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { CoursesPage } from './pages/CoursesPage';
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
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function AppShell() {
  const location = useLocation();
  const hideNav = (
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/dashboard')
  );

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
        <AppShell />
      </AuthProvider>
    </Router>
  );
}

export default App;
