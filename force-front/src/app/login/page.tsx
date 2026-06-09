'use client';

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useLogin } from '@/api';

const loginSchema = z.object({
  identifier: z.string().min(1, 'El email es requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginContent() {
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login: authLogin } = useAuth();
  const { login, loading: isLoading } = useLogin();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) setError(decodeURIComponent(errorParam));
  }, [searchParams]);

  const onSubmit = async (data: LoginFormData) => {
    setError('');
    try {
      const result = await login(data);
      authLogin(result.jwt, result.user);
      router.push('/');
    } catch {
      setError('No pudimos iniciar sesión. Revisá tus credenciales.');
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div className="kicker">Bienvenido de vuelta</div>
          <h1 className="cinzel" style={{ fontSize: 38, color: '#F6ECD7', margin: '8px 0 0', letterSpacing: '.03em' }}>Iniciar sesión</h1>
        </div>
        <div className="panel">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="field">
              <label htmlFor="identifier">Email</label>
              <input {...register('identifier')} type="email" id="identifier" placeholder="tu@email.com" />
              {errors.identifier && <p className="form-err">{errors.identifier.message}</p>}
            </div>
            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input {...register('password')} type="password" id="password" placeholder="••••••••" />
              {errors.password && <p className="form-err">{errors.password.message}</p>}
            </div>
            {error && <p className="form-err">{error}</p>}
            <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
              {isLoading ? 'Entrando…' : 'Entrar ✦'}
            </button>
          </form>
          <p className="sub" style={{ textAlign: 'center', fontSize: 14, marginTop: 18 }}>
            ¿No tenés cuenta? <Link href="/register" style={{ color: 'var(--gold-soft)' }}>Registrate</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="page"><div className="state"><div className="spinner" /><p>Cargando…</p></div></div>}>
      <LoginContent />
    </Suspense>
  );
}
