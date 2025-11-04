import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, NavLink } from "react-router-dom";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/*
  MULTI‑PAGE SITE (React Router)
  Pages: Home, Maps, Profiles, Methods, Compare, Video, Sources, About
  Editing: Change text in CONTENT and THEME objects. Data URLs in DATA_SOURCES.
*/

// ====== BASIC SITE SETTINGS ======
const THEME = {
  bg: "bg-gradient-to-b from-sky-50 to-white",
  text: "text-slate-700",
  primary: "#1565c0",   // TheBus
  secondary: "#6a1b9a", // WMATA
  accent: "#2e7d32",    // Sidewalks
  highlight: "#ef6c00", // Bus stops
};

const CONTENT = {
  siteTitle: "Where the Sidewalk Ends: Mapping Gaps in Walkability in Upper Marlboro, MD",
  tagline: "Walkability gaps near schools, bus stops, and services",
  intro:
    "Residents of Upper Marlboro, MD face inconsistent sidewalk coverage on key corridors. This site compiles map layers and field findings to prioritize safe, ADA‑compliant connections.",
  aboutCredit:
    "Created by Danielle T. Fisher for CityLab — Johns Hopkins Carey Business School & MICA, Fall 2025.",
};

// ====== DATA SOURCES (live endpoints where possible) ======
const DATA_SOURCES = {
  sidewalks: {
    label: "PGC Sidewalk Inventory (DPWT)",
    url: "https://gis.princegeorgescountymd.gov/arcgis/rest/services/transportation/Sidewalks/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    color: THEME.accent,
  },
  theBusRoutes: {
    label: "TheBus Routes (Summer 2025)",
    url: "https://gis.princegeorgescountymd.gov/arcgis/rest/services/dpwt/BUS_STOP_ROUTE_SUMMER2025/FeatureServer/1/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    color: THEME.primary,
  },
  busStops: {
    label: "TheBus Stops (Summer 2025)",
    url: "https://gis.princegeorgescountymd.gov/arcgis/rest/services/dpwt/BUS_STOP_ROUTE_SUMMER2025/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    color: THEME.highlight,
  },
  wmataBusRoutes: {
    label: "WMATA Major Bus Routes (2025)",
    url: "https://services2.arcgis.com/2NBEaAVPObxRmRog/ArcGIS/rest/services/WMATA_Rail_Map_WFL1/FeatureServer/17/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    color: THEME.secondary,
  },
  groceries: {
    label: "Grocery Stores (PGC Business)",
    url: "https://gis.princegeorgescountymd.gov/arcgis/rest/services/Business/Businesses/MapServer/7/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    color: "#795548",
  },
  schools: {
    label: "PGCPS School Locations",
    url: "https://services1.arcgis.com/qTQ6qYkHpxlu0G82/arcgis/rest/services/PGCPS_School_Locations/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
    color: "#c62828",
  },
};

// ====== SMALL UI HELPERS ======
const Section = ({ title, children }) => (
  <section className="max-w-6xl mx-auto px-4 py-10">
    <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">{title}</h2>
    <div className={"leading-relaxed space-y-4 " + THEME.text}>{children}</div>
  </section>
);

const Pill = ({ children }) => (
  <span className="inline-block rounded-full border px-3 py-1 text-xs md:text-sm mr-2 mb-2">
    {children}
  </span>
);

const KPI = ({ label, value, footnote }) => (
  <div className="rounded-2xl border bg-white p-4 shadow-sm">
    <div className="text-3xl font-bold">{value}</div>
    <div className="text-xs mt-1 text-slate-500">
      {label} {footnote && <span className="align-super">{footnote}</span>}
    </div>
  </div>
);

const Legend = ({ items }) => (
  <div className="bg-white/90 backdrop-blur rounded-2xl shadow p-3 text-xs space-y-1">
    {items.map((it) => (
      <div className="flex items-center gap-2" key={it.label}>
        <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: it.color }} />
        <span>{it.label}</span>
      </div>
    ))}
  </div>
);

// ====== DATA FETCH HOOK ======
const useGeoJson = (url) => {
  const [data, setData] = useState(null);
  useEffect(() => {
    let ignore = false;
    if (!url) return;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (!ignore) setData(d);
      })
      .catch(() => setData(null));
    return () => (ignore = true);
  }, [url]);
  return data;
};

// ====== MAP TABS (used on /maps) ======
function MapTabs() {
  const [tab, setTab] = useState("sidewalks");
  const sidewalks = useGeoJson(DATA_SOURCES.sidewalks.url);
  const theBus = useGeoJson(DATA_SOURCES.theBusRoutes.url);
  const wmata = useGeoJson(DATA_SOURCES.wmataBusRoutes.url);
  const stops = useGeoJson(DATA_SOURCES.busStops.url);
  const groceries = useGeoJson(DATA_SOURCES.groceries.url);
  const schools = useGeoJson(DATA_SOURCES.schools.url);

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="flex flex-wrap gap-2 mb-3">
        {[
          { id: "sidewalks", label: "Sidewalk Coverage" },
          { id: "transit", label: "Transit Access (TheBus + Metrobus)" },
          { id: "schools", label: "Schools & First/Last‑Mile" },
          { id: "food", label: "Food Access (Grocery)" },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3 py-1 rounded-full text-sm border ${
              tab === id ? "bg-slate-900 text-white" : "bg-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Interactive Map</h3>
        <Legend
          items={[
            { label: DATA_SOURCES.sidewalks.label, color: DATA_SOURCES.sidewalks.color },
            { label: DATA_SOURCES.theBusRoutes.label, color: DATA_SOURCES.theBusRoutes.color },
            { label: DATA_SOURCES.wmataBusRoutes.label, color: DATA_SOURCES.wmataBusRoutes.color },
            { label: DATA_SOURCES.busStops.label, color: DATA_SOURCES.busStops.color },
            { label: DATA_SOURCES.schools.label, color: DATA_SOURCES.schools.color },
            { label: DATA_SOURCES.groceries.label, color: DATA_SOURCES.groceries.color },
          ]}
        />
      </div>

      <MapContainer center={[38.8157, -76.7497]} zoom={14} scrollWheelZoom className="h-[560px] w-full rounded-xl">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />

        {/* Town center marker (circle to avoid external icon images) */}
        <CircleAt lat={38.8157} lng={-76.7497} color="#111827" />

        {/* Sidewalks */}
        {(tab === "sidewalks" || tab === "schools" || tab === "food" || tab === "transit") && sidewalks && (
          <GeoJSON data={sidewalks} style={{ color: DATA_SOURCES.sidewalks.color, weight: 2 }} />
        )}

        {/* Transit */}
        {(tab === "transit" || tab === "schools" || tab === "food") && theBus && (
          <GeoJSON data={theBus} style={{ color: DATA_SOURCES.theBusRoutes.color, weight: 2 }} />
        )}
        {(tab === "transit" || tab === "schools" || tab === "food") && wmata && (
          <GeoJSON data={wmata} style={{ color: DATA_SOURCES.wmataBusRoutes.color, weight: 2 }} />
        )}
        {(tab === "transit" || tab === "schools" || tab === "food") && stops && (
          <GeoJSON
            data={stops}
            pointToLayer={(feature, latlng) =>
              L.circleMarker(latlng, { radius: 4, fillOpacity: 0.9, color: DATA_SOURCES.busStops.color, weight: 1 })
            }
          />
        )}

        {/* Schools */}
        {tab === "schools" && schools && (
          <GeoJSON
            data={schools}
            pointToLayer={(feature, latlng) =>
              L.circleMarker(latlng, { radius: 5, fillOpacity: 0.9, color: DATA_SOURCES.schools.color, weight: 1 })
            }
          />
        )}

        {/* Grocery */}
        {tab === "food" && groceries && (
          <GeoJSON
            data={groceries}
            pointToLayer={(feature, latlng) =>
              L.circleMarker(latlng, { radius: 5, fillOpacity: 0.9, color: DATA_SOURCES.groceries.color, weight: 1 })
            }
          />
        )}
      </MapContainer>
      <p className="text-xs text-slate-500 mt-2">
        Live layers from County/WMATA services. See the Sources page for citations and retrieval dates.
      </p>
    </div>
  );
}

// Helper to draw a circle at a coordinate
function CircleAt({ lat, lng, color = "#111827" }) {
  const map = useMap();
  useEffect(() => {
    const layer = L.circleMarker([lat, lng], { radius: 6, color, weight: 2, fillOpacity: 1 });
    layer.addTo(map);
    return () => map.removeLayer(layer);
  }, [lat, lng, color, map]);
  return null;
}

// ====== PAGES ======
function Layout({ children }) {
  return (
    <div className={`min-h-screen ${THEME.bg}`}>
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl md:text-2xl font-bold">
            {CONTENT.siteTitle}
          </Link>
          <nav className="hidden md:flex gap-6 text-sm">
            <NavLink to="/maps" className={({ isActive }) => (isActive ? "underline" : "hover:underline")}>
              Maps
            </NavLink>
            <NavLink to="/profiles" className={({ isActive }) => (isActive ? "underline" : "hover:underline")}>
              Profiles
            </NavLink>
            <NavLink to="/methods" className={({ isActive }) => (isActive ? "underline" : "hover:underline")}>
              Data & Methods
            </NavLink>
            <NavLink to="/compare" className={({ isActive }) => (isActive ? "underline" : "hover:underline")}>
              Compare
            </NavLink>
            <NavLink to="/video" className={({ isActive }) => (isActive ? "underline" : "hover:underline")}>
              Video
            </NavLink>
            <NavLink to="/sources" className={({ isActive }) => (isActive ? "underline" : "hover:underline")}>
              Sources
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => (isActive ? "underline" : "hover:underline")}>
              About
            </NavLink>
          </nav>
        </div>
      </header>
      {children}
      <footer className="text-center text-xs text-slate-500 py-10">CityLab • Upper Marlboro Sidewalks • Multipage v1</footer>
    </div>
  );
}

function HomePage() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="uppercase text-xs tracking-widest text-slate-500">CityLab • Fall 2025</p>
            <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mt-2">{CONTENT.tagline}</h2>
            <p className="mt-4">{CONTENT.intro}</p>
            <div className="mt-4">
              <Pill>Equity</Pill>
              <Pill>Safety</Pill>
              <Pill>ADA</Pill>
              <Pill>First/Last Mile</Pill>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow p-4">
            <MapContainer center={[38.8157, -76.7497]} zoom={14} scrollWheelZoom={false} className="h-72 w-full rounded-xl">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            </MapContainer>
            <p className="text-xs text-slate-500 mt-2">Explore detailed maps, profiles, and data using the top navigation.</p>
          </div>
        </div>
      </div>
      <Section title="Problem Statement">
        <p>
          Inconsistent sidewalks and missing curb ramps force pedestrians—especially students, seniors, wheelchair users, and bus riders—to walk on roadway shoulders. Several key segments lack continuous, safe pedestrian routes to schools, government buildings, health providers, and bus stops.
        </p>
        <ul className="list-disc ml-6">
          <li>Gaps on primary corridors (e.g., Old Marlboro Pike & Old Crain Hwy).</li>
          <li>Limited crossing protection at key intersections.</li>
          <li>First/last‑mile gaps between homes and transit service.</li>
        </ul>
      </Section>
    </Layout>
  );
}

function MapsPage() {
  return (
    <Layout>
      <Section title="Maps: Sidewalks, Transit, Schools & Food Access">
        <MapTabs />
      </Section>
    </Layout>
  );
}

function ProfilesPage() {
  const cards = [
    {
      title: "Tanya (36, Nurse) + Kayla (11, Student)",
      body:
        "Morning drop‑offs happen along a busy two‑lane corridor without sidewalks. To reach the school bus stop, Kayla walks the grassy edge or cuts across yards. Tanya worries about speeding drivers and limited sightlines.",
      items: [
        ["Route", "Old Marlboro Pike → nearest bus stop"],
        ["Barrier", "No sidewalk/curb; narrow shoulder"],
        ["Design need", "Continuous sidewalk + RRFB crossing"],
      ],
    },
    {
      title: "Ms. Gloria (69, Retired Postal Worker)",
      body:
        "Uses a cane and avoids dusk trips because of uneven edges and missing curb ramps. Reaching the nearest stop requires walking in the travel lane for ~200 ft.",
      items: [["Route", "Residential loop → Old Crain Hwy"], ["Barrier", "Missing curb ramps"], ["Design need", "ADA ramps + sidewalk infill"]],
    },
    {
      title: "Derrick (42, Delivery Driver)",
      body:
        "Parks legally but must walk along shoulders to reach storefronts. Trucks and buses encroach on the edge where pedestrians walk.",
      items: [["Route", "Downtown errands around Water St"], ["Barrier", "No continuous pedestrian zone"], ["Design need", "Sidewalk + curb extensions"]],
    },
    {
      title: "Marcus (33, County Employee)",
      body:
        "Uses TheBus to connect to Metro. First/last‑mile gaps add 10 minutes and force unsafe crossings to reach the stop.",
      items: [["Route", "Home → TheBus stop → Largo Town Center"], ["Barrier", "Discontinuous sidewalks"], ["Design need", "Fill gaps + align stops with crossings"]],
    },
    {
      title: "Renee (28, Retail)",
      body:
        "Walks with stroller to daycare. Sloped shoulders and puddling after rain make the route impassable.",
      items: [["Route", "Apartment cluster → daycare"], ["Barrier", "No sidewalk; drainage issues"], ["Design need", "Sidewalk with proper grading + inlet"]],
    },
    {
      title: "Mr. James (71, Veteran)",
      body:
        "Uses a mobility scooter; uneven edges and missing curb cuts force detours in the road.",
      items: [["Route", "Home → clinic → grocery"], ["Barrier", "No curb cuts"], ["Design need", "ADA curb ramps + clear width"]],
    },
  ];

  return (
    <Layout>
      <Section title="Community Profiles: Who’s Walking — and Where the Sidewalk Ends">
        <p className="text-sm text-slate-600">
          Personas illustrate lived experiences based on field observation and adult interviews. The child perspective is included with a parent and does not involve direct child interviews.
        </p>
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {cards.map((c) => (
            <div key={c.title} className="bg-white rounded-2xl shadow p-5">
              <h3 className="text-lg font-semibold">{c.title}</h3>
              <p className="text-sm mt-2">{c.body}</p>
              <ul className="text-sm list-disc ml-5 mt-2">
                {c.items.map(([k, v]) => (
                  <li key={k}>
                    <strong>{k}:</strong> {v}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
    </Layout>
  );
}

function MethodsPage() {
  return (
    <Layout>
      <Section title="Data & Methods">
        <p>
          <strong>Scope.</strong> We mapped sidewalk coverage, bus routes/stops (TheBus 2025 & WMATA 2025), schools, and grocery access for Upper Marlboro, MD. We computed walking distances and first/last‑mile conditions to essential destinations.
        </p>
        <p>
          <strong>Sources.</strong> Official county/state feature services and agency pages. Each map layer and statement references the numbered source on the Sources page.
        </p>
        <p>
          <strong>Method.</strong> Layers are requested as live GeoJSON from ArcGIS Feature/Map Services when available. For walk metrics, we apply a standard 5 km/h walking speed and measure distance to nearest bus stop, school entrance, and grocery point. ADA considerations (curb ramps, detectable warnings) inform gap scoring.
        </p>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <KPI label="% corridor without sidewalks (study area)" value="—" footnote="[1]" />
          <KPI label="# bus stops lacking sidewalk within 100 ft" value="—" footnote="[2][3]" />
          <KPI label="Median walk to nearest grocery" value="—" footnote="[4]" />
        </div>
      </Section>
    </Layout>
  );
}

function ComparePage() {
  return (
    <Layout>
      <Section title="Comparison Neighborhood: Edgewater, MD (Income/Scale Match)">
        <p>
          To contextualize Upper Marlboro’s walkability gaps, we mirror the same measures in a predominantly white,
          similar‑income community: <strong>Edgewater, MD</strong>. This page will replicate sidewalk coverage, transit access,
          and access to groceries/schools using comparable data sources.
        </p>
        <div className="bg-white rounded-2xl shadow p-4">
          <p className="text-sm text-slate-600">
            (Placeholder) Add Edgewater layers here using the same endpoints and methods for an apples‑to‑apples comparison.
          </p>
          <div className="mt-3">
            <Pill>Income Parity</Pill>
            <Pill>Demographic Contrast</Pill>
            <Pill>Method Match</Pill>
          </div>
        </div>
      </Section>
    </Layout>
  );
}

function VideoPage() {
  return (
    <Layout>
      <Section title="Presentation Video">
        <div className="aspect-video bg-black/5 rounded-xl flex items-center justify-center">
          <p className="text-slate-500">Embed your Loom/YouTube link here</p>
        </div>
      </Section>
    </Layout>
  );
}

function SourcesPage() {
  return (
    <Layout>
      <Section title="Sources & Citations">
        <ol className="list-decimal ml-6 text-sm">
          <li>
            Sidewalks — Prince George’s County DPW&T <code>transportation/Sidewalks</code> MapServer (live GeoJSON query). Retrieved Nov 4, 2025. [
            <a className="underline" href="https://gis.princegeorgescountymd.gov/arcgis/rest/services/transportation/Sidewalks/MapServer/0">REST</a>]
          </li>
          <li>
            TheBus Summer 2025 — Stops & Routes FeatureServer (live GeoJSON). Retrieved Nov 4, 2025. [
            <a className="underline" href="https://gis.princegeorgescountymd.gov/arcgis/rest/services/dpwt/BUS_STOP_ROUTE_SUMMER2025/FeatureServer/layers">REST</a>]
          </li>
          <li>
            WMATA Major Bus Routes — FeatureServer Layer 17 (live GeoJSON). Retrieved Nov 4, 2025. [
            <a className="underline" href="https://services2.arcgis.com/2NBEaAVPObxRmRog/ArcGIS/rest/services/WMATA_Rail_Map_WFL1/FeatureServer/17">REST</a>]
          </li>
          <li>
            Grocery Stores — Prince George’s County Business MapServer Layer 7 (live GeoJSON). Retrieved Nov 4, 2025. [
            <a className="underline" href="https://gis.princegeorgescountymd.gov/arcgis/rest/services/Business/Businesses/MapServer/7">REST</a>]
          </li>
          <li>
            PGCPS School Locations — FeatureServer (live GeoJSON). Retrieved Nov 4, 2025. [
            <a className="underline" href="https://services1.arcgis.com/qTQ6qYkHpxlu0G82/arcgis/rest/services/PGCPS_School_Locations/FeatureServer/0">REST</a>]
          </li>
          <li>
            Metrorail Hours (not 24/7) — WMATA. Retrieved Nov 4, 2025. [
            <a className="underline" href="https://www.wmata.com/service/rail/">WMATA Rail Hours</a>]
          </li>
          <li>
            Call‑A‑Bus Service Window — Prince George’s County DPW&T. Retrieved Nov 4, 2025. [
            <a className="underline" href="https://www.princegeorgescountymd.gov/departments-offices/public-works-transportation/metro-and-transportation/call-bus">Call‑A‑Bus</a>]
          </li>
          <li>
            TheBus Redesign 2025 — County landing page. Retrieved Nov 4, 2025. [
            <a className="underline" href="https://www.princegeorgescountymd.gov/departments-offices/thebus-new-routes-2025">TheBus 2025</a>]
          </li>
        </ol>
        <p className="text-xs text-slate-500 mt-3">
          Each interactive layer on the Maps page is loaded directly from the listed REST services using GeoJSON queries with WGS84 (EPSG:4326).
        </p>
      </Section>
    </Layout>
  );
}

function AboutPage() {
  return (
    <Layout>
      <Section title="About the Project">
        <p>
          <strong>{CONTENT.aboutCredit}</strong>
        </p>
        <p className="text-sm text-slate-600">
          This site is an academic visualization. Child perspectives are represented ethically via parent/guardian interviews and direct observation; no minors were interviewed directly.
        </p>
      </Section>
    </Layout>
  );
}

function NotFoundPage() {
  return (
    <Layout>
      <Section title="Page not found">
        <p>Try the navigation above to explore the Maps, Profiles, Methods, Compare, and Sources pages.</p>
      </Section>
    </Layout>
  );
}

// ====== APP (ROUTER) ======
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/maps" element={<MapsPage />} />
        <Route path="/profiles" element={<ProfilesPage />} />
        <Route path="/methods" element={<MethodsPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/video" element={<VideoPage />} />
        <Route path="/sources" element={<SourcesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
