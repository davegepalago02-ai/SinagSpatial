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
    checkBasketParam();   // Handle incoming GEE analysis
    updateBasketBadge();  // Restore badge count from storage

    // Legacy: direct report modal open via URL
    const params = new URLSearchParams(window.location.search);
    if (params.has('muni') && params.get('action') !== 'basket') {
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
    ['view-home', 'view-simulator', 'view-mission-card', 'view-basket'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });

    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('animate-fade-in');
    }

    if (viewId === 'view-home') {
        const drawer = document.getElementById('burger-drawer');
        if (drawer && !drawer.classList.contains('-translate-x-full')) toggleDrawer();
    }
    if (viewId === 'view-basket') renderBasket();
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
// 7. REPORT BASKET SYSTEM
// ============================================================
const BASKET_KEY = 'sinagspatial_basket';

/** Read basket from localStorage */
function getBasket() {
    try { return JSON.parse(localStorage.getItem(BASKET_KEY)) || []; }
    catch (e) { return []; }
}

/** Save basket to localStorage */
function saveBasket(arr) {
    localStorage.setItem(BASKET_KEY, JSON.stringify(arr));
}

/** Called on page load — if URL has action=basket, save entry & clean URL */
function checkBasketParam() {
    const p = new URLSearchParams(window.location.search);
    if (p.get('action') !== 'basket') return;

    const entry = {
        id: Date.now(),
        timestamp: new Date().toLocaleString('en-PH'),
        muni: decodeURIComponent(p.get('muni') || 'Unknown'),
        province: decodeURIComponent(p.get('province') || ''),
        rain: parseFloat(p.get('rain') || 0),
        pop: parseInt(p.get('pop') || 0),
        crops: parseFloat(p.get('crops') || 0),
        houses: parseFloat(p.get('houses') || 0),
        totalArea: parseFloat(p.get('totalArea') || 0),
        highArea: parseFloat(p.get('highArea') || 0),
        medArea: parseFloat(p.get('medArea') || 0),
        lowArea: parseFloat(p.get('lowArea') || 0),
        histMax: parseFloat(p.get('histMax') || 0),
        forecast: parseFloat(p.get('forecast') || 0),
        mapUrl: decodeURIComponent(p.get('map') || '')
    };

    const basket = getBasket();
    basket.unshift(entry);          // Newest first
    saveBasket(basket);
    updateBasketBadge();
    showToast(`✅ ${entry.muni} analysis added to Report Basket!`);

    // Clean URL so refresh doesn't add duplicate
    window.history.replaceState({}, '', window.location.pathname);

    // Auto-navigate to basket
    switchView('view-basket');
}

/** Update badge counter on basket button */
function updateBasketBadge() {
    const count = getBasket().length;
    const badge = document.getElementById('basket-badge');
    if (!badge) return;
    badge.innerText = count;
    count > 0 ? badge.classList.remove('hidden') : badge.classList.add('hidden');
}

/** Show/hide toast message */
function showToast(msg, duration = 4000) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), duration);
}

/** Remove one item from basket */
function removeFromBasket(id) {
    const basket = getBasket().filter(e => e.id !== id);
    saveBasket(basket);
    updateBasketBadge();
    renderBasket();
}

/** Clear all basket entries */
function clearBasket() {
    if (!confirm('Clear all analyses from the basket?')) return;
    saveBasket([]);
    updateBasketBadge();
    renderBasket();
}

/** Render basket cards into #basket-cards */
function renderBasket() {
    const basket = getBasket();
    const grid = document.getElementById('basket-cards');
    const empty = document.getElementById('basket-empty');

    if (basket.length === 0) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    grid.innerHTML = basket.map(item => {
        const severity = getRiskLevel(item);
        const severityColor = { LOW: 'green', MODERATE: 'yellow', HIGH: 'orange', EXTREME: 'red' }[severity];
        const ratio = item.histMax > 0 ? (item.rain / item.histMax) : 0;
        const ratioText = item.histMax > 0 ? `${(ratio * 100).toFixed(0)}% of 40-yr max` : 'No historical baseline';

        return `
        <div class="basket-card" id="card-${item.id}">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <p class="text-[10px] text-slate-400 uppercase tracking-widest mb-1">${item.timestamp}</p>
                    <h3 class="text-lg font-black text-slate-800 leading-tight">${item.muni}</h3>
                    <p class="text-xs text-slate-500">${item.province || ''}</p>
                </div>
                <span class="severity-badge severity-${severity.toLowerCase()}">${severity}</span>
            </div>

            <!-- Clipped Map Thumbnail -->
            ${item.mapUrl ? `
            <div class="rounded-xl overflow-hidden border border-slate-200 mb-3 relative">
                <img src="${item.mapUrl}" alt="Flood susceptibility map of ${item.muni}"
                    class="w-full object-cover" style="max-height:160px;"
                    onerror="this.parentElement.innerHTML='<div class=\'text-[10px] text-slate-400 text-center py-4\'>Map preview unavailable</div>'">
                <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                    <span class="text-white text-[9px] font-bold tracking-wide">${item.rain} mm Simulation · HAND Model</span>
                </div>
            </div>` : `
            <div class="rounded-xl bg-slate-100 border border-dashed border-slate-300 text-center text-[10px] text-slate-400 py-5 mb-3">
                No map preview available
            </div>`}

            <div class="grid grid-cols-2 gap-2 text-[11px] mb-3">
                <div class="basket-metric">
                    <span class="basket-metric-label">👥 Population</span>
                    <span class="basket-metric-value">${item.pop.toLocaleString()}</span>
                </div>
                <div class="basket-metric">
                    <span class="basket-metric-label">🏠 Built-up</span>
                    <span class="basket-metric-value">${item.houses} ha</span>
                </div>
                <div class="basket-metric">
                    <span class="basket-metric-label">🌾 Crops</span>
                    <span class="basket-metric-value">${item.crops} ha</span>
                </div>
                <div class="basket-metric">
                    <span class="basket-metric-label">📐 Flood Area</span>
                    <span class="basket-metric-value">${item.totalArea} ha</span>
                </div>
            </div>

            <!-- Susceptibility Breakdown -->
            <div class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Susceptibility Breakdown</div>
            <div class="flex flex-col gap-1 mb-3">
                <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-sm flex-shrink-0" style="background:#ef4444"></span>
                    <span class="text-[11px] text-slate-600 flex-1">Critical Inundation</span>
                    <span class="text-[11px] font-bold text-slate-800">${item.highArea || '—'} ha</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-sm flex-shrink-0" style="background:#f97316"></span>
                    <span class="text-[11px] text-slate-600 flex-1">Moderate Susceptibility</span>
                    <span class="text-[11px] font-bold text-slate-800">${item.medArea || '—'} ha</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-sm flex-shrink-0" style="background:#eab308"></span>
                    <span class="text-[11px] text-slate-600 flex-1">Low Probability</span>
                    <span class="text-[11px] font-bold text-slate-800">${item.lowArea || '—'} ha</span>
                </div>
            </div>

            <div class="text-[10px] text-slate-400 mb-4 flex items-center gap-2">
                <i class="fa-solid fa-cloud-rain"></i>
                <span>${item.rain} mm simulated &nbsp;|&nbsp; ${ratioText}</span>
            </div>

            <div class="flex gap-2">
                <button onclick="generateFromBasket(${item.id})"
                    class="flex-1 bg-slate-900 hover:bg-black text-white text-xs font-bold py-2 px-3 rounded-lg transition flex items-center justify-center gap-2">
                    <i class="fa-solid fa-file-pdf"></i> Generate Report
                </button>
                <button onclick="removeFromBasket(${item.id})"
                    class="text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-3 py-2 rounded-lg transition text-xs">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>`;
    }).join('');
}

// ============================================================
// 8. INTELLIGENCE ENGINE
// ============================================================
function getRiskLevel(item) {
    const ratio = item.histMax > 0 ? item.rain / item.histMax : 0;
    if (ratio > 1.0 || item.pop > 50000) return 'EXTREME';
    if (ratio > 0.7 || item.pop > 10000) return 'HIGH';
    if (ratio > 0.3 || item.pop > 2000) return 'MODERATE';
    return 'LOW';
}

function generateInterpretation(item) {
    const ratio = item.histMax > 0 ? item.rain / item.histMax : 0;
    const severity = getRiskLevel(item);
    const ratioStr = item.histMax > 0 ? `${(ratio * 100).toFixed(0)}% of the 40-year historical rainfall maximum (${item.histMax} mm)` : 'no available 40-year CHIRPS baseline';

    const narratives = {
        EXTREME: `The simulated rainfall of ${item.rain} mm represents ${ratioStr} for ${item.muni}, ${item.province}. This constitutes an UNPRECEDENTED hydrological extreme that surpasses historical typhoon records. The HAND model projects critical inundation across ${item.totalArea} hectares, with an estimated ${item.pop.toLocaleString()} residents directly threatened. Immediate escalation to disaster response protocols is warranted.`,
        HIGH: `The ${item.rain} mm simulation for ${item.muni}, ${item.province} registers at ${ratioStr}. This is equivalent to a major typhoon-class event in local flood history. The HAND-derived flood model identifies ${item.totalArea} ha of critical inundation, directly threatening an estimated ${item.pop.toLocaleString()} residents. Residential exposure of ${item.houses} ha and agricultural damage of ${item.crops} ha signal significant socio-economic impact.`,
        MODERATE: `The ${item.rain} mm rainfall scenario for ${item.muni} reaches ${ratioStr}. This represents a significant but manageable hydrometeorological event. Flood susceptibility mapping via MERIT-Hydro HAND indicates ${item.totalArea} ha at critical risk. Approximately ${item.pop.toLocaleString()} individuals reside in inundation zones, with ${item.houses} ha of built-up area and ${item.crops} ha of farmland exposed.`,
        LOW: `The ${item.rain} mm simulation for ${item.muni}, ${item.province} is within ${ratioStr}. This falls within routine seasonal rainfall parameters for the area. The HAND model projects limited flooding — ${item.totalArea} ha total — affecting an estimated ${item.pop.toLocaleString()} people. Standard monitoring protocols are appropriate at this simulation level.`
    };
    return narratives[severity];
}

function generateRecommendations(item) {
    const severity = getRiskLevel(item);
    const recs = {
        EXTREME: [
            '• IMMEDIATE: Issue mandatory evacuation orders for all Red-zone communities',
            '• Activate Municipal/City DRRM Operations Center at full capacity',
            '• Pre-position rescue boats and emergency medical teams in high-risk barangays',
            '• Coordinate with NDRRMC and OCD-Region for resource augmentation',
            '• Enforce road closures on flood-prone corridors; deploy traffic management',
            '• Declare state of calamity and prepare emergency procurement channels'
        ],
        HIGH: [
            '• Issue pre-emptive evacuation advisory for all Critical Inundation (Red) zones',
            '• Place MDRRMO on Action Mode; 24/7 monitoring of river gauges',
            '• Alert barangay captains in flood-prone areas to prepare community evacuation',
            '• Coordinate with DA and PCIC for early agricultural loss documentation',
            '• Open evacuation centers in identified safe zones above flood elevation'
        ],
        MODERATE: [
            '• Issue Yellow Alert for flood-prone communities adjacent to drainage networks',
            '• Clear and inspect primary and secondary drainage infrastructure',
            '• Alert barangay councils to monitor local water level indicators',
            '• Prepare evacuation lists for residents in Low-to-Moderate risk zones',
            '• Advise farmers with exposed crops to harvest or implement protective measures'
        ],
        LOW: [
            '• Conduct routine drainage maintenance and canal clearing operations',
            '• Continue standard weather and river level monitoring protocols',
            '• Ensure community flood preparedness materials are updated and distributed',
            '• Review and test communication channels between MDRRMO and barangays'
        ]
    };
    return recs[severity].join('\n');
}

/** Open PDF modal pre-filled from a basket entry with AI-generated content */
function generateFromBasket(id) {
    const item = getBasket().find(e => e.id === id);
    if (!item) return;

    // Fill hidden sidebar inputs
    document.getElementById('in-muni').value = `${item.muni}, ${item.province}`;
    document.getElementById('in-rain').value = item.rain;
    document.getElementById('in-pop').value = item.pop;
    document.getElementById('in-crops').value = item.crops;
    document.getElementById('in-houses').value = item.houses;
    document.getElementById('in-narrative').value = generateInterpretation(item);
    document.getElementById('in-recs').value = generateRecommendations(item);
    document.getElementById('in-map-url').value = item.mapUrl || '';

    openReportModal();
    syncReport();
}

// ============================================================
// 9. FULLSCREEN TOGGLE (GEE Simulator)
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
