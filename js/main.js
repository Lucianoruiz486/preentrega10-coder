// ===================================================
// Pre-Entrega 10: APIs, Peticiones y Librerías
// Simulador: Validador de Stock de un negocio de indumentaria deportiva
// Continuación de la Pre-Entrega 9: el catálogo ahora se pide con fetch a un archivo
// data.json (async/await + try/catch/finally) y los mensajes al usuario se muestran
// con las librerías Toastify (notificaciones) y SweetAlert2 (confirmaciones y errores).
// ===================================================

// ===================================================
// 1. CLASE (Pre-Entrega 5): la "fábrica" de productos del simulador
// ===================================================
class Producto {
  constructor(id, nombre, precio, stock) {
    this.id = id;
    this.nombre = nombre;
    this.precio = precio;
    this.stock = stock;
  }

  // INFORMA: indica si hay unidades suficientes para el pedido
  hayStock(cantidad) {
    return cantidad <= this.stock;
  }

  // MODIFICA el estado: descuenta unidades. Solo vende enteros mayores a 0 que alcancen el stock
  // Retorna true si la venta se realizó y false si no
  vender(cantidad) {
    if (Number.isInteger(cantidad) && cantidad > 0 && this.hayStock(cantidad)) {
      this.stock = this.stock - cantidad;
      return true;
    }
    return false;
  }

  // MODIFICA el estado: baja el precio según el porcentaje (solo entre 0 y 100, sin incluirlos)
  aplicarDescuento(porcentaje) {
    if (porcentaje > 0 && porcentaje < 100) {
      this.precio = Math.round(this.precio - (this.precio * porcentaje) / 100);
    }
    return this.precio;
  }

  // CALCULA: precio final con IVA (21%), sin modificar el precio base
  calcularPrecioConIva() {
    return Math.round(this.precio * 1.21);
  }
}

// ===================================================
// 2. ESTADO DEL SIMULADOR Y STORAGE
// ===================================================
// El catálogo arranca vacío y se llena con cargarCatalogo()
let productos = [];

// Indica si hay una carga en curso (mientras tanto no se puede agregar nada)
let cargando = false;

// Fuente de datos (archivo local) y una dirección que no existe para simular una falla de red
const URL_DATOS = "./data.json";
const URL_FALLA = "./no-existe.json";

// Clave con la que se guarda la copia de trabajo del catálogo en localStorage
const CLAVE_STORAGE = "productosStock";

// GUARDAR: convierte el array a texto JSON y lo almacena
function guardarProductos() {
  localStorage.setItem(CLAVE_STORAGE, JSON.stringify(productos));
}

// RECUPERAR: devuelve el array guardado, o null si no hay nada guardado todavía
function leerGuardados() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_STORAGE));
    return Array.isArray(datos) ? datos : null;
  } catch (error) {
    return null; // si el texto guardado estuviera dañado, se trata como "no hay nada"
  }
}

// Id único para un producto nuevo: el mayor id existente + 1
function obtenerNuevoId() {
  return productos.reduce((maximo, { id }) => Math.max(maximo, id), 0) + 1;
}

// ===================================================
// 3. SELECCIÓN DE ELEMENTOS DEL DOM
// ===================================================
const contenedorProductos = document.getElementById("contenedor-productos");
const cargandoMensaje = document.getElementById("cargando");

const inputNombre = document.querySelector("#input-nombre");
const inputPrecio = document.querySelector("#input-precio");
const inputStock = document.querySelector("#input-stock");
const btnAgregar = document.querySelector("#btn-agregar");

const inputBuscar = document.querySelector("#input-buscar");
const checkDisponibles = document.querySelector("#check-disponibles");

const statProductos = document.querySelector("#stat-productos");
const statUnidades = document.querySelector("#stat-unidades");
const statValor = document.querySelector("#stat-valor");
const statAgotados = document.querySelector("#stat-agotados");

const btnRecargar = document.querySelector("#btn-recargar");
const btnVaciar = document.querySelector("#btn-vaciar");
const checkFalla = document.querySelector("#check-falla");

const aviso = document.querySelector("#aviso");
const avisoTexto = document.querySelector("#aviso-texto");
const btnCerrarAviso = document.querySelector("#btn-cerrar-aviso");

// ===================================================
// 4. FUNCIONES AUXILIARES
// ===================================================

// Formatea un número como precio argentino: 45000 -> "45.000"
const formatearPrecio = (valor) => valor.toLocaleString("es-AR");

// Devuelve una promesa que se resuelve después de los milisegundos indicados
const esperar = (milisegundos) => new Promise((resolve) => setTimeout(resolve, milisegundos));

// Evita que el texto escrito por el usuario se interprete como HTML dentro del innerHTML
function escaparHtml(texto) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// LIBRERÍA TOASTIFY: notificación en pantalla de cada acción
// tipo: "exito" (verde), "error" (rojo) o "info" (azul)
const coloresToast = { exito: "#047857", error: "#b91c1c", info: "#1d4ed8" };

function mostrarMensaje(texto, tipo) {
  Toastify({
    text: texto,
    duration: 3500,
    close: true,
    gravity: "top",
    position: "right",
    style: { background: coloresToast[tipo] ?? coloresToast.info },
  }).showToast();
}

// LIBRERÍA SWEETALERT2: ventana de confirmación antes de una acción que no se puede deshacer
// Retorna true si el usuario confirma y false si cancela
async function confirmarAccion(titulo, texto) {
  const { isConfirmed } = await Swal.fire({
    title: titulo,
    text: texto,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, continuar",
    cancelButtonText: "Cancelar",
  });
  return isConfirmed;
}

// Habilita o deshabilita los botones que modifican el catálogo (por ejemplo, durante una carga)
function alternarControles(deshabilitar) {
  [btnAgregar, btnVaciar, btnRecargar].forEach((boton) => {
    boton.disabled = deshabilitar;
  });
}

// FILTRO: devuelve los productos que coinciden con el texto buscado y con "solo con stock"
function obtenerProductosFiltrados() {
  const texto = inputBuscar.value.trim().toLowerCase();

  return productos.filter(
    (producto) =>
      producto.nombre.toLowerCase().includes(texto) &&
      (!checkDisponibles.checked || producto.stock > 0)
  );
}

// ===================================================
// 5. RENDERIZADO DINÁMICO
// ===================================================

// Recorre el array y dibuja una tarjeta por cada producto usando template strings
function renderizarProductos(lista) {
  if (lista.length === 0) {
    contenedorProductos.innerHTML = `<p class="vacio">No hay productos para mostrar.</p>`;
    return;
  }

  contenedorProductos.innerHTML = lista
    .map((producto) => {
      const agotado = producto.stock === 0;

      return `
        <article class="card ${agotado ? "card--agotado" : ""}" data-id="${producto.id}">
          <span class="etiqueta">${agotado ? "Agotado" : "En stock"}</span>
          <h3>${escaparHtml(producto.nombre)}</h3>
          <p class="card__precio">$${formatearPrecio(producto.precio)}</p>
          <p class="card__detalle">Con IVA: $${formatearPrecio(producto.calcularPrecioConIva())}</p>
          <p class="card__detalle">Stock: ${producto.stock} unidades</p>
          <div class="card__acciones">
            <button class="btn btn--primario" data-accion="vender" data-id="${producto.id}" ${agotado ? "disabled" : ""}>Vender 1</button>
            <button class="btn btn--secundario" data-accion="descuento" data-id="${producto.id}">-10%</button>
            <button class="btn btn--peligro" data-accion="eliminar" data-id="${producto.id}">Eliminar</button>
          </div>
        </article>`;
    })
    .join("");
}

// Actualiza el resumen del inventario (reduce suma, filter cuenta)
function actualizarResumen() {
  const unidades = productos.reduce((acumulado, producto) => acumulado + producto.stock, 0);
  const valorInventario = productos.reduce(
    (acumulado, producto) => acumulado + producto.precio * producto.stock,
    0
  );
  const agotados = productos.filter((producto) => producto.stock === 0).length;

  statProductos.textContent = productos.length;
  statUnidades.textContent = unidades;
  statValor.textContent = `$${formatearPrecio(valorInventario)}`;
  statAgotados.textContent = agotados;
}

// Vuelve a dibujar todo cada vez que el array cambia; si se pasa un id, resalta esa tarjeta
function actualizarVista(idResaltado) {
  renderizarProductos(obtenerProductosFiltrados());
  actualizarResumen();

  if (idResaltado !== undefined) {
    // ?. porque la tarjeta puede no existir (por ejemplo, si el filtro la oculta)
    const tarjeta = document.querySelector(`.card[data-id="${idResaltado}"]`);
    tarjeta?.classList.add("resaltada");
  }
}

// ===================================================
// 6. ACCIONES DEL SIMULADOR
// ===================================================

// Valida los datos del formulario y agrega un producto nuevo al array
function agregarProducto() {
  // Si el catálogo todavía se está cargando, el producto nuevo se perdería al terminar la carga
  if (cargando) {
    mostrarMensaje("Esperá a que termine de cargar el catálogo.", "info");
    return;
  }

  const nombre = inputNombre.value.trim();
  const precio = Number(inputPrecio.value);
  const stock = Number(inputStock.value);

  if (nombre === "") {
    mostrarMensaje("Ingresá el nombre del producto.", "error");
  } else if (!(precio > 0)) {
    mostrarMensaje("Ingresá un precio mayor a 0.", "error");
  } else if (inputStock.value === "" || !Number.isInteger(stock) || stock < 0) {
    mostrarMensaje("Ingresá un stock entero (0 o más).", "error");
  } else if (productos.some((producto) => producto.nombre.toLowerCase() === nombre.toLowerCase())) {
    mostrarMensaje(`Ya existe un producto llamado "${nombre}".`, "error");
  } else {
    // Flujo: crear el dato, agregarlo al array, guardarlo en storage y volver a dibujar
    const nuevoProducto = new Producto(obtenerNuevoId(), nombre, precio, stock);
    productos.push(nuevoProducto);
    guardarProductos();

    // Se limpian el formulario y los filtros para que el producto nuevo se vea seguro
    inputNombre.value = "";
    inputPrecio.value = "";
    inputStock.value = "";
    inputBuscar.value = "";
    checkDisponibles.checked = false;

    mostrarMensaje(`Agregaste "${nuevoProducto.nombre}" al catálogo.`, "exito");
    actualizarVista(nuevoProducto.id);
  }
}

// Vende 1 unidad validando el stock con el método del objeto
function venderUnidad(producto) {
  const vendido = producto.vender(1);

  // Operador ternario: reemplaza un if-else simple (el mensaje y su tipo dependen del resultado)
  mostrarMensaje(
    vendido
      ? `Vendiste 1 unidad de ${producto.nombre}. Quedan ${producto.stock}.`
      : `${producto.nombre} está agotado.`,
    vendido ? "exito" : "error"
  );

  guardarProductos();
  actualizarVista(producto.id);
}

// Aplica un 10% de descuento con el método del objeto
function aplicarDescuentoDiez(producto) {
  producto.aplicarDescuento(10);
  guardarProductos();
  mostrarMensaje(`${producto.nombre} ahora cuesta $${formatearPrecio(producto.precio)}.`, "info");
  actualizarVista(producto.id);
}

// Quita el producto del array (pide confirmación con SweetAlert2 y filter se queda con los demás)
async function eliminarProducto(producto) {
  const confirmado = await confirmarAccion(
    "¿Eliminar producto?",
    `Se va a eliminar "${producto.nombre}" del catálogo.`
  );
  if (!confirmado) {
    return;
  }

  productos = productos.filter((item) => item.id !== producto.id);
  guardarProductos();
  mostrarMensaje(`Eliminaste "${producto.nombre}" del catálogo.`, "info");
  actualizarVista();
}

// Vacía el catálogo y guarda la lista vacía (al recargar la página sigue vacío)
async function vaciarCatalogo() {
  const confirmado = await confirmarAccion(
    "¿Vaciar el catálogo?",
    "Se van a eliminar todos los productos."
  );
  if (!confirmado) {
    return;
  }

  productos = [];
  guardarProductos();
  mostrarMensaje("Vaciaste el catálogo.", "info");
  actualizarVista();
}

// ===================================================
// 7. PETICIONES Y ASINCRONISMO: fetch, async/await y try/catch/finally
// ===================================================

// FETCH: pide el archivo JSON y lo convierte en un array de objetos comunes
// - await espera la respuesta sin congelar la página
// - fetch NO falla con un 404: por eso se revisa respuesta.ok y se lanza el error a mano
async function obtenerDatos(url) {
  await esperar(800); // demora simulada para que se alcance a ver el mensaje de carga

  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    throw new Error(`el servidor respondió con el error ${respuesta.status}`);
  }
  return respuesta.json();
}

// Carga el catálogo: usa la copia guardada en el navegador y, si no hay, la pide con fetch
// forzarServidor = true ignora lo guardado y vuelve a pedir data.json
async function cargarCatalogo(forzarServidor = false) {
  cargando = true;
  alternarControles(true);
  cargandoMensaje.classList.remove("oculto"); // mensaje "Cargando productos..."

  try {
    const guardados = forzarServidor ? null : leerGuardados();

    // ?? usa lo guardado y solo si no hay nada (null) hace el fetch
    const lista = guardados ?? (await obtenerDatos(checkFalla.checked ? URL_FALLA : URL_DATOS));

    // Destructuring: se vuelven a crear los objetos como Producto (para recuperar sus métodos)
    productos = lista.map(({ id, nombre, precio, stock }) => new Producto(id, nombre, precio, stock));

    if (guardados === null) {
      guardarProductos();
    }
    actualizarVista();

    mostrarMensaje(
      guardados === null
        ? `✔️ ${productos.length} productos cargados desde data.json`
        : `✔️ Recuperamos ${productos.length} productos guardados`,
      "exito"
    );
  } catch (error) {
    // Falla de red (TypeError) o respuesta no exitosa: se avisa con SweetAlert2
    actualizarVista();
    const detalle = error instanceof TypeError ? "no se pudo conectar con el servidor" : error.message;
    Swal.fire({
      icon: "error",
      title: "No se pudo cargar el catálogo",
      text: `${detalle}. Intentá de nuevo.`,
    });
  } finally {
    // Se ejecuta SIEMPRE: se oculta el mensaje de carga y se vuelven a habilitar los botones
    cargando = false;
    alternarControles(false);
    cargandoMensaje.classList.add("oculto");
  }
}

// Descarta los cambios guardados y vuelve a pedir data.json (con confirmación)
async function recargarDesdeJson() {
  const confirmado = await confirmarAccion(
    "¿Recargar el catálogo?",
    "Se descartarán los cambios guardados y se volverán a pedir los datos de data.json."
  );
  if (confirmado) {
    await cargarCatalogo(true);
  }
}

// TEMPORIZADOR: unos segundos después de entrar, muestra un recordatorio con datos reales del stock
function mostrarRecordatorio() {
  const agotados = productos.filter((producto) => producto.stock === 0);

  let texto;
  if (productos.length === 0) {
    texto = "🔔 Recordatorio: el catálogo está vacío. Cargá productos para empezar a vender.";
  } else if (agotados.length === 0) {
    texto = "🔔 Recordatorio: todo el stock está al día.";
  } else {
    const nombres = agotados.map(({ nombre }) => nombre).join(", ");
    texto = `🔔 Recordatorio: hay ${agotados.length} producto/s agotado/s (${nombres}). ¡Es momento de reponer!`;
  }

  avisoTexto.textContent = texto;
  aviso.classList.remove("oculto");
}

// ===================================================
// 8. EVENTOS
// ===================================================

// CLICK en el botón Agregar
btnAgregar.addEventListener("click", agregarProducto);

// CLICK en los botones que vacían el catálogo o lo vuelven a pedir con fetch
btnVaciar.addEventListener("click", vaciarCatalogo);
btnRecargar.addEventListener("click", recargarDesdeJson);

// CLICK en cerrar el aviso
btnCerrarAviso.addEventListener("click", () => {
  aviso.classList.add("oculto");
});

// TECLADO: Enter en cualquier campo del formulario también agrega el producto
[inputNombre, inputPrecio, inputStock].forEach((campo) => {
  campo.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
      agregarProducto();
    }
  });
});

// TECLADO: la búsqueda filtra la lista mientras se escribe; Esc limpia el buscador
inputBuscar.addEventListener("keyup", (evento) => {
  if (evento.key === "Escape") {
    inputBuscar.value = "";
  }
  actualizarVista();
});

// CAMBIO en el checkbox "Solo con stock"
checkDisponibles.addEventListener("change", () => {
  actualizarVista();
});

// CLICK en los botones de cada tarjeta. Como las tarjetas se vuelven a dibujar
// cada vez, se escucha un solo click en el contenedor y se lee qué botón se tocó
contenedorProductos.addEventListener("click", (evento) => {
  // Destructuring: se leen accion e id del dataset del botón en una sola línea
  const { accion, id } = evento.target.dataset;
  const producto = productos.find((item) => item.id === Number(id));

  if (accion === undefined || producto === undefined) {
    return;
  }

  switch (accion) {
    case "vender":
      venderUnidad(producto);
      break;
    case "descuento":
      aplicarDescuentoDiez(producto);
      break;
    case "eliminar":
      eliminarProducto(producto);
      break;
  }
});

// ===================================================
// 9. INICIO: apenas carga la página se pide el catálogo y se programa el recordatorio
// ===================================================
cargarCatalogo();
setTimeout(mostrarRecordatorio, 4000);
