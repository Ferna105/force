'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="page">
        <div className="state"><div className="spinner" /><p>Cargando…</p></div>
      </div>
    );
  }

  if (!user) {
    return (
      fallback || (
        <div className="page">
          <div className="state"><div className="spinner" /><p>Redirigiendo al inicio de sesión…</p></div>
        </div>
      )
    );
  }

  return <>{children}</>;
}
