'use client';
import { useSyncExternalStore } from 'react';
function subscribe(callback: () => void) { window.addEventListener('themechange', callback); return () => window.removeEventListener('themechange', callback); }
const snapshot = () => document.documentElement.dataset.theme ?? 'system';
const serverSnapshot = () => 'system';
export function useTheme() { return useSyncExternalStore(subscribe, snapshot, serverSnapshot); }
export default function ThemeToggle() {
    const theme = useTheme();
    function cycle() {
        const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
        if (next === 'system')
            delete document.documentElement.dataset.theme;
        else
            document.documentElement.dataset.theme = next;
        try {
            localStorage.setItem('github-city-theme', next);
        }
        catch { /* Storage can be disabled. */ }
        window.dispatchEvent(new Event('themechange'));
    }
    return <button className="theme-toggle" onClick={cycle} aria-label={'Color theme: ' + theme + '. Change theme.'}>{theme === 'system' ? '◐' : theme === 'light' ? '☀' : '☾'}<span>{theme.charAt(0).toUpperCase() + theme.slice(1)}</span></button>;
}
