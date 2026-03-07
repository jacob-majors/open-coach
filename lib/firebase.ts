// Firebase client SDK — client-side only
// This module must only be used in client components or event handlers.

let _app: import("firebase/app").FirebaseApp | null = null;
let _auth: import("firebase/auth").Auth | null = null;
let _provider: import("firebase/auth").GoogleAuthProvider | null = null;

function isConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "placeholder"
  );
}

async function getFirebaseApp() {
  if (_app) return _app;
  const { initializeApp, getApps } = await import("firebase/app");
  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }
  _app = initializeApp({
    apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  return _app;
}

async function getFirebaseAuth() {
  if (_auth) return _auth;
  const app = await getFirebaseApp();
  const { getAuth } = await import("firebase/auth");
  _auth = getAuth(app);
  return _auth;
}

async function getProvider() {
  if (_provider) return _provider;
  const { GoogleAuthProvider } = await import("firebase/auth");
  _provider = new GoogleAuthProvider();
  return _provider;
}

export async function signInWithGoogle() {
  if (!isConfigured()) {
    throw new Error("Firebase is not configured — add NEXT_PUBLIC_FIREBASE_API_KEY to .env.local");
  }
  const { signInWithPopup } = await import("firebase/auth");
  const [firebaseAuth, provider] = await Promise.all([getFirebaseAuth(), getProvider()]);
  const result = await signInWithPopup(firebaseAuth, provider);
  const idToken = await result.user.getIdToken();
  return { user: result.user, idToken };
}

export async function signOutFirebase() {
  if (!isConfigured()) return;
  const { signOut } = await import("firebase/auth");
  const firebaseAuth = await getFirebaseAuth();
  await signOut(firebaseAuth);
}

// For the sidebar auth state listener — returns unsubscribe fn
export async function onAuthStateChange(
  callback: (user: import("firebase/auth").User | null) => void
) {
  if (!isConfigured()) {
    callback(null);
    return () => {};
  }
  const { onAuthStateChanged } = await import("firebase/auth");
  const firebaseAuth = await getFirebaseAuth();
  return onAuthStateChanged(firebaseAuth, callback);
}
