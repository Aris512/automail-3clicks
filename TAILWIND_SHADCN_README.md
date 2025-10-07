# 🚀 AutoMail 3Clicks - Frontend con Tailwind CSS + Shadcn/UI

## 📋 Descripción
Sistema multi-tenant para envío de emails con un frontend moderno desarrollado usando **Tailwind CSS** y **Shadcn/UI** para componentes elegantes y responsivos.

## 🛠️ Stack Tecnológico

### **Frontend:**
- **Tailwind CSS** - Framework de CSS utility-first
- **Shadcn/UI** - Componentes UI modernos y accesibles
- **JavaScript ES6** - Funcionalidades interactivas
- **HTML5** - Estructura semántica

### **Backend:**
- **AdonisJS v6** - Framework Node.js
- **SQLite** - Base de datos
- **Sistema de sesiones web** - Autenticación

## 🎨 Características del Diseño

### ✨ **Tailwind CSS**
- **Utility-first**: Clases CSS predefinidas para desarrollo rápido
- **Responsive**: Diseño adaptable a todos los dispositivos
- **Customizable**: Variables CSS personalizadas para temas
- **Performance**: CSS optimizado y purgado automáticamente

### 🧩 **Shadcn/UI Components**
- **Button**: Botones con múltiples variantes (default, destructive, outline, secondary, ghost, link)
- **Card**: Tarjetas con header, content y footer
- **Input**: Campos de entrada con estados de focus y error
- **Label**: Etiquetas accesibles para formularios

### 🎯 **Sistema de Colores**
```css
:root {
  --primary: 221.2 83.2% 53.3%;        /* Azul principal */
  --secondary: 210 40% 96%;           /* Gris claro */
  --destructive: 0 84.2% 60.2%;      /* Rojo para errores */
  --muted: 210 40% 96%;              /* Texto secundario */
  --accent: 210 40% 96%;             /* Acentos */
  --card: 0 0% 100%;                 /* Fondo de tarjetas */
  --border: 214.3 31.8% 91.4%;      /* Bordes */
}
```

## 📁 Estructura del Proyecto

```
resources/
├── views/
│   ├── login.html          # Página de login con Tailwind
│   ├── register.html       # Página de registro con Tailwind
│   ├── dashboard.html      # Dashboard con componentes Shadcn
│   ├── users.html          # Gestión de usuarios
│   └── tenants.html        # Gestión de tenants
├── css/
│   └── app.css            # Estilos base de Tailwind + variables CSS
└── js/
    ├── lib/
    │   └── utils.js       # Utilidades para Shadcn
    └── components/
        └── ui/
            ├── button.js  # Componente Button
            ├── card.js    # Componente Card
            ├── input.js   # Componente Input
            └── label.js   # Componente Label
```

## 🚀 Instalación y Configuración

### 1. **Dependencias Instaladas**
```bash
# Tailwind CSS y plugins
npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms @tailwindcss/typography

# Shadcn/UI utilities
npm install class-variance-authority clsx tailwind-merge lucide-react
```

### 2. **Archivos de Configuración**
- `tailwind.config.js` - Configuración de Tailwind con colores personalizados
- `postcss.config.js` - Configuración de PostCSS
- `resources/css/app.css` - Estilos base y variables CSS

### 3. **CDN Tailwind**
Las páginas usan Tailwind CSS via CDN para desarrollo rápido:
```html
<script src="https://cdn.tailwindcss.com"></script>
```

## 🎨 Componentes Implementados

### **Button Component**
```html
<!-- Botón primario -->
<button class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
    Botón Primario
</button>

<!-- Botón secundario -->
<button class="bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-3">
    Botón Secundario
</button>
```

### **Card Component**
```html
<div class="bg-card rounded-lg shadow-sm p-6">
    <div class="text-xl font-semibold text-card-foreground mb-4">Título</div>
    <div class="text-muted-foreground mb-4">Contenido de la tarjeta</div>
    <div class="flex gap-2">
        <!-- Botones de acción -->
    </div>
</div>
```

### **Input Component**
```html
<input 
    type="email" 
    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    placeholder="tu@email.com"
>
```

## 🎯 Páginas Actualizadas

### **1. Login (`/login`)**
- ✅ Diseño con gradiente de fondo
- ✅ Card centrada con sombras
- ✅ Inputs con estados de focus
- ✅ Botón con hover effects
- ✅ Mensajes de error/success con colores apropiados

### **2. Registro (`/register`)**
- ✅ Formulario completo con validación
- ✅ Indicador de fortaleza de contraseña
- ✅ Placeholders descriptivos
- ✅ Validación en tiempo real

### **3. Dashboard (`/dashboard`)**
- ✅ Header con gradiente
- ✅ Grid responsivo para estadísticas
- ✅ Cards con componentes Shadcn
- ✅ Botones con variantes múltiples
- ✅ Layout adaptable (mobile-first)

## 📱 Responsive Design

### **Breakpoints Tailwind**
- `sm:` - 640px+
- `md:` - 768px+
- `lg:` - 1024px+
- `xl:` - 1280px+

### **Grid System**
```html
<!-- Grid responsivo -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <!-- Se adapta de 1 columna en móvil a 3 en desktop -->
</div>
```

## 🎨 Personalización

### **Colores Personalizados**
Los colores se pueden personalizar modificando las variables CSS en `resources/css/app.css`:

```css
:root {
    --primary: 221.2 83.2% 53.3%;  /* Cambiar color principal */
    --secondary: 210 40% 96%;       /* Cambiar color secundario */
    /* ... más variables */
}
```

### **Componentes Reutilizables**
Los componentes Shadcn están en `resources/js/components/ui/` y se pueden extender fácilmente.

## 🚀 Cómo Probar

### 1. **Iniciar el servidor**
```bash
npm run dev
```

### 2. **Acceder a las páginas**
- **Login**: http://localhost:3333/login
- **Registro**: http://localhost:3333/register
- **Dashboard**: http://localhost:3333/dashboard

### 3. **Verificar características**
- ✅ Diseño responsivo (redimensionar ventana)
- ✅ Estados de hover en botones
- ✅ Focus states en inputs
- ✅ Mensajes de error/success
- ✅ Gradientes y sombras

## 🔧 Desarrollo

### **Añadir nuevos componentes**
1. Crear archivo en `resources/js/components/ui/`
2. Definir variantes con `class-variance-authority`
3. Exportar clases CSS
4. Usar en las páginas HTML

### **Personalizar estilos**
1. Modificar variables CSS en `app.css`
2. Ajustar configuración en `tailwind.config.js`
3. Añadir clases personalizadas

## 📊 Beneficios de Tailwind + Shadcn

### ✅ **Ventajas**
- **Desarrollo rápido**: Clases utility-first
- **Consistencia**: Sistema de diseño unificado
- **Performance**: CSS optimizado
- **Mantenibilidad**: Componentes reutilizables
- **Accesibilidad**: Componentes Shadcn accesibles
- **Responsive**: Mobile-first approach

### 🎯 **Resultado**
- Frontend moderno y profesional
- Experiencia de usuario mejorada
- Código mantenible y escalable
- Diseño consistente en todas las páginas

---

**¡Disfruta del nuevo frontend con Tailwind CSS y Shadcn/UI! 🎨✨**
