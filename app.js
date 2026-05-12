var mapP, markerP;
var gpsIni = "No marcado", gpsFin = "No marcado";
var latIni = null, lngIni = null;
var latFin = null, lngFin = null;
var sectorActivo = "";

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
            actualizarMarcador(pos.coords.latitude, pos.coords.longitude);
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
    if (!isNaN(lat) && !isNaN(lng)) actualizarMarcador(lat, lng);
}

function marcarGPS(tipo) {
    let p = markerP.getLatLng();
    let lat = p.lat; let lng = p.lng;
    try {
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
        let textoUTM = `Z:16N E:${Math.round(easting)} N:${Math.round(northing)}`;
        if (tipo === 'ini') { gpsIni = textoUTM; latIni = lat; lngIni = lng; } 
        else { gpsFin = textoUTM; latFin = lat; lngFin = lng; }
        document.getElementById('coords-display').innerText = `Inicio: ${gpsIni} | Fin: ${gpsFin}`;
    } catch (e) { console.error(e); }
}

const leerFoto = (id) => {
    const el = document.getElementById(id);
    if (!el || !el.files || !el.files[0]) return null;
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(el.files[0]);
    });
};

async function generarPDFPoda() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const logoUrl = "https://raw.githubusercontent.com/proyectosjdop-alfa/app_poda/refs/heads/main/imagenes/UTCD%20Vertical.png";

    const getLogoBase64 = (url) => {
        return new Promise((resolve) => {
            const img = new Image(); img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width; canvas.height = img.height;
                const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = url;
        });
    };

    const logoImg = await getLogoBase64(logoUrl);
    const dibujarEncabezado = () => {
        doc.setDrawColor(0); doc.setLineWidth(0.5); doc.rect(5, 5, 200, 287);
        doc.setLineWidth(0.3); doc.rect(10, 10, 190, 25);
        doc.line(60, 10, 60, 35); doc.line(150, 10, 150, 35); doc.line(170, 10, 170, 35);
        doc.line(150, 18, 200, 18); doc.line(150, 26, 200, 26);
        if (logoImg) doc.addImage(logoImg, 'PNG', 12, 12, 45, 20);
        doc.setFont("helvetica", "bold"); doc.setFontSize(11);
        doc.text("INFORME DE PODA COMUNITARIA", 105, 19, {align: "center"});
        doc.text("SECTOR: " + sectorActivo, 105, 27, {align: "center"});
    };

    dibujarEncabezado();
    doc.setLineWidth(0.2); doc.rect(10, 40, 190, 45);
    doc.setFontSize(9);
    let y = 47;
    const txt = (l, v, curY) => { doc.setFont("helvetica", "bold"); doc.text(l, 15, curY); doc.setFont("helvetica", "normal"); doc.text(String(v || ""), 52, curY); };
    
    txt("CIRCUITO:", document.getElementById('poda-circuito').value, y); y+=6;
    txt("ZONA:", document.getElementById('poda-zona').value, y); y+=6;
    txt("HORARIO:", `${document.getElementById('h-ini').value} a ${document.getElementById('h-fin').value}`, y); y+=6;
    txt("TRABAJO:", `B: ${document.getElementById('m-brecha').value}m / P: ${document.getElementById('m-poda').value}m / Postes: ${document.getElementById('m-postes').value}`, y); y+=6;
    txt("PAGOS:", `MO: L${document.getElementById('pago-mo').value} / Trans: L${document.getElementById('pago-trans').value}`, y); y+=6;
    txt("GPS UTM:", `Ini: ${gpsIni} | Fin: ${gpsFin}`, y); y+=6;
    txt("RESPONSABLES:", document.getElementById('resp-super').value, y);

    const fG = await leerFoto('f-grupo');
    const fV = await leerFoto('f-vehiculo');
    if(fG) { doc.text("FOTO GRUPO", 90, 93); doc.addImage(fG, 'JPEG', 25, 95, 160, 95); doc.rect(25, 95, 160, 95); }
    if(fV) { doc.text("FOTO VEHÍCULO", 105, 200, {align:"center"}); doc.addImage(fV, 'JPEG', 65, 202, 80, 85); doc.rect(65, 202, 80, 85); }

    const flf = await leerFoto('f-lider-f'); const flr = await leerFoto('f-lider-r');
    if(flf || flr){
        doc.addPage(); dibujarEncabezado();
        if(flf){ doc.text("DNI LÍDER FRENTE", 105, 50, {align:"center"}); doc.addImage(flf, 'JPEG', 62, 55, 85, 54); doc.rect(62, 55, 85, 54); }
        if(flr){ doc.text("DNI LÍDER REVÉS", 105, 130, {align:"center"}); doc.addImage(flr, 'JPEG', 62, 135, 85, 54); doc.rect(62, 135, 85, 54); }
    }

    const dnis = ['f-id-f', 'f-id-r', 'f-id-f2', 'f-id-r2'];
    for(let id of dnis){
        const img = await leerFoto(id);
        if(img){ doc.addPage(); dibujarEncabezado(); doc.text("DNI PERSONAL", 105, 45, {align:"center"}); doc.addImage(img, 'JPEG', 15, 50, 180, 230); doc.rect(15, 50, 180, 230); }
    }

    doc.addPage(); dibujarEncabezado();
    const secciones = [
        { t: "FOTOS ANTES", ids: ['f-ini-1', 'f-ini-2', 'f-ini-3'] },
        { t: "FOTOS DURANTE", ids: ['f-eje-1', 'f-eje-2', 'f-eje-3'] },
        { t: "FOTOS DESPUÉS", ids: ['f-fin-1', 'f-fin-2', 'f-fin-3'] }
    ];
    let yImg = 45;
    for (let s of secciones) {
        doc.setFont("helvetica", "bold"); doc.text(s.t, 15, yImg);
        yImg += 5; let xImg = 10;
        for (let id of s.ids) {
            const img = await leerFoto(id);
            if (img) { doc.addImage(img, 'JPEG', xImg, yImg, 62, 70); doc.rect(xImg, yImg, 62, 70); }
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
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result; img.style.width = "100%"; img.style.height = "100%";
            img.style.objectFit = "cover"; img.style.borderRadius = "4px";
            contenedor.appendChild(img);
        }
        reader.readAsDataURL(input.files[0]);
    }
}
