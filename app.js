// --- PARTE 1: CONFIGURACIÓN Y ACCESO ---
var mapP, markerP;
var gpsIni = "No marcado", gpsFin = "No marcado";
var latIni = null, lngIni = null;
var latFin = null, lngFin = null;
var sectorActivo = "";

// Diccionario de usuarios y contraseñas
const USUARIOS = {
    "admin": "admin123",
    "brus laguna": "enee2026",
    "choluteca": "enee2026",
    "comayagua": "enee2026",
    "danli": "enee2026",
    "el progreso": "enee2026",
    "juticalpa": "enee2026",
    "la ceiba": "enee2026",
    "san pedro sula": "enee2026",
    "santa barbara": "enee2026",
    "santa rosa": "enee2026",
    "santa cruz": "enee2026",
    "tegucigalpa": "enee2026",
    "tocoa": "enee2026"
};

// URL de tu Worker en Cloudflare
const API_URL = "https://api-poda.proyectos-jdop.workers.dev/";

function validarLogin() {
    const u = document.getElementById('user').value.toLowerCase();
    const p = document.getElementById('pass').value;

    if (USUARIOS[u] && USUARIOS[u] === p) {
        sectorActivo = u.toUpperCase();
        document.getElementById('login-container').style.display = 'none';
        
        if (u === "admin") {
            // Activa el Panel Admin si el usuario es administrador
            document.getElementById('admin-panel-container').style.display = 'block';
            cargarDatosAdmin();
        } else {
            // Activa el Formulario de Poda para los sectores
            document.getElementById('form-poda-container').style.display = 'block';
            document.getElementById('user-display').innerText = "Sector: " + sectorActivo;
            initMapPoda();
        }
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

async function cargarDatosAdmin() {
    const tbody = document.getElementById('admin-tbody');
    tbody.innerHTML = "<tr><td colspan='7' style='padding:20px; text-align:center;'>Cargando base de datos central...</td></tr>";

    try {
        const res = await fetch(API_URL);
        const datos = await res.json();
        tbody.innerHTML = ""; 

        datos.forEach(f => {
            const fila = `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 8px;">${f.fecha_registro}</td>
                    <td><b>${f.sector}</b></td>
                    <td>${f.circuito}</td>
                    <td>${f.m_brecha}m</td>
                    <td>${f.m_poda}m</td>
                    <td>L. ${f.pago_mo}</td>
                    <td><a href="https://www.google.com/maps?q=${f.gps_inicio}" target="_blank" style="color:#2980b9; font-weight:bold;">📍 Ver</a></td>
                </tr>
            `;
            tbody.innerHTML += fila;
        });
    } catch (e) {
        tbody.innerHTML = "<tr><td colspan='7' style='color:red; text-align:center;'>Error de conexión con la base de datos.</td></tr>";
    }
}

// --- PARTE 2: MAPAS Y MULTIMEDIA ---
function initMapPoda() {
    if (mapP) mapP.remove();
    mapP = L.map('map-poda').setView([14.65, -86.21], 15);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri'
    }).addTo(mapP);
    markerP = L.marker([14.65, -86.21], { draggable: true }).addTo(mapP);
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            actualizarMarcador(pos.coords.latitude, pos.coords.longitude);
        }, null, {enableHighAccuracy: true});
    }
    setTimeout(() => mapP.invalidateSize(), 300);
}

function actualizarMarcador(lat, lng) {
    mapP.setView([lat, lng], 17);
    markerP.setLatLng([lat, lng]);
}

function ingresarManual() {
    const lat = parseFloat(document.getElementById('manual-lat').value);
    const lng = parseFloat(document.getElementById('manual-lng').value);
    if (!isNaN(lat) && !isNaN(lng)) actualizarMarcador(lat, lng);
}

function marcarGPS(tipo) {
    let p = markerP.getLatLng();
    let c = p.lat.toFixed(6) + ", " + p.lng.toFixed(6);
    if (tipo === 'ini') { gpsIni = c; latIni = p.lat; lngIni = p.lng; } 
    else { gpsFin = c; latFin = p.lat; lngFin = p.lng; }
    document.getElementById('coords-display').innerText = `Inicio: ${gpsIni} | Fin: ${gpsFin}`;
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
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// --- PARTE 3: RESPALDO Y GENERACIÓN DE PDF COMPLETO ---

// Función para guardar los datos en Cloudflare D1
async function respaldarEnCloudflare() {
    const datosRespaldo = {
        sector: sectorActivo,
        circuito: document.getElementById('poda-circuito').value,
        zona: document.getElementById('poda-zona').value,
        fecha: document.getElementById('poda-fecha').value,
        personas: document.getElementById('poda-personas').value,
        brecha: document.getElementById('m-brecha').value,
        poda: document.getElementById('m-poda').value,
        postes: document.getElementById('m-postes').value,
        pago_mo: document.getElementById('pago-mo').value,
        pago_trans: document.getElementById('pago-trans').value,
        gps_ini: gpsIni,
        gps_fin: gpsFin,
        resp_super: document.getElementById('resp-super').value,
        resp_activ: document.getElementById('resp-activ').value
    };

    try {
        await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datosRespaldo)
        });
        console.log("✅ Respaldo exitoso en la base de datos central");
    } catch (e) {
        console.error("❌ Error de red al respaldar, pero se procederá con el PDF:", e);
    }
}

async function generarPDFPoda() {
    // 1. Ejecutar respaldo automático antes de generar el PDF
    await respaldarEnCloudflare();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const logoUrl = "https://raw.githubusercontent.com/proyectosjdop-alfa/app_poda/refs/heads/main/imagenes/UTCD%20Vertical.png";

    // Función para obtener la imagen y convertirla a base64
    const getLogoBase64 = (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = url;
        });
    };

    const logoImg = await getLogoBase64(logoUrl);

    const dibujarEstructuraInstitucional = () => {
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.rect(5, 5, 200, 287); 

        doc.setLineWidth(0.3);
        doc.rect(10, 10, 190, 25); 

        doc.line(60, 10, 60, 35);  
        doc.line(150, 10, 150, 35); 
        doc.line(170, 10, 170, 35);
        doc.line(150, 18, 200, 18);
        doc.line(150, 26, 200, 26);

        if (logoImg) {
            doc.addImage(logoImg, 'PNG', 12, 12, 45, 20);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("INFORME DE PODA COMUNITARIA", 105, 19, {align: "center"});
        doc.text("SECTOR: " + sectorActivo, 105, 27, {align: "center"});

        doc.setFontSize(8);
        doc.text("Código", 152, 15);
        doc.text("Versión", 152, 23);
        doc.setFont("helvetica", "normal");
        doc.text("1", 185, 23, {align: "center"}); 
        doc.setFont("helvetica", "bold");
        doc.text("Fecha", 152, 31);
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

    // --- PÁGINA 1 ---
    dibujarEstructuraInstitucional();
    doc.setLineWidth(0.2);
    doc.rect(10, 40, 190, 45); 
    doc.setFontSize(9);
    let yD = 47;

    doc.setFont("helvetica", "bold");
    doc.text("CIRCUITO:", 15, yD);
    doc.setFont("helvetica", "normal");
    doc.text(document.getElementById('poda-circuito').value, 41, yD);

    doc.setFont("helvetica", "bold");
    doc.text("ZONA DE TRABAJO:", 100, yD);
    doc.setFont("helvetica", "normal");
    doc.text(document.getElementById('poda-zona').value, 133, yD);
    yD += 6;

    doc.setFont("helvetica", "bold");
    doc.text("FECHA:", 15, yD);
    doc.setFont("helvetica", "normal");
    let fechaInput = document.getElementById('poda-fecha').value; 
    let fechaFormateada = "";
    if(fechaInput) {
        const [anio, mes, dia] = fechaInput.split("-");
        fechaFormateada = `${dia}-${mes}-${anio}`;
    }
    doc.text(fechaFormateada, 41, yD);

    doc.setFont("helvetica", "bold");
    doc.text("HORARIO:", 100, yD);
    doc.setFont("helvetica", "normal");
    let horario = `H.INICIO ${document.getElementById('h-ini').value}  / H.FINAL ${document.getElementById('h-fin').value}`;
    doc.text(horario.substring(0, 55), 133, yD);
    yD += 6;

    // Conversión UTM para Reporte
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
        const M = a * ((1 - eccSquared / 4 - 3 * eccSquared * eccSquared / 64 - 5 * eccSquared * eccSquared * eccSquared / 256) * latRad - (3 * eccSquared / 8 + 3 * eccSquared * eccSquared / 32 + 45 * eccSquared * eccSquared * eccSquared / 1024) * Math.sin(2 * latRad) + (15 * eccSquared * eccSquared / 256 + 45 * eccSquared * eccSquared * eccSquared / 1024) * Math.sin(4 * latRad) - (35 * eccSquared * eccSquared * eccSquared / 3072) * Math.sin(6 * latRad));
        const easting = (k0 * N * (A + (1 - T + C) * A * A * A / 6 + (5 - 18 * T + T * T + 72 * C - 58 * eccSquared) * A * A * A * A * A / 120) + 500000.0);
        const northing = (k0 * (M + N * Math.tan(latRad) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A * A * A * A / 24 + (61 - 58 * T + T * T + 600 * C - 330 * eccSquared) * A * A * A * A * A * A / 720)));
        return `${Math.round(easting)}, ${Math.round(northing)}`;
    };

    let utmIniReporte = convertirA_UTM(latIni, lngIni);
    let utmFinReporte = convertirA_UTM(latFin, lngFin);

    doc.setFont("helvetica", "bold");
    doc.text("P. GPS INICIAL:", 15, yD);
    doc.setFont("helvetica", "normal");
    doc.text(`${utmIniReporte}`, 41, yD);

    doc.setFont("helvetica", "bold");
    doc.text("P. GPS FINAL:", 100, yD);
    doc.setFont("helvetica", "normal");
    doc.text(`${utmFinReporte}`, 133, yD);
    yD += 6;

    doc.setFont("helvetica", "bold");
    doc.text("PERSONAS CONTRATADAS:", 15, yD);
    doc.setFont("helvetica", "normal");
    doc.text(document.getElementById('poda-personas').value, 60, yD);

    doc.setFont("helvetica", "bold");
    doc.text("RESPONSABLES:", 100, yD); 
    doc.setFont("helvetica", "normal");
    let resps = `${document.getElementById('resp-super').value} / ${document.getElementById('resp-activ').value}`;
    doc.text(resps.substring(0, 55), 133, yD);
    yD += 6;

    doc.setFont("helvetica", "bold");
    doc.text("PAGO MANO DE OBRA:", 15, yD);
    doc.setFont("helvetica", "normal");
    doc.text(`L. ${document.getElementById('pago-mo').value}`, 60, yD);
    yD += 6;

    doc.setFont("helvetica", "bold");
    doc.text("PAGO TRANSPORTE:", 15, yD);
    doc.setFont("helvetica", "normal");
    doc.text(`L. ${document.getElementById('pago-trans').value}`, 60, yD);
    yD += 6;

    doc.setFont("helvetica", "bold");
    doc.text("TRABAJO EJECUTADO:", 15, yD);
    doc.setFont("helvetica", "normal");
    let trabajo = `Brecha: ${document.getElementById('m-brecha').value}m, Poda: ${document.getElementById('m-poda').value}m, Postes: ${document.getElementById('m-postes').value}`;
    doc.text(trabajo, 60, yD);

    const fGrupo = await leerFoto('f-grupo');
    const fVehiculo = await leerFoto('f-vehiculo');

    if (fGrupo) {
        doc.setFont("helvetica", "bold"); doc.text("FOTO GRUPO", 90, 93);
        doc.addImage(fGrupo, 'JPEG', 25, 95, 160, 95);
        doc.rect(25, 95, 160, 95);
    }
    if (fVehiculo) {
        doc.setFont("helvetica", "bold"); 
        doc.text("FOTO VEHÍCULO", 105, 200, { align: "center" });
        const vFotoW = 80; const vFotoH = 85; 
        const centerX = (210 - vFotoW) / 2;
        doc.addImage(fVehiculo, 'JPEG', centerX, 202, vFotoW, vFotoH);
        doc.rect(centerX, 202, vFotoW, vFotoH);
    }

    // PÁGINA DNI LÍDER
    const fLiderF = await leerFoto('f-lider-f');
    const fLiderR = await leerFoto('f-lider-r');
    if (fLiderF || fLiderR) {
        doc.addPage();
        dibujarEstructuraInstitucional();
        const cardW = 85; const cardH = 54; const centerX = (210 - cardW) / 2;
        if (fLiderF) {
            doc.setFont("helvetica", "bold");
            doc.text("DNI LÍDER - FRONTAL", 105, 55, {align: "center"});
            doc.addImage(fLiderF, 'JPEG', centerX, 60, cardW, cardH);
            doc.rect(centerX, 60, cardW, cardH);
        }
        if (fLiderR) {
            doc.setFont("helvetica", "bold");
            doc.text("DNI LÍDER - REVÉS", 105, 135, {align: "center"});
            doc.addImage(fLiderR, 'JPEG', centerX, 140, cardW, cardH);
            doc.rect(centerX, 140, cardW, cardH);
        }
    }

    // IDENTIDADES GRUPALES
    const identidades = [
        {id:'f-id-f', t:'DNI PERSONAL FRENTE (1)'}, 
        {id:'f-id-r', t:'DNI PERSONAL REVÉS (1)'},
        {id:'f-id-f2', t:'DNI PERSONAL FRENTE (2)'}, 
        {id:'f-id-r2', t:'DNI PERSONAL REVÉS (2)'}
    ];
    for(let p of identidades){
        const img = await leerFoto(p.id);
        if(img) {
            doc.addPage();
            dibujarEstructuraInstitucional();
            doc.setFont("helvetica", "bold");
            doc.text(p.t, 105, 45, {align: "center"});
            doc.addImage(img, 'JPEG', 15, 50, 180, 230);
            doc.rect(15, 50, 180, 230);
        }
    }

    // FOTOS ANTES, DURANTE Y DESPUÉS
    doc.addPage();
    dibujarEstructuraInstitucional();
    const secciones = [
        {t:"FOTOS ANTES", ids:['f-ini-1','f-ini-2','f-ini-3']},
        {t:"FOTOS DURANTE", ids:['f-eje-1','f-eje-2','f-eje-3']},
        {t:"FOTOS DESPUÉS", ids:['f-fin-1','f-fin-2','f-fin-3']}
    ];
    let yImg = 45;
    for(let s of secciones){
        doc.setFont("helvetica", "bold"); doc.text(s.t, 15, yImg);
        yImg += 5; let xImg = 10;
        for(let id of s.ids){
            const img = await leerFoto(id);
            if(img){ doc.addImage(img, 'JPEG', xImg, yImg, 62, 70); doc.rect(xImg, yImg, 62, 70); }
            xImg += 64;
        }
        yImg += 75;
    }

    doc.save(`Informe_Poda_${sectorActivo}.pdf`);
}
