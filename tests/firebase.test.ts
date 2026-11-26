import { describe, it, expect } from 'vitest';
import * as firebaseClient from '@/lib/firebase/client';

const { isFirebaseConfigured, firebaseConfig } = firebaseClient;

describe('Firebase Client Setup', () => {
  it('detects Firebase configuration when credentials are provided in env', () => {
    expect(firebaseConfig).toBeDefined();
    expect('analytics' in firebaseClient).toBe(false);
    if (firebaseConfig.apiKey) {
      expect(firebaseConfig.projectId).toBe('airqua-ai');
      expect(firebaseConfig.authDomain).toBe('airqua-ai.firebaseapp.com');
      expect(isFirebaseConfigured()).toBe(true);
    } else {
      expect(isFirebaseConfigured()).toBe(false);
    }
  });
});
