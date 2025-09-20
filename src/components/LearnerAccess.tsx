import { useEffect, useState } from 'react';
import { X, Key, Plus, Copy, CheckCircle2 } from 'lucide-react';
import { useLearner } from '../context/LearnerContext';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { generateAccessCode } from '../lib/progress';

interface LearnerAccessProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LearnerAccess({ isOpen, onClose }: LearnerAccessProps) {
    const { setLearner } = useLearner();
    const [mode, setMode] = useState<'choose' | 'create' | 'access' | 'created'>('choose');
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [generatedCode, setGeneratedCode] = useState('');
    const [copied, setCopied] = useState(false);

    const handleClose = () => {
        setMode('choose');
        setName('');
        setCode('');
        setGeneratedCode('');
        setError('');
        setCopied(false);
        onClose();
    };

    useEffect(() => {
        if (!isOpen) {
            setMode('choose');
            setName('');
            setCode('');
            setGeneratedCode('');
            setError('');
            setCopied(false);
            setIsLoading(false);
        }
    }, [isOpen]);

    const handleCreateProfile = async () => {
        if (!name.trim()) return;

        setIsLoading(true);
        setError('');

        try {
            const newCode = generateAccessCode();
            const learnerData = {
                code: newCode,
                displayName: name.trim(),
                createdAt: serverTimestamp(),
                lastActiveAt: serverTimestamp()
            };

            await setDoc(doc(db, 'learningProgress', newCode), learnerData);

            setLearner({
                id: newCode,
                displayName: name.trim(),
                createdAt: new Date(),
                lastActiveAt: new Date()
            });
            setGeneratedCode(newCode);
            setCopied(false);
            setMode('created');
        } catch (err) {
            setError('Erro ao criar perfil. Tente novamente.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccessProfile = async () => {
        if (!code.trim() || code.length !== 4) {
            setError('Código deve ter 4 caracteres');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const docRef = doc(db, 'learningProgress', code.toUpperCase());
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setLearner({
                    id: code.toUpperCase(),
                    displayName: data.displayName || 'Participante',
                    createdAt: data.createdAt?.toDate() || new Date(),
                    lastActiveAt: new Date()
                });

                await setDoc(docRef, { lastActiveAt: serverTimestamp() }, { merge: true });
                handleClose();
            } else {
                setError('Código não encontrado');
            }
        } catch (err) {
            setError('Erro ao acessar perfil. Tente novamente.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const reset = () => {
        setMode('choose');
        setName('');
        setCode('');
        setGeneratedCode('');
        setError('');
        setCopied(false);
    };

    const handleCopy = async () => {
        if (!generatedCode) return;
        try {
            await navigator.clipboard.writeText(generatedCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Erro ao copiar código', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-theme-surface border border-theme rounded-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">Acessar Progresso</h2>
                    <button onClick={handleClose} className="text-theme-secondary hover:text-theme-primary">
                        <X size={20} />
                    </button>
                </div>

                {mode === 'choose' && (
                    <div className="space-y-4">
                        <p className="text-sm text-theme-secondary mb-6">
                            Escolha uma opção para acompanhar seu progresso nas aulas:
                        </p>

                        <button
                            onClick={() => setMode('create')}
                            className="w-full p-4 border border-theme rounded-xl hover:bg-theme-surface-hover transition-colors flex items-center gap-3"
                        >
                            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                                <Plus size={20} />
                            </div>
                            <div className="text-left">
                                <div className="font-medium">Criar novo perfil</div>
                                <div className="text-sm text-theme-secondary">Digite seu nome e receba um código</div>
                            </div>
                        </button>

                        <button
                            onClick={() => setMode('access')}
                            className="w-full p-4 border border-theme rounded-xl hover:bg-theme-surface-hover transition-colors flex items-center gap-3"
                        >
                            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white">
                                <Key size={20} />
                            </div>
                            <div className="text-left">
                                <div className="font-medium">Usar código existente</div>
                                <div className="text-sm text-theme-secondary">Acesse seu progresso com o código</div>
                            </div>
                        </button>
                    </div>
                )}

                {mode === 'create' && (
                    <div className="space-y-4">
                        <button
                            onClick={reset}
                            className="text-sm text-theme-secondary hover:text-theme-primary mb-2"
                        >
                            ← Voltar
                        </button>

                        <div>
                            <label className="block text-sm font-medium mb-2">Seu nome</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Digite seu nome completo"
                                className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                maxLength={50}
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleCreateProfile}
                            disabled={!name.trim() || isLoading}
                            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? 'Criando...' : 'Criar Perfil e Gerar Código'}
                        </button>
                    </div>
                )}

                {mode === 'access' && (
                    <div className="space-y-4">
                        <button
                            onClick={reset}
                            className="text-sm text-theme-secondary hover:text-theme-primary mb-2"
                        >
                            ← Voltar
                        </button>

                        <div>
                            <label className="block text-sm font-medium mb-2">Código de acesso</label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                placeholder="Digite o código (ex: AB3X)"
                                className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center text-lg font-mono"
                                maxLength={4}
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleAccessProfile}
                            disabled={code.length !== 4 || isLoading}
                            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? 'Acessando...' : 'Acessar Meu Progresso'}
                        </button>
                    </div>
                )}

                {mode === 'created' && (
                    <div className="space-y-6 text-center">
                        <div className="mx-auto w-14 h-14 rounded-full bg-green-500/10 border border-green-500/40 text-green-600 grid place-items-center">
                            <CheckCircle2 size={28} />
                        </div>
                        <div className="space-y-1">
                            <div className="text-lg font-semibold">Perfil criado com sucesso!</div>
                            <p className="text-sm text-theme-secondary">Guarde e compartilhe o código abaixo para acompanhar seu progresso.</p>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                            <div className="px-5 py-3 rounded-xl border border-theme bg-theme-base text-lg font-mono tracking-[0.6em]">
                                {generatedCode.split('').join(' ')}
                            </div>
                            <button
                                onClick={handleCopy}
                                className={`px-3 py-2 rounded-xl border transition-colors flex items-center gap-2 ${copied ? 'border-green-500 text-green-600' : 'border-theme text-theme-primary hover:border-theme-primary'}`}
                            >
                                <Copy size={16} />
                                <span className="text-sm font-medium">{copied ? 'Copiado!' : 'Copiar'}</span>
                            </button>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            Começar a aprender
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
