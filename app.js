var mapP, markerP;
var gpsIni = "No marcado", gpsFin = "No marcado";
var latIni = null, lngIni = null;
var latFin = null, lngFin = null;
var sectorActivo = "";

// CREDENCIALES
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

async function generarPDFPoda() {
    try { enviarDatosCloudflare(); } catch(e) {}

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
        // Marco de la hoja
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.rect(5, 5, 200, 287); 

        // Cajetín encabezado
        doc.setLineWidth(0.3);
        doc.rect(10, 10, 190, 25); 

        doc.line(60, 10, 60, 35);  
        doc.line(150, 10, 150, 35); 
        doc.line(170, 10, 170, 35);
        doc.line(150, 18, 200, 18);
        doc.line(150, 26, 200, 26);

        // Logo insertado en la celda izquierda
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

    // PÁGINA 1
    // --- CONFIGURACIÓN INICIAL ---
    dibujarEstructuraInstitucional();
    doc.setLineWidth(0.2);
    // Dibujamos el rectángulo (ajusté el alto a 50 por si acaso)
    doc.rect(10, 40, 190, 45); 
    doc.setFontSize(9);
    let yD = 47;

    // --- FILA 1: CIRCUITO Y ZONA DE TRABAJO ---
    doc.setFont("helvetica", "bold");
    doc.text("CIRCUITO:", 15, yD);
    doc.setFont("helvetica", "normal");
    doc.text(document.getElementById('poda-circuito').value, 41, yD);

    doc.setFont("helvetica", "bold");
    doc.text("ZONA DE TRABAJO:", 100, yD);
    doc.setFont("helvetica", "normal");
    doc.text(document.getElementById('poda-zona').value, 133, yD);
    yD += 6;

    // --- FILA 2: FECHA Y HORARIO ---
    doc.setFont("helvetica", "bold");
    doc.text("FECHA:", 15, yD);
    doc.setFont("helvetica", "normal");
    doc.text(document.getElementById('poda-fecha').value, 41, yD);

    doc.setFont("helvetica", "bold");
    doc.text("HORARIO:", 100, yD);
    doc.setFont("helvetica", "normal");
    let horario = `H.INICIO ${document.getElementById('h-ini').value}  / H.FINAL ${document.getElementById('h-fin').value}`;
    doc.text(horario.substring(0, 55), 133, yD); // Acortamos un poco por si son muy largos
    yD += 6;

    // --- FILA 3: GPS ---
    doc.setFont("helvetica", "bold");
    doc.text("P. GPS INICIAL:", 15, yD);
    doc.setFont("helvetica", "normal");
    doc.text(` ${gpsIni}`, 40, yD);

    doc.setFont("helvetica", "bold");
    doc.text("P. GPS FINAL:", 100, yD);
    doc.setFont("helvetica", "normal");
    doc.text(` ${gpsFin}`, 133, yD);
    yD += 6;

    // --- FILA 4: TRABAJO EJECUTADO ---
    doc.setFont("helvetica", "bold");
    doc.text("TRABAJO EJECUTADO:", 15, yD);
    doc.setFont("helvetica", "normal");
    let trabajo = `Brecha: ${document.getElementById('m-brecha').value}m, Poda: ${document.getElementById('m-poda').value}m, Postes: ${document.getElementById('m-postes').value}`;
    doc.text(trabajo, 60, yD);
    yD += 6;

    // --- FILA 5: PERSONAS Y RESPONSABLES ---
    doc.setFont("helvetica", "bold");
    doc.text("PERSONAS CONTRATADAS:", 15, yD);
    doc.setFont("helvetica", "normal");
    doc.text(document.getElementById('poda-personas').value, 60, yD);

    doc.setFont("helvetica", "bold");
    doc.text("RESPONSABLES:", 100, yD); // X=100 para que quepan bien los nombres
    doc.setFont("helvetica", "normal");
    let resps = `${document.getElementById('resp-super').value} / ${document.getElementById('resp-activ').value}`;
    doc.text(resps.substring(0, 55), 133, yD); // Acortamos un poco por si son muy largos
    yD += 6;

    // --- FILA 6: PAGO MANO DE OBRA ---
    doc.setFont("helvetica", "bold");
    doc.text("PAGO MANO DE OBRA:", 15, yD);
    doc.setFont("helvetica", "normal");
    doc.text(`L. ${document.getElementById('pago-mo').value}`, 60, yD);
    yD += 6;

    // --- FILA 7: PAGO TRANSPORTE ---
    doc.setFont("helvetica", "bold");
    doc.text("PAGO TRANSPORTE:", 15, yD);
    doc.setFont("helvetica", "normal");
    doc.text(`L. ${document.getElementById('pago-trans').value}`, 60, yD);

    const fGrupo = await leerFoto('f-grupo');
    const fVehiculo = await leerFoto('f-vehiculo');

    if (fGrupo) {
        doc.setFont("helvetica", "bold"); doc.text("FOTO GRUPO", 90, 93);
        doc.addImage(fGrupo, 'JPEG', 25, 95, 160, 95);
        doc.rect(25, 95, 160, 95);
    }
   if (fVehiculo) {
        // Título de la foto
        doc.setFont("helvetica", "bold"); 
        doc.text("FOTO VEHÍCULO", 105, 200, { align: "center" }); // Título centrado

        // Dimensiones para el formato Vertical (Retrato)
        const vFotoW = 80; // Ancho reducido (mm)
        const vFotoH = 85; // Alto aumentado (mm)
        const centerX = (210 - vFotoW) / 2; // Cálculo para centrar en la hoja

        // Insertar la imagen y el borde (rectángulo)
        doc.addImage(fVehiculo, 'JPEG', centerX, 202, vFotoW, vFotoH);
        doc.rect(centerX, 202, vFotoW, vFotoH); // Borde ajustado a la nueva medida
    }

    // --- PÁGINA 2: DNI LÍDER (Centrado y tamaño ID) ---
const fLiderF = await leerFoto('f-lider-f');
const fLiderR = await leerFoto('f-lider-r');

if (fLiderF || fLiderR) {
    doc.addPage();
    dibujarEstructuraInstitucional();

    const cardW = 85; // Ancho estándar ID mm
    const cardH = 54; // Alto estándar ID mm
    const centerX = (210 - cardW) / 2;

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

// --- ACTUALIZACIÓN DE IDENTIDADES GRUPALES ---
// Reemplaza tu bucle anterior de 'ids' por este que incluye las 4 fotos:
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
        doc.addImage(img, 'JPEG', 15, 50, 180, 230); // Estas siguen ocupando la hoja
        doc.rect(15, 50, 180, 230);
    }
}

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

function enviarDatosCloudflare() {
    const data = {
        sector: sectorActivo,
        circuito: document.getElementById('poda-circuito').value,
        zona_trabajo: document.getElementById('poda-zona').value,
        fecha_envio: new Date().toISOString()
    };
    fetch("https://api-cuadrillas.cgujuticalpa.workers.dev/", {
        method: "POST",
        mode: "no-cors", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    }).catch(() => {}); 
}
