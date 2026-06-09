# Configuración de Autenticación

## Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# Configuración de Strapi
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
```

## Configuración en Strapi

### 1. Configurar autenticación local

En tu backend de Strapi, asegúrate de que la autenticación local esté habilitada:

1. Ve a **Settings > Users & Permissions Plugin > Roles**
2. Selecciona el rol **Authenticated**
3. Asegúrate de que los permisos necesarios estén habilitados



### 3. Configurar CORS

En tu archivo `config/middlewares.js` de Strapi, asegúrate de que CORS esté configurado correctamente:

```javascript
module.exports = [
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'https:'],
          'media-src': ["'self'", 'data:', 'blob:', 'https:'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      origin: ['http://localhost:3000'], // URL de tu frontend
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
```

## Uso

### Login con Email/Contraseña

La aplicación ya está configurada para usar la autenticación local de Strapi. Los usuarios pueden registrarse e iniciar sesión usando su email y contraseña.



## Servicios de API

- `authService.login()` - Login con email/contraseña
- `authService.register()` - Registro de usuario
- `authService.getMe()` - Obtener información del usuario
- `authService.logout()` - Logout

## Hooks de API

- `useLogin()` - Hook para login
- `useRegister()` - Hook para registro
- `useGetMe()` - Hook para obtener información del usuario

## Componentes

- `src/app/login/page.tsx` - Página de login
- `src/app/register/page.tsx` - Página de registro
- `src/components/Navigation.tsx` - Navegación con estado de autenticación
- `src/hooks/useAuth.ts` - Hook para manejar el estado de autenticación

## Estructura de API

- `src/api/types.ts` - Tipos de autenticación
- `src/api/services.ts` - Servicios de autenticación
- `src/api/hooks.ts` - Hooks de autenticación

## Funcionalidades

- ✅ Login con email/contraseña
- ✅ Registro de usuarios
- ✅ Manejo de estado de autenticación
- ✅ Navegación dinámica según el estado de autenticación
- ✅ Logout
- ✅ Validación de formularios
- ✅ Manejo de errores
- ✅ UI responsive y moderna 