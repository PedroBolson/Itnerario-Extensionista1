import { motion } from 'framer-motion';
import { Camera, FileText, CheckCircle, AlertTriangle, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const photoTips = [
    "Use fundo neutro e bem iluminado",
    "Vista roupas profissionais apropriadas",
    "Mantenha postura ereta e sorriso discreto",
    "Evite acessórios chamativos",
    "Resolução mínima de 300x300 pixels"
];

const resumeTips = [
    "Seja objetivo: máximo 2 páginas",
    "Use verbos de ação (gerenciei, desenvolvi, implementei)",
    "Quantifique resultados sempre que possível",
    "Adapte o currículo para cada vaga",
    "Inclua palavras-chave da descrição da vaga"
];

const designTips = [
    "Use fontes legíveis e profissionais",
    "Mantenha hierarquia visual clara",
    "Use cores com moderação",
    "Deixe espaços em branco adequados",
    "Seja consistente com formatação"
];

const photoDonts = [
    "Selfies ou fotos casuais",
    "Óculos escuros ou bonés",
    "Fundos bagunçados ou coloridos",
    "Fotos em grupo cortadas",
    "Imagens pixeladas ou borradas"
];

const resumeDonts = [
    "Informações pessoais desnecessárias",
    "Erros de ortografia ou gramática",
    "Experiências muito antigas (>10 anos)",
    "Mentiras ou exageros",
    "Formato confuso ou desorganizado"
];

const TipCard = ({ icon: Icon, title, tips, color }: {
    icon: any;
    title: string;
    tips: string[];
    color: string;
}) => (
    <div className="bg-theme-surface/90 rounded-2xl p-8 backdrop-blur-sm border border-theme hover:shadow-lg transition-all duration-300">
        <div className={`w-16 h-16 ${color} rounded-2xl flex items-center justify-center mb-6`}>
            <Icon className="w-8 h-8 text-white" />
        </div>

        <h3 className="text-2xl font-bold text-theme-primary mb-6">
            {title}
        </h3>

        <ul className="space-y-4">
            {tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-theme-secondary leading-relaxed">
                        {tip}
                    </span>
                </li>
            ))}
        </ul>
    </div>
);

const DontCard = ({ title, donts }: { title: string; donts: string[] }) => (
    <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-8 border border-red-200 dark:border-red-800 hover:shadow-lg transition-all duration-300">
        <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-white" />
        </div>

        <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-6">
            {title}
        </h3>

        <ul className="space-y-4">
            {donts.map((dont, index) => (
                <li key={index} className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-red-700 dark:text-red-300 leading-relaxed">
                        {dont}
                    </span>
                </li>
            ))}
        </ul>
    </div>
);

export const Tutorial = () => {
    const navigate = useNavigate();

    return (
        <section className="py-20 bg-theme-base min-h-screen">
            <div className="max-w-7xl mx-auto px-6">

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16 pt-20"
                >
                    <h1 className="text-5xl font-bold text-theme-primary mb-6">
                        Dicas de CV
                        <span className="block text-primary">para o Mercado</span>
                    </h1>
                    <p className="text-xl text-theme-secondary max-w-3xl mx-auto leading-relaxed">
                        Melhore seu currículo com técnicas práticas e sugestões animadas que mostram o que importa para recrutadores.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="grid lg:grid-cols-3 gap-8 mb-16"
                >
                    <TipCard
                        icon={Camera}
                        title="Foto Profissional"
                        tips={photoTips}
                        color="bg-gradient-to-r from-blue-500 to-cyan-500"
                    />

                    <TipCard
                        icon={FileText}
                        title="Conteúdo do Currículo"
                        tips={resumeTips}
                        color="bg-gradient-to-r from-violet-500 to-purple-500"
                    />

                    <TipCard
                        icon={Star}
                        title="Design & Layout"
                        tips={designTips}
                        color="bg-gradient-to-r from-emerald-500 to-teal-500"
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="mb-16"
                >
                    <h3 className="text-3xl font-bold text-center text-theme-primary mb-12">
                        O que <span className="text-red-500">Evitar</span>
                    </h3>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <DontCard title="Foto Profissional" donts={photoDonts} />
                        <DontCard title="Conteúdo" donts={resumeDonts} />
                        <DontCard
                            title="Design"
                            donts={[
                                "Fontes muito decorativas",
                                "Excesso de cores e elementos",
                                "Falta de organização visual",
                                "Informações sobrepostas"
                            ]}
                        />
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="rounded-3xl p-8 text-center text-white"
                    style={{ background: `linear-gradient(to right, var(--color-primary), var(--color-secondary))` }}
                >
                    <h3 className="text-2xl font-bold mb-4">Pronto para aplicar as dicas?</h3>
                    <p className="text-white/90 mb-6 text-lg">Gere seu CV com cores personalizadas e preview fiel antes de baixar.</p>
                    <button
                        onClick={() => navigate('/criar-cv')}
                        className="bg-theme-inverted text-theme-base px-8 py-4 rounded-full font-semibold hover:bg-theme-inverted/90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                        Criar meu CV
                    </button>
                </motion.div>
            </div>
        </section>
    );
};
