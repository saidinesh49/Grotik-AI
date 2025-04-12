import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, onAuthStateChanged, type User } from 'firebase/auth';
import { writable } from 'svelte/store';

// Your Firebase configuration
// Replace these with your actual Firebase config values
const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};

// Initialize Firebase
let app;
try {
    app = initializeApp(firebaseConfig);
} catch (error: any) {
    if (error.code !== 'app/duplicate-app') {
        console.error('Firebase initialization error:', error);
        throw error;
    }
}

// Initialize Firebase Authentication
const auth = getAuth(app);

// Initialize providers
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

const facebookProvider = new FacebookAuthProvider();
facebookProvider.setCustomParameters({
    display: 'popup'
});

// Create a user store
export const user = writable<User | null>(null);

// Subscribe to auth state changes
onAuthStateChanged(auth, (firebaseUser) => {
    user.set(firebaseUser);
});

export { auth, googleProvider, facebookProvider }; 