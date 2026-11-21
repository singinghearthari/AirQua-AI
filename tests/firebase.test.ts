import { describe, it, expect } from 'vitest';
import { isFirebaseConfigured, firebaseConfig } from '@/lib/firebase/client';

describe('Firebase Client Setup', () => {
  it('detects Firebase configuration when credentials are provided in env', () => {
    expect(firebaseConfig).toBeDefined();
    if (firebaseConfig.apiKey) {
      expect(firebaseConfig.projectId).toBe('airqua-ai');
      expect(firebaseConfig.authDomain).toBe('airqua-ai.firebaseapp.com');
      expect(isFirebaseConfigured()).toBe(true);
    } else {
      expect(isFirebaseConfigured()).toBe(false);
    }
  });
});
