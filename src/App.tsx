import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Cloud as CloudIcon, Search, Calendar, CloudRain, CloudSnow, Wind, Droplets, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

function Cloud() {
  return (
    <svg viewBox="0 0 350 180" className="w-full h-full">
      <defs>
        <filter id="f1" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="35" />
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fafafa" />
          <stop offset="100%" stopColor="#c7c7c7" />
        </linearGradient>
      </defs>
      <g filter="url(#f1)">
        <ellipse cx="120" cy="100" rx="90" ry="55" fill="url(#g1)" />
        <ellipse cx="200" cy="95" rx="95" ry="60" fill="url(#g1)" />
        <ellipse cx="260" cy="110" rx="70" ry="45" fill="url(#g1)" />
        <ellipse cx="80" cy="120" rx="70" ry="40" fill="url(#g1)" />
      </g>
    </svg>
  );
}

function ActivityCard({ title, match, img, onClick }) {
  return (
    <button onClick={onClick} className="text-left w-full">
      <div className="flex items-center gap-3 rounded-2xl bg-white/80 hover:bg-white/90 transition p-3 pr-5 shadow-sm ring-1 ring-slate-100">
        <div className="w-16 h-16 rounded-xl overflow-hidden">
          <img src={img} alt={title} className="w-full h-full object-cover" />
        </div>
        <div className="leading-tight">
          <div className="text-lg font-semibold">{title}</div>
          {match && <div className="text-slate-500 font-medium">{match} Match</div>}
        </div>
      </div>
    </button>
  );
}

function TimeChip({ n, label }) {
  return (
    <div className="flex items-center gap-4">
      <div className="grid place-items-center w-10 h-10 rounded-full border-2 border-emerald-500 text-emerald-600 font-bold">{n}</div>
      <div className="text-xl font-semibold">{label}</div>
    </div>
  );
}

function SimilarLocation({ city, match, img, onClick }) {
  return (
    <button onClick={onClick} className="text-left w-full">
      <div className="flex items-center gap-4 rounded-2xl hover:bg-white/60 transition p-2">
        <div className="w-28 h-16 rounded-2xl overflow-hidden ring-1 ring-white/60 shadow-sm">
          <img src={img} alt={city} className="w-full h-full object-cover" />
        </div>
        <div>
          <div className="font-semibold text-xl">{city}</div>
          {match && <div className="text-slate-500 font-medium">{match} Match</div>}
        </div>
      </div>
    </button>
  );
}

function ordinal(n) { const s = ["th","st","nd","rd"]; const v = n % 100; return s[(v-20)%10] || s[v] || s[0]; }
function formatDateLabel(iso) { const d = new Date(iso); const m = d.toLocaleString("en-US", { month: "short" }); const day = d.getDate(); return `${m} ${day}${ordinal(day)} ${d.getFullYear()}`; }

function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no-window"));
    if (typeof (window as any).L !== "undefined") return resolve((window as any).L);
    if (!document.querySelector('link[data-leaflet]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.setAttribute("data-leaflet", "true");
      document.head.appendChild(link);
    }
    const existing = document.querySelector('script[data-leaflet]');
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).L));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.setAttribute("data-leaflet", "true");
    script.onload = () => resolve((window as any).L);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function LeafletMap({ position, place, onSelect, isFullscreen, onToggleFullscreen }) {
  const normalRef = useRef(null);
  const fullscreenRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [showExpandButton, setShowExpandButton] = useState(false);
  
  // Initialize map
  const initializeMap = (container) => {
    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (e) {
        // Ignore errors during cleanup
      }
      mapRef.current = null;
      markerRef.current = null;
    }
    
    loadLeaflet().then((L) => {
      if (container && !mapRef.current) {
        try {
          mapRef.current = L.map(container, {
            zoomControl: true,
            attributionControl: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            touchZoom: true,
            dragging: true
          }).setView([position.lat, position.lng], 11);
          
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { 
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19,
            tileSize: 256,
            zoomOffset: 0
          }).addTo(mapRef.current);
          
          markerRef.current = L.marker([position.lat, position.lng]).addTo(mapRef.current).bindPopup(place);
          
          mapRef.current.on("click", (e) => {
            onSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
            if (isFullscreen) {
              setTimeout(() => onToggleFullscreen(), 100);
            }
          });
          
          // Force map to resize after initialization
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.invalidateSize();
            }
          }, 100);
        } catch (error) {
          console.error('Error initializing map:', error);
        }
      }
    }).catch((error) => {
      console.error('Error loading Leaflet:', error);
    });
  };

  // Initialize map when component mounts or fullscreen changes
  useEffect(() => {
    const currentRef = isFullscreen ? fullscreenRef.current : normalRef.current;
    if (currentRef) {
      // Add multiple delays to ensure proper initialization across browsers
      setTimeout(() => initializeMap(currentRef), 100);
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 300);
    }
    
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          // Ignore cleanup errors
        }
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isFullscreen]);

  // Update position when it changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([position.lat, position.lng]);
      if (markerRef.current) {
        markerRef.current.setLatLng([position.lat, position.lng]).bindPopup(place);
      }
    }
  }, [position.lat, position.lng, place]);

  if (isFullscreen) {
    return (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onToggleFullscreen}
        />
        {/* Fullscreen Map */}
        <div className="fixed top-8 left-4 right-4 bottom-16 z-50 bg-white rounded-lg shadow-2xl overflow-hidden" style={{ width: 'calc(100vw - 2rem)', height: 'calc(100vh - 6rem)' }}>
          <button
            onClick={onToggleFullscreen}
            className="absolute top-4 right-4 z-10 bg-white hover:bg-gray-100 p-2 rounded-full shadow-lg transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
          <div ref={fullscreenRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />
        </div>
      </>
    );
  }

  return (
    <div 
      className="relative w-full h-full group"
      onMouseEnter={() => setShowExpandButton(true)}
      onMouseLeave={() => setShowExpandButton(false)}
    >
      <div ref={normalRef} className="w-full h-full rounded-lg" />
      {showExpandButton && (
        <button
          onClick={onToggleFullscreen}
          className="absolute top-2 right-2 bg-white hover:bg-gray-100 p-2 rounded shadow-md transition-all duration-200 z-10 opacity-90 hover:opacity-100"
          title="Expand map"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
        </button>
      )}
    </div>
  );
}

function WeatherFX({ condition }) {
  if (condition === "sunny") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-amber-300/40 blur-3xl animate-pulse" />
      </div>
    );
  }
  if (condition === "rainy") {
    const drops = Array.from({ length: 60 });
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-100/40 to-sky-200/20" />
        {drops.map((_, i) => (
          <div key={i} className="absolute w-[2px] h-6 bg-sky-400/70 animate-[fall_1.4s_linear_infinite]" style={{ left: `${(i*17)%100}%`, top: `${-(i%20)*20}px`, animationDelay: `${(i%10)*0.1}s` }} />
        ))}
        <style>{`@keyframes fall{0%{transform:translateY(-10vh)}100%{transform:translateY(120vh)}}`}</style>
      </div>
    );
  }
  if (condition === "snowy") {
    const flakes = Array.from({ length: 40 });
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {flakes.map((_, i) => (
          <div key={i} className="absolute animate-[drift_6s_linear_infinite]" style={{ left: `${(i*23)%100}%`, top: `${-(i%20)*25}px`, animationDelay: `${(i%12)*0.2}s` }}>
            <CloudSnow className="w-5 h-5 text-slate-200" />
          </div>
        ))}
        <style>{`@keyframes drift{0%{transform:translateY(-10vh) rotate(0)}100%{transform:translateY(110vh) rotate(180deg)}}`}</style>
      </div>
    );
  }
  if (condition === "windy") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-y-0 -left-24 w-1/2 bg-gradient-to-r from-sky-200/30 to-transparent blur-2xl animate-[sweep_8s_ease-in-out_infinite]" />
        <style>{`@keyframes sweep{0%,100%{transform:translateX(-20%)}50%{transform:translateX(30%)}}`}</style>
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-60">
        <Cloud />
      </div>
    </div>
  );
}

function HeaderNav({ visible, currentPage, setPage, surveyResults }) {
  return (
    <header
      className={`fixed top-0 left-0 w-full z-40 transition-all duration-400 ${
        visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      } bg-white/50 shadow-sm ring-1 ring-slate-100 backdrop-blur`}
      style={{ willChange: "opacity, transform" }}
    >
  <nav className="max-w-[1400px] mx-auto flex items-center justify-between px-2 py-3">
        {/* Outlined logo, same style as buttons */}
        <div
          className="text-3xl font-extrabold text-black cursor-pointer pl-2 select-none flex items-baseline"
          onClick={() => currentPage !== "home" && setPage("home")}
        >
          WhetherWeather<span className="text-base font-normal ml-1">2025 v0.9</span>
        </div>
        <ul className="flex gap-6 text-base">
          <li>
            <button
              className={`text-black px-4 py-2 ${currentPage === "home" ? "font-bold" : ""}`}
              onClick={() => currentPage !== "home" && setPage("home")}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              Home
            </button>
          </li>
          <li>
            <button
              className={`text-black px-4 py-2 ${currentPage === "about" ? "font-bold" : ""}`}
              onClick={() => currentPage !== "about" && setPage("about")}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              About
            </button>
          </li>
          <li>
            <button
              className={`text-black px-4 py-2 ${currentPage === "survey" ? "font-bold" : ""}`}
              onClick={() => currentPage !== "survey" && setPage("survey")}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              Event Planner Survey
            </button>
          </li>
          {surveyResults && (
            <li>
              <button
                className={`text-black px-4 py-2 ${currentPage === "results" ? "font-bold" : ""}`}
                onClick={() => currentPage !== "results" && setPage("results")}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                Survey Results
              </button>
            </li>
          )}
          <li>
            <button
              className={`text-black px-4 py-2 ${currentPage === "nasaspaceapps2025" ? "font-bold" : ""}`}
              onClick={() => currentPage !== "nasaspaceapps2025" && setPage("nasaspaceapps2025")}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              NASASpaceApps2025
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
}

function NASASpaceApps2025Page() {
  return (
    <div className="min-h-[120vh] w-full relative overflow-hidden pb-16" 
         style={{
           background: 'linear-gradient(135deg, #0a0a2e 0%, #16213e 25%, #1a237e 50%, #0e1b3c 75%, #0a0a2e 100%)'
         }}>
      
      {/* Starfield Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large stars - more randomly distributed */}
        <div className="absolute top-12 right-24 w-3 h-3 bg-white rounded-full opacity-90 animate-pulse"></div>
        <div className="absolute top-20 right-20 w-2 h-2 bg-white rounded-full opacity-70"></div>
        <div className="absolute top-36 right-1/2 w-2.5 h-2.5 bg-white rounded-full opacity-80 animate-pulse"></div>
        <div className="absolute top-44 left-3/4 w-1.5 h-1.5 bg-white rounded-full opacity-60"></div>
        <div className="absolute bottom-40 right-1/3 w-3 h-3 bg-white rounded-full opacity-95"></div>
        <div className="absolute bottom-32 right-16 w-1.5 h-1.5 bg-white rounded-full opacity-50 animate-pulse"></div>
        <div className="absolute bottom-20 right-2/3 w-2 h-2 bg-white rounded-full opacity-85"></div>
        <div className="absolute top-1/2 right-10 w-1.5 h-1.5 bg-white rounded-full opacity-70"></div>
        
        {/* Medium stars - repositioned */}
        <div className="absolute top-16 right-1/4 w-1.5 h-1.5 bg-white rounded-full opacity-60"></div>
        <div className="absolute top-24 right-2/5 w-2 h-2 bg-white rounded-full opacity-75 animate-pulse"></div>
        <div className="absolute top-28 left-3/5 w-1 h-1 bg-white rounded-full opacity-50"></div>
        <div className="absolute top-22 right-1/5 w-2.5 h-2.5 bg-white rounded-full opacity-80"></div>
        
        {/* Small scattered stars - better distribution */}
        <div className="absolute top-1/4 right-1/2 w-1.5 h-1.5 bg-white rounded-full opacity-80 animate-pulse"></div>
        <div className="absolute top-1/4 right-1/6 w-1 h-1 bg-white rounded-full opacity-45"></div>
        <div className="absolute top-1/4 right-1/12 w-2 h-2 bg-white rounded-full opacity-70"></div>
        
        <div className="absolute top-1/2 left-2/3 w-1 h-1 bg-white rounded-full opacity-55 animate-pulse"></div>
        <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-white rounded-full opacity-70"></div>
        <div className="absolute top-1/2 right-1/8 w-2 h-2 bg-white rounded-full opacity-50"></div>
        
        <div className="absolute top-2/3 left-2/3 w-1.5 h-1.5 bg-white rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute top-2/3 right-2/5 w-1 h-1 bg-white rounded-full opacity-75"></div>
        <div className="absolute top-2/3 right-1/6 w-1.5 h-1.5 bg-white rounded-full opacity-45"></div>
        
        <div className="absolute bottom-1/4 right-2/3 w-1 h-1 bg-white rounded-full opacity-55 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-2/6 w-1.5 h-1.5 bg-white rounded-full opacity-80"></div>
        <div className="absolute bottom-1/4 right-1/10 w-1 h-1 bg-white rounded-full opacity-60"></div>
        
        {/* Additional scattered small stars - avoiding left clustering */}
        <div className="absolute top-1/8 left-3/4 w-1 h-1 bg-white rounded-full opacity-50"></div>
        <div className="absolute top-5/8 right-1/10 w-1 h-1 bg-white rounded-full opacity-75"></div>
        <div className="absolute top-7/8 left-1/2 w-2 h-2 bg-white rounded-full opacity-55"></div>
        <div className="absolute bottom-1/8 left-3/4 w-1 h-1 bg-white rounded-full opacity-70"></div>
        <div className="absolute bottom-3/8 right-1/4 w-1.5 h-1.5 bg-white rounded-full opacity-45 animate-pulse"></div>
      </div>

      {/* Main Content Container - moved lower and more transparent */}
      <div className="relative z-10 min-h-screen flex items-end justify-center px-6 py-8 pb-16">
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-10 max-w-4xl w-full border border-white/10 mb-0 mt-24">
          <div className="flex flex-col gap-6">
            
            <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight text-center">
              <a 
                href="https://www.spaceappschallenge.org/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-300 hover:text-blue-200 transition-colors underline"
              >
                NASA Space Apps Challenge 2025
              </a>
            </h1>

            <div className="mt-3">
              <h2 className="text-xl font-bold mb-2 text-white underline">About Us</h2>
              <p className="font-semibold leading-relaxed text-white text-base mb-2">
                Developed by engineering students at the University of Sydney, this webpage was created as a part of a hackathon, to integrate NASA data and complex algorithms to help people predict weather months, and even years in advance.
              </p>
            </div>

            <div className="mt-3">
              <h2 className="text-xl font-bold mb-2 text-white underline">Why?</h2>
              <p className="font-semibold leading-relaxed mb-2 text-white text-base">
                Well, the short answer is because it was a challenge in the hackathon that we decided to partake in.
              </p>
              <p className="font-semibold leading-relaxed text-white text-base mb-2">
                The long answer is because for most people, we only need to know the weather a few days, or maybe a week in advance. As a result, on our phone weather apps, we can only see up to a week. However, for some people, knowing the weather (or at least, with certain confidences) is important; for perhaps their jobs, event planning etc. Also, for people living in areas which suffer extreme weather events, our service helps predict these too.
              </p>
            </div>

            <div className="mt-3">
              <p className="font-semibold leading-relaxed mb-2 text-white text-base">
                The website is constantly in development, and many more features will be added, along with updates to our algorithms, APIs, and server speeds, as well as the overall user experience.
              </p>
              <p className="font-bold leading-relaxed text-white text-lg">
                Feel free to reach out for any queries!!!
              </p>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-900 via-purple-800 to-indigo-700 pt-32 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-blue-100 mb-3">
            About WhetherWeather
          </h1>
          <p className="text-lg text-blue-200 leading-relaxed">
            A free and easy to access service providing mid to long term weather prediction using NASA data and advanced statistical algorithms.
          </p>
        </div>

        <div className="grid gap-8 md:gap-12">
          {/* TLDR Section */}
          <div className="bg-blue-800/50 rounded-2xl shadow-lg p-6 border border-blue-700/50">
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-3">
              📝 TLDR
            </h2>
            <div className="space-y-3 text-white leading-relaxed text-sm">
              <p>
                WhetherWeather is a simple web app that tells you what the weather will probably be like months or even years in the future. Unlike your phone's weather app that only shows you the next week, we use NASA's historical weather data and smart computer algorithms to make educated guesses about weather patterns way ahead of time.
              </p>
              <p>
                Perfect for planning weddings, vacations, outdoor events, or just satisfying your curiosity about whether it'll be sunny for your birthday next year. The predictions come with confidence levels so you know how reliable they are. It's free, easy to use, and helps you plan your future with weather insights you can't get anywhere else.
              </p>
            </div>
          </div>

          {/* NASA Database Section */}
          <div className="bg-blue-800/50 rounded-2xl shadow-lg p-6 border border-blue-700/50">
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-3">
              🛰️ NASA POWER Database
            </h2>
            <div className="space-y-3 text-white leading-relaxed text-sm">
              <p>
                Our weather predictions are powered by NASA's POWER (Prediction of Worldwide Energy 
                Resources) database, which contains decades of historical weather data collected from satellites and ground stations worldwide.
              </p>
              <p>
                This comprehensive dataset includes temperature, precipitation, humidity, wind patterns, and many other climatology measurements spanning over 40 years, providing us with valid and plentiful data, which can be used algorithmically to predict future weather patterns.
              </p>
            </div>
          </div>

          {/* Algorithm Section */}
          <div className="bg-blue-800/50 rounded-2xl shadow-lg p-6 border border-blue-700/50">
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-3">
              🧠 Climatology Prediction Algorithm
            </h2>
            <div className="space-y-3 text-white leading-relaxed text-sm">
              <p>
                Our prediction algorithm employs advanced statistical analysis and machine learning techniques to identify 
                patterns and trends in historical weather data. Through the analysis of these long-term climate patterns, seasonal variations, 
                and historical weather events, our algorithms can predict weather conditions with reasonable confidence 
                intervals (which are shown) for dates months or even years in advance.
              </p>
              <p>
                When the backend is given a selected date, and a selected location (with coordinates) via the user, the software will fetch weather data via the NASA API, and send it to the algorithm. The algorithm will take this information and use a variety of methods, combining multiple prediction models to provide:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Point (coordinate) estimates for expected weather conditions at any date in the future</li>
                <li>Confidence intervals showing the range of likely outcomes</li>
                <li>Probability assessments for extreme weather events</li>
                <li>Seasonal trend analysis and anomaly detection</li>
              </ul>
            </div>
          </div>

          {/* Use Cases Section */}
          <div className="bg-blue-800/50 rounded-2xl shadow-lg p-6 border border-blue-700/50">
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-3">
              🎯 Practicality and Real World Applications
            </h2>
            <div className="space-y-3 text-white leading-relaxed text-sm">
              <p>
                Why does this software exist? Well, other than the fact that it was created for a hackathon, mid to long term weather prediction is useful for:
              </p>
              <div className="grid md:grid-cols-2 gap-3 mt-3">
                <div>
                  <h3 className="font-semibold text-white mb-2 text-sm">Event Planning</h3>
                  <ul className="text-xs space-y-1 text-white/80">
                    <li>• Weddings and outdoor ceremonies</li>
                    <li>• Festivals and large gatherings</li>
                    <li>• Agricultural planning</li>
                    <li>• Planning locations for a nice and sunny proposal!</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2 text-sm">Risk Management & Safety</h3>
                  <ul className="text-xs space-y-1 text-white/80">
                    <li>• Construction project planning</li>
                    <li>• Travel and tourism</li>
                    <li>• Insurance and finance</li>
                    <li>• Extreme Weather events warnings</li>
                  </ul>
                </div>
              </div>
              <p className="mt-3">
                And also for those who are simply curious about future weather, anywhere in the world.
              </p>
            </div>
          </div>

          {/* Development Team */}
          <div className="bg-blue-800/50 rounded-2xl shadow-lg p-6 border border-blue-700/50">
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-3">
              👥 Development Team
            </h2>
            <div className="space-y-3 text-white leading-relaxed text-sm">
              <p>
                WhetherWeather was developed by Michael Deng, Yatin Bayya, Oscar Whatmough, and Hajin Paek; a group of engineering students at the University of Sydney as part of the NASA Space Apps Challenge 2025. Our team combines expertise in data science, front end and back end web development, and software engineering, to deliver (relatively) accurate weather predictions.
              </p>
              <p>
                This website will be managed, and will be constantly updated with more features, fixes, and more accurate data.
              </p>
              <p>
                We acknowledge that as of now, some data in the algorithm is incorrect, and due to me (Michael) being behind in a lot of courses right now, I am unable to edit the algorithm, for at least a small while. So please don't blame me, thanks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SurveyNotAvailablePage({ setPage }: { setPage: (page: string) => void }) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-900 via-purple-800 to-indigo-700 pt-32 pb-16 px-6 flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-blue-800/50 rounded-2xl shadow-lg p-12 border border-blue-700/50">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
              🚧 Survey Feature
            </h1>
            <p className="text-2xl md:text-3xl text-blue-100 leading-relaxed">
              Sorry about that. The survey feature is not yet available. Fixing is in progress :)
            </p>
          </div>
          
          <button
            onClick={() => setPage("home")}
            className="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors duration-200 text-lg"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus('sending');

    try {
      // Using FormSubmit.co API to send emails
      const response = await fetch('https://formsubmit.co/ajax/michaeldengyt1@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: `WhetherWeather Contact: ${formData.subject}`,
          message: formData.message,
          _captcha: false
        })
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setSubmitStatus('error');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-900 via-purple-800 to-indigo-700 pt-32 pb-16 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-blue-100 mb-3">
            Contact Us / Feedback
          </h1>
          <p className="text-lg text-blue-200 leading-relaxed">
            We'd love to hear from you! Send us your feedback, questions, or suggestions.
          </p>
        </div>

        <div className="bg-blue-800/50 rounded-2xl shadow-lg p-8 border border-blue-700/50">
          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-green-600/20 border border-green-500/50 rounded-lg">
              <p className="text-green-100 text-center">✅ Thank you! Your message has been sent successfully.</p>
            </div>
          )}
          
          {submitStatus === 'error' && (
            <div className="mb-6 p-4 bg-red-600/20 border border-red-500/50 rounded-lg">
              <p className="text-red-100 text-center">❌ Sorry, there was an error sending your message. Please try again.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-white font-medium mb-2">
                Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-blue-900/50 border border-blue-600/50 rounded-lg text-white placeholder-blue-200/70 focus:outline-none focus:border-blue-400"
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-white font-medium mb-2">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-blue-900/50 border border-blue-600/50 rounded-lg text-white placeholder-blue-200/70 focus:outline-none focus:border-blue-400"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-white font-medium mb-2">
                Subject *
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-blue-900/50 border border-blue-600/50 rounded-lg text-white placeholder-blue-200/70 focus:outline-none focus:border-blue-400"
                placeholder="What's this about?"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-white font-medium mb-2">
                Message *
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                required
                rows={6}
                className="w-full px-4 py-3 bg-blue-900/50 border border-blue-600/50 rounded-lg text-white placeholder-blue-200/70 focus:outline-none focus:border-blue-400 resize-vertical"
                placeholder="Tell us what's on your mind..."
              />
            </div>

            <button
              type="submit"
              disabled={submitStatus === 'sending'}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {submitStatus === 'sending' ? 'Sending...' : 'Send Message'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-blue-600/30">
            <p className="text-blue-200 text-sm text-center">
              You can also reach us at: <a href="mailto:michaeldengyt1@gmail.com" className="text-blue-100 hover:underline">michaeldengyt1@gmail.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  const phrases = [
    // 💍 Life events
    "💍 Planning a wedding?",
    "🎂 Outdoor birthday?",
    "💐 Engagement party?",
    "👶 Baby shower?",
    "❤️ Anniversary dinner?",
    "👨‍👩‍👧‍👦 Family reunion?",
    "🎓 Graduation photos?",
    "🌳 Backyard celebration?",
    "🌸 Garden party?",
    "💒 Outdoor proposal?",
    "🎄 Outdoor Christmas lunch?",
    "🎆 New Year celebration?",
    "🍇 Vineyard wedding?",
    "🌴 Destination wedding?",
    "🏕️ Outdoor ceremony?",

    // ✈️ Travel & holidays
    "🏖️ Booking a beach trip?",
    "🎿 Ski trip ahead?",
    "🏕️ Camping getaway?",
    "💞 Honeymoon plans?",
    "🚗 Road trip adventure?",
    "🌅 Holiday escape?",
    "🛫 Flying overseas?",
    "🏝️ Heading to the islands?",
    "☀️ Europe in summer?",
    "🌺 Bali holiday?",
    "🏔️ Queenstown trip?",
    "🦘 Outback journey?",
    "🏙️ City break?",
    "🏡 Country retreat?",
    "🌊 Beach holiday next year?",

    // 🏃‍♂️ Sports & fitness
    "🏃‍♂️ Running a marathon?",
    "🏅 Half-marathon day?",
    "⛰️ Trail race ahead?",
    "🚴 Triathlon training?",
    "🚵 Cycling event?",
    "🚣 Rowing regatta?",
    "⛳ Golf tournament?",
    "🏄 Surf trip?",
    "⚽ Soccer finals?",
    "🏏 Cricket weekend?",
    "🏐 Netball tournament?",
    "🎗️ Charity run?",
    "🏫 School sports day?",
    "🥇 Cross-country race?",
    "💪 Fitness bootcamp?",

    // 🎪 Business & public events
    "🎤 Hosting a concert?",
    "🏕️ Outdoor expo?",
    "🍔 Food festival?",
    "🧺 Farmers market?",
    "🏢 Team retreat?",
    "🏠 Company open day?",
    "🚀 Product launch?",
    "💼 Corporate event?",
    "🛍️ Trade fair?",
    "📸 Photo shoot?",
    "🎥 Film shoot?",
    "📣 Outdoor promotion?",
    "🤝 Team-building day?",
    "🏌️ Client golf day?",
    "📊 Conference planning?",

    // 🏡 Home & garden projects
    "🧱 Pouring concrete slab?",
    "🎨 Painting the house?",
    "🪜 Roof repairs?",
    "🪵 Building a deck?",
    "🔨 Home renovation?",
    "🚗 New driveway?",
    "🚧 Installing a fence?",
    "🌿 Lawn makeover?",
    "🏡 Backyard project?",
    "🌷 Planting the garden?",
    "🌳 Landscaping work?",
    "🌲 Tree planting?",
    "💡 Outdoor lighting?",
    "🏊 Pool build?",
    "🔋 Solar install?",
    "📦 Major house move?",
    "🏠 Open home day?",
    "🧼 Spring cleaning plan?",
    "🌼 Garden redesign?",
    "🧰 Exterior upgrade?",

    // 🌾 Farming & rural
    "🌾 Scheduling harvest?",
    "🌱 Planting season?",
    "🐑 Lambing season?",
    "🐄 Calving season?",
    "🚿 Irrigation plan?",
    "🌻 Pasture management?",
    "🌾 Hay baling?",
    "🚜 Crop spraying?",
    "🐄 Livestock transport?",
    "🪚 Fence maintenance?",
    "🏡 Farm open day?",
    "🍇 Vineyard picking?",
    "🌦️ Weather-sensitive job?",
    "✂️ Orchard pruning?",
    "🐖 Farm show event?",

    // 🌅 Lifestyle & leisure
    "🥾 Planning a hiking trip?",
    "🏔️ Multi-day trek ahead?",
    "🏕️ Camping expedition?",
    "🎣 Fishing getaway?",
    "🛶 Kayak adventure?",
    "🌄 Mountain sunrise trip?",
    "✨ Stargazing weekend?",
    "📷 Photography tour?",
    "🏖️ Beach camping?",
    "🎈 Hot-air balloon ride?",
    "🗓️ Long-weekend escape?",
    "🏕️ Glamping holiday?",
    "🛣️ Scenic road trip?",
    "👨‍👩‍👧 Family holiday?",
    "🌺 Luxury retreat?",

    // ☀️ Weather-sensitive work
    "🎨 Exterior painting?",
    "🏠 Roof replacement?",
    "🪵 Deck staining?",
    "🛣️ Driveway sealing?",
    "🪟 Window installation?",
    "🧱 Outdoor paving?",
    "🎨 Fence painting?",
    "🌿 Landscaping schedule?",
    "🏗️ Building foundation?",
    "🎥 Outdoor filming?",
    "🚁 Drone shoot?",
    "🏗️ Construction start date?",
    "🔧 Exterior refurbishment?",
    "🏡 Garden build project?"
  ];

  // Taglines array for slower cycling
  const taglines = [
    "Because your wedding planner needs to know NOW",
    "Weather predictions you can plan your life around",
    "Advanced climatology predictions for strategic planning",
    "Scientific weather prediction beyond the weekly forecast",
    "Your personal weather time machine",
    "Weather forecasting for the chronically prepared",
    "Future weather, present peace of mind",
    "Because sometimes you need to know if it'll rain next summer",
    "Weather wizardry powered by NASA",
    "Turning crystal balls into algorithms",
    "Weather that thinks ahead, so you don't have to",
    "Making meteorologists jealous since 2025",
    "Your time-traveling weather app",
    "Because 'check the weather' shouldn't mean 'check yesterday'",
    "Predicting tomorrow's drama, today",
    "Know the weather before the weather knows itself"
  ];

  // Add your image URLs here. You can add more later for cycling.
  const images = [
    "https://images.pexels.com/photos/164250/pexels-photo-164250.jpeg",
    "https://images.pexels.com/photos/325521/pexels-photo-325521.jpeg",
    "https://images.pexels.com/photos/868097/pexels-photo-868097.jpeg",
    "https://images.pexels.com/photos/1608383/pexels-photo-1608383.jpeg",
    "https://images.pexels.com/photos/2398220/pexels-photo-2398220.jpeg",
    "https://images.pexels.com/photos/29857582/pexels-photo-29857582.jpeg",
    "https://images.pexels.com/photos/3278215/pexels-photo-3278215.jpeg",
    "https://images.pexels.com/photos/34155468/pexels-photo-34155468.jpeg",
    "https://images.pexels.com/photos/3669288/pexels-photo-3669288.jpeg",
    "https://images.pexels.com/photos/869258/pexels-photo-869258.jpeg",
    "https://images.pexels.com/photos/975771/pexels-photo-975771.jpeg",
    "https://images.unsplash.com/photo-1699240893341-6750644e05aa",
    "https://images.pexels.com/photos/315191/pexels-photo-315191.jpeg",
    "https://images.pexels.com/photos/1488402/pexels-photo-1488402.jpeg",
    "https://images.pexels.com/photos/2422588/pexels-photo-2422588.jpeg",
    "https://images.unsplash.com/photo-1529553815871-df205a9a2891",
    "https://images.pexels.com/photos/395196/pexels-photo-395196.jpeg",
    "https://images.pexels.com/photos/9578717/pexels-photo-9578717.jpeg"
];

  // Shuffle phrases once on mount
  const [shuffled, setShuffled] = useState<string[]>([]);
  useEffect(() => {
    function shuffle(array: string[]) {
      const arr = array.slice();
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    setShuffled(shuffle(phrases));
  }, []);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!shuffled.length) return;
    const timer = setInterval(() => setIdx(i => (i + 1) % shuffled.length), 2200);
    return () => clearInterval(timer);
  }, [shuffled]);

  // Separate image index for slower cycling
  const [imageIdx, setImageIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setImageIdx(i => (i + 1) % images.length), 8800);
    return () => clearInterval(timer);
  }, [images.length]);

  // Tagline index for even slower cycling (5x slower than main text) - now random
  const [taglineIdx, setTaglineIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTaglineIdx(prevIdx => {
        let newIdx;
        do {
          newIdx = Math.floor(Math.random() * taglines.length);
        } while (newIdx === prevIdx && taglines.length > 1); // Avoid same tagline twice in a row
        return newIdx;
      });
    }, 11000);
    return () => clearInterval(timer);
  }, [taglines.length]);

  // Scroll handler for button
  const scrollToPrediction = () => {
    const el = document.getElementById("prediction-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
      {/* Cycling image background with blur and dark overlay */}
      <AnimatePresence mode="popLayout">
        <motion.img
          key={images[imageIdx]}
          src={images[imageIdx]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0, filter: "blur(4px) brightness(0.9)" }}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.8 }}
        />
      </AnimatePresence>
      <div className="absolute inset-0 w-full h-full bg-black/10 z-0 pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
        {/* Removed spinning GIF */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={shuffled[idx]}
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.98 }}
            transition={{ duration: 0.6 }}
            className="text-white text-4xl md:text-6xl font-extrabold text-center drop-shadow-lg"
            style={{ minHeight: "3.5em" }}
          >
            {shuffled[idx]}
          </motion.div>
        </AnimatePresence>
        {/* Cycling taglines */}
        <AnimatePresence mode="wait">
          <motion.div
            key={taglineIdx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8 }}
            className="mt-3 text-white text-lg md:text-2xl font-semibold text-center drop-shadow"
            style={{ minHeight: "2em" }}
          >
            {taglines[taglineIdx]}
          </motion.div>
        </AnimatePresence>
        {/* Translucent scroll button, now pink */}
        <button
          onClick={scrollToPrediction}
          className="mt-6 px-6 py-2 rounded-full bg-white/40 text-pink-700 font-bold text-base shadow hover:bg-white/60 transition backdrop-blur"
        >
          Access WhetherWeather now
        </button>
      </div>
    </section>
  );
}

function FooterSection({ visitCount, setPage }: { visitCount: number; setPage: (page: string) => void }) {
  return (
    <footer className="w-full bg-white/80 border-t border-slate-200 py-4 flex flex-col md:flex-row items-center justify-between px-6 gap-3">
      <div className="flex items-center gap-2">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png"
          alt="Instagram"
          className="w-6 h-6 rounded-full border"
        />
        <a
          href="https://instagram.com/weweather.au"
          target="_blank"
          rel="noopener noreferrer"
          className="text-pink-600 font-semibold hover:underline text-sm"
        >
          @weweather.au
        </a>
      </div>
      
      {/* Visitor Counter */}
      <div className="flex items-center gap-2 text-slate-600 text-xs">
        <span className="bg-slate-100 px-2 py-1 rounded-full">
          👁️ This website has been visited <span className="font-bold text-slate-800">{visitCount.toLocaleString()}</span> times
        </span>
      </div>
      
      <div className="flex gap-4 text-slate-600 text-xs">
        <span className="text-slate-500 text-xs">
          An app developed by{' '}
          <a href="https://www.linkedin.com/in/michael-deng-254784244/" target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600">
            Michael Deng
          </a>
          ,{' '}
          <a href="https://www.linkedin.com/in/yatinbayya/" target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600">
            Yatin Bayya
          </a>
          ,{' '}
          <a href="https://www.linkedin.com/in/oscar-whatmough-0582b1318/" target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600">
            Oscar Whatmough
          </a>
          {' '}and{' '}
          <a href="https://www.linkedin.com/in/hajinpaek/" target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600">
            Hajin Paek
          </a>
        </span>
        <button 
          onClick={() => setPage("contact")} 
          className="hover:underline cursor-pointer bg-none border-none text-slate-600"
        >
          Contact Us/Feedback
        </button>
        <a href="#" className="hover:underline">Terms &amp; Conditions</a>
        <a href="#" className="hover:underline">Privacy Policy</a>
        <span>&copy; 2025 WhetherWeather</span>
      </div>
    </footer>
  );
}

function quantile(arr, p) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const idx = p * (s.length - 1);
  const i = Math.floor(idx);
  const j = Math.min(i + 1, s.length - 1);
  const frac = idx - i;
  return s[i] * (1 - frac) + s[j] * frac;
}
function median(arr) { return quantile(arr, 0.5); }
function predictProbability(binaryOutcomes) {
  const n = binaryOutcomes.length;
  const k = binaryOutcomes.reduce((acc, b) => acc + b, 0);
  if (!n) return null;
  
  const p = k / n;
  const percent = Math.round(p * 100);
  
  // Calculate 70% confidence interval (15% each side) using binomial statistics
  const z = 1.04; // z-score for 70% confidence interval (15% each side)
  const se = Math.sqrt((p * (1 - p)) / n); // standard error
  const margin = z * se;
  
  const lowerBound = Math.max(0, p - margin);
  const upperBound = Math.min(1, p + margin);
  
  return {
    point: percent,
    lower: Math.round(lowerBound * 100),
    upper: Math.round(upperBound * 100)
  };
}
function predictContinuous(arr) {
  return {
    point: median(arr),
    lower: quantile(arr, 0.1),
    upper: quantile(arr, 0.9)
  };
}
function predictContinuousLog1p(arr) {
  const logv = arr.map(v => Math.log1p(Math.max(0, v)));
  return {
    point: Math.expm1(quantile(logv, 0.5)),
    lower: Math.max(0, Math.expm1(quantile(logv, 0.1))),
    upper: Math.max(0, Math.expm1(quantile(logv, 0.9)))
  };
}

function predictRainfall(arr) {
  // Calculate simple average for rainfall
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  const avgRounded = Math.round(avg * 10) / 10;
  
  // Exponential scaling: smaller values get smaller ranges, larger values get larger ranges
  // Range is never zero, scales exponentially with the value
  const baseRange = Math.max(0.1, avgRounded * 0.3); // Minimum 0.1mm range, scales with value
  const lowerRange = baseRange * 0.7; // Lower range is always smaller
  const upperRange = baseRange * 1.5; // Upper range is larger
  
  return {
    point: avgRounded,
    lower: Math.max(0, Math.round((avgRounded - lowerRange) * 10) / 10),
    upper: Math.round((avgRounded + upperRange) * 10) / 10
  };
}

export default function App() {
  // All state declarations consolidated here
  const [weather, setWeather] = useState({ condition: "cloudy", temp: 18, min: 12, max: 20, rainChance: 40 });
  const [activity, setActivity] = useState("Hiking");
  const [activitySelect, setActivitySelect] = useState("Hiking");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0,10));
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [ai, setAi] = useState({ activities: [], bestTimes: ["Mid-July","Early April","End of May"], similar: [] });
  const [aiDateNote, setAiDateNote] = useState("");
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateOptions, setDateOptions] = useState([]);
  const [dateOptLoading, setDateOptLoading] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [position, setPosition] = useState({ lat: -33.8688, lng: 151.2093 });
  const [place, setPlace] = useState("Sydney");
  const [headerVisible, setHeaderVisible] = useState(true);
  const [currentPage, setPage] = useState("home");
  
  // Visitor counter state
  const [visitCount, setVisitCount] = useState(0);
  
  // Initialize visitor count on app load with global API
  useEffect(() => {
    const trackVisit = async () => {
      try {
        // Using CountAPI for global visitor tracking across all IPs/countries
        const response = await fetch('https://api.countapi.xyz/hit/whetherweather-nasa-space-apps/global-visits');
        const data = await response.json();
        
        if (data && data.value) {
          setVisitCount(data.value);
          console.log(`Global visit count: ${data.value}`);
        } else {
          throw new Error('API response invalid');
        }
      } catch (error) {
        console.error('Error tracking global visit:', error);
        
        // Fallback to localStorage if global API fails
        const currentCount = localStorage.getItem('whetherweather_visit_count');
        const count = currentCount ? parseInt(currentCount, 10) : 0;
        const newCount = count + 1;
        localStorage.setItem('whetherweather_visit_count', newCount.toString());
        setVisitCount(newCount);
        console.log(`Using local fallback count: ${newCount}`);
      }
    };
    
    trackVisit();
  }, []);
  
  // Store previous page to detect navigation away from results
  const [previousPage, setPreviousPage] = useState("home");

  // Clear results when leaving the results page
  const clearResults = () => {
    setSurveyResults(null);
    setSurveyData({
      eventType: "",
      customEventType: "",
      peopleCount: "",
      weatherPreference: "",
      duration: "",
      budget: "",
      additionalRequirements: ""
    });
  };
  
  // Auto-clear results when leaving results page
  useEffect(() => {
    if (previousPage === "results" && currentPage !== "results" && surveyResults) {
      clearResults();
    }
    setPreviousPage(currentPage);
  }, [currentPage]);

  // Clear results on page refresh/reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem('surveyResults');
    };

    const handleUnload = () => {
      clearResults();
    };

    // Clear any existing results on app load
    clearResults();

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, []);

  // Handle navigation with result clearing
  const handleNavigation = (newPage: string) => {
    if (currentPage === "results" && newPage !== "results") {
      clearResults();
    }
    setPage(newPage);
  };
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [showMetricDropdown, setShowMetricDropdown] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState([
    "rainChance",
    "avgMaxTemp",
    "avgRainfall"
  ]);

  // Survey states
  const [surveyData, setSurveyData] = useState({
    eventType: '',
    customEventType: '',
    peopleCount: '',
    weatherPreference: '',
    budget: '',
    duration: '',
    additionalRequirements: ''
  });
  const [surveyResults, setSurveyResults] = useState<{
    recommendedLocation?: {
      city: string;
      country: string;
      lat: number;
      lng: number;
      reason: string;
    };
    description?: string;
    tips?: string[];
    bestTime?: string;
    considerations?: string[];
  } | null>(null);
  const [showSurveyPopup, setShowSurveyPopup] = useState(false);
  const [surveyPopupDismissed, setSurveyPopupDismissed] = useState(false);
  const [surveyPopupTimer, setSurveyPopupTimer] = useState<any>(null);
  const [mapFullscreen, setMapFullscreen] = useState(false);

  // Helper functions for smart survey logic
  const getEventType = () => surveyData.eventType === "Other" ? surveyData.customEventType : surveyData.eventType;
  
  const shouldSkipBudget = () => {
    const eventType = getEventType().toLowerCase();
    return eventType.includes('sports') || eventType.includes('hiking') || eventType.includes('photography');
  };
  
  const isShortTermEvent = () => {
    const eventType = getEventType().toLowerCase();
    return eventType.includes('sports') || eventType.includes('photography') || eventType.includes('picnic');
  };

  // Function to get rain chance descriptive label
  const getRainChanceLabel = (percentage: number): string => {
    if (percentage <= 10) return "Very Unlikely to Rain";
    if (percentage <= 25) return "Unlikely to Rain";
    if (percentage <= 45) return "Possible Rain";
    if (percentage <= 65) return "Likely to Rain";
    if (percentage <= 85) return "Very Likely to Rain";
    return "Almost Certain Rain";
  };

  // Function to get snow chance descriptive label
  const getSnowChanceLabel = (percentage: number): string => {
    if (percentage <= 10) return "Very Unlikely to Snow";
    if (percentage <= 25) return "Unlikely to Snow";
    if (percentage <= 45) return "Possible Snow";
    if (percentage <= 65) return "Likely to Snow";
    if (percentage <= 85) return "Very Likely to Snow";
    return "Almost Certain Snow";
  };

  // Function to get temperature-based color with relative shading
  const getTemperatureColor = (temp: number, tempType: 'avg' | 'max' | 'min' = 'avg'): string => {
    // Base intensity multipliers for different temperature types
    const typeMultipliers = {
      'max': 1.0,   // Maximum gets full intensity
      'avg': 0.75,  // Average gets 75% intensity  
      'min': 0.5    // Minimum gets 50% intensity
    };
    
    const baseMultiplier = typeMultipliers[tempType];
    
    if (temp >= 0) {
      // Red for positive temperatures - scale to 50°C for very dark red
      const intensity = Math.min(temp / 50, 1) * baseMultiplier;
      // More gradual progression: light red to dark red
      const r = Math.round(180 + (75 * intensity)); // 180-255 (lighter start, gradual to full red)
      const g = Math.round(120 - (100 * intensity)); // 120-20 (less green reduction)
      const b = Math.round(120 - (100 * intensity)); // 120-20 (less blue reduction)
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Blue for negative temperatures - scale to -20°C for very dark blue
      const intensity = Math.min(Math.abs(temp) / 20, 1) * baseMultiplier;
      const r = Math.round(120 - (100 * intensity)); // 120-20
      const g = Math.round(140 - (60 * intensity)); // 140-80
      const b = Math.round(180 + (75 * intensity)); // 180-255
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // Function to get temperature-based vial colors with relative shading
  const getTemperatureVialColors = (temp: number, tempType: 'avg' | 'max' | 'min' = 'avg') => {
    const baseColor = getTemperatureColor(temp, tempType);
    const [r, g, b] = baseColor.match(/\d+/g)!.map(Number);
    
    // Create lighter and darker variants for gradients
    const lightColor = `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`;
    const darkColor = `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`;
    const borderColor = baseColor; // Use same base color for borders
    
    return {
      base: baseColor,
      light: lightColor,
      dark: darkColor,
      border: borderColor,
      gradient: `linear-gradient(90deg,${lightColor} 60%,${baseColor} 100%)`,
      shadowColor: `${baseColor}88` // with 88 alpha for shadow
    };
  };

  const [weatherMetrics, setWeatherMetrics] = useState<{
    rainChance?: { point: number; lower: number; upper: number } | null;
    avgTemp?: { point: number | null; lower: number | null; upper: number | null };
    maxTemp?: { point: number | null; lower: number | null; upper: number | null };
    minTemp?: { point: number | null; lower: number | null; upper: number | null };
    snowChance?: { point: number; lower: number; upper: number } | null;
    heatwaveChance?: { point: number; lower: number; upper: number } | null;
    avgRainfall?: { point: number; lower: number; upper: number };
    heavyRain?: { point: number; lower: number; upper: number } | null;
  }>({});

  const presetActivities = ["Hiking","Surfing","Coastal Walk","Trail Running","Cycling","Kayaking","Custom"];

  useEffect(() => { if (!presetActivities.includes(activity)) setActivitySelect("Custom"); else setActivitySelect(activity); }, [activity]);
  useEffect(() => { if (activitySelect !== "Custom") setActivity(activitySelect); }, [activitySelect]);

  const theme = useMemo(() => {
    const c = weather.condition;
    if (c === "sunny") return { pageFrom: "from-amber-100", pageTo: "to-sky-100", card: "bg-white/80", text: "text-amber-700", icon: null };
    if (c === "rainy") return { pageFrom: "from-slate-200", pageTo: "to-sky-300", card: "bg-white/70", text: "text-sky-800", icon: <CloudRain className="w-5 h-5"/> };
    if (c === "snowy") return { pageFrom: "from-slate-100", pageTo: "to-slate-200", card: "bg-white/70", text: "text-slate-700", icon: <CloudSnow className="w-5 h-5"/> };
    if (c === "windy") return { pageFrom: "from-teal-100", pageTo: "to-sky-200", card: "bg-white/70", text: "text-teal-700", icon: <Wind className="w-5 h-5"/> };
    return { pageFrom: "from-slate-100", pageTo: "to-slate-200", card: "bg-white/80", text: "text-slate-700", icon: <CloudIcon className="w-5 h-5"/> };
  }, [weather.condition]);

  useEffect(() => { if (typeof window === "undefined" || !navigator.geolocation) return; navigator.geolocation.getCurrentPosition((pos) => { const { latitude, longitude } = pos.coords; setPosition({ lat: latitude, lng: longitude }); }); }, []);

  useEffect(() => { reverseGeocode(position.lat, position.lng).then(setPlace).catch(()=>setPlace("Selected Location")); }, [position]);

  async function reverseGeocode(lat, lng) {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
    const j = await r.json();
    return j.address?.city || j.address?.town || j.address?.village || j.address?.suburb || (j.display_name ? j.display_name.split(",")[0] : "Selected Location");
  }

  async function forwardGeocode(q) {
    if (!q) return;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}`);
      const j = await r.json();
      if (j && j.length) {
        const top = j[0];
        setPosition({ lat: parseFloat(top.lat), lng: parseFloat(top.lon) });
        setPlace(top.display_name.split(",")[0]);
      }
    } catch (_) {}
  }

  useEffect(() => { fetchClimatology(position.lat, position.lng, selectedDate); }, [position, selectedDate]);

  useEffect(() => {
    if (!locationQuery || locationQuery.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const controller = new AbortController();
    fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(locationQuery)}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        setSearchSuggestions(data.slice(0, 5));
        setShowSuggestions(true);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [locationQuery]);

  async function fetchClimatology(lat, lng, dateISO) {
    try {
      setLoadingWeather(true);
      const d = new Date(dateISO);
      const thisYear = d.getFullYear();
      const years = Array.from({length:3}, (_,i) => thisYear - i - 1); // Reduced to 3 years for fastest loading
      const acc = { T2M: [] as number[], T2M_MIN: [] as number[], T2M_MAX: [] as number[], PRECTOTCORR: [] as number[] };
      
      // Batch requests by year with timeout for faster response
      const requests = years.map(async (y) => {
        try {
          // Get 3-day window around the target date
          const startDt = new Date(Date.UTC(y, d.getMonth(), d.getDate() - 1));
          const endDt = new Date(Date.UTC(y, d.getMonth(), d.getDate() + 1));
          
          const startYmd = `${startDt.getFullYear()}${String(startDt.getMonth()+1).padStart(2,'0')}${String(startDt.getDate()).padStart(2,'0')}`;
          const endYmd = `${endDt.getFullYear()}${String(endDt.getMonth()+1).padStart(2,'0')}${String(endDt.getDate()).padStart(2,'0')}`;
          
          const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,T2M_MIN,T2M_MAX,PRECTOTCORR&community=RE&latitude=${lat}&longitude=${lng}&start=${startYmd}&end=${endYmd}&format=JSON`;
          
          // Add 5-second timeout per request for much faster response
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const r = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          
          const j = await r.json();
          const p = j?.properties?.parameter || {};
          
          // Extract data from the 3-day range
          Object.keys(p.T2M || {}).forEach(ymd => {
            if (p?.T2M?.[ymd] != null) acc.T2M.push(Number(p.T2M[ymd]));
            if (p?.T2M_MIN?.[ymd] != null) acc.T2M_MIN.push(Number(p.T2M_MIN[ymd]));
            if (p?.T2M_MAX?.[ymd] != null) acc.T2M_MAX.push(Number(p.T2M_MAX[ymd]));
            if (p?.PRECTOTCORR?.[ymd] != null) acc.PRECTOTCORR.push(Number(p.PRECTOTCORR[ymd]));
          });
        } catch (error) {
          // Continue even if individual year fails
          console.warn(`Failed to fetch data for year ${y}:`, error);
        }
      });
      
      // Execute all requests in parallel with much shorter overall timeout
      await Promise.race([
        Promise.all(requests),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Overall timeout')), 8000))
      ]);
      
      if (!acc.T2M.length) throw new Error('no-data');

      // --- Build arrays for metrics ---
      const rainOccur = acc.PRECTOTCORR.map(v => v > 2 ? 1 : 0);
      const tMean = acc.T2M;
      const tMax = acc.T2M_MAX;
      const tMin = acc.T2M_MIN;
      const rainMm = acc.PRECTOTCORR;
      const heavyRainDays = acc.PRECTOTCORR.map(v => v > 7.6 ? 1 : 0);
      const snowOccur = acc.T2M.map((t, i) => (t <= 1 && acc.T2M_MAX[i] <= 3) ? 1 : 0);
      const avgMaxTemp = tMax;
      const avgMinTemp = tMin;
      const avgTemp = tMean;
      const heatwaveDays = tMax.map(t => t >= 38 ? 1 : 0);

      // --- Calculate metrics using JS formulas ---
      const rainChance = predictProbability(rainOccur);
      
      // Simple averages for temperatures (as requested)
      const avgTempResult = {
        point: Math.round((avgTemp.reduce((a,b) => a+b, 0) / avgTemp.length) * 10) / 10,
        lower: Math.round(Math.min(...avgTemp) * 10) / 10,
        upper: Math.round(Math.max(...avgTemp) * 10) / 10
      };
      const maxTempResult = {
        point: Math.round((avgMaxTemp.reduce((a,b) => a+b, 0) / avgMaxTemp.length) * 10) / 10,
        lower: Math.round(Math.min(...avgMaxTemp) * 10) / 10,
        upper: Math.round(Math.max(...avgMaxTemp) * 10) / 10
      };
      const minTempResult = {
        point: Math.round((avgMinTemp.reduce((a,b) => a+b, 0) / avgMinTemp.length) * 10) / 10,
        lower: Math.round(Math.min(...avgMinTemp) * 10) / 10,
        upper: Math.round(Math.max(...avgMinTemp) * 10) / 10
      };
      
      const snowChance = predictProbability(snowOccur);
      const heatwaveChance = predictProbability(heatwaveDays);
      const avgRainfallResult = predictRainfall(rainMm);
      const heavyRainChance = predictProbability(heavyRainDays);
      
      // --- Store all results in weatherMetrics ---
      setWeatherMetrics({
        rainChance,
        avgTemp: avgTempResult,
        maxTemp: maxTempResult,
        minTemp: minTempResult,
        snowChance,
        heatwaveChance,
        avgRainfall: avgRainfallResult,
        heavyRain: heavyRainChance
      });

      // --- Set summary weather for icons etc ---
      const avg = (arr: number[])=> Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);
      const temp = avg(acc.T2M), min = avg(acc.T2M_MIN), max = avg(acc.T2M_MAX);
      let condition = 'sunny';
      if (temp <= 1 && max <= 3) condition = 'snowy';
      else if (rainChance && rainChance.point >= 50) condition = 'rainy';
      else if (rainChance && rainChance.point >= 20) condition = 'cloudy';
      setWeather({ condition, temp, min, max, rainChance: rainChance?.point || 0 });
      // Make AI call optional/background to not block main weather data
      if (activity && activity.trim()) {
        fetchAI({ condition, temp, min, max, rainChance }, { lat, lng, name: place }, dateISO);
      }
    } catch (e) {
      setWeather(w => ({ ...w }));
    } finally { setLoadingWeather(false); }
  }

  async function fetchAI(w, loc, dateISO) {
    try {
      setAiLoading(true);
      const monthName = new Date(dateISO).toLocaleString('en-US', { month: 'long' });
      const payload = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Return JSON only with keys: activities (array of {name, match, reason}), bestTimes (array of exactly 3 strings formatted 'Early/ Mid/ Late <Month>'), similar (array of exactly 3 objects {city, country, lat, lng, similarity, why}). similarity is 0-100." },
          { role: "user", content: `We are planning '${activity}' near ${loc.name} at (${loc.lat},${loc.lng}). The month is ${monthName}. Historical avg for ${monthName} ${new Date(dateISO).getDate()} (10-year NASA POWER): temp=${w.temp}°C, min=${w.min}°C, max=${w.max}°C, rainChance=${w.rainChance}%, condition=${w.condition}.\n1) Suggest 5 activities that fit these conditions with short reasons and 0-100 matches.\n2) Give the best times of the year for this activity at this location as three labels (Early/Mid/Late <Month>).\n3) Suggest 3 locations worldwide that have historically SIMILAR weather in ${monthName} (same time of year) to ${loc.name}, and include {city, country, lat, lng, similarity, why}. JSON only.` }
        ],
        temperature: 0.5
      };
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
        body: JSON.stringify(payload)
      });
      const j = await res.json();
      const content = j.choices?.[0]?.message?.content || "{}";
      let parsed;
      try { parsed = JSON.parse(content); } catch { parsed = {}; }
      if (parsed.activities || parsed.bestTimes || parsed.similar) {
        setAi({
          activities: Array.isArray(parsed.activities) ? parsed.activities : [],
          bestTimes: Array.isArray(parsed.bestTimes) ? parsed.bestTimes : [],
          similar: Array.isArray(parsed.similar) ? parsed.similar : []
        });
      }
    } catch (_) {
    } finally { setAiLoading(false); }
  }

  async function processSurvey() {
    console.log("Processing survey...", surveyData);
    
    // Validate survey data first
    if (!surveyData.eventType || !surveyData.peopleCount || !surveyData.weatherPreference || !surveyData.duration) {
      alert("Please complete all required survey fields before submitting.");
      return;
    }
    
    try {
      setSurveyLoading(true);
      
      // Check API key
      if (!OPENAI_KEY || OPENAI_KEY.length < 10) {
        throw new Error("OpenAI API key is not properly configured");
      }
      console.log("API Key configured:", OPENAI_KEY.substring(0, 20) + "...");
      
      const payload = {
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "You are a travel and event planning expert. You MUST return valid JSON only with no additional text. The JSON must have these exact keys: recommendedLocation (object with city, country, lat, lng, reason), description (string), tips (array of strings), bestTime (string), considerations (array of strings)." 
          },
          { 
            role: "user", 
            content: `Plan a perfect ${getEventType()} for ${surveyData.peopleCount} people. Weather preferences: ${surveyData.weatherPreference}. Duration: ${surveyData.duration}. ${shouldSkipBudget() ? '' : `Budget: ${surveyData.budget}.`} Additional requirements: ${surveyData.additionalRequirements || 'None specified'}. Recommend an ideal location worldwide with weather-focused guidance.` 
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      };
      
      console.log("Sending API request with payload:", payload);
      
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${OPENAI_KEY}` 
        },
        body: JSON.stringify(payload)
      });
      
      console.log("API Response Status:", res.status);
      console.log("API Response Headers:", Object.fromEntries(res.headers.entries()));
      
      const responseText = await res.text();
      console.log("Raw API Response:", responseText);
      
      let j;
      try {
        j = JSON.parse(responseText);
      } catch (parseErr) {
        console.error("Failed to parse API response as JSON:", parseErr);
        throw new Error(`Invalid JSON response from API: ${responseText.substring(0, 200)}`);
      }
      
      if (!res.ok) {
        console.error("API Error Response:", j);
        throw new Error(`OpenAI API Error (${res.status}): ${j.error?.message || j.error?.code || 'Unknown error'}`);
      }
      
      const content = j.choices?.[0]?.message?.content;
      if (!content) {
        console.error("No content in API response:", j);
        throw new Error("Empty response from OpenAI API");
      }
      
      console.log("GPT Content received:", content);
      
      // Parse the JSON response
      let parsed;
      try { 
        // Clean up the content - remove any markdown formatting
        let jsonStr = content.trim();
        
        // Remove markdown code blocks if present
        if (jsonStr.includes('```json')) {
          const start = jsonStr.indexOf('```json') + 7;
          const end = jsonStr.lastIndexOf('```');
          if (end > start) {
            jsonStr = jsonStr.substring(start, end).trim();
          }
        } else if (jsonStr.includes('```')) {
          const start = jsonStr.indexOf('```') + 3;
          const end = jsonStr.lastIndexOf('```');
          if (end > start) {
            jsonStr = jsonStr.substring(start, end).trim();
          }
        }
        
        // Extract JSON object if there's extra text
        const jsonStart = jsonStr.indexOf('{');
        const jsonEnd = jsonStr.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
        }
        
        console.log("Cleaned JSON string:", jsonStr);
        parsed = JSON.parse(jsonStr);
        console.log("Successfully parsed JSON:", parsed);
        
      } catch (parseError) { 
        console.error("JSON Parse Error:", parseError);
        console.log("Using fallback response due to parse error");
        
        // Create a fallback response
        parsed = {
          recommendedLocation: {
            city: "Barcelona",
            country: "Spain",
            lat: 41.3851,
            lng: 2.1734,
            reason: "Excellent Mediterranean climate with reliable weather patterns for outdoor events"
          },
          description: `Based on your ${getEventType()} requirements for ${surveyData.peopleCount} people with ${surveyData.weatherPreference} weather preferences, this location offers ideal conditions for your ${surveyData.duration} event.`,
          tips: [
            "Check local weather forecasts 1-2 weeks before your event",
            "Consider backup indoor options if available",
            "Pack appropriate clothing for seasonal variations",
            "Book accommodations well in advance"
          ],
          bestTime: "Spring through early fall offers the most favorable weather conditions",
          considerations: [
            "Weather patterns can vary seasonally",
            "Peak tourist seasons may affect availability and pricing",
            "Local climate data suggests minimal rain disruption",
            "Temperature ranges are generally comfortable for outdoor activities"
          ]
        };
      }
      
      // Validate and ensure required fields
      if (!parsed || typeof parsed !== 'object') {
        throw new Error("Invalid response structure from AI");
      }
      
      // Ensure recommendedLocation exists and is valid
      if (!parsed.recommendedLocation || !parsed.recommendedLocation.city || !parsed.recommendedLocation.country) {
        parsed.recommendedLocation = {
          city: "Barcelona",
          country: "Spain", 
          lat: 41.3851,
          lng: 2.1734,
          reason: "Selected as a reliable destination for your event requirements"
        };
      }
      
      // Ensure required fields have defaults
      parsed.description = parsed.description || "This location has been selected based on optimal weather patterns for your event.";
      parsed.tips = Array.isArray(parsed.tips) ? parsed.tips : ["Check weather forecasts before your event", "Plan for seasonal variations"];
      parsed.bestTime = parsed.bestTime || "Seasonal timing varies - check local climate data";
      parsed.considerations = Array.isArray(parsed.considerations) ? parsed.considerations : ["Weather patterns can vary", "Consider local seasonal factors"];
      
      console.log("Final validated result:", parsed);
      
      // Set the results and navigate
      setSurveyResults(parsed);
      setPosition({ 
        lat: parsed.recommendedLocation.lat || 41.3851, 
        lng: parsed.recommendedLocation.lng || 2.1734 
      });
      setPlace(`${parsed.recommendedLocation.city}, ${parsed.recommendedLocation.country}`);
      
      // Navigate to results
      handleNavigation("results");
      
    } catch (error) {
      console.error('Survey processing error:', error);
      console.error('Error stack:', error.stack);
      
      // Show more specific error message
      let errorMessage = "An error occurred while processing your survey. ";
      if (error.message.includes("API")) {
        errorMessage += "There seems to be an issue with the AI service. ";
      } else if (error.message.includes("network") || error.message.includes("fetch")) {
        errorMessage += "Please check your internet connection. ";
      } else {
        errorMessage += "Please try again. ";
      }
      errorMessage += `(Error: ${error.message})`;
      
      alert(errorMessage);
    } finally { 
      setSurveyLoading(false); 
    }
  }

  function openPerfectDateModal() {
    setShowDateModal(true);
    setDateOptions([]);
    suggestDatesByAI();
  }

  async function suggestDatesByAI() {
    try {
      setDateOptLoading(true);
      setAiDateNote("");
      const payload = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a weather-focused scheduling expert for the NASA Space Apps challenge. Return JSON only with key 'options' which is an array of 3 objects: {date: 'YYYY-MM-DD', label: 'Early/ Mid/ Late <Month>', reason: 'weather-based reason'}. Use historical weather patterns and seasonal climate data to recommend dates. Dates must be within the next 12 months." },
          { role: "user", content: `Suggest 3 optimal future dates within 12 months for '${activity}' near ${place} at (${position.lat},${position.lng}). Base recommendations on typical weather patterns, seasonal conditions, and climate data. JSON only.` }
        ],
        temperature: 0.5
      };
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
        body: JSON.stringify(payload)
      });
      const j = await res.json();
      const content = j.choices?.[0]?.message?.content || "{}";
      let parsed = {} as any;
      try { parsed = JSON.parse(content); } catch {}
      const opts = Array.isArray(parsed.options) ? parsed.options.filter((o:any)=>o && typeof o.date==='string') : [];
      if (opts.length) setDateOptions(opts);
    } catch (_) {
    } finally { setDateOptLoading(false); }
  }

  function pickDate(opt) {
    if (!opt?.date) return;
    setSelectedDate(opt.date);
    const lbl = opt.label && typeof opt.label === 'string' ? opt.label : '';
    const rsn = opt.reason && typeof opt.reason === 'string' ? opt.reason : '';
    setAiDateNote([lbl, rsn].filter(Boolean).join(' • '));
    setShowDateModal(false);
  }

  const themeIcon = theme.icon;

  const [similarPreset] = useState([
    { city: "San Francisco, USA", lat: 37.7749, lng: -122.4194, img: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&auto=format&fit=crop&q=60" },
    { city: "Lisbon, Portugal", lat: 38.7223, lng: -9.1393, img: "https://images.unsplash.com/photo-1483721310020-03333e577078?w=400&auto=format&fit=crop&q=60" },
    { city: "Cape Town, South Africa", lat: -33.9249, lng: 18.4241, img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&auto=format&fit=crop&q=60" },
  ]);

  function onClickSimilar(item) {
    if (item.lat && item.lng) {
      setPosition({ lat: item.lat, lng: item.lng });
      setPlace(item.city.split(',')[0]);
    } else if (item.city) {
      forwardGeocode(item.city);
    }
  }

  useEffect(() => {
  }, []);

  // Header scroll logic
  const lastScrollY = useRef(0);

  useEffect(() => {
    function onScroll() {
      const currentY = window.scrollY;
      if (currentY < 10) {
        setHeaderVisible(true);
      } else if (currentY > lastScrollY.current) {
        setHeaderVisible(false); // scrolling down
      } else {
        setHeaderVisible(true); // scrolling up
      }
      lastScrollY.current = currentY;
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Survey popup scroll detection
  useEffect(() => {
    function checkSurveyPopup() {
      if (surveyPopupDismissed || showSurveyPopup) return;
      
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      
      // Start timer when user scrolls past 70% of the page
      if (scrollPercent > 70 && !surveyPopupTimer) {
        const timer = setTimeout(() => {
          setShowSurveyPopup(true);
          setSurveyPopupTimer(null);
        }, 5000); // 5 second delay
        
        setSurveyPopupTimer(timer);
      }
      // Clear timer if user scrolls back up
      else if (scrollPercent <= 70 && surveyPopupTimer) {
        clearTimeout(surveyPopupTimer);
        setSurveyPopupTimer(null);
      }
    }
    
    window.addEventListener("scroll", checkSurveyPopup);
    return () => {
      window.removeEventListener("scroll", checkSurveyPopup);
      if (surveyPopupTimer) {
        clearTimeout(surveyPopupTimer);
      }
    };
  }, [showSurveyPopup, surveyPopupDismissed, surveyPopupTimer]);

  const metricOptions = [
    { value: "rainChance", label: "Chance of Rain (%)", emoji: "🌦️" },
    { value: "avgTempOnDate", label: "Expected Average Temperature", emoji: "🌡️" },
    { value: "avgMaxTemp", label: "Expected Maximum Temperature", emoji: "🔥" },
    { value: "avgMinTemp", label: "Expected Minimum Temperature", emoji: "❄️" },
    { value: "snowChancePercent", label: "Snow Chance (%)", emoji: "🌨️" },
    { value: "heatwaveChancePercent", label: "Heatwave Chance (%)", emoji: "☀️" },
    { value: "avgRainfall", label: "Expected Rainfall (mm)", emoji: "🌧️" },
    { value: "heavyRainChance", label: "Chance of Heavy Rain (%)", emoji: "💧" }
  ];

  function handleSuggestionClick(suggestion) {
    setPosition({ lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) });
    setPlace(suggestion.display_name.split(",")[0]);
    setLocationQuery(suggestion.display_name.split(",")[0]);
    setShowSuggestions(false);
  }

  return (
    <div className={`relative min-h-screen w-full bg-gradient-to-b ${theme.pageFrom} ${theme.pageTo} text-slate-900 transition-colors duration-700`}>
      {/* HEADER NAVIGATION */}
      <HeaderNav visible={headerVisible} currentPage={currentPage} setPage={handleNavigation} surveyResults={surveyResults} />

      {/* PAGE ROUTING */}
      {currentPage === "home" && (
        <>
          <HeroSection />
          {/* Beta Version Transition Section */}
          <div className="w-full bg-gradient-to-b from-slate-50 via-blue-50/30 to-white py-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 via-transparent to-red-100/20"></div>
            <div className="relative z-10 max-w-5xl mx-auto px-8 text-center">
              <div className="inline-flex items-center gap-3 bg-white/70 backdrop-blur-sm rounded-full px-10 py-3 shadow-xl border border-white/50">
                <span className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent">
                  WhetherWeather v0.9 Beta
                </span>
              </div>
              <p className="mt-5 text-slate-600 font-medium text-lg max-w-3xl mx-auto leading-relaxed">
                Experience the future of weather prediction with our advanced algorithms and NASA data integration
              </p>
            </div>
          </div>

          <div
            id="prediction-section"
            className={`w-full px-8 md:px-20 lg:px-32 pt-6 transition-colors duration-700 relative ${
              weather.rainChance >= 80
                ? "bg-gradient-to-b from-blue-400/90 to-blue-300/70"
                : weather.rainChance >= 70
                ? "bg-gradient-to-b from-blue-300/80 to-blue-200/60"
                : weather.rainChance >= 60
                ? "bg-gradient-to-b from-blue-200/70 to-blue-100/50"
                : weather.rainChance >= 50
                ? "bg-gradient-to-b from-blue-200/60 to-blue-100/45"
                : weather.rainChance >= 40
                ? "bg-gradient-to-b from-blue-100/60 to-sky-200/50"
                : weather.rainChance >= 30
                ? "bg-gradient-to-b from-blue-100/50 to-sky-200/40"
                : weather.rainChance >= 20
                ? "bg-gradient-to-b from-sky-300/50 to-sky-100/35"
                : weather.rainChance >= 10
                ? "bg-gradient-to-b from-sky-200/40 to-sky-50/30"
                : weather.condition === "snowy"
                ? "bg-gradient-to-b from-slate-100/80 to-slate-200/40"
                : weather.condition === "windy"
                ? "bg-gradient-to-b from-teal-100/60 to-sky-200/30"
                : "bg-white/80"
            }`}
          >
            {/* Raindrops Animation */}
            {weather.rainChance >= 40 && (
              <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                <style dangerouslySetInnerHTML={{
                  __html: `
                    @keyframes raindrop {
                      from { transform: translateY(-50px); opacity: 0.8; }
                      10% { opacity: 1; }
                      90% { opacity: 1; }
                      to { transform: translateY(calc(100vh)); opacity: 0; }
                    }
                  `
                }} />
                {Array.from({ length: Math.min(100, Math.floor(weather.rainChance * 1.2)) }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      left: `${Math.random() * 100}%`,
                      width: `${Math.random() * 2 + 1}px`,
                      height: `${Math.random() * 25 + 15}px`,
                      backgroundColor: `rgba(59, 130, 246, ${Math.random() * 0.4 + 0.4})`,
                      animation: `raindrop ${Math.max(0.8, 2.5 - (weather.rainChance / 50))}s linear infinite`,
                      animationDelay: `${Math.random() * 3}s`
                    }}
                  />
                ))}
              </div>
            )}
            <div className="flex flex-col gap-4 mb-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="flex flex-col gap-2 lg:w-[48%]">
                  <div className="text-slate-700 font-semibold text-sm">Select your date:</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-slate-600" />
                    <input type="date" value={selectedDate} onChange={(e)=>setSelectedDate(e.target.value)} className="px-3 py-2 rounded-lg ring-2 ring-slate-300 bg-white/80 focus:ring-4 focus:ring-emerald-400 text-base font-semibold" style={{ minWidth: 180 }} />
                    <div className="text-slate-700 font-semibold text-base">{formatDateLabel(selectedDate)}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 lg:w-[48%]">
                  <div className="text-slate-700 font-semibold text-sm">
                    Select your location: 
                    <span className="text-slate-500 text-xs ml-2 font-normal">or click anywhere on the map</span>
                  </div>
                  <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { forwardGeocode(locationQuery); setShowSuggestions(false); } }}
                      placeholder="Search city or place"
                      className="w-full pl-10 pr-3 py-2 rounded-lg ring-2 ring-slate-300 bg-white/80 focus:outline-none focus:ring-4 focus:ring-emerald-400 text-base font-semibold"
                      style={{ minWidth: 250 }}
                    />
                    {showSuggestions && searchSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-lg shadow-lg ring-1 ring-slate-200 z-10">
                        {searchSuggestions.map((s, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-2 hover:bg-emerald-50 cursor-pointer text-slate-700 text-sm"
                            onMouseDown={() => handleSuggestionClick(s)}
                          >
                            {s.display_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => forwardGeocode(locationQuery)} className="px-3 py-2 rounded-lg bg-slate-900 text-white shadow text-base font-semibold">Search</button>
                  <button onClick={() => { if (navigator.geolocation) navigator.geolocation.getCurrentPosition((pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })); }} className="px-3 py-2 rounded-lg bg-white ring-2 ring-slate-300 shadow text-base font-semibold">Use my location</button>
                  </div>
                </div>
              </div>
              {aiDateNote && (
                <div className="-mt-2 text-sm text-slate-600">{aiDateNote}</div>
              )}
            </div>

            {/* Two blobs, same height, side by side, larger margins */}
            <div className="w-full h-[600px] flex flex-col xl:flex-row gap-8 items-stretch justify-center mt-8">
              {/* Left card: location and map */}
              <div className="relative rounded-3xl overflow-hidden shadow-sm ring-1 ring-slate-100 bg-white/90 flex flex-col w-full xl:w-[60%] h-[600px]">
                <div className="px-5 pt-2 pb-0">
                  <div className="max-w-xl">
                    <div className="text-lg md:text-xl font-extrabold capitalize mb-1">
                      Predicted weather
                    </div>
                    <div className="flex flex-col items-start w-full">
                      <span
                        className="font-extrabold break-words w-full"
                        style={{
                          fontSize: place.length > 18 ? '1.8rem' : '2.2rem',
                          lineHeight: '1.1',
                          maxWidth: '100%',
                          whiteSpace: 'normal',
                          overflowWrap: 'break-word',
                        }}
                      >
                        {place}
                      </span>
                      <span
                        className="font-bold mt-0.5 break-words w-full"
                        style={{
                          fontSize: formatDateLabel(selectedDate).length > 18 ? '1.4rem' : '1.8rem',
                          lineHeight: '1.1',
                          maxWidth: '100%',
                          whiteSpace: 'normal',
                          overflowWrap: 'break-word',
                        }}
                      >
                        {formatDateLabel(selectedDate)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex items-start pt-2">
                  <div className="w-full h-full">
                    {!showDateModal && !showSurveyPopup ? (
                      <LeafletMap 
                        position={position} 
                        place={place} 
                        onSelect={(pos) => setPosition(pos)} 
                        isFullscreen={mapFullscreen}
                        onToggleFullscreen={() => setMapFullscreen(!mapFullscreen)}
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center bg-white/70">
                        <div className="text-slate-500 text-sm">
                          {showDateModal ? "Map hidden while picking a date" : "Map temporarily hidden"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right card: centered content, fixed height with scrolling */}
              <div
                className="relative rounded-3xl overflow-hidden shadow-sm ring-1 ring-slate-100 bg-white/90 flex flex-col items-center w-full xl:w-[40%] h-[600px] p-4 overflow-y-auto"
                style={{ marginLeft: 'auto', marginRight: 'auto', justifyContent: 'flex-start' }}
              >
                {/* Weather Features Header and Filters on same line */}
                <div className="mb-4 w-full flex items-center justify-between">
                  <div className="flex-1"></div>
                  <h2 className="text-xl font-bold text-slate-800 text-center whitespace-nowrap">Weather Features</h2>
                  <div className="flex-1 flex justify-end">
                    <button
                      className="px-2 py-1 bg-emerald-600 text-white font-semibold rounded-md shadow hover:bg-emerald-700 transition text-xs"
                      onClick={() => setShowMetricDropdown(v => !v)}
                    >
                      Filters
                    </button>
                  </div>
                </div>
                
                {/* Filters dropdown */}
                <div className="relative w-full">
                  {showMetricDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-lg shadow-lg ring-1 ring-slate-200 z-10 p-4 flex flex-col">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {metricOptions.map(opt => (
                          <label key={opt.value} className="flex flex-col items-center gap-1 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={selectedMetrics.includes(opt.value)}
                              onChange={() => {
                                setSelectedMetrics(selectedMetrics.includes(opt.value)
                                  ? selectedMetrics.filter(v => v !== opt.value)
                                  : [...selectedMetrics, opt.value]);
                              }}
                              className="w-5 h-5 accent-emerald-500 rounded border-2 border-slate-300"
                            />
                            <span className="text-base">{opt.emoji}</span>
                            <span className="text-center text-xs mt-0.5">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                      <button
                        className="mt-3 px-3 py-2 bg-emerald-600 text-white font-bold rounded-lg shadow hover:bg-emerald-700 transition self-end text-sm"
                        onClick={() => setShowMetricDropdown(false)}
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
                {/* Vial-like output for each selected metric */}
                <div className="flex flex-row gap-4 mt-2 w-full items-center justify-center flex-wrap">
                  {selectedMetrics.filter(val => {
                    // Only show metrics that have valid data
                    if (val === "rainChance") return weatherMetrics.rainChance?.point !== undefined;
                    if (val === "avgTempOnDate") return weatherMetrics.avgTemp?.point !== undefined;
                    if (val === "avgMaxTemp") return weatherMetrics.maxTemp?.point !== undefined;
                    if (val === "avgMinTemp") return weatherMetrics.minTemp?.point !== undefined;
                    if (val === "avgRainfall") return weatherMetrics.avgRainfall?.point !== undefined;
                    if (val === "snowChancePercent") return weatherMetrics.snowChance?.point !== undefined;
                    if (val === "heatwaveChancePercent") return weatherMetrics.heatwaveChance?.point !== undefined;
                    if (val === "heavyRainChance") return weatherMetrics.heavyRain?.point !== undefined;
                    return false;
                  }).map(val => {
                    let label = metricOptions.find(opt => opt.value === val)?.label;
                    let emoji = metricOptions.find(opt => opt.value === val)?.emoji;
                    let result = "";
                    let vialType = "percent"; // or "value"
                    let percent = 0, lower = 0, upper = 0, value = 0, min = 0, max = 100, range = [0, 100];

                    if (val === "rainChance" && weatherMetrics.rainChance !== undefined && weatherMetrics.rainChance !== null && 
                        weatherMetrics.rainChance.point !== undefined && weatherMetrics.rainChance.lower !== undefined && weatherMetrics.rainChance.upper !== undefined) {
                      const rainLabel = getRainChanceLabel(weatherMetrics.rainChance.point);
                      result = `${weatherMetrics.rainChance.point}% - ${rainLabel}`;
                      percent = weatherMetrics.rainChance.point;
                      lower = weatherMetrics.rainChance.lower; 
                      upper = weatherMetrics.rainChance.upper;
                      vialType = "percent";
                      range = [0, 100];
                    }
                    if (val === "snowChancePercent" && weatherMetrics.snowChance !== undefined && weatherMetrics.snowChance !== null &&
                        weatherMetrics.snowChance.point !== undefined && weatherMetrics.snowChance.lower !== undefined && weatherMetrics.snowChance.upper !== undefined) {
                      const snowLabel = getSnowChanceLabel(weatherMetrics.snowChance.point);
                      result = `${weatherMetrics.snowChance.point}% - ${snowLabel}`;
                      percent = weatherMetrics.snowChance.point;
                      lower = weatherMetrics.snowChance.lower;
                      upper = weatherMetrics.snowChance.upper;
                      vialType = "percent";
                      range = [0, 100];
                    }
                    if (val === "heatwaveChancePercent" && weatherMetrics.heatwaveChance !== undefined && weatherMetrics.heatwaveChance !== null &&
                        weatherMetrics.heatwaveChance.point !== undefined && weatherMetrics.heatwaveChance.lower !== undefined && weatherMetrics.heatwaveChance.upper !== undefined) {
                      result = `${weatherMetrics.heatwaveChance.point}% [${weatherMetrics.heatwaveChance.lower}–${weatherMetrics.heatwaveChance.upper}%]`;
                      percent = weatherMetrics.heatwaveChance.point;
                      lower = weatherMetrics.heatwaveChance.lower;
                      upper = weatherMetrics.heatwaveChance.upper;
                      vialType = "percent";
                      range = [0, 100];
                    }
                    if (val === "heavyRainChance" && weatherMetrics.heavyRain !== undefined && weatherMetrics.heavyRain !== null &&
                        weatherMetrics.heavyRain.point !== undefined && weatherMetrics.heavyRain.lower !== undefined && weatherMetrics.heavyRain.upper !== undefined) {
                      result = `${weatherMetrics.heavyRain.point}% [${weatherMetrics.heavyRain.lower}–${weatherMetrics.heavyRain.upper}%]`;
                      percent = weatherMetrics.heavyRain.point;
                      lower = weatherMetrics.heavyRain.lower;
                      upper = weatherMetrics.heavyRain.upper;
                      vialType = "percent";
                      range = [0, 100];
                    }
                    if (val === "avgTempOnDate" && weatherMetrics.avgTemp && weatherMetrics.avgTemp.point !== null && weatherMetrics.avgTemp.lower !== null && weatherMetrics.avgTemp.upper !== null) {
                      value = weatherMetrics.avgTemp.point;
                      lower = weatherMetrics.avgTemp.lower;
                      upper = weatherMetrics.avgTemp.upper;
                      result = `${value.toFixed(1)}°C [${lower.toFixed(1)}–${upper.toFixed(1)}]`;
                      vialType = "value";
                      min = 0; max = 50; range = [min, max];
                    }
                    if (val === "avgMaxTemp" && weatherMetrics.maxTemp && weatherMetrics.maxTemp.point !== null && weatherMetrics.maxTemp.lower !== null && weatherMetrics.maxTemp.upper !== null) {
                      value = weatherMetrics.maxTemp.point;
                      lower = weatherMetrics.maxTemp.lower;
                      upper = weatherMetrics.maxTemp.upper;
                      result = `${value.toFixed(1)}°C [${lower.toFixed(1)}–${upper.toFixed(1)}]`;
                      vialType = "value";
                      min = 0; max = 50; range = [min, max];
                    }
                    if (val === "avgMinTemp" && weatherMetrics.minTemp && weatherMetrics.minTemp.point !== null && weatherMetrics.minTemp.lower !== null && weatherMetrics.minTemp.upper !== null) {
                      value = weatherMetrics.minTemp.point;
                      lower = weatherMetrics.minTemp.lower;
                      upper = weatherMetrics.minTemp.upper;
                      result = `${value.toFixed(1)}°C [${lower.toFixed(1)}–${upper.toFixed(1)}]`;
                      vialType = "value";
                      min = 0; max = 50; range = [min, max];
                    }
                    if (val === "avgRainfall" && weatherMetrics.avgRainfall) {
                      value = weatherMetrics.avgRainfall.point;
                      lower = weatherMetrics.avgRainfall.lower;
                      upper = weatherMetrics.avgRainfall.upper;
                      result = `${value.toFixed(1)}mm [${lower.toFixed(1)}–${upper.toFixed(1)}]`;
                      vialType = "value";
                      min = 0; max = 50; range = [min, max];
                    }

                    // Vial dimensions (wider)
                    const vialWidth = 320;
                    const vialHeight = 18;
                    // For percent metrics, circle position
                    const circleX = vialType === "percent" ? (percent / 100) * vialWidth : 0;
                    // For value metrics, shaded bar width
                    const barWidth = vialType === "value" ? ((value - min) / (max - min)) * vialWidth : 0;
                    // For range shading
                    const rangeStart = vialType === "percent"
                      ? (lower / 100) * vialWidth
                      : ((lower - min) / (max - min)) * vialWidth;
                    const rangeEnd = vialType === "percent"
                      ? (upper / 100) * vialWidth
                      : ((upper - min) / (max - min)) * vialWidth;

                    return (
                      <div
                        key={val}
                        className="flex flex-col items-center bg-white rounded-xl shadow ring-1 ring-emerald-200 px-3 py-2 min-w-fit"
                        style={{
                          maxWidth: vialWidth + 24
                        }}
                      >
                        {/* Emoji and label */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg font-extrabold">{emoji}</span>
                          <span className={`text-base font-extrabold text-center ${(val === "rainChance" || val === "avgRainfall" || val === "heavyRainChance") ? "text-blue-600" : ""}`}>{label}</span>
                        </div>
                        {/* Vial */}
                        <div className="w-full flex flex-col items-center">
                          <div style={{ 
                            width: vialWidth, 
                            height: vialHeight, 
                            position: "relative", 
                            background: (val === "avgTempOnDate" || val === "avgMaxTemp" || val === "avgMinTemp") && value !== null 
                              ? getTemperatureVialColors(value, 
                                  val === "avgMaxTemp" ? "max" : 
                                  val === "avgMinTemp" ? "min" : "avg"
                                ).light.replace('rgb', 'rgba').replace(')', ', 0.3)')
                              : (val === "rainChance" || val === "avgRainfall" || val === "heavyRainChance") 
                                ? "rgba(59, 130, 246, 0.2)" 
                                : "#e6f4ea", 
                            borderRadius: 12, 
                            overflow: "hidden", 
                            marginBottom: 8 
                          }}>
                            {/* Range shading */}
                            <div
                              style={{
                                position: "absolute",
                                left: rangeStart,
                                width: Math.max(4, rangeEnd - rangeStart),
                                top: 0,
                                height: vialHeight,
                                background: (val === "avgTempOnDate" || val === "avgMaxTemp" || val === "avgMinTemp") && value !== null 
                                  ? getTemperatureVialColors(value, 
                                      val === "avgMaxTemp" ? "max" : 
                                      val === "avgMinTemp" ? "min" : "avg"
                                    ).gradient
                                  : (val === "rainChance" || val === "avgRainfall" || val === "heavyRainChance")
                                    ? "linear-gradient(90deg, #60a5fa 60%, #3b82f6 100%)"
                                    : "linear-gradient(90deg,#34d399 60%,#059669 100%)",
                                opacity: 0.5,
                                borderRadius: 12
                              }}
                            />
                            {/* Main border */}
                            <div
                              style={{
                                position: "absolute",
                                left: 0,
                                top: 0,
                                width: vialWidth,
                                height: vialHeight,
                                border: `2px solid ${(val === "avgTempOnDate" || val === "avgMaxTemp" || val === "avgMinTemp") && value !== null 
                                  ? getTemperatureVialColors(value, 
                                      val === "avgMaxTemp" ? "max" : 
                                      val === "avgMinTemp" ? "min" : "avg"
                                    ).border
                                  : (val === "rainChance" || val === "avgRainfall" || val === "heavyRainChance")
                                    ? "#3b82f6"
                                    : "#059669"}`,
                                borderRadius: 12,
                                boxSizing: "border-box"
                              }}
                            />
                            {/* For value metrics: shaded bar */}
                            {vialType === "value" && (
                              <div
                                style={{
                                  position: "absolute",
                                  left: 0,
                                  top: 0,
                                  width: barWidth,
                                  height: vialHeight,
                                  background: (val === "avgTempOnDate" || val === "avgMaxTemp" || val === "avgMinTemp") && value !== null 
                                    ? getTemperatureVialColors(value, 
                                        val === "avgMaxTemp" ? "max" : 
                                        val === "avgMinTemp" ? "min" : "avg"
                                      ).gradient
                                    : (val === "rainChance" || val === "avgRainfall" || val === "heavyRainChance")
                                      ? "linear-gradient(90deg, #60a5fa 60%, #3b82f6 100%)"
                                      : "linear-gradient(90deg,#34d399 60%,#059669 100%)",
                                  borderRadius: 12,
                                  opacity: 0.7
                                }}
                              />
                            )}
                            {/* For percent metrics: circle */}
                            {vialType === "percent" && (
                              <div
                                style={{
                                  position: "absolute",
                                  left: Math.max(0, Math.min(vialWidth - 12, circleX - 6)),
                                  top: 2,
                                  width: 18,
                                  height: 18,
                                  background: (val === "avgTempOnDate" || val === "avgMaxTemp" || val === "avgMinTemp") && value !== null 
                                    ? getTemperatureVialColors(value, 
                                        val === "avgMaxTemp" ? "max" : 
                                        val === "avgMinTemp" ? "min" : "avg"
                                      ).base
                                    : (val === "rainChance" || val === "avgRainfall" || val === "heavyRainChance")
                                      ? "#3b82f6"
                                      : "#059669",
                                  borderRadius: "50%",
                                  border: `2px solid ${(val === "avgTempOnDate" || val === "avgMaxTemp" || val === "avgMinTemp") && value !== null 
                                    ? getTemperatureVialColors(value, 
                                        val === "avgMaxTemp" ? "max" : 
                                        val === "avgMinTemp" ? "min" : "avg"
                                      ).light
                                    : (val === "rainChance" || val === "avgRainfall" || val === "heavyRainChance")
                                      ? "#60a5fa"
                                      : "#34d399"}`,
                                  boxShadow: `0 0 6px ${(val === "avgTempOnDate" || val === "avgMaxTemp" || val === "avgMinTemp") && value !== null 
                                    ? getTemperatureVialColors(value, 
                                        val === "avgMaxTemp" ? "max" : 
                                        val === "avgMinTemp" ? "min" : "avg"
                                      ).shadowColor
                                    : (val === "rainChance" || val === "avgRainfall" || val === "heavyRainChance")
                                      ? "#3b82f688"
                                      : "#05966988"}`,
                                  zIndex: 2
                                }}
                              />
                            )}
                          </div>
                          {/* Result text */}
                          <div 
                            className="text-xl font-bold mt-1 text-center"
                            style={{
                              color: (val === "avgTempOnDate" || val === "avgMaxTemp" || val === "avgMinTemp") && value !== null 
                                ? getTemperatureColor(value, 
                                    val === "avgMaxTemp" ? "max" : 
                                    val === "avgMinTemp" ? "min" : "avg"
                                  ) 
                                : (val === "rainChance" || val === "avgRainfall" || val === "heavyRainChance")
                                  ? "#3b82f6" // blue-600 for rain metrics
                                  : "#059669" // emerald-700 for other metrics
                            }}
                          >
                            {result || "—"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Disclaimer underneath the entire map section */}
            <div className="mt-6 max-w-4xl mx-auto pb-10">
              <div className="text-xs text-slate-600 leading-relaxed text-center">
                <p className="mb-2">
                  All information is accurate as of <strong>{new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</strong>.
                </p>
                <p>
                  To learn more about the NASA Database, and algorithm for the climatology predictions, visit the <button 
                    onClick={() => setPage("about")} 
                    className="text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    About
                  </button> page.
                </p>
              </div>
            </div>

          </div>
        </>
      )}

      {currentPage === "about" && (
        <AboutPage />
      )}

      {currentPage === "contact" && (
        <ContactPage />
      )}

      {currentPage === "nasaspaceapps2025" && (
        <NASASpaceApps2025Page />
      )}

      <AnimatePresence>
        {showDateModal && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ y: 20, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.98 }} transition={{ duration: 0.2 }} className="w-[92vw] max-w-xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <div className="text-xl font-semibold">Perfect dates for {activitySelect === 'Custom' ? activity : activitySelect}</div>
                <button onClick={()=>setShowDateModal(false)} className="p-2 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-1 text-sm text-slate-600">Pick one of these recommendations. We’ll show the expected weather based on NASA POWER climatology.</div>

              <div className="mt-4 grid gap-3">
                {dateOptLoading && (
                  <div className="flex items-center gap-2 text-slate-600 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Fetching AI suggestions…
                  </div>
                )}
                {!dateOptLoading && dateOptions.length === 0 && (
                  <div className="text-sm text-slate-500">No suggestions yet. Try again in a moment.</div>
                )}
                {dateOptions.map((opt:any, idx:number) => (
                  <button key={idx} onClick={()=>pickDate(opt)} className="text-left w-full rounded-xl ring-1 ring-slate-200 hover:ring-emerald-300 hover:bg-emerald-50/50 transition p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold">{opt.label || formatDateLabel(opt.date)}</div>
                        {opt.reason && <div className="text-slate-600 text-sm mt-1">{opt.reason}</div>}
                      </div>
                      <div className="text-slate-700 font-medium">{opt.date}</div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SURVEY PAGE */}
      {currentPage === "survey" && (
        <SurveyNotAvailablePage setPage={handleNavigation} />
      )}

      {/* SURVEY RESULTS PAGE */}
      {currentPage === "results" && surveyResults && (
        <motion.div 
          className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 px-4 py-8 pt-24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-7xl mx-auto">
            {/* Two-column layout matching the main page */}
            <div className="w-full h-[800px] flex flex-col xl:flex-row gap-8 items-stretch justify-center mt-8">
              
              {/* Left card: location and map (EXACT COPY) */}
              <div className="relative rounded-3xl overflow-hidden shadow-sm ring-1 ring-slate-100 bg-white/90 flex flex-col w-full xl:w-[60%] h-[800px]">
                <div className="px-6 pt-6 pb-0">
                  <div className="max-w-xl">
                    <div className="text-4xl md:text-6xl font-extrabold capitalize mb-3">
                      Our Recommendation
                    </div>
                    <div className="flex flex-col items-start w-full">
                      <span
                        className="font-extrabold break-words w-full"
                        style={{
                          fontSize: (surveyResults.recommendedLocation?.city + ", " + surveyResults.recommendedLocation?.country).length > 18 ? '2.5rem' : '3.5rem',
                          lineHeight: '1.1',
                          maxWidth: '100%',
                          whiteSpace: 'normal',
                          overflowWrap: 'break-word',
                        }}
                      >
                        {surveyResults.recommendedLocation?.city}, {surveyResults.recommendedLocation?.country}
                      </span>
                      <span
                        className="font-bold mt-1 break-words w-full text-emerald-600"
                        style={{
                          fontSize: '1.5rem',
                          lineHeight: '1.1',
                          maxWidth: '100%',
                          whiteSpace: 'normal',
                          overflowWrap: 'break-word',
                        }}
                      >
                        Perfect for your {getEventType()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex items-start pt-1">
                  <div className="w-full h-[400px] xl:h-[480px]">
                    <LeafletMap 
                      position={position} 
                      place={place} 
                      onSelect={(pos: any) => setPosition(pos)} 
                      isFullscreen={mapFullscreen}
                      onToggleFullscreen={() => setMapFullscreen(!mapFullscreen)}
                    />
                  </div>
                </div>
              </div>

              {/* Right card: recommendation details */}
              <div className="relative rounded-3xl overflow-hidden shadow-sm ring-1 ring-slate-100 bg-white/90 flex flex-col w-full xl:w-[40%] h-[800px] p-6 overflow-y-auto">
                <div className="space-y-6">
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-emerald-600 mb-2">Perfect Match Found!</h1>
                    <p className="text-gray-600">Based on your preferences, here's why this location is ideal:</p>
                  </div>

                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                    <h2 className="text-xl font-semibold mb-3 text-emerald-800">Why This Location?</h2>
                    <p className="text-emerald-700 leading-relaxed">{surveyResults.description}</p>
                  </div>

                  {surveyResults.bestTime && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <h2 className="text-xl font-semibold mb-3 text-blue-800">Best Time to Visit</h2>
                      <p className="text-blue-700">{surveyResults.bestTime}</p>
                    </div>
                  )}

                  {surveyResults.tips && (
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                      <h2 className="text-xl font-semibold mb-3 text-amber-800">Helpful Tips</h2>
                      <ul className="space-y-2">
                        {surveyResults.tips.map((tip: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-amber-600 mt-1">💡</span>
                            <span className="text-amber-700">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {surveyResults.considerations && (
                    <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                      <h2 className="text-xl font-semibold mb-3 text-red-800">Important Considerations</h2>
                      <ul className="space-y-2">
                        {surveyResults.considerations.map((consideration: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-red-600 mt-1">⚠️</span>
                            <span className="text-red-700">{consideration}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 pt-4">
                    <button 
                      onClick={() => setPage("home")}
                      className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition"
                    >
                      Explore This Location
                    </button>
                    <button 
                      onClick={() => setPage("survey")}
                      className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
                    >
                      Take Survey Again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Survey Popup */}
      <AnimatePresence>
        {showSurveyPopup && (
          <motion.div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-3xl p-8 mx-4 max-w-md w-full shadow-2xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center">
                <div className="text-6xl mb-4">🌍</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  Want a personalized location recommendation?
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Take our smart survey to discover the perfect destination for your event based on weather, preferences, and requirements.
                </p>
                
                <div className="flex flex-col gap-3">
                  <button
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                    onClick={() => {
                      setShowSurveyPopup(false);
                      setSurveyPopupDismissed(true);
                      setPage("survey");
                    }}
                  >
                    Yes, Take the Survey! 🚀
                  </button>
                  
                  <button
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl transition-all duration-300"
                    onClick={() => {
                      setShowSurveyPopup(false);
                      setSurveyPopupDismissed(true);
                    }}
                  >
                    Not now
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 mt-4">
                  Don't worry, the survey will always be available in the header if you change your mind later! 
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER SECTION */}
      <FooterSection visitCount={visitCount} setPage={handleNavigation} />
    </div>
  );
}
