// High-Resolution DEM (30m)
// Fix: COPERNICUS/DEM/GLO30 is an ImageCollection, need to mosaic it.
var dem = ee.ImageCollection("COPERNICUS/DEM/GLO30").select('DEM').mosaic();

// 1. BOUNDARIES
// Fix: Use filterBounds with a central point for robustness
var cdoBoundary = ee.FeatureCollection("FAO/GAUL/2015/level2")
    .filterBounds(ee.Geometry.Point([124.64, 8.48]));

// 2. HAND MODEL (Height Above Nearest Drainage)
// Using MERIT Hydro which contains a pre-computed HAND band ('hnd')
// hnd: vertical distance between a pixel and the nearest drainage channel
var merit = ee.Image("MERIT/Hydro/v1_0_1");
var hand = merit.select('hnd');

// 3. TRIBUTARY EXTRACTION (Catchment Area)
// Fix: Band name is 'upa' (upstream area), not 'uparea'
var riverNetwork = merit.select('upa')
    .gt(25) // Threshold: Drainage area > 25 km^2 define main tributaries
    .selfMask()
    .clip(cdoBoundary);

// 4. FLOOD RISK CLASSIFICATION (Physically Based)
// Risk is defined by how low you are relative to the river (HAND)
// rather than simple distance buffers.

// High Risk: 0-5m above nearest river (Floodplain)
var highRisk = hand.lt(5).and(hand.gte(0));

// Low Risk: 5-10m above nearest river (Terraces)
var lowRisk = hand.lt(10).and(hand.gte(5));

// Combine Risk Map
var riskMap = ee.Image(0)
    .where(lowRisk, 1)   // 1 = Low Risk (Yellow)
    .where(highRisk, 2)  // 2 = High Risk (Red)
    .updateMask(hand.lt(10)) // Only show relevant risk zones
    .selfMask()
    .clip(cdoBoundary);

// 5. VISUALIZATION
Map.centerObject(cdoBoundary, 12);
Map.setOptions('HYBRID'); // Better context for flooding

// Hillshade for context (using Copernicus DEM)
var hillshade = ee.Terrain.hillshade(dem).clip(cdoBoundary);
Map.addLayer(hillshade, { min: 150, max: 255, opacity: 0.6 }, 'Terrain Relief', false);

// Risk Layers
Map.addLayer(riskMap, { min: 1, max: 2, palette: ['FFFF00', 'FF0000'] }, 'Flood Risk (HAND)');
Map.addLayer(riverNetwork, { palette: ['0000FF'] }, 'Major Tributaries');
Map.addLayer(cdoBoundary.style({ fillColor: '00000000', color: '000000', width: 2 }), {}, 'Administrative Boundary');

// 6. MAP LEGEND
var legend = ui.Panel({
    style: {
        position: 'bottom-left',
        padding: '8px 15px'
    }
});

var legendTitle = ui.Label({
    value: 'Flood Risk (HAND Model)',
    style: { fontWeight: 'bold', fontSize: '16px', margin: '0 0 4px 0', padding: '0' }
});
legend.add(legendTitle);

// Use a cleaner function to create rows
var makeRow = function (color, name) {
    var colorBox = ui.Label({
        style: {
            backgroundColor: color,
            padding: '8px',
            margin: '0 0 4px 0'
        }
    });
    var description = ui.Label({
        value: name,
        style: { margin: '0 0 4px 6px' }
    });
    return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
    });
};

legend.add(makeRow('FF0000', 'High Risk (< 5m above river)'));
legend.add(makeRow('FFFF00', 'Low Risk (5-10m above river)'));
legend.add(makeRow('0000FF', 'Major Tributaries (> 25km² flow)'));

Map.add(legend);

// 7. SUMMARY REPORT (Optional CSV Export)
/*
// Count High Risk Area Example
var pixelArea = ee.Image.pixelArea();
var highRiskArea = pixelArea.updateMask(riskMap.eq(2))
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: cdoBoundary.geometry(),
    scale: 30,
    maxPixels: 1e9
  });
print('High Risk Area (m²):', highRiskArea.get('area'));
*/
