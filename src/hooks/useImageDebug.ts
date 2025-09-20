// Hook para debug de imagens durante desenvolvimento
import { useEffect } from 'react';

export function useImageDebug(src?: string, alt?: string) {
    useEffect(() => {
        if (process.env.NODE_ENV === 'development' && src) {
            console.log('🖼️ Image Debug:', {
                src,
                alt,
                isValid: isValidUrl(src),
                timestamp: new Date().toISOString()
            });
        }
    }, [src, alt]);
}

function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}