import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';

export const firebaseConfig = {
  apiKey: "AIzaSyCDaISJPPkq8FkbxQP_VrWShTAzgicgUz8",
  authDomain: "team-aura-6d1ba.firebaseapp.com",
  databaseURL: "https://team-aura-6d1ba-default-rtdb.firebaseio.com",
  projectId: "team-aura-6d1ba",
  storageBucket: "team-aura-6d1ba.firebasestorage.app",
  messagingSenderId: "96576915579",
  appId: "1:96576915579:web:9f3df5ca7da1c4e84ebade",
  measurementId: "G-NMFSJGFZZW"
};

let app;
let db: Database;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getDatabase(app);
} catch (error) {
  console.warn("Firebase initialization warning:", error);
}

export { app, db };
