# Admin Panel - Alianza E-commerce

Panel de administración para gestionar el e-commerce de Alianza.

## Requisitos

- Node.js 18+
- Backend ejecutándose en `http://localhost:3000`

## Instalación

```bash
cd proyecto-alianza/AdminPanel
npm install
```

## Ejecutar

```bash
npm run dev
```

El admin estará disponible en `http://localhost:5174`

## Estructura

```
src/
├── admin/pages/           # Páginas del admin
│   ├── Dashboard.tsx     # Dashboard principal
│   ├── LoginPage.tsx     # Login
│   ├── ProductsPage.tsx  # Gestión de productos
│   ├── OrdersPage.tsx    # Gestión de órdenes
│   ├── NewsPage.tsx      # Gestión de noticias
│   ├── WikiPage.tsx      # Gestión de wikis
│   ├── UsersPage.tsx     # Gestión de usuarios
│   └── ProjectsPage.tsx  # Gestión de proyectos
├── shared/components/     # Componentes compartidos
│   ├── AdminLayout.tsx   # Layout principal
│   └── AdminSidebar.tsx  # Barra lateral
├── hooks/
│   └── useAuth.tsx       # Hook de autenticación
├── services/
│   └── api.ts            # Cliente API
├── types/
│   └── index.ts          # Tipos TypeScript
└── styles/
    └── admin.css         # Estilos del admin
```

## Variables de Entorno

Crea un archivo `.env`:
```env
VITE_API_URL=http://localhost:3000
```

## Permisos por Rol

| Página | Admin | Jefe Proyecto | Staff |
|--------|-------|---------------|-------|
| Dashboard | ✓ | ✓ | ✓ |
| Órdenes | ✓ | ✓ | - |
| Productos | ✓ | ✓ | - |
| Noticias | ✓ | ✓ | - |
| Wikis | ✓ | ✓ | ✓ |
| Usuarios | ✓ | - | - |
| Proyectos | ✓ | - | - |

## Características

- Dashboard con estadísticas
- CRUD completo de productos con variantes
- Gestión de órdenes con tracking
- Editor de noticias y wikis
- Sistema de enrollment de usuarios
- Diseño responsive
- Sistema de temas (hereda de VistaUsuario)
