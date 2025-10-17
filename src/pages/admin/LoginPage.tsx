import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [challengeQuestion, setChallengeQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const challengeValue = challengeAnswer.trim() ? Number(challengeAnswer.trim()) : undefined;
      await signIn(email.trim(), password, challengeValue);
      setChallengeQuestion(null);
      setChallengeAnswer('');
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const authError = err as Error & { code?: string; challenge?: { question?: string } };
      if (authError.challenge?.question) {
        setChallengeQuestion(authError.challenge.question);
        setChallengeAnswer('');
      }
      setError(authError.message || 'Falha ao entrar. Verifique suas credenciais.');
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
            <label htmlFor="email" className="block text-sm font-medium mb-1 text-theme-primary">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-theme rounded-xl bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="admin@projeto.com"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1 text-theme-primary">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-theme rounded-xl bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          {challengeQuestion && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-medium text-blue-700 dark:text-blue-400">Confirme que você é humano</h3>
              </div>
              <label className="block text-sm text-theme-secondary">
                Resolva rapidamente: {challengeQuestion}
              </label>
              <input
                type="number"
                value={challengeAnswer}
                onChange={(e) => setChallengeAnswer(e.target.value)}
                className="w-full px-3 py-2 border border-blue-500/40 rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Resposta"
                required
              />
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full px-4 py-2 rounded-xl font-medium btn-primary flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Entrando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1" />
                </svg>
                Entrar
              </>
            )}
          </button>
        </form>

        <p className="text-xs text-theme-muted mt-4">
          Não há cadastro público. Contas são gerenciadas internamente.
        </p>
      </div>
    </div>
  );
}
