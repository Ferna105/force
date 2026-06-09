import axios from 'axios';

// Configuración base del cliente API
const API_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

// Crear instancia de axios con configuración base
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Endpoints de autenticación: nunca deben llevar un Bearer del localStorage
// (un token viejo/expirado haría que Strapi rechace el login con 401).
const AUTH_ENDPOINTS = ['/auth/local', '/auth/local/register'];

// Interceptor para requests: adjunta el JWT del localStorage si existe,
// salvo que la llamada ya traiga su propio header Authorization o sea un
// endpoint de autenticación (login/register).
apiClient.interceptors.request.use(
  (config) => {
    const isAuthEndpoint = AUTH_ENDPOINTS.some((path) =>
      (config.url ?? '').startsWith(path)
    );
    if (
      typeof window !== 'undefined' &&
      !config.headers?.Authorization &&
      !isAuthEndpoint
    ) {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para responses
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Manejo de errores global
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default apiClient; 