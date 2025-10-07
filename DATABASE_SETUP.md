# Configuración de Base de Datos PostgreSQL con Docker

## Variables de Entorno Requeridas

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
NODE_ENV=development
PORT=3333
APP_KEY=tu-clave-de-aplicacion-aqui
HOST=localhost
LOG_LEVEL=info

# Configuración de Base de Datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=secret
DB_DATABASE=automail_3clicks
```

## Iniciar los Servicios

1. **Iniciar PostgreSQL y Redis con Docker:**
   ```bash
   docker-compose up -d
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Ejecutar migraciones:**
   ```bash
   node ace migration:run
   ```

4. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

## Notas Importantes

- La aplicación ahora está configurada para usar PostgreSQL en lugar de SQLite
- Se eliminó la dependencia `better-sqlite3` del proyecto
- El archivo `tmp/db.sqlite3` fue eliminado
- Las variables de entorno de la base de datos son ahora requeridas (no opcionales)
- La configuración está optimizada para trabajar con el contenedor Docker de PostgreSQL
