'use client';

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLogin } from '@/api';

// Schema de validación
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Verificar si hay un error en los parámetros de la URL
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const onSubmit = async (data: LoginFormData) => {
    setError('');

    try {
      const result = await login(data);
      // Usar el hook de autenticación
      authLogin(result.jwt, result.user);
      router.push('/'); // Redirigir al home
    } catch (err) {
      setError('Error de conexión');
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-white">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Accede a tu cuenta
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg shadow-xl p-8 border border-white/20">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-white">
                Email
              </label>
              <input
                {...register('identifier')}
                type="email"
                id="identifier"
                className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="tu@email.com"
              />
              {errors.identifier && (
                <p className="mt-1 text-sm text-red-400">{errors.identifier.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white">
                Contraseña
              </label>
              <input
                {...register('password')}
                type="password"
                id="password"
                className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-md p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>



          <div className="mt-6 text-center">
            <p className="text-sm text-gray-300">
              ¿No tienes una cuenta?{' '}
              <a href="/register" className="font-medium text-blue-400 hover:text-blue-300">
                Regístrate aquí
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold text-white">
              Cargando...
            </h2>
          </div>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
} 