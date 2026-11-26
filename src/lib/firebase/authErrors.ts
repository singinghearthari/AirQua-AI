/**
 * Maps Firebase Authentication error codes into clear, human-readable UI messages.
 */
export function getReadableAuthErrorMessage(err: unknown): string {
  const errObj = (typeof err === 'object' && err !== null ? err : {}) as {
    code?: unknown;
    message?: unknown;
  };
  const errorCode = typeof errObj.code === 'string' ? errObj.code : '';
  const defaultMessage = err instanceof Error ? err.message : typeof errObj.message === 'string' ? errObj.message : '';

  if (errorCode.includes('invalid-credential') || errorCode.includes('wrong-password')) {
    return 'Incorrect email or password. Please double-check your credentials.';
  }
  if (errorCode.includes('user-not-found')) {
    return 'No account found with this email. Click "Create Account" to register.';
  }
  if (errorCode.includes('email-already-in-use')) {
    return 'An account already exists with this email. Please switch to "Sign In".';
  }
  if (errorCode.includes('weak-password')) {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (errorCode.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (errorCode.includes('popup-closed-by-user')) {
    return 'Sign in was cancelled. Please try again.';
  }
  if (errorCode.includes('network-request-failed')) {
    return 'Network connection error. Please check your internet connection.';
  }
  return defaultMessage || 'Authentication failed. Please try again.';
}
