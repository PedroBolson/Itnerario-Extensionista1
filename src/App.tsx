
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveView = () => {
    switch (location.pathname) {
      case '/':
        return 'home';
      case '/tutorial':
        return 'tutorial';
      case '/criar-cv':
        return 'form';
      case '/cursos':
        return 'cursos';
      default:
        return 'home';
    }
  };

  const navigateTo = (path: string) => {
    navigate(path);
  };

  return (
    <nav className="fixed top-4 left-4 z-40">
      <div className="flex flex-col sm:flex-row gap-2 bg-theme-surface/95 backdrop-blur-md rounded-2xl p-3 border border-theme shadow-xl">
        {[
          { path: '/', key: 'home', label: 'Início' },
          { path: '/cursos', key: 'cursos', label: 'Mini Cursos' },
          { path: '/tutorial', key: 'tutorial', label: 'Dicas de CV' },
          { path: '/criar-cv', key: 'form', label: 'Criar CV' }
        ].map(({ path, key, label }) => (
          <button
            key={key}
            onClick={() => navigateTo(path)}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300 whitespace-nowrap ${getActiveView() === key
              ? 'btn-primary shadow-md'
              : 'text-theme-secondary hover:bg-theme-surface-hover'
              }`}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="/criar-cv" element={<FormPage />} />
        <Route path="/cursos" element={<CoursesPage />} />
        <Route path="/auth" element={<LoginPage />} />
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
    location.pathname.startsWith('/auth') ||
    location.pathname.startsWith('/dashboard')
  );

  return (
    <div className="min-h-[100svh] bg-theme-base transition-colors duration-300">
      <ThemeSwitch />
      {!hideNav && <Navigation />}
      <main className="bg-transparent">
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
