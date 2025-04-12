import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark' | 'system';

function getSystemTheme(): Theme {
    if (!browser) return 'system';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme(): Theme {
    if (!browser) return 'system';
    return (localStorage.getItem('theme') as Theme) || 'system';
}

function createThemeStore() {
    const { subscribe, set } = writable<Theme>(getInitialTheme());

    return {
        subscribe,
        setTheme: (newTheme: Theme) => {
            if (!browser) return;
            
            const root = document.documentElement;
            const systemTheme = getSystemTheme();
            const effectiveTheme = newTheme === 'system' ? systemTheme : newTheme;
            
            root.classList.remove('light', 'dark');
            root.classList.add(effectiveTheme);
            
            localStorage.setItem('theme', newTheme);
            set(newTheme);
        },
        initialize: () => {
            if (!browser) return;
            
            const savedTheme = getInitialTheme();
            const systemTheme = getSystemTheme();
            const effectiveTheme = savedTheme === 'system' ? systemTheme : savedTheme;
            
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(effectiveTheme);
            
            set(savedTheme);

            // Listen for system theme changes
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                const currentTheme = localStorage.getItem('theme') as Theme;
                if (currentTheme === 'system') {
                    document.documentElement.classList.remove('light', 'dark');
                    document.documentElement.classList.add(e.matches ? 'dark' : 'light');
                }
            });
        }
    };
}

export const theme = createThemeStore(); 