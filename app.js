var mapP, markerP;
var markerIni, markerFin; // Nuevos marcadores fijos
var gpsIni = "No marcado", gpsFin = "No marcado";
var latIni = null, lngIni = null;
var latFin = null, lngFin = null;
var sectorActivo = "";
let CIRCUITOS_DATABASE = {}; // Base de datos desde Google Sheets

// --- 1. CARGA DINÁMICA DE CIRCUITOS DESDE GOOGLE SHEETS ---
async function precargarCircuitosDesdeSheets() {
    const sheetId = '15FfY5O9CXIBA0RUcwqJMqHLbrOFRmu4ssgZ9xhPa44A';
    const gid = '434622515';
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;

    try {
        const response = await fetch(url);
        const csvText = await response.text();
        const filas = csvText.split('\n').slice(1); 
        const temporalDB = {};

        filas.forEach(fila => {
            const columnas = fila.replace(/"/g, "").split(',');
            if (columnas.length >= 2) {
                const sector = columnas[0].trim().toUpperCase();
                const circuito = columnas[1].trim();
                if (!temporalDB[sector]) temporalDB[sector] = [];
                temporalDB[sector].push(circuito);
            }
        });
        CIRCUITOS_DATABASE = temporalDB;
        console.log("✅ Circuitos sincronizados con Google Sheets");
    } catch (error) {
        console.error("❌ Error cargando circuitos:", error);
    }
}

// Cargar al iniciar
precargarCircuitosDesdeSheets();

const USUARIOS = {
    "admin": "admin123", "brus laguna": "enee2026", "choluteca": "enee2026",
    "comayagua": "enee2026", "danli": "enee2026", "el progreso": "enee2026",
    "juticalpa": "enee2026", "la ceiba": "enee2026", "san pedro sula": "enee2026",
    "santa barbara": "enee2026", "santa rosa": "enee2026", "santa cruz": "enee2026",
    "tegucigalpa": "enee2026", "tocoa": "enee2026"
};

function validarLogin() {
    const u = document.getElementById('user').value.toLowerCase();
    const p = document.getElementById('pass').value;

    if (USUARIOS[u] && USUARIOS[u] === p) {
        sectorActivo = u.toUpperCase();
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('form-poda-container').style.display = 'block';
        document.getElementById('user-display').innerText = "Sector: " + sectorActivo;
        
        actualizarListaCircuitos(sectorActivo); // Llenar el select
        initMapPoda();
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function actualizarListaCircuitos(sector) {
    const select = document.getElementById('poda-circuito');
    select.innerHTML = '<option value="">Seleccione un circuito...</option>';
    const lista = CIRCUITOS_DATABASE[sector] || [];
    
    lista.forEach(c => {
        let opt = document.createElement('option');
        opt.value = c;
        opt.innerText = c;
        select.appendChild(opt);
    });
}

// --- 2. GESTIÓN DEL MAPA Y CAPAS ---
async function initMapPoda() {
    if (mapP) mapP.remove();
    mapP = L.map('map-poda').setView([14.65, -86.21], 13);
    
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri'
    }).addTo(mapP);

    // Cargar Capa GeoJSON de Circuitos (Red Primaria)
    try {
        const geoRes = await fetch("https://raw.githubusercontent.com/proyectosjdop-alfa/app_poda/main/Circuitos%20Juticalpa.geojson");
        const geoData = await geoRes.json();
        L.geoJSON(geoData, {
            style: { color: "#f1c40f", weight: 2, opacity: 0.5 }
        }).addTo(mapP);
    } catch(e) { console.warn("No se pudo cargar la capa GeoJSON"); }

    markerP = L.marker([14.65, -86.21], { draggable: true }).addTo(mapP);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            actualizarMarcador(pos.coords.latitude, pos.coords.longitude);
        }, () => {}, {enableHighAccuracy: true});
    }
    setTimeout(() => mapP.invalidateSize(), 300);
}

function actualizarMarcador(lat, lng) {
    mapP.setView([lat, lng], 16);
    markerP.setLatLng([lat, lng]);
}

// --- 3. UBICACIÓN MANUAL SEGÚN INTERFAZ NUEVA ---
function ubicarManual(tipo) {
    let lat, lng;
    if(tipo === 'ini') {
        lat = parseFloat(document.getElementById('manual-lat-ini').value);
        lng = parseFloat(document.getElementById('manual-lng-ini').value);
    } else {
        lat = parseFloat(document.getElementById('manual-lat-fin').value);
        lng = parseFloat(document.getElementById('manual-lng-fin').value);
    }

    if (!isNaN(lat) && !isNaN(lng)) {
        actualizarMarcador(lat, lng);
    } else {
        alert("Ingrese coordenadas válidas.");
    }
}

// --- 4. MARCADO DE PUNTOS FIJOS (CHINCHETAS) ---
function marcarGPS(tipo) {
    let p = markerP.getLatLng();
    let lat = Number(p.lat.toFixed(6));
    let lng = Number(p.lng.toFixed(6));

    if (tipo === 'ini') {
        if (markerIni) mapP.removeLayer(markerIni);
        markerIni = L.marker([lat, lng], {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
                iconSize: [25, 41], iconAnchor: [12, 41]
            })
        }).addTo(mapP);
        gpsIni = lat + ", " + lng; latIni = lat; lngIni = lng;
        document.getElementById('display-lat-ini').innerText = lat.toFixed(5);
    } else {
        if (markerFin) mapP.removeLayer(markerFin);
        markerFin = L.marker([lat, lng], {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                iconSize: [25, 41], iconAnchor: [12, 41]
            })
        }).addTo(mapP);
        gpsFin = lat + ", " + lng; latFin = lat; lngFin = lng;
        document.getElementById('display-lat-fin').innerText = lat.toFixed(5);
    }
}

// --- 5. MÁSCARA DE MONEDA ---
function formatearMoneda(input) {
    let valor = input.value.replace(/[^\d]/g, ""); // Solo números
    if (valor === "") { input.value = ""; return; }
    input.value = "L. " + Number(valor).toLocaleString('en-US');
}

// --- 6. LOGICA DE ENVIO Y PDF (SE MANTIENE TU ESTRUCTURA) ---
async function enviarArchivoAR2(archivo, nombre, tipo) {
    try {
        await fetch("https://api-poda.proyectos-jdop.workers.dev/upload", {
            method: "POST",
            headers: { "X-File-Name": nombre, "X-File-Type": tipo },
            body: archivo
        });
    } catch (e) { console.error("Error R2:", e); }
}

async function generarPDFPoda() {
    const numEnergis = document.getElementById('poda-energis').value.trim();
    if (!numEnergis) { alert("Ingrese el Número de Reporte."); return; }

    // Limpiar formato de moneda para guardar solo números en la BD
    const pagoMO_raw = document.getElementById('pago-mo').value.replace(/[^\d]/g, "");
    const pagoTrans_raw = document.getElementById('pago-trans').value.replace(/[^\d]/g, "");

    const nombreArchivoFinal = `Reporte_ENERGIS_${numEnergis}.pdf`;

    const datosRespaldo = {
        sector: sectorActivo,
        circuito: document.getElementById('poda-circuito').value,
        zona: document.getElementById('poda-zona').value,
        fecha: document.getElementById('poda-fecha').value,
        personas: document.getElementById('poda-personas').value,
        brecha: document.getElementById('m-brecha').value,
        poda: document.getElementById('m-poda').value,
        postes: document.getElementById('m-postes').value,
        pago_mo: pagoMO_raw,
        pago_trans: pagoTrans_raw,
        gps_ini: gpsIni,
        gps_fin: gpsFin,
        resp_super: document.getElementById('resp-super').value,
        resp_activ: document.getElementById('resp-activ').value,
        reporte_energis: numEnergis
    };

    // Envío a D1
    try {
        await fetch("https://api-poda.proyectos-jdop.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datosRespaldo)
        });
    } catch (e) { console.error("D1 Error"); }

    // Lógica de PDF... (aquí sigue tu código de jsPDF igual que antes)
    // Asegúrate de usar las variables latIni, lngIni para el conversor UTM que ya tienes.
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // ... resto de tu código de generación de PDF ...
    
    const pdfBlobResult = doc.output('blob');
    await enviarArchivoAR2(pdfBlobResult, nombreArchivoFinal, "application/pdf");
    doc.save(nombreArchivoFinal);
    alert("✅ Proceso completado exitosamente.");
}

function previsualizar(input, idContenedor) {
    const contenedor = document.getElementById(idContenedor);
    contenedor.innerHTML = "";
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.width = "100%"; img.style.height = "100%";
            img.style.objectFit = "cover";
            contenedor.appendChild(img);
        }
        reader.readAsDataURL(input.files[0]);
    }
}
