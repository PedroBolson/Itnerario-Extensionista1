import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    X,
    Eye,
    EyeOff,
    AlertCircle,
    UserPlus,
    ShieldCheck,
    ShieldOff,
    Ban,
    RefreshCw,
    BadgeCheck
} from 'lucide-react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import {
    createUserRecord,
    listenAllUserRecords,
    updateUserRecord,
    type UserRecord
} from '../lib/users';

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
    const { user } = useAuth();

    const [users, setUsers] = useState<UserRecord[]>([]);
    const [listLoading, setListLoading] = useState(true);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isActive, setIsActive] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showAdminPassword, setShowAdminPassword] = useState(false);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'create'>('list');

    const [localError, setLocalError] = useState('');
    const [localSuccess, setLocalSuccess] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [updatingRoleFor, setUpdatingRoleFor] = useState<string | null>(null);
    const [updatingStatusFor, setUpdatingStatusFor] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setViewMode('list');
            return;
        }
        setListLoading(true);
        const unsub = listenAllUserRecords((records) => {
            setUsers(records);
            setListLoading(false);
        });
        return () => unsub();
    }, [isOpen]);

    const filteredUsers = useMemo(() => {
        const key = search.trim().toLowerCase();
        if (!key) return users;
        return users.filter((item) => (
            [item.fullName, item.email, item.uid]
                .filter(Boolean)
                .some((value) => value!.toLowerCase().includes(key))
        ));
    }, [users, search]);

    const openCreateView = () => {
        setLocalError('');
        setLocalSuccess('');
        setViewMode('create');
    };

    const openListView = () => {
        setLocalError('');
        setViewMode('list');
    };

    const resetForm = () => {
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setAdminPassword('');
        setIsAdmin(false);
        setIsActive(true);
        setShowPassword(false);
        setShowAdminPassword(false);
        setLocalError('');
    };

    const handleClose = () => {
        resetForm();
        setLocalSuccess('');
        setViewMode('list');
        onClose();
    };

    const handleCreateUser = async () => {
        setLocalError('');
        setLocalSuccess('');

        const safeFirst = firstName.trim();
        const safeLast = lastName.trim();
        const fullName = [safeFirst, safeLast].filter(Boolean).join(' ').trim();

        if (!email.trim() || !password) {
            setLocalError('Email e senha são obrigatórios');
            return;
        }

        if (!adminPassword) {
            setLocalError('Informe sua senha para confirmar a operação');
            return;
        }

        if (password.length < 6) {
            setLocalError('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            setLocalError('As senhas não conferem');
            return;
        }

        if (!user?.email) {
            setLocalError('Não foi possível identificar o administrador atual. Refaça o login.');
            return;
        }

        if (!auth.currentUser) {
            setLocalError('Sessão expirada. Faça login novamente.');
            return;
        }

        setIsCreating(true);

        try {
            const adminEmail = user.email;
            const adminCredential = EmailAuthProvider.credential(adminEmail, adminPassword);

            await reauthenticateWithCredential(auth.currentUser, adminCredential);

            const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            const createdUser = credential.user;

            await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

            await createUserRecord({
                uid: createdUser.uid,
                email: email.trim(),
                fullName: fullName || email.trim(),
                role: isAdmin ? 'admin' : null,
                isActive,
            });

            const createdName = fullName || email.trim();
            const message = `${createdName} cadastrado com sucesso${isAdmin ? ' como administrador' : ''}.`;
            setLocalSuccess(message);
            onSuccess(message);
            onUserCreated();

            resetForm();
            setViewMode('list');
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
                case 'auth/invalid-login-credentials':
                case 'auth/invalid-credential':
                case 'auth/wrong-password':
                    errorMessage = 'Senha de administrador inválida';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Muitas tentativas. Tente novamente em instantes';
                    break;
                default:
                    errorMessage = err.message || errorMessage;
            }

            setLocalError(errorMessage);
            onError(errorMessage);
        } finally {
            setIsCreating(false);
        }
    };

    const toggleRole = async (record: UserRecord) => {
        if (record.uid === user?.uid && record.role === 'admin') {
            const msg = 'Você não pode remover sua própria permissão de administrador.';
            setLocalError(msg);
            onError(msg);
            return;
        }

        const nextRole = record.role === 'admin' ? null : 'admin';
        setUpdatingRoleFor(record.uid);
        setLocalError('');
        setLocalSuccess('');

        try {
            await updateUserRecord(record.uid, { role: nextRole });
            const msg = nextRole === 'admin'
                ? `${record.fullName || record.email} agora é administrador.`
                : `${record.fullName || record.email} removido da administração.`;
            setLocalSuccess(msg);
            onSuccess(msg);
        } catch (error) {
            console.error('Erro ao atualizar cargo do usuário:', error);
            const msg = 'Não foi possível atualizar o cargo do usuário.';
            setLocalError(msg);
            onError(msg);
        } finally {
            setUpdatingRoleFor(null);
        }
    };

    const toggleStatus = async (record: UserRecord) => {
        if (record.uid === user?.uid) {
            const msg = 'Você não pode alterar o status da própria conta.';
            setLocalError(msg);
            onError(msg);
            return;
        }

        const nextStatus = !record.isActive;
        setUpdatingStatusFor(record.uid);
        setLocalError('');
        setLocalSuccess('');

        try {
            await updateUserRecord(record.uid, { isActive: nextStatus });
            const msg = nextStatus
                ? `${record.fullName || record.email} foi reativado.`
                : `${record.fullName || record.email} foi desativado e não poderá acessar.`;
            setLocalSuccess(msg);
            onSuccess(msg);
        } catch (error) {
            console.error('Erro ao atualizar status do usuário:', error);
            const msg = 'Não foi possível atualizar o status do usuário.';
            setLocalError(msg);
            onError(msg);
        } finally {
            setUpdatingStatusFor(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-theme-surface border border-theme rounded-2xl p-6 w-full max-w-5xl shadow-2xl dark:border-white/10 dark:bg-[#14141a]">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 grid place-items-center dark:bg-blue-500/20 dark:text-blue-300">
                            <UserPlus size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-theme-primary">Gerenciar Usuários</h3>
                            <p className="text-sm text-theme-secondary">Crie novos acessos, defina administradores e controle o status das contas.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {viewMode === 'list' ? (
                            <button
                                onClick={openCreateView}
                                className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium shadow-sm hover:bg-blue-600 transition-colors dark:bg-blue-600 dark:hover:bg-blue-500"
                            >
                                Novo usuário
                            </button>
                        ) : (
                            <button
                                onClick={openListView}
                                className="px-3 py-2 rounded-lg bg-theme-surface text-theme-secondary border border-theme text-sm font-medium hover:text-theme-primary transition-colors dark:bg-white/5 dark:text-white dark:border-white/10"
                            >
                                Ver usuários
                            </button>
                        )}
                        <button
                            onClick={handleClose}
                            className="text-theme-secondary hover:text-theme-primary"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {(localError || localSuccess) && (
                    <div className="mb-4">
                        {localError && (
                            <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 p-3 rounded flex items-center gap-2">
                                <AlertCircle size={14} />
                                {localError}
                            </div>
                        )}
                        {localSuccess && !localError && (
                            <div className="text-sm text-green-600 bg-green-500/10 border border-green-500/20 p-3 rounded">
                                {localSuccess}
                            </div>
                        )}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {viewMode === 'list' && (
                        <motion.section
                            key="admin-list"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -16 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="space-y-4"
                        >
                            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h4 className="text-base font-semibold text-theme-primary">Usuários Cadastrados</h4>
                                    <p className="text-xs text-theme-secondary">Defina privilégios e controle acesso rapidamente.</p>
                                </div>
                                <div className="relative w-full sm:w-auto">
                                    <input
                                className="w-full sm:w-[260px] pl-9 pr-3 py-2 rounded-xl border border-theme bg-theme-base text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Buscar por nome ou email"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                    />
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1110.5 3a7.5 7.5 0 016.15 12.15z" />
                                    </svg>
                                </div>
                            </header>

                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                                {listLoading ? (
                                    <div className="h-40 border border-dashed border-theme rounded-xl grid place-items-center text-theme-secondary text-sm">
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                        <span className="mt-2">Carregando usuários...</span>
                                    </div>
                                ) : filteredUsers.length === 0 ? (
                                    <div className="h-40 border border-dashed border-theme rounded-xl grid place-items-center text-theme-secondary text-sm">
                                        Nenhum usuário encontrado.
                                    </div>
                                ) : (
                                    filteredUsers.map((record) => {
                                        const isThisAdmin = record.uid === user?.uid;
                                        const roleLoading = updatingRoleFor === record.uid;
                                        const statusLoading = updatingStatusFor === record.uid;

                                        return (
                                            <motion.div
                                                key={record.uid}
                                                layout
                                                initial={{ opacity: 0.8, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                transition={{ duration: 0.15 }}
                                                className="border border-theme/70 rounded-xl p-4 bg-theme-base/60 backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
                                            >
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <div className="font-medium text-theme-primary flex items-center gap-2">
                                                            {record.fullName || 'Nome não informado'}
                                                            {isThisAdmin && (
                                                                <BadgeCheck className="w-4 h-4 text-blue-500" />
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-theme-secondary">
                                                            {record.email || 'Sem email vinculado'}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.role === 'admin' ? 'bg-purple-500/15 text-purple-500 border border-purple-500/25 dark:bg-purple-500/20 dark:text-purple-200 dark:border-purple-500/30' : 'bg-theme-surface text-theme-secondary border border-theme dark:bg-white/5 dark:text-white dark:border-white/10'}`}>
                                                            {record.role === 'admin' ? 'Administrador' : 'Padrão'}
                                                        </span>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.isActive ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/30' : 'bg-red-500/10 text-red-600 border border-red-500/20 dark:bg-red-500/15 dark:text-red-200 dark:border-red-500/30'}`}>
                                                            {record.isActive ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {!isThisAdmin && (
                                                    <div className="mt-4 flex flex-wrap gap-3">
                                                        <button
                                                            onClick={() => toggleRole(record)}
                                                            disabled={roleLoading || statusLoading}
                                                            className={`flex-1 min-w-[160px] px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${record.role === 'admin'
                                                                ? 'border-purple-500/40 text-purple-500 hover:bg-purple-500/10 dark:border-purple-500/40 dark:text-purple-200'
                                                                : 'border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface dark:border-white/15 dark:text-white dark:hover:bg-white/10'} ${roleLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                        >
                                                            {roleLoading ? (
                                                                <>
                                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                                    Atualizando...
                                                                </>
                                                            ) : record.role === 'admin' ? (
                                                                <>
                                                                    <ShieldOff className="w-4 h-4" />
                                                                    Remover admin
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <ShieldCheck className="w-4 h-4" />
                                                                    Tornar admin
                                                                </>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => toggleStatus(record)}
                                                            disabled={statusLoading || roleLoading}
                                                            className={`flex-1 min-w-[160px] px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${record.isActive
                                                                ? 'border-amber-500/30 text-amber-600 hover:bg-amber-500/10 dark:border-amber-400/40 dark:text-amber-300 dark:hover:bg-amber-400/10'
                                                                : 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 dark:border-emerald-400/40 dark:text-emerald-200 dark:hover:bg-emerald-400/10'} ${statusLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                        >
                                                            {statusLoading ? (
                                                                <>
                                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                                    Atualizando...
                                                                </>
                                                            ) : record.isActive ? (
                                                                <>
                                                                    <Ban className="w-4 h-4" />
                                                                    Desativar acesso
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <ShieldCheck className="w-4 h-4" />
                                                                    Reativar acesso
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.section>
                    )}

                    {viewMode === 'create' && (
                        <motion.section
                            key="admin-create"
                            initial={{ opacity: 0, x: 24 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -24 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="space-y-4"
                        >
                            <header>
                                <h4 className="text-base font-semibold text-theme-primary">Criar novo usuário</h4>
                                <p className="text-xs text-theme-secondary">Informe os dados do novo usuário e confirme com sua senha.</p>
                            </header>

                            <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-theme-primary">Nome</label>
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="Maria"
                                            className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-theme-primary">Sobrenome</label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Souza"
                                            className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium mb-1 text-theme-primary">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="usuario@projeto.com"
                                        className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-theme-primary">Senha provisória</label>
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
                                                onClick={() => setShowPassword((prev) => !prev)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-secondary hover:text-theme-primary"
                                            >
                                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-theme-primary">Confirmar senha</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Repita a senha"
                                            className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label className="inline-flex items-center gap-2 text-sm text-theme-secondary">
                                        <input
                                            type="checkbox"
                                            checked={isAdmin}
                                            onChange={(e) => setIsAdmin(e.target.checked)}
                                            className="rounded border-theme text-purple-500 focus:ring-purple-500"
                                        />
                                        Tornar administrador
                                    </label>
                                    <label className="inline-flex items-center gap-2 text-sm text-theme-secondary">
                                        <input
                                            type="checkbox"
                                            checked={isActive}
                                            onChange={(e) => setIsActive(e.target.checked)}
                                            className="rounded border-theme text-emerald-500 focus:ring-emerald-500"
                                        />
                                        Habilitar acesso imediato
                                    </label>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-theme space-y-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-theme-primary">Sua senha (confirmação)</label>
                                    <div className="relative">
                                        <input
                                            type={showAdminPassword ? 'text' : 'password'}
                                            value={adminPassword}
                                            onChange={(e) => setAdminPassword(e.target.value)}
                                            placeholder="Digite sua senha para confirmar"
                                            className="w-full px-3 py-2 pr-10 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowAdminPassword((prev) => !prev)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-secondary hover:text-theme-primary"
                                        >
                                            {showAdminPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-xs text-theme-secondary dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-100">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle size={14} className="text-amber-600 mt-[2px]" />
                                        <div>
                                            <p className="text-theme-primary font-medium">Importante</p>
                                            <p>Após criar o usuário, ele receberá acesso imediato com a senha provisória informada. Oriente o novo usuário a trocar a senha no primeiro acesso.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleClose}
                                        className="flex-1 px-4 py-2 border border-theme text-theme-secondary rounded-lg hover:bg-theme-surface-hover transition-colors dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleCreateUser}
                                        disabled={isCreating}
                                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 dark:bg-blue-600 dark:hover:bg-blue-500"
                                    >
                                        {isCreating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Criando...
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus size={16} />
                                                Criar usuário
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
