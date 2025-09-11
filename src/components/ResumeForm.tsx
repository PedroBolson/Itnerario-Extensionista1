import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, User, Briefcase, GraduationCap, Award, Upload, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ResumePreview } from './ResumePreview';

interface FormData {
    personalInfo: {
        name: string;
        email: string;
        phone: string;
        location: string;
        photo?: File;
        summary: string;
    };
    experience: Array<{
        company: string;
        position: string;
        startDate: string;
        endDate: string;
        current: boolean;
        description: string;
    }>;
    education: Array<{
        institution: string;
        degree: string;
        field: string;
        startDate: string;
        endDate: string;
        current: boolean;
    }>;
    skills: string[];
    achievements: string[];
}

export const ResumeForm = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState<FormData>({
        personalInfo: {
            name: '',
            email: '',
            phone: '',
            location: '',
            summary: ''
        },
        experience: [{ company: '', position: '', startDate: '', endDate: '', current: false, description: '' }],
        education: [{ institution: '', degree: '', field: '', startDate: '', endDate: '', current: false }],
        skills: [],
        achievements: []
    });

    const [themeColors, setThemeColors] = useState({ primary: '#7c3aed', accent: '#06b6d4', headerText: '#ffffff' });
    const previewRef = useRef<HTMLDivElement>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        const node = viewportRef.current;
        if (!node) return;
        const compute = () => {
            const w = node.clientWidth - 16;
            const s = Math.min(1, Math.max(0.3, w / 794));
            setScale(s);
        };
        compute();
        const ro = new ResizeObserver(compute);
        ro.observe(node);
        return () => ro.disconnect();
    }, []);

    const generatePDF = async () => {
        const target = printRef.current || previewRef.current;
        if (!target) return;
        const canvas = await html2canvas(target, { scale: 2, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'pt', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
        pdf.save(`${formData.personalInfo.name || 'cv'}-preview.pdf`);
    };

    const steps = [
        { icon: User, title: 'Informações Pessoais', description: 'Dados básicos e foto' },
        { icon: Briefcase, title: 'Experiência', description: 'Histórico profissional' },
        { icon: GraduationCap, title: 'Educação', description: 'Formação acadêmica' },
        { icon: Award, title: 'Habilidades', description: 'Competências e conquistas' }
    ];

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({
                ...formData,
                personalInfo: { ...formData.personalInfo, photo: file }
            });
            const url = URL.createObjectURL(file);
            setPhotoUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return url;
            });
        }
    };

    return (
        <section className="py-20 relative overflow-hidden bg-theme-base">

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                {/* Progress Steps */}
                <div className="mb-12 pt-16">
                    <div className="flex items-center justify-between mb-8">
                        {steps.map((step, index) => (
                            <div key={index} className="flex flex-col items-center flex-1">
                                <motion.div
                                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${index <= currentStep
                                        ? 'border-theme text-theme-inverted'
                                        : 'border-theme-muted text-theme-muted'
                                        }`}
                                    style={{
                                        backgroundColor: index <= currentStep ? 'var(--color-primary)' : 'transparent'
                                    }}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <step.icon className="w-5 h-5" />
                                </motion.div>
                                {index < steps.length - 1 && (
                                    <div
                                        className={`h-0.5 w-full mt-6 transition-colors ${index < currentStep ? '' : 'bg-theme-base'
                                            }`}
                                        style={index < currentStep ? { backgroundColor: 'var(--color-primary)' } : {}}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="text-center">
                        <h3 className="text-2xl font-bold text-theme-primary mb-2">
                            {steps[currentStep].title}
                        </h3>
                        <p className="text-theme-secondary">
                            {steps[currentStep].description}
                        </p>
                    </div>
                </div>

                {/* Form Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="bg-theme-surface/90 rounded-2xl p-8 backdrop-blur-sm border border-theme min-h-96"
                    >
                        {/* Step 0: Personal Info */}
                        {currentStep === 0 && (
                            <div className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-theme-secondary mb-2">
                                            Nome Completo
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                            value={formData.personalInfo.name}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                personalInfo: { ...formData.personalInfo, name: e.target.value }
                                            })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-theme-secondary mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                            value={formData.personalInfo.email}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                personalInfo: { ...formData.personalInfo, email: e.target.value }
                                            })}
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-theme-secondary mb-2">
                                            Telefone
                                        </label>
                                        <input
                                            type="tel"
                                            className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                            value={formData.personalInfo.phone}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                personalInfo: { ...formData.personalInfo, phone: e.target.value }
                                            })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-theme-secondary mb-2">
                                            Localização
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Cidade, Estado"
                                            className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                            value={formData.personalInfo.location}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                personalInfo: { ...formData.personalInfo, location: e.target.value }
                                            })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                                        Foto Profissional
                                    </label>
                                    <div className="border-2 border-dashed border-theme rounded-lg p-6 text-center hover:border-opacity-80 transition-colors cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            id="photo-upload"
                                        />
                                        <label htmlFor="photo-upload" className="cursor-pointer">
                                            <Upload className="w-8 h-8 text-theme-muted mx-auto mb-2" />
                                            <p className="text-theme-muted">
                                                {formData.personalInfo.photo
                                                    ? `Arquivo: ${formData.personalInfo.photo.name}`
                                                    : 'Clique para fazer upload da sua foto'
                                                }
                                            </p>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                                        Resumo Profissional
                                    </label>
                                    <textarea
                                        rows={4}
                                        placeholder="Descreva brevemente sua experiência e objetivos profissionais..."
                                        className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary resize-none"
                                        value={formData.personalInfo.summary}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            personalInfo: { ...formData.personalInfo, summary: e.target.value }
                                        })}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 1: Experiência */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <h3 className="text-2xl font-bold text-theme-primary mb-6">
                                    Experiência Profissional
                                </h3>

                                {formData.experience.map((exp, index) => (
                                    <div key={index} className="bg-theme-surface/50 p-6 rounded-lg border border-theme">
                                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">
                                                    Empresa
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                    value={exp.company}
                                                    onChange={(e) => {
                                                        const newExperience = [...formData.experience];
                                                        newExperience[index].company = e.target.value;
                                                        setFormData({ ...formData, experience: newExperience });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">
                                                    Cargo
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                    value={exp.position}
                                                    onChange={(e) => {
                                                        const newExperience = [...formData.experience];
                                                        newExperience[index].position = e.target.value;
                                                        setFormData({ ...formData, experience: newExperience });
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">
                                                    Data de Início
                                                </label>
                                                <input
                                                    type="month"
                                                    className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                    value={exp.startDate}
                                                    onChange={(e) => {
                                                        const newExperience = [...formData.experience];
                                                        newExperience[index].startDate = e.target.value;
                                                        setFormData({ ...formData, experience: newExperience });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">
                                                    Data de Fim
                                                </label>
                                                <input
                                                    type="month"
                                                    className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                    value={exp.endDate}
                                                    disabled={exp.current}
                                                    onChange={(e) => {
                                                        const newExperience = [...formData.experience];
                                                        newExperience[index].endDate = e.target.value;
                                                        setFormData({ ...formData, experience: newExperience });
                                                    }}
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-theme"
                                                        checked={exp.current}
                                                        onChange={(e) => {
                                                            const newExperience = [...formData.experience];
                                                            newExperience[index].current = e.target.checked;
                                                            if (e.target.checked) {
                                                                newExperience[index].endDate = '';
                                                            }
                                                            setFormData({ ...formData, experience: newExperience });
                                                        }}
                                                    />
                                                    <span className="text-sm text-theme-secondary">Trabalho atual</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-theme-secondary mb-2">
                                                Descrição
                                            </label>
                                            <textarea
                                                rows={3}
                                                className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary resize-none"
                                                value={exp.description}
                                                onChange={(e) => {
                                                    const newExperience = [...formData.experience];
                                                    newExperience[index].description = e.target.value;
                                                    setFormData({ ...formData, experience: newExperience });
                                                }}
                                            />
                                        </div>

                                        <button
                                            onClick={() => {
                                                const newExperience = formData.experience.filter((_, i) => i !== index);
                                                setFormData({ ...formData, experience: newExperience });
                                            }}
                                            className="mt-4 text-red-500 hover:text-red-700 text-sm"
                                        >
                                            Remover experiência
                                        </button>
                                    </div>
                                ))}

                                <button
                                    onClick={() => {
                                        const newExperience = [...formData.experience, {
                                            company: '',
                                            position: '',
                                            startDate: '',
                                            endDate: '',
                                            current: false,
                                            description: ''
                                        }];
                                        setFormData({ ...formData, experience: newExperience });
                                    }}
                                    className="w-full py-3 border-2 border-dashed border-theme rounded-lg text-theme-secondary hover:bg-theme-surface/50 transition-colors"
                                >
                                    + Adicionar Experiência
                                </button>
                            </div>
                        )}

                        {/* Step 2: Educação */}
                        {currentStep === 2 && (
                            <div className="space-y-6">
                                <h3 className="text-2xl font-bold text-theme-primary mb-6">
                                    Educação
                                </h3>

                                {formData.education.map((edu, index) => (
                                    <div key={index} className="bg-theme-surface/50 p-6 rounded-lg border border-theme">
                                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">
                                                    Instituição
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                    value={edu.institution}
                                                    onChange={(e) => {
                                                        const newEducation = [...formData.education];
                                                        newEducation[index].institution = e.target.value;
                                                        setFormData({ ...formData, education: newEducation });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">
                                                    Curso/Diploma
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                    value={edu.degree}
                                                    onChange={(e) => {
                                                        const newEducation = [...formData.education];
                                                        newEducation[index].degree = e.target.value;
                                                        setFormData({ ...formData, education: newEducation });
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-theme-secondary mb-2">
                                                Área de Estudo
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                value={edu.field}
                                                onChange={(e) => {
                                                    const newEducation = [...formData.education];
                                                    newEducation[index].field = e.target.value;
                                                    setFormData({ ...formData, education: newEducation });
                                                }}
                                            />
                                        </div>

                                        <div className="grid md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">
                                                    Data de Início
                                                </label>
                                                <input
                                                    type="month"
                                                    className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                    value={edu.startDate}
                                                    onChange={(e) => {
                                                        const newEducation = [...formData.education];
                                                        newEducation[index].startDate = e.target.value;
                                                        setFormData({ ...formData, education: newEducation });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">
                                                    Data de Conclusão
                                                </label>
                                                <input
                                                    type="month"
                                                    className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                    value={edu.endDate}
                                                    disabled={edu.current}
                                                    onChange={(e) => {
                                                        const newEducation = [...formData.education];
                                                        newEducation[index].endDate = e.target.value;
                                                        setFormData({ ...formData, education: newEducation });
                                                    }}
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-theme"
                                                        checked={edu.current}
                                                        onChange={(e) => {
                                                            const newEducation = [...formData.education];
                                                            newEducation[index].current = e.target.checked;
                                                            if (e.target.checked) {
                                                                newEducation[index].endDate = '';
                                                            }
                                                            setFormData({ ...formData, education: newEducation });
                                                        }}
                                                    />
                                                    <span className="text-sm text-theme-secondary">Em andamento</span>
                                                </label>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                const newEducation = formData.education.filter((_, i) => i !== index);
                                                setFormData({ ...formData, education: newEducation });
                                            }}
                                            className="mt-4 text-red-500 hover:text-red-700 text-sm"
                                        >
                                            Remover formação
                                        </button>
                                    </div>
                                ))}

                                <button
                                    onClick={() => {
                                        const newEducation = [...formData.education, {
                                            institution: '',
                                            degree: '',
                                            field: '',
                                            startDate: '',
                                            endDate: '',
                                            current: false
                                        }];
                                        setFormData({ ...formData, education: newEducation });
                                    }}
                                    className="w-full py-3 border-2 border-dashed border-theme rounded-lg text-theme-secondary hover:bg-theme-surface/50 transition-colors"
                                >
                                    + Adicionar Formação
                                </button>
                            </div>
                        )}

                        {/* Additional steps would be implemented here */}
                        {currentStep === 3 && (
                            <div className="py-6">
                                <div className="grid gap-8 lg:grid-cols-[320px_1fr] items-start">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-theme-secondary mb-2">Cor primária</label>
                                            <input type="color" value={themeColors.primary} onChange={(e) => setThemeColors({ ...themeColors, primary: e.target.value })} className="h-10 w-20 p-0 bg-transparent border border-theme rounded" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-theme-secondary mb-2">Cor de destaque</label>
                                            <input type="color" value={themeColors.accent} onChange={(e) => setThemeColors({ ...themeColors, accent: e.target.value })} className="h-10 w-20 p-0 bg-transparent border border-theme rounded" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-theme-secondary mb-2">Cor do texto do cabeçalho</label>
                                            <input type="color" value={themeColors.headerText} onChange={(e) => setThemeColors({ ...themeColors, headerText: e.target.value })} className="h-10 w-20 p-0 bg-transparent border border-theme rounded" />
                                        </div>
                                        <p className="text-sm text-theme-muted">Pré-visualize as cores antes de baixar o PDF.</p>
                                        <button onClick={generatePDF} className="btn-primary px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2">
                                            <Download className="w-4 h-4" /> Baixar PDF
                                        </button>
                                    </div>
                                    <div className="bg-white rounded-xl border border-theme overflow-hidden">
                                        <div className="bg-theme-surface px-4 py-2 text-sm text-theme-secondary border-b border-theme">Pré-visualização</div>
                                        <div ref={viewportRef} className="overflow-auto p-2 relative">
                                            <div style={{ width: 794 * scale, height: 1123 * scale, position: 'relative' }}>
                                                <div style={{ position: 'absolute', top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                                                    <ResumePreview
                                                        ref={previewRef}
                                                        data={{
                                                            personalInfo: {
                                                                name: formData.personalInfo.name,
                                                                email: formData.personalInfo.email,
                                                                phone: formData.personalInfo.phone,
                                                                location: formData.personalInfo.location,
                                                                summary: formData.personalInfo.summary,
                                                            },
                                                            experience: formData.experience,
                                                            education: formData.education,
                                                            skills: formData.skills,
                                                        }}
                                                        colors={themeColors}
                                                        photoSrc={photoUrl}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ position: 'absolute', left: -10000, top: 0 }}>
                                                <ResumePreview
                                                    ref={printRef}
                                                    data={{
                                                        personalInfo: {
                                                            name: formData.personalInfo.name,
                                                            email: formData.personalInfo.email,
                                                            phone: formData.personalInfo.phone,
                                                            location: formData.personalInfo.location,
                                                            summary: formData.personalInfo.summary,
                                                        },
                                                        experience: formData.experience,
                                                        education: formData.education,
                                                        skills: formData.skills,
                                                    }}
                                                    colors={themeColors}
                                                    photoSrc={photoUrl}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex justify-between mt-8">
                    <button
                        onClick={prevStep}
                        disabled={currentStep === 0}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold ${currentStep === 0
                            ? 'bg-theme-muted/20 text-theme-muted cursor-not-allowed'
                            : 'bg-theme-surface text-theme-primary border border-theme hover:bg-theme-surface/80'
                            } transition-all duration-300`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Anterior
                    </button>

                    <button
                        onClick={nextStep}
                        disabled={currentStep === steps.length - 1}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold ${currentStep === steps.length - 1
                            ? 'bg-theme-muted/20 text-theme-muted cursor-not-allowed'
                            : 'btn-primary hover:shadow-lg'
                            } transition-all duration-300`}
                    >
                        Próximo
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </section>
    );
};
