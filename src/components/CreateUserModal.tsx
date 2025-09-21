import { useState } from 'react';
import { X, Eye, EyeOff, AlertCircle, UserPlus } from 'lucide-react';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUserCreated: () => void;
    onError: (error: string) => void;
    onSuccess: (message: string) => void;
}

export function CreateUserModal({
    isOpen,
    onClose,
    onUserCreated,
    onError,
    onSuccess
}: CreateUserModalProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [localError, setLocalError] = useState('');

    const handleClose = () => {
        setEmail('');
        setPassword('');
        setShowPassword(false);
        setLocalError('');
        onClose();
    };

    const handleCreateUser = async () => {
        if (!email || !password) {
            setLocalError('Email e senha são obrigatórios');
            return;
        }

        if (password.length < 6) {
            setLocalError('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        setIsCreating(true);
        setLocalError('');

        try {
            // Criar novo usuário
            await createUserWithEmailAndPassword(auth, email, password);

            // Deslogar o usuário recém criado
            await signOut(auth);

            // Sucesso - o admin precisará fazer login novamente
            onSuccess(`Usuário ${email} criado com sucesso! Você precisará fazer login novamente.`);
            handleClose();
            onUserCreated();

            // Recarregar a página para forçar novo login
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (err: any) {
            console.error('Erro ao criar usuário:', err);
            let errorMessage = 'Erro ao criar usuário';

            switch (err.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Este email já está em uso';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Email inválido';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'A senha é muito fraca';
                    break;
                default:
                    errorMessage = err.message || 'Erro ao criar usuário';
            }

            setLocalError(errorMessage);
            onError(errorMessage);
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-theme-surface border border-theme rounded-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 grid place-items-center">
                            <UserPlus size={20} />
                        </div>
                        <h3 className="text-lg font-semibold text-theme-primary">Criar Novo Usuário</h3>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-theme-secondary hover:text-theme-primary"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-theme-primary">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@projeto.com"
                            className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-theme-primary">Senha</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                className="w-full px-3 py-2 pr-10 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-secondary hover:text-theme-primary"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {localError && (
                        <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 p-2 rounded flex items-center gap-2">
                            <AlertCircle size={14} />
                            {localError}
                        </div>
                    )}

                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
                        <div className="flex items-start gap-2">
                            <AlertCircle size={16} className="text-amber-600 mt-0.5" />
                            <div className="text-sm text-theme-secondary">
                                <div className="font-medium mb-1 text-theme-primary">Atenção:</div>
                                <div>Ao criar uma conta, você será redirecionado para a tela de login devido a limitações do fluxo padrão do Firebase.</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleClose}
                            className="flex-1 px-4 py-2 border border-theme text-theme-secondary rounded-lg hover:bg-theme-surface-hover transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreateUser}
                            disabled={isCreating || !email || !password}
                            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {isCreating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Criando...
                                </>
                            ) : (
                                <>
                                    <UserPlus size={16} />
                                    Criar Usuário
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
