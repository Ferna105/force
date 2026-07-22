'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRegister } from '@/api';

const registerSchema = z.object({
  username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { register: registerUser, loading: isLoading } = useRegister();

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError('');
    try {
      await registerUser({ username: data.username, email: data.email, password: data.password });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError('No pudimos crear la cuenta. Probá de nuevo.');
    }
  };

  if (success) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="panel" style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--verdant)', fontSize: 56, marginBottom: 8 }}>✓</div>
            <h2 className="cinzel" style={{ fontSize: 28, color: '#F6ECD7', marginBottom: 12 }}>¡Cuenta creada!</h2>
            <p className="sub" style={{ marginBottom: 18 }}>Te llevamos al inicio de sesión…</p>
            <Link href="/login" className="btn btn-primary" style={{ justifyContent: 'center' }}>Ir al login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div className="kicker">Sumate al universo</div>
          <h1 className="cinzel" style={{ fontSize: 'clamp(28px,7vw,38px)', color: '#F6ECD7', margin: '8px 0 0', letterSpacing: '.03em' }}>Crear cuenta</h1>
        </div>
        <div className="panel">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="field">
              <label htmlFor="username">Nombre de domador</label>
              <input {...register('username')} type="text" id="username" placeholder="tu_usuario" />
              {errors.username && <p className="form-err">{errors.username.message}</p>}
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input {...register('email')} type="email" id="email" placeholder="tu@email.com" />
              {errors.email && <p className="form-err">{errors.email.message}</p>}
            </div>
            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input {...register('password')} type="password" id="password" placeholder="••••••••" />
              {errors.password && <p className="form-err">{errors.password.message}</p>}
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">Confirmar contraseña</label>
              <input {...register('confirmPassword')} type="password" id="confirmPassword" placeholder="••••••••" />
              {errors.confirmPassword && <p className="form-err">{errors.confirmPassword.message}</p>}
            </div>
            {error && <p className="form-err">{error}</p>}
            <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
              {isLoading ? 'Creando…' : 'Crear cuenta ✦'}
            </button>
          </form>
          <p className="sub" style={{ textAlign: 'center', fontSize: 14, marginTop: 18 }}>
            ¿Ya tenés cuenta? <Link href="/login" style={{ color: 'var(--gold-soft)' }}>Iniciá sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
