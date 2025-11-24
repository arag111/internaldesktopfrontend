'use client';
import { useEffect } from 'react';
import '../lib/axiosInterceptor';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Axios interceptor is imported above and will be active
    console.log('[Auth] Axios interceptor initialized');
  }, []);

  return <>{children}</>;
}
