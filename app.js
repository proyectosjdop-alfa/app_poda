var mapP, markerP;
var markerIni, markerFin; 
var gpsIni = "No marcado", gpsFin = "No marcado";
var latIni = null, lngIni = null;
var latFin = null, lngFin = null;
var sectorActivo = "";
let CIRCUITOS_DATABASE = {}; 

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
        console.log("✅ Circuitos sincronizados");
        
        // Si el usuario ya se logueó pero los circuitos tardaron en cargar, actualizamos
        if(sectorActivo) actualizarListaCircuitos(sectorActivo);
    } catch (error) {
        console.error("❌ Error cargando circuitos:", error);
    }
}

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
        
        actualizarListaCircuitos(sectorActivo); 
        initMapPoda();
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function actualizarListaCircuitos(sector) {
    const select = document.getElementById('poda-circuito');
    if (!select) return;
    
    select.innerHTML = '<option value="">Seleccione un circuito...</option>';
    const lista = CIRCUITOS_DATABASE[sector] || [];
    
    if (lista.length === 0) {
        select.innerHTML = '<option value="">Cargando o sin datos...</option>';
        return;
    }

    lista.forEach(c => {
        let opt = document.createElement('option');
        opt.value = c;
        opt.innerText = c;
        select.appendChild(opt);
    });
}

// --- 2. MAPA Y GEOPOSICIÓN ---
async function initMapPoda() {
    if (mapP) mapP.remove();
    mapP = L.map('map-poda').setView([14.65, -86.21], 13);
    
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri'
    }).addTo(mapP);

    try {
        const geoRes = await fetch("https://raw.githubusercontent.com/proyectosjdop-alfa/app_poda/main/Circuitos%20Juticalpa.geojson");
        const geoData = await geoRes.json();
        L.geoJSON(geoData, { style: { color: "#f1c40f", weight: 2, opacity: 0.5 } }).addTo(mapP);
    } catch(e) { console.warn("GeoJSON no disponible"); }

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

function ubicarManual(tipo) {
    let lat, lng;
    if(tipo === 'ini') {
        lat = parseFloat(document.getElementById('manual-lat-ini').value);
        lng = parseFloat(document.getElementById('manual-lng-ini').value);
    } else {
        lat = parseFloat(document.getElementById('manual-lat-fin').value);
        lng = parseFloat(document.getElementById('manual-lng-fin').value);
    }
    if (!isNaN(lat) && !isNaN(lng)) { actualizarMarcador(lat, lng); }
}

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

function formatearMoneda(input) {
    let valor = input.value.replace(/[^\d]/g, ""); 
    if (valor === "") { input.value = ""; return; }
    input.value = "L. " + Number(valor).toLocaleString('en-US');
}

// --- 3. CONVERSOR UTM ---
const convertirA_UTM = (lat, lng) => {
    if (!lat || !lng) return "No marcado";
    const a = 6378137.0; const eccSquared = 0.00669438; const k0 = 0.9996;
    const zoneNumber = 16; const lonOrigin = (zoneNumber - 1) * 6 - 180 + 3;
    const latRad = lat * Math.PI / 180.0; const lonRad = lng * Math.PI / 180.0;
    const lonOriginRad = lonOrigin * Math.PI / 180.0;
    const N = a / Math.sqrt(1 - eccSquared * Math.sin(latRad) * Math.sin(latRad));
    const T = Math.tan(latRad) * Math.tan(latRad);
    const C = eccSquared * Math.cos(latRad) * Math.cos(latRad) / (1 - eccSquared);
    const A = Math.cos(latRad) * (lonRad - lonOriginRad);
    const M = a * ((1 - eccSquared / 4 - 3 * eccSquared * eccSquared / 64 - 5 * eccSquared * eccSquared / 256) * latRad - (3 * eccSquared / 8 + 3 * eccSquared * eccSquared / 32 + 45 * eccSquared * eccSquared * eccSquared / 1024) * Math.sin(2 * latRad) + (15 * eccSquared * eccSquared / 256 + 45 * eccSquared * eccSquared / 1024) * Math.sin(4 * latRad) - (35 * eccSquared * eccSquared * eccSquared / 3072) * Math.sin(6 * latRad));
    const easting = (k0 * N * (A + (1 - T + C) * A * A * A / 6 + (5 - 18 * T + T * T + 72 * C - 58 * eccSquared) * A * A * A * A * A / 120) + 500000.0);
    const northing = (k0 * (M + N * Math.tan(latRad) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A * A * A * A / 24 + (61 - 58 * T + T * T + 600 * C - 330 * eccSquared) * A * A * A * A * A * A / 720)));
    return `${Math.round(easting)}, ${Math.round(northing)}`;
};

// --- 4. ENVÍO Y PDF ---
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

    const nombreArchivoFinal = `Reporte_ENERGIS_${numEnergis}.pdf`;

    const datosRespaldo = {
        sector: sectorActivo,
        circuito: document.getElementById('poda-circuito').value,
        zona: document.getElementById('poda-zona').value,
        fecha_trabajo: document.getElementById('poda-fecha').value,
        cuadrilla_p: document.getElementById('poda-personas').value,
        m_brecha: document.getElementById('m-brecha').value,
        m_poda: document.getElementById('m-poda').value,
        m_postes: document.getElementById('m-postes').value,
        pago_mo: document.getElementById('pago-mo').value.replace(/[^\d]/g, ""),
        pago_transp: document.getElementById('pago-trans').value.replace(/[^\d]/g, ""),
        gps_inicio: gpsIni,
        gps_final: gpsFin,
        responsable_superv: document.getElementById('resp-super').value,
        responsable_contra: document.getElementById('resp-activ').value,
        reporte_energis: numEnergis
    };

    try {
        await fetch("https://api-poda.proyectos-jdop.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datosRespaldo)
        });
    } catch (e) { console.error("D1 Error", e); }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const logoUrl = "https://raw.githubusercontent.com/proyectosjdop-alfa/app_poda/refs/heads/main/imagenes/UTCD%20Vertical.png";

    const getLogoBase64 = (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width; canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = url;
        });
    };

    const logoImg = await getLogoBase64(logoUrl);

    const dibujarEstructura = () => {
        doc.setDrawColor(0); doc.setLineWidth(0.5); doc.rect(5, 5, 200, 287); 
        doc.setLineWidth(0.3); doc.rect(10, 10, 190, 25); 
        doc.line(60, 10, 60, 35); doc.line(150, 10, 150, 35); 
        if (logoImg) doc.addImage(logoImg, 'PNG', 12, 12, 45, 20);
        doc.setFont("helvetica", "bold"); doc.setFontSize(11);
        doc.text("INFORME DE PODA COMUNITARIA", 105, 19, {align: "center"});
        doc.text("SECTOR: " + sectorActivo, 105, 27, {align: "center"});
        doc.setFontSize(8); doc.text("ENERGIS: " + numEnergis, 152, 15);
    };

    const leerFoto = (id) => {
        const file = document.getElementById(id).files[0];
        if (!file) return null;
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    };

    dibujarEstructura();
    doc.setFontSize(9); doc.rect(10, 40, 190, 45);
    doc.text("CIRCUITO: " + document.getElementById('poda-circuito').value, 15, 47);
    doc.text("ZONA: " + document.getElementById('poda-zona').value, 100, 47);
    doc.text("GPS INICIO (UTM): " + convertirA_UTM(latIni, lngIni), 15, 54);
    doc.text("GPS FINAL (UTM): " + convertirA_UTM(latFin, lngFin), 100, 54);
    doc.text("PAGO MO: L. " + document.getElementById('pago-mo').value, 15, 61);
    doc.text("PAGO TRANS: L. " + document.getElementById('pago-trans').value, 100, 61);

    const fGrupo = await leerFoto('f-grupo');
    if (fGrupo) {
        doc.text("FOTO GRUPO", 105, 93, {align:"center"});
        doc.addImage(fGrupo, 'JPEG', 25, 95, 160, 95);
    }

    const pdfBlobResult = doc.output('blob');
    await enviarArchivoAR2(pdfBlobResult, nombreArchivoFinal, "application/pdf");
    doc.save(nombreArchivoFinal);
    alert("✅ Reporte generado y subido.");
}

function previsualizar(input, idContenedor) {
    const contenedor = document.getElementById(idContenedor);
    contenedor.innerHTML = "";
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.width = "100%"; img.style.height = "100%"; img.style.objectFit = "cover";
            contenedor.appendChild(img);
        }
        reader.readAsDataURL(input.files[0]);
    }
}
