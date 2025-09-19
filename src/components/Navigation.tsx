import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import InstantTooltip from './InstantTooltip';

export default function Navigation() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const HomeIcon = () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m3 12 2-2m0 0 7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    );

    const BookIcon = () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
    );

    const UserIcon = () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    );

    const AcademicIcon = () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
    );

    const navItems = useMemo(() => [
        { path: '/', icon: HomeIcon, label: 'Início', color: 'bg-blue-500' },
        { path: '/cursos', icon: AcademicIcon, label: 'Mini Cursos', color: 'bg-orange-500' },
        { path: '/tutorial', icon: BookIcon, label: 'Dicas de Currículo', color: 'bg-green-500' },
        { path: '/criar-cv', icon: UserIcon, label: 'Criar Currículo', color: 'bg-purple-500' }
    ], []);

    const handleNavigation = (path: string) => {
        navigate(path);
        setIsMobileMenuOpen(false);
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    return (
        <>
            {/* Desktop Navigation - Vertical Side Nav */}
            <div className="hidden md:block fixed left-0 top-0 h-screen w-20 bg-theme-surface backdrop-blur-md border-r border-theme z-40">
                <div className="flex flex-col items-center justify-center h-full space-y-8 p-4 relative">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <InstantTooltip key={item.path} tooltip={item.label} position="right">
                                <motion.button
                                    onClick={() => handleNavigation(item.path)}
                                    className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 ${isActive
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : 'hover:bg-theme-surface-hover text-theme-secondary hover:text-theme-primary'
                                        }`}
                                    whileHover={{
                                        scale: 1.05,
                                        transition: { type: "spring", stiffness: 400, damping: 25 }
                                    }}
                                    whileTap={{
                                        scale: 0.95,
                                        transition: { type: "spring", stiffness: 400, damping: 25 }
                                    }}
                                >
                                    {/* Indicator de fundo móvel */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="navIndicator"
                                            className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-blue-600/20 border border-blue-500/30"
                                            transition={{
                                                type: "spring",
                                                stiffness: 200,
                                                damping: 15,
                                                mass: 1.2
                                            }}
                                        />
                                    )}

                                    <motion.div
                                        animate={{
                                            scale: isActive ? 1.1 : 1,
                                            rotate: isActive ? [0, 5, -5, 0] : 0
                                        }}
                                        transition={{
                                            scale: { type: "spring", stiffness: 300, damping: 20 },
                                            rotate: { duration: 0.6, ease: "easeInOut" }
                                        }}
                                        className="relative z-10"
                                    >
                                        <Icon />
                                    </motion.div>
                                </motion.button>
                            </InstantTooltip>
                        );
                    })}
                </div>
            </div>

            {/* Mobile Hamburger Button */}
            <motion.button
                onClick={toggleMobileMenu}
                className={`md:hidden fixed top-4 left-4 z-[60] w-12 h-12 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center transition-all duration-300`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                    x: isMobileMenuOpen ? 240 : 0
                }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
                <div className="relative w-6 h-6 flex flex-col items-center justify-center">
                    <motion.span
                        className="block absolute w-5 h-0.5 bg-gray-800 dark:bg-white rounded-full"
                        style={{ top: '8px' }}
                        animate={{
                            rotate: isMobileMenuOpen ? 45 : 0,
                            y: isMobileMenuOpen ? 4 : 0,
                        }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    />
                    <motion.span
                        className="block absolute w-5 h-0.5 bg-gray-800 dark:bg-white rounded-full"
                        style={{ top: '12px' }}
                        animate={{
                            opacity: isMobileMenuOpen ? 0 : 1,
                            scaleX: isMobileMenuOpen ? 0 : 1
                        }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                    />
                    <motion.span
                        className="block absolute w-5 h-0.5 bg-gray-800 dark:bg-white rounded-full"
                        style={{ top: '16px' }}
                        animate={{
                            rotate: isMobileMenuOpen ? -45 : 0,
                            y: isMobileMenuOpen ? -4 : 0,
                        }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    />
                </div>
            </motion.button>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={toggleMobileMenu}
                            className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                        />

                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 30
                            }}
                            className="md:hidden fixed left-0 top-0 h-screen w-80 bg-theme-surface backdrop-blur-md shadow-2xl z-40"
                        >
                            <div className="flex flex-col justify-center h-full space-y-6 p-8">
                                {navItems.map((item, index) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path;

                                    return (
                                        <motion.button
                                            key={item.path}
                                            onClick={() => handleNavigation(item.path)}
                                            className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 ${isActive
                                                ? 'bg-theme-surface-hover shadow-md'
                                                : 'hover:bg-theme-surface-hover'
                                                }`}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            whileHover={{ scale: 1.02, x: 8 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <div className={`w-12 h-12 rounded-lg ${item.color} flex items-center justify-center text-white`}>
                                                <Icon />
                                            </div>
                                            <span className="text-lg font-medium text-theme-primary">
                                                {item.label}
                                            </span>

                                            {isActive && (
                                                <motion.div
                                                    className="ml-auto w-2 h-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500"
                                                    layoutId="activeMobileIndicator"
                                                    transition={{
                                                        type: "spring",
                                                        stiffness: 350,
                                                        damping: 25
                                                    }}
                                                />
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}