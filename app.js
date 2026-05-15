var mapP, markerP;
var gpsIni = "No marcado", gpsFin = "No marcado";
var latIni = null, lngIni = null;
var latFin = null, lngFin = null;
var sectorActivo = "";

let fotoBlob = null; 

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

function validarLogin() {
    const u = document.getElementById('user').value.toLowerCase();
    const p = document.getElementById('pass').value;

    if (USUARIOS[u] && USUARIOS[u] === p) {
        sectorActivo = u.toUpperCase();
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('form-poda-container').style.display = 'block';
        document.getElementById('user-display').innerText = "Sector: " + sectorActivo;
        initMapPoda();
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function initMapPoda() {
    if (mapP) mapP.remove();
    mapP = L.map('map-poda').setView([14.65, -86.21], 15);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri'
    }).addTo(mapP);
    markerP = L.marker([14.65, -86.21], { draggable: true }).addTo(mapP);
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            let lat = pos.coords.latitude;
            let lng = pos.coords.longitude;
            actualizarMarcador(lat, lng);
        }, () => {}, {enableHighAccuracy: true});
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
    if (!isNaN(lat) && !isNaN(lng)) {
        actualizarMarcador(lat, lng);
    } else {
        alert("Por favor, ingrese valores numéricos válidos para Latitud y Longitud.");
    }
}

function marcarGPS(tipo) {
    let p = markerP.getLatLng();
    let lat = Number(p.lat.toFixed(6));
    let lng = Number(p.lng.toFixed(6));
    let c = lat + ", " + lng;
    if (tipo === 'ini') { gpsIni = c; latIni = lat; lngIni = lng; } 
    else { gpsFin = c; latFin = lat; lngFin = lng; }
    document.getElementById('coords-display').innerText = `Inicio: ${gpsIni} | Fin: ${gpsFin}`;
}

// --- FUNCIÓN PARA SUBIR ARCHIVOS A R2 ---
async function enviarArchivoAR2(archivo, nombre, tipo) {
    try {
        await fetch("https://api-poda.proyectos-jdop.workers.dev/upload", {
            method: "POST",
            headers: {
                "X-File-Name": nombre,
                "X-File-Type": tipo
            },
            body: archivo
        });
        console.log(`✅ Archivo ${nombre} subido a R2`);
    } catch (e) {
        console.error(`❌ Error subiendo ${nombre}:`, e);
    }
}

async function guardarEnBaseDeDatos(nombre, mensaje) {
    const urlApi = "https://api-poda.proyectos-jdop.workers.dev/guardar";
    try {
        await fetch(urlApi, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario: nombre, mensaje: mensaje })
        });
        console.log("Datos respaldados en Cloudflare");
    } catch (error) {
        console.error("Error de respaldo:", error);
    }
}

async function generarPDFPoda() {
    const numEnergis = document.getElementById('poda-energis').value.trim();
    
    if (!numEnergis) {
        alert("Por favor, ingrese el Número de Reporte ENERGIS.");
        return;
    }

    // 1. DEFINIR ID_UNICO (Sector_Reporte)
    const ID_UNICO = `${sectorActivo}_${numEnergis}`; 
    const nombreArchivoFinal = `Informe_${ID_UNICO}.pdf`;

    // --- VALIDACIÓN ÚNICA POR ENERGIS ---
    try {
        const checkRes = await fetch(`https://api-poda.proyectos-jdop.workers.dev/validar-energis?num=${numEnergis}`);
        const checkData = await checkRes.json();
        if (checkData.existe) {
            const confirmar = confirm(`El reporte ENERGIS ${numEnergis} ya existe. ¿Desea sustituirlo?`);
            if (!confirmar) return; 
        }
    } catch (error) {
        console.error("Error validando:", error);
    }

      // 1. Recopilar datos para el respaldo
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
        resp_activ: document.getElementById('resp-activ').value,
        reporte_energis: numEnergis
    };

    // 2. Enviar a Cloudflare D1
    try {
        await fetch("https://api-poda.proyectos-jdop.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datosRespaldo)
        });
        console.log("✅ Respaldo exitoso en D1");
    } catch (e) {
        console.error("❌ Falló el respaldo en D1:", e);
    }

    // 4. GENERACIÓN DEL PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const logoUrl = "https://raw.githubusercontent.com/proyectosjdop-alfa/app_poda/refs/heads/main/imagenes/UTCD%20Vertical.png";

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
        if (logoImg) { doc.addImage(logoImg, 'PNG', 12, 12, 45, 20); }
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

    doc.setFont("helvetica", "bold");
    doc.text("P. GPS INICIAL:", 15, yD);
    doc.setFont("helvetica", "normal");
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
    doc.text(`${convertirA_UTM(latIni, lngIni)}`, 41, yD);
    doc.setFont("helvetica", "bold");
    doc.text("P. GPS FINAL:", 100, yD);
    doc.setFont("helvetica", "normal");
    doc.text(`${convertirA_UTM(latFin, lngFin)}`, 133, yD);
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
        const vFotoW = 80; const vFotoH = 85; const centerX = (210 - vFotoW) / 2;
        doc.addImage(fVehiculo, 'JPEG', centerX, 202, vFotoW, vFotoH);
        doc.rect(centerX, 202, vFotoW, vFotoH);
    }

    // --- MANEJO DE IDENTIDADES Y OTRAS PÁGINAS (TUS BUCLES EXISTENTES) ---
    const fLiderF = await leerFoto('f-lider-f');
    const fLiderR = await leerFoto('f-lider-r');
    if (fLiderF || fLiderR) {
        doc.addPage(); dibujarEstructuraInstitucional();
        const cardW = 85; const cardH = 54; const centerX = (210 - cardW) / 2;
        if (fLiderF) {
            doc.setFont("helvetica", "bold"); doc.text("DNI LÍDER - FRONTAL", 105, 55, {align: "center"});
            doc.addImage(fLiderF, 'JPEG', centerX, 60, cardW, cardH); doc.rect(centerX, 60, cardW, cardH);
        }
        if (fLiderR) {
            doc.setFont("helvetica", "bold"); doc.text("DNI LÍDER - REVÉS", 105, 135, {align: "center"});
            doc.addImage(fLiderR, 'JPEG', centerX, 140, cardW, cardH); doc.rect(centerX, 140, cardW, cardH);
        }
    }

    const identidades = [
        {id:'f-id-f', t:'DNI PERSONAL FRENTE (1)'}, {id:'f-id-r', t:'DNI PERSONAL REVÉS (1)'},
        {id:'f-id-f2', t:'DNI PERSONAL FRENTE (2)'}, {id:'f-id-r2', t:'DNI PERSONAL REVÉS (2)'}
    ];
    for(let p of identidades){
        const img = await leerFoto(p.id);
        if(img) {
            doc.addPage(); dibujarEstructuraInstitucional();
            doc.setFont("helvetica", "bold"); doc.text(p.t, 105, 45, {align: "center"});
            doc.addImage(img, 'JPEG', 15, 50, 180, 230); doc.rect(15, 50, 180, 230);
        }
    }

    doc.addPage(); dibujarEstructuraInstitucional();
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

    // --- 3. SUBIDA AUTOMÁTICA A R2 (PDF y FOTO) ---
    // Subir el PDF
    try {
        const pdfBlobResult = doc.output('blob');
        await enviarArchivoAR2(pdfBlobResult, nombreArchivoFinal, "application/pdf");
    } catch (e) {
        console.error("Error subiendo a R2:", e);
    }

    // Descarga local
    doc.save(nombreArchivoFinal);
    alert("✅ Proceso completado para el ID: " + ID_UNICO);
}

function previsualizar(input, idContenedor) {
    const contenedor = document.getElementById(idContenedor);
    contenedor.innerHTML = "";
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.width = "100%"; img.style.height = "100%";
            img.style.objectFit = "cover"; img.style.borderRadius = "4px";
            contenedor.appendChild(img);
        }
        reader.readAsDataURL(input.files[0]);
    }
}
