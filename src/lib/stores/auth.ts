import { writable, derived } from 'svelte/store';
import type { User } from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from '$lib/config/firebase';
import {
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from 'firebase/auth';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { toast } from 'svelte-sonner';

interface UserStore {
    user: User | null;
    loading: boolean;
    googleLoading: boolean;
    facebookLoading: boolean;
    error: string | null;
}

// Create a custom Svelte store for managing user state
const createUserStore = () => {
    const { subscribe, set, update } = writable<UserStore>({
        user: null,
        loading: true,
        googleLoading: false,
        facebookLoading: false,
        error: null
    });

    return {
        subscribe,
        setUser: (user: User | null) => {
            update((state) => ({ ...state, user, loading: false, error: null }));
            if (browser) {
                if (user) {
                    if (window.location.pathname === '/signin' || window.location.pathname === '/signup') {
                        goto('/dashboard'); // Redirect authenticated users trying to access signin/signup
                    }
                } else {
                    goto('/signin'); // Redirect unauthenticated users to signin
                }
            }
        },
        setError: (error: string) =>
            update((state) => ({
                ...state,
                error,
                loading: false,
                googleLoading: false,
                facebookLoading: false
            })),
        setLoading: (loading: boolean) => update((state) => ({ ...state, loading })),
        setGoogleLoading: (loading: boolean) =>
            update((state) => ({ ...state, googleLoading: loading })),
        setFacebookLoading: (loading: boolean) =>
            update((state) => ({ ...state, facebookLoading: loading })),
        signOut: async () => {
            try {
                await firebaseSignOut(auth);
                set({
                    user: null,
                    loading: false,
                    googleLoading: false,
                    facebookLoading: false,
                    error: null
                });
                if (browser) {
                    goto('/signin');
                    toast.success('Signed out successfully');
                }
            } catch (error) {
                toast.error('Failed to sign out');
            }
        }
    };
};

export const userStore = createUserStore();

// Derived store for authentication state
export const isAuthenticated = derived(
    userStore,
    ($userStore) => !!$userStore.user
);

// Helper function to handle auth provider sign-in
async function handleProviderSignIn(
    provider: typeof googleProvider | typeof facebookProvider,
    isGoogle: boolean
) {
    const store = userStore;
    try {
        if (isGoogle) {
            store.setGoogleLoading(true);
        } else {
            store.setFacebookLoading(true);
        }
        const result = await signInWithPopup(auth, provider);
        store.setUser(result.user);
        toast.success('Signed in successfully');
        return { success: true };
    } catch (error: any) {
        store.setError(error.message);
        toast.error('Failed to sign in', {
            description: error.message
        });
        return { success: false };
    }
}

export const signInWithGoogle = () => handleProviderSignIn(googleProvider, true);
export const signInWithFacebook = () => handleProviderSignIn(facebookProvider, false);

// Subscribe to auth state changes and update the store
onAuthStateChanged(auth, (firebaseUser) => {
    userStore.setUser(firebaseUser);
});
