// ==========================================
// MOVE REPORTE DE CLASE DE PRUEBA
// MOVE Dance Academy
// ==========================================
// Esta página solo habla con el Worker de Cloudflare por fetch().
// El Worker es el único lugar donde vive la clave de Airtable y
// la clave de Green API (WhatsApp); nunca están en este archivo.

const WORKER_URL = "https://pruebasmove.movedancea.workers.dev";

// ---------- estado ----------
let maestras = [];
let maestraSeleccionada = null;
let pruebasPendientes = [];
let pruebaActual = null;

// ---------- helpers ----------
function el(id) {
  return document.getElementById(id);
}

function mostrarPantalla(id) {
  const pantallas = [
    "pantallaCargando",
    "pantallaMaestra",
    "pantallaLista",
    "pantallaFormulario",
    "pantallaListo",
  ];
  pantallas.forEach((p) => {
    el(p).hidden = p !== id;
  });
  mostrarError("");
}

function mostrarError(msg) {
  el("mensajeError").textContent = msg || "";
}

async function llamarWorker(payload) {
  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const datos = await res.json();
  if (!datos.success) {
    throw new Error(datos.error || "Ocurrió un error inesperado.");
  }
  return datos;
}

// ---------- inicio ----------
async function iniciar() {
  mostrarPantalla("pantallaCargando");
  try {
    const datos = await llamarWorker({ accion: "maestras" });
    maestras = datos.maestras || [];
    renderMaestras();
    mostrarPantalla("pantallaMaestra");
  } catch (e) {
    mostrarPantalla("pantallaMaestra");
    mostrarError("No se pudo conectar: " + e.message);
  }
}

function renderMaestras() {
  const cont = el("listaMaestras");
  cont.innerHTML = "";
  maestras.forEach((m) => {
    const btn = document.createElement("button");
    btn.textContent = m.nombre;
    btn.addEventListener("click", () => seleccionarMaestra(m));
    cont.appendChild(btn);
  });
}

async function seleccionarMaestra(m) {
  maestraSeleccionada = m;
  el("saludoMaestra").textContent = `👋 Hola, ${m.nombre}`;
  await cargarPendientes();
}

async function cargarPendientes() {
  mostrarPantalla("pantallaCargando");
  try {
    const datos = await llamarWorker({
      accion: "pendientes",
      maestraId: maestraSeleccionada.id,
    });
    pruebasPendientes = datos.pruebas || [];
    renderPendientes();
    mostrarPantalla("pantallaLista");
  } catch (e) {
    mostrarPantalla("pantallaLista");
    mostrarError("No se pudo conectar: " + e.message);
  }
}

function renderPendientes() {
  const cont = el("listaPruebas");
  cont.innerHTML = "";
  el("textoVacio").hidden = pruebasPendientes.length !== 0;

  pruebasPendientes.forEach((p) => {
    const tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta-prueba";

    const nombre = document.createElement("p");
    nombre.className = "tarjeta-alumna";
    nombre.textContent = p.alumna;

    const detalle = document.createElement("p");
    detalle.className = "tarjeta-detalle";
    detalle.textContent = [p.clase, p.fecha, p.hora].filter(Boolean).join(" · ");

    tarjeta.appendChild(nombre);
    tarjeta.appendChild(detalle);
    tarjeta.addEventListener("click", () => abrirFormulario(p));
    cont.appendChild(tarjeta);
  });
}

function abrirFormulario(p) {
  pruebaActual = p;
  el("fichaNombre").textContent = p.alumna;
  el("fichaDetalle").textContent = [p.clase, p.fecha, p.hora].filter(Boolean).join(" · ");

  el("selectParticipacion").value = "";
  el("selectIntegracion").value = "";
  el("selectDisfruto").value = "";
  el("selectRecomendacion").value = "";
  el("textoComentariosFamilia").value = "";
  el("textoComentariosInternos").value = "";

  mostrarPantalla("pantallaFormulario");
}

async function enviarReporte() {
  const participacion = el("selectParticipacion").value;
  const integracion = el("selectIntegracion").value;
  const disfruto = el("selectDisfruto").value;
  const recomendacion = el("selectRecomendacion").value;
  const comentariosFamilia = el("textoComentariosFamilia").value.trim();
  const comentariosInternos = el("textoComentariosInternos").value.trim();

  if (!participacion || !integracion || !disfruto || !recomendacion) {
    mostrarError("Por favor completa las 4 calificaciones antes de enviar.");
    return;
  }

  const btn = el("btnEnviarReporte");
  btn.disabled = true;
  const textoOriginal = btn.textContent;
  btn.textContent = "Enviando...";
  mostrarError("");

  try {
    await llamarWorker({
      accion: "guardar",
      pruebaId: pruebaActual.id,
      participacion,
      integracion,
      disfruto,
      recomendacion,
      comentariosFamilia,
      comentariosInternos,
    });

    el("mensajeFinal").textContent = `El reporte de ${pruebaActual.alumna} se envió por WhatsApp a la mamá.`;
    mostrarPantalla("pantallaListo");
  } catch (e) {
    mostrarError("No se pudo enviar: " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
}

// ---------- eventos ----------
el("btnCambiarMaestra").addEventListener("click", () => {
  maestraSeleccionada = null;
  mostrarPantalla("pantallaMaestra");
});

el("btnAtrasFormulario").addEventListener("click", () => {
  mostrarPantalla("pantallaLista");
});

el("btnEnviarReporte").addEventListener("click", enviarReporte);

el("btnOtraPrueba").addEventListener("click", async () => {
  await cargarPendientes();
});

// ---------- arranque ----------
iniciar();
