# Repositorios nuevos (temporalmente aquí)

Estas dos carpetas son **repositorios independientes**. Se guardaron aquí, con su historial, solo porque desde la sesión no se pudieron crear repos nuevos en GitHub.

| Carpeta | Contenido |
|---|---|
| `alianza-backend/` | API en C# (.NET 8) + PostgreSQL y panel de administración `/admin` |
| `alianza-ldap/` | Directorio OpenLDAP con usuarios y grupos de permisos |

## Moverlos a sus propios repositorios

1. En GitHub, crea dos repos **vacíos** (sin README): `alianza-backend` y `alianza-ldap`.
2. Desde una copia de este repositorio en la rama donde están estas carpetas:

```bash
git subtree split --prefix=repos-nuevos/alianza-backend -b solo-backend
git push https://github.com/Vichoko02/alianza-backend.git solo-backend:main

git subtree split --prefix=repos-nuevos/alianza-ldap -b solo-ldap
git push https://github.com/Vichoko02/alianza-ldap.git solo-ldap:main
```

3. Después, borra la carpeta `repos-nuevos/` de este repositorio.
