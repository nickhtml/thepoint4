import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(configPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

const app = initializeApp({
  credential: applicationDefault(),
  projectId: firebaseConfig.projectId,
});

export const dbAdmin = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const authAdmin = getAuth(app);
