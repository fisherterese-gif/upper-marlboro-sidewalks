// Simple dropdown toggles
document.querySelectorAll('.dropdown > button').forEach(btn=>{
  btn.addEventListener('click', e=>{
    const dd = btn.parentElement;
    document.querySelectorAll('.dropdown').forEach(d=>{ if(d!==dd) d.classList.remove('open') });
    dd.classList.toggle('open');
  });
});
window.addEventListener('click', e=>{
  if(!e.target.closest('.dropdown')){
    document.querySelectorAll('.dropdown').forEach(d=>d.classList.remove('open'));
  }
});

// Leaflet Map with dataset dropdowns
function initMap() {
  const map = L.map('map').setView([38.815, -76.749], 12);

  const base = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  // Demo data (replace with your real GeoJSON later)
  const sidewalks = {
    "type":"FeatureCollection",
    "features":[
      {"type":"Feature","properties":{"name":"Gap A"}, "geometry":{"type":"LineString","coordinates":[[-76.751,38.81],[-76.74,38.813]]}},
      {"type":"Feature","properties":{"name":"Gap B"}, "geometry":{"type":"LineString","coordinates":[[-76.76,38.82],[-76.75,38.83]]}}
    ]
  };
  const schools = {
    "type":"FeatureCollection",
    "features":[
      {"type":"Feature","properties":{"name":"Elementary"}, "geometry":{"type":"Point","coordinates":[-76.748,38.816]}},
      {"type":"Feature","properties":{"name":"Middle"}, "geometry":{"type":"Point","coordinates":[-76.755,38.825]}}
    ]
  };

  const gapsLayer = L.geoJSON(sidewalks, {
    style: { color:'#ffef5a', weight:5 }
  }).bindPopup(l=>`Sidewalk gap: <b>${l.feature.properties.name}</b>`);

  const schoolsLayer = L.geoJSON(schools, {
    pointToLayer:(f,latlng)=> L.circleMarker(latlng, {radius:8, weight:2, fillOpacity:.9})
  }).bindPopup(l=>`School: <b>${l.feature.properties.name}</b>`);

  const layers = { "Sidewalk Gaps": gapsLayer, "Schools": schoolsLayer };

  // Add default layer
  gapsLayer.addTo(map);

  // dataset select
  const datasetSelect = document.getElementById('dataset');
  datasetSelect.addEventListener('change', ()=>{
    Object.values(layers).forEach(l=>map.removeLayer(l));
    const chosen = layers[datasetSelect.value];
    if(chosen){ chosen.addTo(map); }
  });

  // basemap select
  const basemapSelect = document.getElementById('basemap');
  const baseLayers = {
    "OSM": base,
    "Toner": L.tileLayer('https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png', {attribution:'Stamen'}),
    "Terrain": L.tileLayer('https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png', {attribution:'Stamen'})
  };
  basemapSelect.addEventListener('change', ()=>{
    Object.values(baseLayers).forEach(l=>{ if(map.hasLayer(l)) map.removeLayer(l); });
    baseLayers[basemapSelect.value].addTo(map);
  });
}

if(document.getElementById('map')){
  initMap();
}