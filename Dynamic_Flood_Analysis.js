// =========================================================================
// DYNAMIC FLOOD RISK INSPECTOR (HAND MODEL)
// =========================================================================
// Instructions: Run the script, then CLICK anywhere on the map to analyze.

// --- 1. CONFIGURATION (User Inputs) ---
// REPLACE this string with your Asset ID (e.g., "users/your_name/Phil_Muni")
// If you don't have one, keep it as "FAO/GAUL/2015/level2" for the default global dataset.
var adminAssetId = "projects/ee-dugproject/assets/Phil_Bound_Mun_Level";

// REPLACE this with the column name for the municipality/city name in your shapefile.
// Common examples: "NAME_2", "ADM2_NAME", "Muni_Name"
var adminNameField = "MUNICIPALI";
var PORTAL_URL = "https://davegepalago02-ai.github.io/SinagSpatial/"; // REPLACE with your final GitHub Pages URL


// --- 2. GLOBAL ASSETS ---
// Mosaic DEM once to handle COPERNICUS collection
var dem = ee.ImageCollection("COPERNICUS/DEM/GLO30").select('DEM').mosaic();
var merit = ee.Image("MERIT/Hydro/v1_0_1");

// --- 3. IMPACT DATASETS ---
// Use the official 2020 WorldPop count image for Philippines region
var pop = ee.Image("WorldPop/GPW/v11/GPW_Population_Count/2020");
var landcover = ee.Image("ESA/WorldCover/v100/2020");
var rainHistory = ee.ImageCollection("NASA/GPM_L3/IMERG_V06");
var chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY"); // 40-year Data

// Visual Background for Export (Sentinel-2 Cloudless Mosaic)
var s2Basemap = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
    .median()
    .visualize({ bands: ['B4', 'B3', 'B2'], min: 0, max: 3000, gamma: 1.4 });

// Load the administrative boundaries from the config
var admins = ee.FeatureCollection(adminAssetId);

// --- 2. UI SETUP ---
Map.setOptions('HYBRID');
Map.setCenter(121.7740, 12.8797, 6); // Center on Philippines
Map.style().set('cursor', 'crosshair');

var panel = ui.Panel({
    style: {
        width: '350px',
        position: 'top-right',
        padding: '10px'
    }
});
Map.add(panel);

// --- SPLIT LAYOUT: FIXED HEADER vs SCROLLABLE BODY ---
var headerPanel = ui.Panel({ style: { padding: '0 0 10px 0', border: '1px solid #e5e7eb', borderWidth: '0 0 1px 0' } });
var scrollPanel = ui.Panel({ style: { padding: '10px 0 0 0', maxHeight: '450px' } }); // This part scrolls

var title = ui.Label({
    value: 'SinagSpatial Rainfall Simulator',
    style: { fontSize: '20px', fontWeight: 'bold', color: '#22c55e' }
});

var instructions = ui.Label('1. Click any municipality on the map.\n2. Use the slider below to simulate rainfall intensity.\n3. Observe the flood susceptibility in real-time.', { whiteSpace: 'pre', fontSize: '11px', color: '#666' });

panel.add(headerPanel);
panel.add(scrollPanel);

headerPanel.add(title);
headerPanel.add(instructions);

// --- 3. SIMULATION CONTROLS ---
var rainSlider = ui.Slider({
    min: 0,
    max: 200,
    value: 50,
    step: 10,
    style: { width: '300px' }
});
var rainLabel = ui.Label('Simulated Rainfall: 50 mm', { fontWeight: 'bold' });

var emailBox = ui.Textbox({
    placeholder: 'Enter LGU Email for Export...',
    style: { width: '300px' }
});

var exportBtn = ui.Button({
    label: '📊 Export GeoTIFF (Analysis)',
    style: { width: '300px', color: '#1a73e8' }
});

var visualExportBtn = ui.Button({
    label: '🖼️ Export Visual Map (PNG)',
    style: { width: '300px', color: '#059669' }
});

var summaryBtn = ui.Button({
    label: '📋 Generate Executive Summary',
    style: { width: '300px', fontWeight: 'bold', color: '#d97706' }
});

// --- ADD TO LAYOUT ---
// Slider goes to HEADER (Fixed)
headerPanel.add(ui.Label('Simulation Volume (mm):', { fontSize: '12px', margin: '10px 0 0 10px' }));
headerPanel.add(rainSlider);
headerPanel.add(rainLabel);

// Buttons go to SCROLL PANEL
scrollPanel.add(ui.Label('Export & Reporting:', { fontSize: '12px', margin: '5px 0 0 10px' }));
scrollPanel.add(emailBox);
scrollPanel.add(exportBtn);
scrollPanel.add(visualExportBtn);
scrollPanel.add(summaryBtn);

// Results box is created and added to SCROLL PANEL
var resultsBox = ui.Panel({ style: { padding: '5px', margin: '10px 0 0 0' } }); // dynamic content
scrollPanel.add(resultsBox);

// --- 4. SUMMARY MODAL SETUP ---
var modal = ui.Panel({
    style: {
        width: '450px',
        position: 'middle-left',
        padding: '20px',
        border: '3px solid #ccc',
        shown: false // Initially hidden
    }
});
Map.add(modal);

var closeBtn = ui.Button('Close', function () {
    modal.style().set('shown', false);
});

// Placeholder for the global AOI to allow slider updates
var currentAoi = null;
var currentAdmins = null;
var currentName = null;
var currentProvince = null; // New global for Province
var historicalMax = 0; // Global for narrative baseline

// --- 4. CORE ANALYSIS FUNCTION ---
var runAnalysis = function (coords) {
    resultsBox.clear();
    var statusLabel = ui.Label('Analyzing selected area...');
    resultsBox.add(statusLabel);

    var point = ee.Geometry.Point([coords.lon, coords.lat]);

    // A. Dynamic Boundary Detection
    // A. Dynamic Boundary Detection
    var selectedAdmins = admins.filterBounds(point);

    // Explicitly check size to differentiate "No Feature" vs "Name Missing"
    selectedAdmins.size().evaluate(function (count) {
        if (count === 0) {
            statusLabel.setValue('❌ No boundary found at this location.');
            statusLabel.style().set({ color: 'red', fontWeight: 'bold' });
            return;
        }

        var selectedAdmin = selectedAdmins.first();
        var aoi = selectedAdmin.geometry();

        // Send the entire property dictionary to the client to find names robustly
        selectedAdmin.toDictionary().evaluate(function (res) {
            if (!res) return;

            // Case-insensitive search for Municipality and Province
            var muniName = res[adminNameField] || res.MUNICIPALITY || res.Municipality || res.municipality || 'Unknown';
            var provName = res.PROVINCE || res.Province || res.province || 'Unknown Province';

            currentName = muniName;
            currentProvince = provName;

            // Fetch Historical Extremes (CHIRPS 1981-Current)
            var histCol = chirps.filterBounds(aoi).select('precipitation');
            var maxImage = histCol.max().clip(aoi);
            var histStats = maxImage.reduceRegion({
                reducer: ee.Reducer.max(),
                geometry: aoi,
                scale: 5000,
                bestEffort: true
            });

            histStats.evaluate(function (s) {
                historicalMax = (s && s.precipitation) ? s.precipitation : 0;
                print('Historical 24h Max (CHIRPS):', historicalMax, 'mm');

                // Continue with analysis 
                currentAoi = aoi;
                currentAdmins = selectedAdmins;
                runHydrologyAnalysis();
            });
        });
    });
};

// Update function for slider
rainSlider.onSlide(function (value) {
    rainLabel.setValue('Simulated Rainfall: ' + value + ' mm');
    if (currentAoi) {
        runHydrologyAnalysis();
    }
});

// Extracted function to ensure execution only happens when AOI is confirmed
var runHydrologyAnalysis = function () {
    resultsBox.clear();

    // Display the municipality and province
    resultsBox.add(ui.Label('Analysis for: ' + currentName + ', ' + currentProvince, {
        fontWeight: 'bold',
        fontSize: '13px',
        margin: '10px 0 5px 10px',
        color: '#22c55e'
    }));

    var aoi = currentAoi;
    var boundaryFeature = currentAdmins;
    var rainVolume = rainSlider.getValue();

    // IMPACT DATA (Global variables to store stats)
    var impactStats = {
        popAtRisk: 0,
        cropAtRisk: 0,
        builtAtRisk: 0,
        totalArea: 0,
        forecast: 0
    };

    // Methodology: Stage = Rain / 20 (approximate scaling for susceptibility)
    var stageHeight = rainVolume / 20;

    Map.layers().reset();
    // Only center on first click, not every slider move
    // Removed Map.centerObject(aoi, 11) to allow smooth sliding

    // B. Hydrology & Terrain Processing
    var clippedDem = dem.clip(aoi);
    var hand = merit.select('hnd').clip(aoi);

    // Tributaries (Catchment > 25km2) - Band is 'upa'
    var riverNetwork = merit.select('upa')
        .gt(25)
        .selfMask()
        .clip(aoi);

    // C. Risk Classification (HAND Model - Susceptibility)
    // High: Areas within < 1m of simulated stage
    // Med: Areas within 1-2m of simulated stage
    // Low: Areas within 2-5m of simulated stage
    var highRisk = hand.lt(stageHeight + 1);
    var medRisk = hand.lt(stageHeight + 2).and(hand.gte(stageHeight + 1));
    var lowRisk = hand.lt(stageHeight + 5).and(hand.gte(stageHeight + 2));

    var riskMap = ee.Image(1)
        .where(lowRisk, 1)
        .where(medRisk, 2)
        .where(highRisk, 3)
        .updateMask(hand.lt(stageHeight + 5))
        .selfMask()
        .clip(aoi);

    // D. Visualization
    var hillshade = ee.Terrain.hillshade(clippedDem);

    Map.addLayer(hillshade, { min: 150, max: 255, opacity: 0.5 }, 'Terrain Relief');
    Map.addLayer(boundaryFeature.style({ fillColor: '00000000', color: '000000', width: 2 }), {}, 'Boundary');
    Map.addLayer(riverNetwork, { palette: ['0000FF'] }, 'Major Tributaries');
    Map.addLayer(riskMap, { min: 1, max: 3, palette: ['FFFF00', 'FFA500', 'FF0000'] }, 'Flood Susceptibility (' + rainVolume + 'mm)');

    // E. Area Calculation (Async)
    var areaImg = ee.Image.pixelArea().divide(10000); // Hectares

    var stats = areaImg.addBands(riskMap).reduceRegion({
        reducer: ee.Reducer.sum().group({
            groupField: 1,
            groupName: 'class',
        }),
        geometry: aoi,
        scale: 30,
        maxPixels: 1e9,
        bestEffort: true
    });

    // F. Dynamic Legend
    var highLabel = ui.Label('Calculating...');
    var medLabel = ui.Label('Calculating...');
    var lowLabel = ui.Label('Calculating...');

    addLegendToPanel(highLabel, medLabel, lowLabel, rainVolume);

    // Evaluate Stats
    stats.get('groups').evaluate(function (groups) {
        if (!groups) {
            highLabel.setValue('N/A');
            medLabel.setValue('N/A');
            lowLabel.setValue('N/A');
            return;
        }

        var areas = { 1: 0, 2: 0, 3: 0 };
        groups.forEach(function (g) {
            areas[g.class] = g.sum;
        });

        highLabel.setValue(areas[3].toFixed(2) + ' ha');
        medLabel.setValue(areas[2].toFixed(2) + ' ha');
        lowLabel.setValue(areas[1].toFixed(2) + ' ha');

        impactStats.totalArea = (areas[1] + areas[2] + areas[3]).toFixed(2);
    });

    // --- H. IMPACT ANALYTICS (Background Calculations) ---
    var criticalMask = riskMap.eq(3); // High Risk (Red)

    // 1. Population at Risk (Scale 30 to match flood mask precisely)
    var popRiskCount = pop.unmask(0).updateMask(criticalMask).reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: aoi,
        scale: 30, // resample to match 30m flood pixels
        maxPixels: 1e9,
        bestEffort: true
    });

    // 2. Agricultural Damage (Class 40)
    var crops = landcover.eq(40).selfMask();
    var cropRiskArea = ee.Image.pixelArea().divide(10000).updateMask(criticalMask).updateMask(crops).reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: aoi,
        scale: 30,
        maxPixels: 1e9
    });

    // 3. Residential/Built-up Exposure (Class 50)
    var built = landcover.eq(50).selfMask();
    var builtRiskArea = ee.Image.pixelArea().divide(10000).updateMask(criticalMask).updateMask(built).reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: aoi,
        scale: 30,
        maxPixels: 1e9
    });

    // 4. Rainfall Context (Last 72 hours History - 4h latency buffer)
    var end = ee.Date(Date.now()).advance(-4, 'hour');
    var start = end.advance(-72, 'hour');
    var recentRain = rainHistory.filterDate(start, end).select('precipitationCal').sum().clip(aoi).reduceRegion({
        reducer: ee.Reducer.max(),
        geometry: aoi,
        scale: 10000,
        maxPixels: 1e9
    });

    // Populate impactStats when done
    popRiskCount.evaluate(function (s) {
        if (!s) {
            console.log('Pop data failed to return');
            return;
        }
        // Sum the image values (band name can vary)
        var values = Object.keys(s).map(function (k) { return s[k]; });
        impactStats.popAtRisk = values[0] || 0;
        print('Calculated Population at Risk:', impactStats.popAtRisk);
    });
    cropRiskArea.evaluate(function (s) { if (s) impactStats.cropAtRisk = s.area || s.sum || 0; });
    builtRiskArea.evaluate(function (s) { if (s) impactStats.builtAtRisk = s.area || s.sum || 0; });
    recentRain.evaluate(function (s) { if (s) impactStats.forecast = s.precipitationCal || 0; });

    // --- I. SUMMARY POP-UP HANDLER ---
    summaryBtn.onClick(function () {
        modal.clear();
        modal.style().set('shown', true);

        modal.add(ui.Label('📋 EXECUTIVE SUMMARY', { fontWeight: 'bold', fontSize: '18px', color: '#111827' }));
        modal.add(ui.Label(currentName + ', ' + currentProvince, { fontWeight: 'bold', fontSize: '14px', color: '#374151' }));
        modal.add(ui.Label('Simulation: ' + rainVolume + 'mm Rainfall Scenario', { fontSize: '12px', color: '#4b5563' }));
        modal.add(ui.Label('---------------------------------------------------------', { color: '#e5e7eb' }));

        var addImpactRow = function (icon, label, value, unit, source) {
            var rowPanel = ui.Panel([
                ui.Label(icon + ' ' + label + ':', { fontWeight: 'bold', width: '250px' }),
                ui.Label(value + ' ' + unit, { color: '#ef4444', fontWeight: 'bold' })
            ], ui.Panel.Layout.flow('horizontal'));

            modal.add(rowPanel);
            modal.add(ui.Label('Source: ' + source, { fontSize: '10px', color: '#6b7280', margin: '0 0 10px 30px' }));
        };

        addImpactRow('👥', 'Estimated Population at Risk', Math.round(impactStats.popAtRisk), 'people', 'WorldPop GPW v11 (2020)');
        addImpactRow('🌾', 'Agricultural Damage (Crops)', impactStats.cropAtRisk.toFixed(2), 'hectares', 'ESA WorldCover (10m)');
        addImpactRow('🏠', 'Inundated Residential Areas', impactStats.builtAtRisk.toFixed(2), 'hectares', 'ESA WorldCover (10m)');
        addImpactRow('📐', 'Total Critical Flood Extent', impactStats.totalArea, 'hectares', 'MERIT-Hydro HAND Model (30m)');

        modal.add(ui.Label('---------------------------------------------------------', { color: '#e5e7eb' }));

        // --- SECTION 3: AI HAZARD INTERPRETATION ---
        modal.add(ui.Label('🧠 HAZARD INTERPRETATION', { fontWeight: 'bold', fontSize: '13px', color: '#111827' }));

        var interpretation = "No historical data available for comparison. Base decisions on simulated risk thresholds.";
        var recommendations = ["Monitor local river levels", "Prepare evacuation kits"];

        if (historicalMax > 0) {
            var ratio = (rainVolume / historicalMax);
            if (ratio < 0.3) {
                interpretation = "This is a routine seasonal event. Rainfall intensity is well within historical limits.";
                recommendations = ["Routine drainage maintenance", "Standard weather monitoring"];
            } else if (ratio < 0.7) {
                interpretation = "This is a Significant Hazard event. Intensity matches moderate historical typhoons.";
                recommendations = ["Clear primary drainage channels", "Alert low-lying community leaders"];
            } else if (ratio <= 1.0) {
                interpretation = "This simulates a MAJOR Historical peak. Equivalent to severe disaster events in this town's record.";
                recommendations = ["Pre-emptive evacuation of Red zones", "Activate Municipal DRRM center"];
            } else {
                interpretation = "UNPRECEDENTED EXTREME. This simulation exceed the 40-year historical record significantly.";
                recommendations = ["Enforce immediate mandatory evacuation", "Declare state of emergency if realized"];
            }
        }

        modal.add(ui.Label(interpretation, { fontSize: '11px', color: '#374151', margin: '5px 0 10px 10px' }));

        // --- SECTION 4: PRACTICAL RECOMMENDATIONS ---
        modal.add(ui.Label('✅ PRACTICAL RECOMMENDATIONS', { fontWeight: 'bold', fontSize: '12px', color: '#059669' }));
        recommendations.forEach(function (rec) {
            modal.add(ui.Label('• ' + rec, { fontSize: '11px', margin: '2px 0 2px 20px' }));
        });

        // --- SECTION 5: SMART-LINK EXPORT ---
        modal.add(ui.Label('━━━━━━━━━━━━━━━━━━━━━━━━━━', { color: '#e5e7eb', margin: '15px 0 10px 0' }));
        // Create RGB Risk Map for the Visual Export
        var riskRGB = riskMap.visualize({
            min: 1, max: 3,
            palette: ['FFFF00', 'FFA500', 'FF0000'],
            opacity: 0.6
        });

        // Generate Thumbnail for the Report
        var composite = s2Basemap.blend(riskRGB).clip(aoi);
        var mapThumbUrl = composite.getThumbURL({
            dimensions: 600,
            region: aoi,
            format: 'png'
        });

        var params = "?muni=" + encodeURIComponent(currentName) +
            "&rain=" + rainVolume +
            "&pop=" + (impactStats.popAtRisk || 0) +
            "&crops=" + (impactStats.cropAtRisk ? impactStats.cropAtRisk.toFixed(2) : 0) +
            "&houses=" + (impactStats.builtAtRisk ? impactStats.builtAtRisk.toFixed(2) : 0) +
            "&narrative=" + encodeURIComponent(interpretation) +
            "&recs=" + encodeURIComponent(recommendations.join('\n')) +
            "&map=" + encodeURIComponent(mapThumbUrl);

        var exportLabel = ui.Label({
            value: '🚀 Open SinagSpatial Portal (Auto-Fill 3-Page Report)',
            style: {
                color: 'white',
                backgroundColor: '#0f172a',
                padding: '8px 12px',
                borderRadius: '8px',
                fontWeight: 'bold',
                textAlign: 'center',
                margin: '10px 0',
                fontSize: '11px',
                border: '1px solid #334155'
            },
            targetUrl: PORTAL_URL + params
        });
        modal.add(exportLabel);
        modal.add(ui.Label('Clicking this will auto-fill the 3-page PDF report in your web portal.', { fontSize: '9px', color: '#94a3b8', textAlign: 'center' }));


        modal.add(ui.Label('---------------------------------------------------------', { color: '#e5e7eb' }));
        modal.add(ui.Label('🌧️ Rainfall Context: NASA GPM IMERG', { fontSize: '11px', fontWeight: 'bold' }));
        modal.add(ui.Label('Last 72h History: ' + impactStats.forecast.toFixed(1) + ' mm (max intensity)', { fontSize: '11px', fontStyle: 'italic' }));
        modal.add(ui.Label('Disclaimer: Analysis based on satellite data for DRM planning purposes.', { fontSize: '10px', color: '#9ca3af', margin: '15px 0 0 0' }));

        modal.add(closeBtn);
    });

    // --- G. EXPORT SETUP ---
    exportBtn.onClick(function () {
        var email = emailBox.getValue();
        if (!email || email.indexOf('@') === -1) {
            alert('Please enter a valid LGU Email Address to track the export.');
            return;
        }

        var exportName = 'FloodSusceptibility_' + rainVolume + 'mm_' + email.split('@')[0];
        var downloadUrl = riskMap.getDownloadURL({
            name: exportName,
            scale: 30,
            region: aoi,
            format: 'tiff'
        });

        print('Download Link Generated for ' + email + ':');
        print(downloadUrl);

        var downloadLabel = ui.Label('✅ Click Here to Download GeoTIFF',
            { color: 'blue', fontWeight: 'bold' },
            downloadUrl
        );
        resultsBox.add(downloadLabel);
    });

    // --- J. VISUAL MAP EXPORT ---
    visualExportBtn.onClick(function () {
        var email = emailBox.getValue();
        if (!email || email.indexOf('@') === -1) {
            alert('Please enter a valid LGU Email to track this export.');
            return;
        }

        // Create RGB Risk Map for the Visual Export
        var riskRGB = riskMap.visualize({
            min: 1, max: 3,
            palette: ['FFFF00', 'FFA500', 'FF0000'],
            opacity: 0.6
        });

        // Simple Watermark logic: Adding a constant band with the brand name is complex, 
        // so we use a composite of the basemap and risk map
        var composite = s2Basemap.blend(riskRGB).clip(aoi);

        var visualUrl = composite.getThumbURL({
            name: 'SinagSpatial_Map_' + currentName,
            dimensions: 1024,
            region: aoi,
            format: 'png'
        });

        print('📸 Branded Visual Map Link Generated:');
        print(visualUrl);

        var visualLabel = ui.Label('🖼️ Download Branded Map (PNG)',
            { color: '#059669', fontWeight: 'bold', margin: '5px 0 0 10px' },
            visualUrl
        );
        resultsBox.add(visualLabel);
    });
};

// --- 4. LEGEND ---
var addLegendToPanel = function (highLbl, medLbl, lowLbl, rainVal) {
    var legendTitle = ui.Label('Susceptibility Legend (' + rainVal + 'mm)', { fontWeight: 'bold', margin: '15px 0 5px 0' });
    var methodologyNote = ui.Label('Bases: MERIT-Hydro HAND & ESA WorldCover', { fontSize: '10px', color: '#888' });
    resultsBox.add(legendTitle);
    resultsBox.add(methodologyNote);

    var addRow = function (color, label, statsLabel) {
        var box = ui.Label({
            style: { backgroundColor: color, padding: '8px', margin: '0 8px 4px 0' }
        });

        var widgets = [box, ui.Label(label, { fontSize: '12px' })];
        if (statsLabel) {
            widgets.push(ui.Label(' (', { fontSize: '11px' }));
            widgets.push(statsLabel);
            widgets.push(ui.Label(')', { fontSize: '11px' }));
        }

        var row = ui.Panel({
            widgets: widgets,
            layout: ui.Panel.Layout.Flow('horizontal')
        });
        resultsBox.add(row);
    };

    addRow('FF0000', 'Critical Inundation', highLbl);
    addRow('FFA500', 'Moderate Susceptibility', medLbl);
    addRow('FFFF00', 'Low Probability Pockets', lowLbl);
    addRow('0000FF', 'Drainage Network (Rivers)');
};

// --- 5. INTERACTION ---
Map.onClick(runAnalysis);
