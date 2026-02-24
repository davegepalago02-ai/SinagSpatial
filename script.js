/* 
  COPYRIGHT NOTICE
  (c) 2026 Engr. Dave U. Gepalago
  All Rights Reserved.
*/

// ============================================================
// 1. SERVICE REGISTRY
// ============================================================
const SERVICES = [
    {
        id: 'flood-risk',
        name: 'Flood Risk Simulator',
        status: 'ACTIVE',
        url: 'https://ee-dugproject.projects.earthengine.app/view/flood-risk-mapping',
        icon: 'fa-cloud-showers-heavy',
        color: 'text-radarGreen',
        desc: 'Hand Model & Rainfall Analysis'
    },
    {
        id: 'agri-health',
        name: 'AgriHealth Tracker',
        status: 'UPCOMING',
        icon: 'fa-wheat-awn',
        desc: 'NDVI/NDWI Crop Stress Monitoring',
        objective: 'Real-time monitoring of crop vigor and water stress across municipal farmlands.',
        analytics: ['Vegetation Index (NDVI)', 'Normalized Difference Water Index (NDWI)', 'Anomaly Detection'],
        sector: 'Department of Agriculture (DA), Rice Cooperatives'
    },
    {
        id: 'radar-shield',
        name: 'RadarShield',
        status: 'UPCOMING',
        icon: 'fa-tower-broadcast',
        desc: 'SAR Lodging Detection',
        objective: 'Post-disaster crop structure assessment using cloud-piercing radar technology.',
        analytics: ['Structural loss percentage', 'Inundated area calculation', 'Damage verification'],
        sector: 'PCIC (Insurance), Disaster Risk Reduction Offices'
    },
    {
        id: 'slope-guard',
        name: 'SlopeGuard',
        status: 'UPCOMING',
        icon: 'fa-mountain',
        desc: 'Landslide Susceptibility',
        objective: 'High-resolution terrain analysis to identify zones at risk of slope failure.',
        analytics: ['Slope gradient heatmaps', 'Soil moisture proxy', 'Precipitation threshold alerts'],
        sector: 'MGB (Mines and Geosciences Bureau), Urban Planning Offices'
    },
    {
        id: 'urban-pulse',
        name: 'UrbanPulse',
        status: 'UPCOMING',
        icon: 'fa-city',
        desc: 'Land Use Change',
        objective: 'Automated tracking of urban expansion and agricultural land conversion.',
        analytics: ['Multi-temporal LULC Classification', 'Forest cover loss', 'Built-up area growth'],
        sector: 'LGU Assessors, Environment & Natural Resources (DENR)'
    },
    {
        id: 'sky-audit',
        name: 'SkyAudit',
        status: 'UPCOMING',
        icon: 'fa-smog',
        desc: 'Air Quality Sentinel',
        objective: 'Atmospheric monitoring of industrial pollutants and greenhouse gases.',
        analytics: ['NO₂, SO₂, CO concentration', 'Pollution plume mapping', 'Air Quality Index'],
        sector: 'City Health Offices, Environmental Management Bureau'
    },
    {
        id: 'coastal-watch',
        name: 'CoastalWatch',
        status: 'UPCOMING',
        icon: 'fa-water',
        desc: 'Shoreline Monitoring',
        objective: 'Tracking coastal erosion and accretion rates using historical satellite imagery.',
        analytics: ['Shoreline change rate', 'Coastal vulnerability index'],
        sector: 'Maritime Agencies, Coastal LGUs'
    },
    {
        id: 'forest-eye',
        name: 'ForestEye',
        status: 'UPCOMING',
        icon: 'fa-tree',
        desc: 'Deforestation Alert',
        objective: 'Near real-time alert system for illegal logging activities.',
        analytics: ['Canopy disturbance', 'Road network expansion'],
        sector: 'DENR, Forest Rangers'
    },
    {
        id: 'heat-scan',
        name: 'HeatScan',
        status: 'UPCOMING',
        icon: 'fa-temperature-high',
        desc: 'Urban Heat Island',
        objective: 'Mapping surface temperature anomalies in dense urban areas.',
        analytics: ['Land Surface Temperature (LST)', 'Cooling center identification'],
        sector: 'City Planning, Public Health'
    },
    {
        id: 'aqua-track',
        name: 'AquaTrack',
        status: 'UPCOMING',
        icon: 'fa-droplet',
        desc: 'Water Quality',
        objective: 'Monitoring turbidity and chlorophyll levels in lakes and reservoirs.',
        analytics: ['Turbidity analysis', 'Algal bloom detection'],
        sector: 'Water Districts, Fisheries'
    }
];

// ============================================================
// 2. INITIALIZATION
// ============================================================
window.onload = function () {
    startClock();
    renderNavItems();

    // Check URL params to auto-open report modal
    const params = new URLSearchParams(window.location.search);
    if (params.has('muni')) {
        document.getElementById('in-muni').value = params.get('muni');
        document.getElementById('in-rain').value = params.get('rain') || '100';
        openReportModal();
        syncReport();
    }
};

// ============================================================
// 3. UI LOGIC — Drawer & Clock
// ============================================================
function toggleDrawer() {
    const drawer = document.getElementById('burger-drawer');
    const overlay = document.getElementById('drawer-overlay');

    if (drawer.classList.contains('-translate-x-full')) {
        drawer.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
    } else {
        drawer.classList.add('-translate-x-full');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}

function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function startClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('mission-clock').innerText =
            now.toLocaleTimeString('en-US', { hour12: false });
        document.getElementById('mission-date').innerText =
            now.toLocaleDateString('en-US', {
                weekday: 'short', year: 'numeric',
                month: 'short', day: 'numeric'
            }).toUpperCase();
    }, 1000);
}

// ============================================================
// 4. VIEW MANAGER
// ============================================================
function switchView(viewId) {
    ['view-home', 'view-simulator', 'view-mission-card'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });

    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('animate-fade-in');
    }

    if (viewId === 'view-home') {
        // Close drawer if open
        const drawer = document.getElementById('burger-drawer');
        if (drawer && !drawer.classList.contains('-translate-x-full')) {
            toggleDrawer();
        }
    }
}

// ============================================================
// 5. NAVIGATION RENDERER
// ============================================================
function renderNavItems() {
    const container = document.getElementById('nav-items-container');
    let html = '';

    SERVICES.forEach(service => {
        const opacity = service.status === 'UPCOMING' ? 'opacity-60 hover:opacity-100' : 'hover:scale-[1.02] shadow-lg bg-white/5';
        const cursor = service.status === 'UPCOMING' ? 'cursor-pointer' : 'cursor-pointer border-l-2 border-radarGreen';
        const iconColor = service.status === 'ACTIVE' ? 'text-radarGreen' : 'text-slate-400';
        const badge = service.status === 'UPCOMING'
            ? '<span class="text-[8px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">DEV</span>'
            : '<i class="fa-solid fa-circle-check text-radarGreen text-xs"></i>';

        html += `
            <div onclick="switchService('${service.id}')"
                 class="p-3 rounded-lg flex items-center gap-3 transition ${opacity} ${cursor} border border-transparent hover:border-radarGreen/30 hover:bg-white/5">
                <div class="w-8 h-8 rounded bg-black/40 flex items-center justify-center ${iconColor}">
                    <i class="fa-solid ${service.icon}"></i>
                </div>
                <div class="flex-grow">
                    <h4 class="font-bold text-sm text-slate-200">${service.name}</h4>
                    <p class="text-[9px] text-radarGreen/60 uppercase tracking-wider">${service.desc}</p>
                </div>
                ${badge}
            </div>
        `;
    });
    container.innerHTML = html;
}

function switchService(serviceId) {
    const service = SERVICES.find(s => s.id === serviceId);
    if (!service) return;
    toggleDrawer(); // Close menu

    document.getElementById('view-home').classList.add('hidden');

    if (service.id === 'flood-risk') {
        document.getElementById('view-simulator').classList.remove('hidden');
        document.getElementById('view-mission-card').classList.add('hidden');
    } else {
        document.getElementById('view-simulator').classList.add('hidden');
        document.getElementById('view-mission-card').classList.remove('hidden');
        renderMissionCard(service);
    }
}

function renderMissionCard(service) {
    const analyticsList = service.analytics
        .map(item => `<li class="flex items-center gap-2"><i class="fa-solid fa-microchip text-radarGreen"></i> ${item}</li>`)
        .join('');

    const html = `
        <div class="h-full flex items-center justify-center p-8">
            <div class="glass-card max-w-2xl w-full p-8 rounded-3xl relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-radarGreen to-transparent opacity-50"></div>

                <div class="flex items-center gap-4 mb-6">
                    <div class="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center border border-radarGreen/30 shadow-[0_0_20px_rgba(57,255,20,0.15)]">
                        <i class="fa-solid ${service.icon} text-3xl text-radarGreen"></i>
                    </div>
                    <div>
                        <h2 class="text-3xl font-black text-white tracking-tight">${service.name.toUpperCase()}</h2>
                        <p class="text-xs text-radarGreen font-mono uppercase tracking-[0.3em]">Mission Status: In Development</p>
                    </div>
                </div>

                <div class="space-y-6">
                    <div>
                        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Mission Objective</h3>
                        <p class="text-lg text-slate-200 leading-relaxed font-light border-l-2 border-radarGreen pl-4">${service.objective}</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="bg-black/20 p-4 rounded-xl border border-white/5">
                            <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Key Analytics</h3>
                            <ul class="text-sm text-slate-300 space-y-2 font-mono">${analyticsList}</ul>
                        </div>
                        <div class="bg-black/20 p-4 rounded-xl border border-white/5">
                            <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Target Sector</h3>
                            <p class="text-sm text-slate-300">${service.sector}</p>
                            <div class="mt-4 flex gap-2">
                                <span class="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                                <span class="text-[10px] text-yellow-400 uppercase">Awaiting Downlink</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('card-injection-point').innerHTML = html;
}

// ============================================================
// 6. PDF REPORT LOGIC
// ============================================================
const reportModal = document.getElementById('report-modal');

function openReportModal() {
    reportModal.classList.remove('hidden');
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    }).toUpperCase();
    document.getElementById('p1-date').innerText = dateStr;
    document.getElementById('p2-date').innerText = dateStr;
    document.getElementById('p3-date').innerText = dateStr;
    syncReport();
}

function closeReportModal() {
    reportModal.classList.add('hidden');
}

function syncReport() {
    const muni = document.getElementById('in-muni').value || 'Target Area';
    const rain = document.getElementById('in-rain').value || '100';
    const pop = document.getElementById('in-pop').value || '0';
    const narrative = document.getElementById('in-narrative').value || '--';
    const recs = document.getElementById('in-recs').value || '--';
    const crops = document.getElementById('in-crops').value || '0.00';
    const houses = document.getElementById('in-houses').value || '0.00';
    const mapUrl = document.getElementById('in-map-url').value;

    document.getElementById('p1-muni').innerText = muni;
    document.getElementById('p1-rain').innerText = rain + ' mm';
    document.getElementById('p2-pop').innerText = pop + ' people';
    document.getElementById('p2-narrative').innerText = narrative;
    document.getElementById('p2-recs').innerText = recs;
    document.getElementById('p2-crops').innerText = crops + ' Ha';
    document.getElementById('p2-houses').innerText = houses + ' Ha';

    if (mapUrl && mapUrl.trim() !== '') {
        document.getElementById('p1-map-img').src = mapUrl;
    }
}

async function download3PagePDF() {
    const btn = document.querySelector('button[onclick="download3PagePDF()"]');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Rendering Report...';
    btn.disabled = true;

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageIds = ['report-page-1', 'report-page-2', 'report-page-3'];
    const A4_WIDTH_MM = 210;
    const A4_HEIGHT_MM = 297;

    try {
        for (let i = 0; i < pageIds.length; i++) {
            const page = document.getElementById(pageIds[i]);
            const canvas = await html2canvas(page, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
        }

        const muni = document.getElementById('in-muni').value || 'Report';
        pdf.save(`SinagSpatial_Report_${muni.replace(/\s+/g, '_')}_2026.pdf`);

    } catch (err) {
        console.error('PDF Generation Failed:', err);
        alert('PDF generation failed: ' + err.message);
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-download"></i> Save Official Report (PDF)';
        btn.disabled = false;
    }
}

// ============================================================
// 7. FULLSCREEN TOGGLE (GEE Simulator)
// ============================================================
function toggleSimulatorFullscreen() {
    const wrapper = document.getElementById('simulator-wrapper');
    const icon = document.getElementById('fullscreen-icon');
    const label = document.getElementById('fullscreen-label');

    if (!document.fullscreenElement) {
        wrapper.requestFullscreen().then(() => {
            icon.className = 'fa-solid fa-compress';
            label.innerText = 'Exit Fullscreen';
        }).catch(err => {
            console.warn('Fullscreen error:', err);
        });
    } else {
        document.exitFullscreen().then(() => {
            icon.className = 'fa-solid fa-expand';
            label.innerText = 'Fullscreen';
        });
    }
}

// Keep button state in sync when user presses ESC
document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement) {
        const icon = document.getElementById('fullscreen-icon');
        const label = document.getElementById('fullscreen-label');
        if (icon) icon.className = 'fa-solid fa-expand';
        if (label) label.innerText = 'Fullscreen';
    }
});

// ============================================================
// 8. CONTENT PROTECTION
// ============================================================
document.addEventListener('contextmenu', event => event.preventDefault());
document.onkeydown = function (e) {
    if (e.keyCode === 123) return false;                                          // F12
    if (e.ctrlKey && e.shiftKey && e.keyCode === 'I'.charCodeAt(0)) return false; // Ctrl+Shift+I
    if (e.ctrlKey && e.shiftKey && e.keyCode === 'C'.charCodeAt(0)) return false; // Ctrl+Shift+C
    if (e.ctrlKey && e.shiftKey && e.keyCode === 'J'.charCodeAt(0)) return false; // Ctrl+Shift+J
    if (e.ctrlKey && e.keyCode === 'U'.charCodeAt(0)) return false;               // Ctrl+U
};
