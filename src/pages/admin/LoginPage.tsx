import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isRecoveryMode) {
        await handleForgotPassword();
      } else {
        await signIn(email.trim(), password);
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Falha ao entrar. Verifique suas credenciais.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Digite seu email para recuperar a senha');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess('Email de recuperação enviado! Verifique sua caixa de entrada.');
      setIsRecoveryMode(false);
    } catch (err: any) {
      let errorMessage = 'Erro ao enviar email de recuperação';

      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = 'Email não encontrado';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        default:
          errorMessage = err.message || 'Erro ao enviar email de recuperação';
      }

      setError(errorMessage);
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

          {!isRecoveryMode && (
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
          )}

          {isRecoveryMode && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-medium text-blue-700 dark:text-blue-400">Recuperação de Senha</h3>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                Informe o email da sua conta e receberá as instruções para redefinir sua senha.
              </p>
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

          {success && (
            <div className="text-sm text-green-600 bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading || (isRecoveryMode && !email.trim())}
              className={`w-full px-4 py-2 rounded-xl font-medium btn-primary flex items-center justify-center gap-2 ${loading || (isRecoveryMode && !email.trim()) ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {isRecoveryMode ? 'Enviando...' : 'Entrando...'}
                </>
              ) : isRecoveryMode ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Enviar Email de Recuperação
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

            <button
              type="button"
              onClick={() => {
                setIsRecoveryMode(!isRecoveryMode);
                setError(null);
                setSuccess(null);
                if (!isRecoveryMode) setPassword('');
              }}
              className="w-full px-4 py-2 rounded-xl border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors text-sm flex items-center justify-center gap-2"
            >
              {isRecoveryMode ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Voltar ao Login
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Esqueci a Senha
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-xs text-theme-muted mt-4">
          Não há cadastro público. Contas são gerenciadas internamente.
        </p>
      </div>
    </div>
  );
}
