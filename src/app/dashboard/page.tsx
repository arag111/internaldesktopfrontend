'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token) {
      router.replace('/');
      return;
    }

    if (role === 'superadmin') {
      router.replace('/superadmin');
    } else {
      const savedDashboard = localStorage.getItem('dashboardUrl');
      router.replace(savedDashboard || '/');
    }
  }, [router]);

  return null;
}
