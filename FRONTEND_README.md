# 🚀 AutoMail 3Clicks - Frontend de Prueba

## 📋 Descripción
Este es un sistema multi-tenant para envío de emails con un frontend de prueba desarrollado en HTML, CSS y JavaScript vanilla.

## 🛠️ Tecnologías Utilizadas
- **Backend**: AdonisJS v6
- **Base de Datos**: SQLite
- **Frontend**: HTML5, CSS3, JavaScript ES6
- **Autenticación**: Sistema de sesiones web

## 📁 Estructura del Frontend
```
resources/views/
├── login.html          # Página de inicio de sesión
├── register.html       # Página de registro
├── dashboard.html      # Dashboard principal
├── users.html          # Gestión de usuarios
└── tenants.html        # Gestión de tenants
```

## 🚀 Cómo Probar el Frontend

### 1. Iniciar el Servidor
```bash
npm run dev
```

### 2. Acceder a las Páginas
- **Login**: http://localhost:3333/login
- **Registro**: http://localhost:3333/register
- **Dashboard**: http://localhost:3333/dashboard
- **Usuarios**: http://localhost:3333/users
- **Tenants**: http://localhost:3333/tenants

### 3. Flujo de Prueba Recomendado

#### Paso 1: Registro
1. Ve a `/register`
2. Completa el formulario con:
   - Nombre completo
   - Email válido
   - Contraseña (mínimo 6 caracteres)
   - Nombre de organización
3. Haz clic en "Crear Cuenta"

#### Paso 2: Login
1. Ve a `/login`
2. Ingresa las credenciales del usuario registrado
3. Haz clic en "Iniciar Sesión"

#### Paso 3: Explorar el Dashboard
1. Una vez logueado, serás redirigido al dashboard
2. Explora las diferentes secciones:
   - Estadísticas generales
   - Gestión de usuarios
   - Gestión de tenants
   - Funciones de email

#### Paso 4: Gestión de Usuarios
1. Ve a `/users`
2. Observa la lista de usuarios (datos de ejemplo)
3. Prueba la funcionalidad de búsqueda
4. Haz clic en los botones de acción

#### Paso 5: Gestión de Tenants
1. Ve a `/tenants`
2. Observa las tarjetas de tenants (datos de ejemplo)
3. Prueba la funcionalidad de búsqueda
4. Explora las acciones disponibles

## 🎨 Características del Frontend

### ✨ Diseño Responsivo
- Adaptable a dispositivos móviles y desktop
- Grid system flexible
- Navegación intuitiva

### 🔍 Funcionalidades Interactivas
- Búsqueda en tiempo real
- Validación de formularios
- Confirmaciones de acciones
- Mensajes de estado

### 🎯 UX/UI Moderno
- Gradientes atractivos
- Animaciones suaves
- Iconos descriptivos
- Colores consistentes

## 📊 Datos de Ejemplo

El frontend incluye datos de ejemplo para demostrar las funcionalidades:

### Usuarios de Ejemplo
- Juan Pérez (juan@empresa.com)
- María García (maria@empresa.com)
- Carlos López (carlos@empresa.com)

### Tenants de Ejemplo
- Empresa ABC (5 usuarios, 23 emails)
- Startup XYZ (3 usuarios, 12 emails)
- Corporación Global (15 usuarios, 89 emails)

## 🔧 Funcionalidades Implementadas

### ✅ Completadas
- [x] Página de login con validación
- [x] Página de registro con validación de contraseña
- [x] Dashboard con estadísticas
- [x] Gestión de usuarios (CRUD)
- [x] Gestión de tenants (CRUD)
- [x] Diseño responsivo
- [x] Búsqueda en tiempo real
- [x] Confirmaciones de acciones

### 🚧 En Desarrollo
- [ ] Integración completa con API
- [ ] Middleware de autenticación
- [ ] Formularios de creación/edición
- [ ] Paginación de resultados
- [ ] Filtros avanzados

## 🐛 Solución de Problemas

### Error 404 en páginas
- Verifica que el servidor esté ejecutándose
- Asegúrate de que los archivos HTML estén en `resources/views/`

### Error de autenticación
- Verifica que las migraciones estén ejecutadas
- Comprueba la configuración de la base de datos

### Estilos no se cargan
- Verifica que el CSS esté embebido en los archivos HTML
- Comprueba la consola del navegador por errores

## 📝 Notas Importantes

1. **Datos de Ejemplo**: El frontend usa datos simulados para demostrar las funcionalidades
2. **Sin Base de Datos**: Las acciones de crear/editar/eliminar son simuladas
3. **Autenticación**: El sistema de login está implementado pero puede necesitar ajustes
4. **Responsive**: Optimizado para desktop, tablet y móvil

## 🎯 Próximos Pasos

1. Integrar completamente con la API
2. Implementar middleware de autenticación
3. Añadir formularios de creación/edición
4. Implementar paginación y filtros
5. Añadir tests unitarios
6. Optimizar rendimiento

---

**¡Disfruta probando el frontend! 🚀**
