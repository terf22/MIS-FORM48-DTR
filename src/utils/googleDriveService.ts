import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Personnel, MonthlyDTR, AuditLog } from '../types';

// Initialize Firebase App safely without re-initializing
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

/**
 * Initialize auth listener and token state
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If logged in via Firebase session but no cached token, request sign in on demand
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google with Google Drive scope
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google sign-in.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.code === 'auth/popup-blocked'
    ) {
      console.info('Google sign-in popup was closed or cancelled.');
      return null;
    }
    console.error('Google Sign-in Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign out user and clear cached token
 */
export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Retrieve cached access token
 */
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

const BACKUP_FILE_NAME = 'CSC_Form48_DTR_Backup.json';

export interface BackupDataPayload {
  version: string;
  savedAt: string;
  savedByEmail?: string;
  personnelList: Personnel[];
  dtrMap: Record<string, MonthlyDTR>;
  auditLogs?: AuditLog[];
}

/**
 * Check if a backup file exists in user's Google Drive
 */
export const checkDriveBackup = async (): Promise<{ exists: boolean; fileId?: string; modifiedTime?: string; size?: string; savedByEmail?: string } | null> => {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const q = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and trashed = false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,size)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Drive API error: ${res.statusText}`);

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      const file = data.files[0];
      return {
        exists: true,
        fileId: file.id,
        modifiedTime: file.modifiedTime,
        size: file.size
      };
    }
    return { exists: false };
  } catch (error) {
    console.error('Check Drive backup failed:', error);
    return null;
  }
};

/**
 * Save / Backup current application DTR data to Google Drive
 */
export const saveToGoogleDrive = async (payload: {
  personnelList: Personnel[];
  dtrMap: Record<string, MonthlyDTR>;
  auditLogs?: AuditLog[];
}): Promise<{ fileId: string; modifiedTime: string }> => {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated with Google. Please sign in first.');

  const existing = await checkDriveBackup();
  const fileContent = JSON.stringify({
    version: '1.0',
    savedAt: new Date().toISOString(),
    savedByEmail: auth.currentUser?.email || 'Unknown User',
    personnelList: payload.personnelList,
    dtrMap: payload.dtrMap,
    auditLogs: payload.auditLogs || []
  } as BackupDataPayload, null, 2);

  if (existing?.exists && existing.fileId) {
    // Update existing file
    const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existing.fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: fileContent
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Failed to update file in Google Drive: ${errText}`);
    }

    const updatedFile = await uploadRes.json();
    return {
      fileId: updatedFile.id,
      modifiedTime: new Date().toISOString()
    };
  } else {
    // Create new file via multipart upload
    const metadata = {
      name: BACKUP_FILE_NAME,
      mimeType: 'application/json',
      description: 'CSC Form 48 DTR System Application Data & Monthly Time Records'
    };

    const boundary = 'foo_bar_baz';
    const multipartBody =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${fileContent}\r\n` +
      `--${boundary}--`;

    const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create backup file in Google Drive: ${errText}`);
    }

    const createdFile = await createRes.json();
    return {
      fileId: createdFile.id,
      modifiedTime: new Date().toISOString()
    };
  }
};

/**
 * Download & Restore DTR data from Google Drive
 */
export const loadFromGoogleDrive = async (): Promise<BackupDataPayload | null> => {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated with Google. Please sign in first.');

  const existing = await checkDriveBackup();
  if (!existing?.exists || !existing.fileId) {
    return null;
  }

  const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${existing.fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!downloadRes.ok) {
    throw new Error(`Failed to download backup from Google Drive: ${downloadRes.statusText}`);
  }

  const data: BackupDataPayload = await downloadRes.json();
  return data;
};
