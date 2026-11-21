# Simulador de Ventas - Validador de Stock

Simulador en JavaScript para un negocio de indumentaria deportiva. Es la **Pre-Entrega 10 (APIs, Peticiones y Librerías)**: el catálogo se pide con `fetch` a un archivo `data.json`, se muestra un mensaje mientras carga, y las notificaciones y confirmaciones se hacen con **Toastify** y **SweetAlert2**.

## Estructura del repositorio
```
preentrega10-coder/
├── index.html      # estructura de la página; enlaza el CSS, las librerías (CDN) y el JS
├── data.json       # catálogo de productos que se consume con fetch
├── README.md
├── css/
│   └── style.css   # estilos y layout
└── js/
    └── main.js     # clase Producto, fetch, storage, renderizado y eventos
```

## Cómo ejecutarlo
**Importante:** como la página usa `fetch` para leer `data.json`, **no se puede abrir con doble clic** (el navegador bloquea `fetch` en archivos abiertos desde la compu). Hay que servirla:
- **Con VS Code:** instalá la extensión *Live Server*, hacé clic derecho sobre `index.html` y elegí **Open with Live Server**.
- **Con GitHub Pages:** en el repositorio, **Settings → Pages → Branch: main, carpeta / (root)** y abrí el link que genera.

Hace falta conexión a internet, porque Toastify y SweetAlert2 se cargan por CDN.

## Cómo comprobar cada parte
1. **Fetch con mensaje de carga:** la primera vez que se abre, se ve "⏳ Cargando productos…" y después las tarjetas, con una notificación verde (Toastify): "8 productos cargados desde data.json".
2. **Manejo de errores:** tildá **Simular falla de red** y tocá **Recargar desde data.json** (confirmá). El `fetch` apunta a un archivo que no existe, el servidor responde 404, y aparece una ventana de error (SweetAlert2). El mensaje de carga se oculta igual, porque el `finally` se ejecuta siempre.
3. **Confirmaciones (SweetAlert2):** **Eliminar**, **Vaciar catálogo** y **Recargar** piden confirmación antes de actuar.
4. **Persistencia:** los cambios (agregar, vender, descuento, eliminar) se guardan en `localStorage`; al recargar la página se recuperan sin volver a pedir `data.json`. **Recargar desde data.json** descarta lo guardado y vuelve a pedir el archivo.
5. **Temporizador:** a los 4 segundos aparece un recordatorio amarillo con los productos agotados.

## Criterios de la consigna y dónde se cumplen
| Criterio | Dónde está en `js/main.js` |
|---|---|
| Implementación del fetch (25%) | `obtenerDatos()`: `await fetch(url)`, revisa `respuesta.ok` y devuelve `respuesta.json()`; la consume `cargarCatalogo()` (`async`) |
| Manejo de errores (20%) | `cargarCatalogo()`: `try` con el fetch, `catch` que avisa con SweetAlert2 (falla de red o respuesta no exitosa) y `finally` que oculta el mensaje de carga y rehabilita los botones |
| Elección de librería (25%) | **Toastify** (`mostrarMensaje()`) para avisar el resultado de cada acción sin interrumpir, y **SweetAlert2** (`confirmarAccion()` y el error de carga) para confirmar acciones que borran datos |
| Renderizado en el DOM (20%) | `renderizarProductos()` dibuja con template strings los datos recibidos del JSON; se puede vender, descontar, eliminar y buscar |
| Feedback al usuario (10%) | Mensaje "Cargando productos…" mientras carga y notificación de error con la librería si algo falla |

Además se mantiene todo lo anterior: clase `Producto`, `localStorage` con `JSON.parse`/`JSON.stringify`, `??`, `?.`, ternario, destructuring, `setTimeout`, eventos de click y de teclado, y sin `prompt`, `alert` ni `console`.
