import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    // Dev fallback — won't verify tokens but won't crash the server
    console.warn("Firebase Admin not configured — using project ID only");
    return initializeApp({ projectId: projectId || "open-coach-dev" });
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export async function verifyFirebaseToken(idToken: string) {
  try {
    const adminApp = getAdminApp();
    const decoded = await getAuth(adminApp).verifyIdToken(idToken);
    return decoded;
  } catch {
    return null;
  }
}
