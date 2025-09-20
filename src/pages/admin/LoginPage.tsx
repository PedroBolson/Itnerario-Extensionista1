import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Falha ao entrar. Verifique suas credenciais.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100svh] flex items-center justify-center p-6 bg-theme-base">
      <div className="w-full max-w-sm bg-theme-surface rounded-2xl border border-theme shadow-xl p-6">
        <h1 className="text-xl font-semibold mb-4 text-theme-primary">Acesso Restrito</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 text-theme-secondary">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 rounded-xl bg-theme-base border border-theme text-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-primary/40"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-theme-secondary">Senha</label>
            <input
              type="password"
              className="w-full px-3 py-2 rounded-xl bg-theme-base border border-theme text-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-primary/40"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-xl p-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className={`w-full px-4 py-2 rounded-xl font-medium btn-primary ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="text-xs text-theme-muted mt-4">
          Não há cadastro público. Contas são gerenciadas internamente.
        </p>
      </div>
    </div>
  );
}
