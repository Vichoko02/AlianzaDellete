# Backend - Alianza E-commerce

Backend API construido con NestJS, Firebase y Stripe.

## Requisitos

- Node.js 18+
- Firebase Project con Authentication y Firestore habilitados
- Cuenta de Stripe (para pagos)

## Configuración

1. Copia el archivo de variables de entorno:
```bash
cp .env.example .env
```

2. Configura las variables en `.env`:
```env
# Firebase
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_PRIVATE_KEY=tu-private-key
FIREBASE_CLIENT_EMAIL=tu-client-email

# JWT
JWT_SECRET=tu-secret-muy-largo-y-seguro
JWT_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# URLs
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174

PORT=3000
```

## Instalación

```bash
cd backend
npm install
```

## Ejecutar

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod
```

## Endpoints Principales

### Autenticación
- `POST /auth/register` - Registro
- `POST /auth/login` - Login
- `POST /auth/google` - Login con Google
- `POST /auth/verify` - Verificar token

### Usuarios
- `GET /users/me` - Mi perfil
- `PUT /users/me/profile` - Actualizar perfil
- `GET /users` - Listar usuarios (Admin)
- `POST /users/enroll` - Enrolar usuario (Admin)

### Productos
- `GET /products` - Listar productos
- `POST /products` - Crear producto (Admin)
- `PUT /products/:id` - Actualizar producto
- `DELETE /products/:id` - Eliminar producto

### Órdenes
- `GET /orders/my-orders` - Mis órdenes
- `GET /orders` - Listar órdenes (Admin)
- `PUT /orders/:id/status` - Actualizar estado

### Pagos (Stripe)
- `POST /payments/create-checkout` - Crear sesión de checkout
- `POST /payments/webhook` - Webhook de Stripe

### Noticias/Wikis
- `GET /news` - Listar noticias
- `POST /news` - Crear noticia (Admin/Jefe)
- `GET /wiki` - Listar wikis
- `POST /wiki` - Crear wiki (Admin/Jefe)

## Roles

| Rol | Permisos |
|-----|----------|
| `user` | Ver contenido, comprar |
| `staff` | Editar wikis asignadas |
| `jefe_proyecto` | Gestionar proyectos, noticias, ver métricas |
| `alianza` | Control total |

## Zonas de Envío

El backend incluye初始化 de zonas de envío para Latinoamérica, España y USA. Para inicializar:
```
POST /logistics/init-zones
```
