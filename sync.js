// sync.js - GoldFlow System
// Sincronización básica LocalStorage ↔ Firestore (multidispositivo)

// --------------- Estado inicial ---------------
console.log("[GoldFlow] sync.js cargado correctamente");

let firestoreDisponible = false;

try {
  if (typeof db !== "undefined") {
    firestoreDisponible = true;
    console.log("[GoldFlow] Firestore (db) está listo en sync.js");
  } else {
    console.warn("[GoldFlow] db no está definido en sync.js");
  }
} catch (e) {
  console.error("[GoldFlow] Error comprobando Firestore en sync.js:", e);
}

// --------------- Configuración de colecciones ---------------
const COLECCION_HOJAS = "hojas_goldflow";

// --------------- Función de subida de hojas ---------------
async function subirHojasAFirestore(hojas) {
  if (!firestoreDisponible) {
    console.warn("[GoldFlow] Firestore no disponible, no se sincronizan hojas.");
    return;
  }
  if (!Array.isArray(hojas)) {
    console.warn("[GoldFlow] subirHojasAFirestore recibió un valor no array.");
    return;
  }

  try {
    const batch = db.batch();

    hojas.forEach((hoja) => {
      if (!hoja || !hoja.id) return;

      const ref = db.collection(COLECCION_HOJAS).doc(hoja.id);
      batch.set(ref, hoja, { merge: true });
    });

    await batch.commit();
    console.log(`[GoldFlow] ${hojas.length} hojas sincronizadas con Firestore.`);
  } catch (e) {
    console.error("[GoldFlow] Error al subir hojas a Firestore:", e);
  }
}

// --------------- Envolver guardarHojas ---------------
if (typeof guardarHojas === "function") {
  console.log("[GoldFlow] Envolviendo guardarHojas para sincronizar con Firestore.");

  const originalGuardarHojas = guardarHojas;

  guardarHojas = function (hojas) {
    // 1) Comportamiento original (LocalStorage)
    originalGuardarHojas(hojas);

    // 2) Sincronización en segundo plano
    try {
      subirHojasAFirestore(hojas);
    } catch (e) {
      console.error("[GoldFlow] Error al sincronizar hojas con Firestore:", e);
    }
  };
} else {
  console.warn("[GoldFlow] guardarHojas no está definido cuando se carga sync.js.");
}
// ----------------- DESCARGAR HOJAS DESDE FIRESTORE -----------------
async function descargarHojasDesdeFirestore() {
  if (!firestoreDisponible) {
    console.warn("[GoldFlow] Firestore no disponible, no se descargan hojas.");
    return;
  }

  try {
    const snapshot = await db.collection(COLECCION_HOJAS).get();

    if (snapshot.empty) {
      console.log("[GoldFlow] No hay hojas en Firestore todavía.");
      return;
    }

    const hojas = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      hojas.push(data);
    });

    // Guardar en LocalStorage
    localStorage.setItem("goldflow_hojas", JSON.stringify(hojas));
    console.log(`[GoldFlow] ${hojas.length} hojas descargadas desde Firestore.`);
  } catch (e) {
    console.error("[GoldFlow] Error al descargar hojas:", e);
  }
}

// ----------------- EJECUCIÓN AUTOMÁTICA -----------------
setTimeout(() => {
  descargarHojasDesdeFirestore();
}, 1500);
// ----------------- TIEMPO REAL: ESCUCHAR CAMBIOS EN FIRESTORE -----------------
function escucharCambiosEnFirestore() {
  if (!firestoreDisponible) {
    console.warn("[GoldFlow] Firestore no disponible, no se activa tiempo real.");
    return;
  }

  console.log("[GoldFlow] Activando escucha en tiempo real...");

  db.collection(COLECCION_HOJAS).onSnapshot((snapshot) => {
    const hojas = [];

    snapshot.forEach((doc) => {
      hojas.push(doc.data());
    });

    // Guardar en LocalStorage
    localStorage.setItem("goldflow_hojas", JSON.stringify(hojas));

    console.log(`[GoldFlow] 🔄 Tiempo real activo: ${hojas.length} hojas recibidas.`);

    // Recargar pantalla para reflejar cambios
    location.reload();
  }, (error) => {
    console.error("[GoldFlow] Error en escucha en tiempo real:", error);
  });
}

// ----------------- ACTIVAR ESCUCHA AUTOMÁTICA -----------------
setTimeout(() => {
  escucharCambiosEnFirestore();
}, 1800);
