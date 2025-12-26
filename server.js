const express = require('express');
const cors = require('cors');
const path = require('path');
const { calculateDailyChart, CITIES } = require('./astroService');
const { calculateAuspiciousTimes, calculateGowriNallaNeram } = require('./auspiciousTimesService');
const { calculateCompletePanchang } = require('./panchangService');
const { calculateTamilCalendarMonth } = require('./tamilCalendarService');
const { IST_TIMEZONE, getISTOffsetMinutes, getServerOffsetMinutes, formatIST } = require('./timeUtils');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Health check for mobile app/service monitoring
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
});

// Simple in-memory cache with TTL
const cacheStore = new Map();
function setCache(key, data, ttlMs = 5 * 60 * 1000) {
  cacheStore.set(key, { data, expires: Date.now() + ttlMs });
}
function getCache(key) {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data;
}

// Helper to fetch with retries/backoff
async function fetchJsonWithRetry(url, options = {}, attempts = 3, backoffMs = 300) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, backoffMs * (i + 1)));
      }
    }
  }
  throw lastErr;
}

// External sunrise/sunset/moon proxy with fallback: WeatherAPI -> Sunrise-Sunset -> VisualCrossing
app.get('/api/sunmoon', async (req, res) => {
  try {
    const { lat, lon, date = new Date().toISOString().slice(0, 10) } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'lat and lon are required' });
    }

    const cacheKey = `sunmoon:${lat}:${lon}:${date}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true, stale: false });
    }

    const weatherKey = process.env.WEATHERAPI_KEY;
    const vcKey = process.env.VISUALCROSSING_KEY;

    let result = null;
    let source = null;

    // Primary: WeatherAPI
    if (weatherKey) {
      try {
        const url = `https://api.weatherapi.com/v1/astronomy.json?key=${weatherKey}&q=${lat},${lon}&dt=${date}`;
        const data = await fetchJsonWithRetry(url);
        const astro = data?.astronomy?.astro || {};
        result = {
          sunrise: astro.sunrise,
          sunset: astro.sunset,
          moonrise: astro.moonrise,
          moonset: astro.moonset,
          moonPhase: astro.moon_phase,
          moonIllumination: astro.moon_illumination,
          source: 'weatherapi'
        };
        source = 'weatherapi';
      } catch (err) {
        console.warn('[SUNMOON] WeatherAPI failed:', err.message);
      }
    }

    // Fallback 1: Sunrise-Sunset.org (sun only)
    if (!result) {
      try {
        const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&date=${date}&formatted=0`;
        const data = await fetchJsonWithRetry(url);
        const r = data?.results || {};
        result = {
          sunrise: r.sunrise,
          sunset: r.sunset,
          moonrise: null,
          moonset: null,
          moonPhase: null,
          moonIllumination: null,
          source: 'sunrise-sunset'
        };
        source = 'sunrise-sunset';
      } catch (err) {
        console.warn('[SUNMOON] Sunrise-Sunset failed:', err.message);
      }
    }

    // Fallback 2: VisualCrossing (needs key)
    if (!result && vcKey) {
      try {
        const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}/${date}?key=${vcKey}&include=days`;
        const data = await fetchJsonWithRetry(url);
        const day = Array.isArray(data?.days) ? data.days[0] : null;
        result = {
          sunrise: day?.sunrise,
          sunset: day?.sunset,
          moonrise: day?.moonrise,
          moonset: day?.moonset,
          moonPhase: day?.moonphase,
          moonIllumination: day?.moonillumination,
          source: 'visualcrossing'
        };
        source = 'visualcrossing';
      } catch (err) {
        console.warn('[SUNMOON] VisualCrossing failed:', err.message);
      }
    }

    if (!result) {
      return res.status(502).json({ error: 'All external sunrise/sunset sources failed' });
    }

    const payload = {
      ...result,
      lat,
      lon,
      date,
      cached: false,
      stale: false
    };
    setCache(cacheKey, payload, 10 * 60 * 1000); // cache 10 minutes
    res.json(payload);
  } catch (error) {
    console.error('Error in /api/sunmoon:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint for daily chart
app.get('/api/daily-chart', (req, res) => {
  try {
    const { date, time = '05:30', city = 'Chennai' } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    const chartData = calculateDailyChart(date, time, city);
    res.json({
      ...chartData,
      timezone: IST_TIMEZONE,
      timezoneOffsetMinutes: getISTOffsetMinutes(),
      serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      serverOffsetMinutes: getServerOffsetMinutes(),
      serverTimeIST: formatIST(new Date())
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Get available cities
app.get('/api/cities', (req, res) => {
  const names = Object.keys(CITIES);
  const items = names.map((name) => ({ name, ...CITIES[name] }));
  res.json({ names, items });
});

// API endpoint for auspicious times (Rahu Kaal, Yamaganda)
app.get('/api/auspicious-times', (req, res) => {
  try {
    const { date, city = 'Chennai' } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    const auspiciousData = calculateAuspiciousTimes(date, city);
    res.json(auspiciousData);
    
  } catch (error) {
    console.error('Error calculating auspicious times:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: Complete Panchang API endpoint (Tithi, Nakshatra, Yoga, Karana, Nalla Neram)
app.get('/api/panchang', (req, res) => {
  try {
    const { date, city = 'Chennai' } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    // Get city timezone
    const cityData = CITIES[city] || CITIES.Chennai;
    
    // Calculate complete panchang
    const panchangData = calculateCompletePanchang(date, cityData.tz);
    
    // Also get auspicious times (Rahu Kaal, Yamaganda) for integration
    const auspiciousData = calculateAuspiciousTimes(date, city);
    
    // Compute Gowri Nalla Neram windows (strict 8-part division, transparent derivation)
    const gowri = calculateGowriNallaNeram(date, city);

    // NALLA NERAM: Derived from Gowri Good slots with exclusions
    const nallaNeramPayload = {
      calculationMethod: gowri.calculationMethod,
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      nallaNeram: gowri.nallaNeramSlots.map(slot => ({
        type: slot.type,
        derivedFrom: slot.derivedFrom,
        gowriSlotIndex: slot.gowriSlotIndex,
        period: slot.period,
        start: slot.start,
        end: slot.end,
        duration: slot.duration,
        quality: slot.quality,
        filtersApplied: slot.filtersApplied,
        factor: `Gowri ${slot.period} slot ${slot.gowriSlotIndex} (${slot.quality})`
      })),
      gowriNallaNeram: [...gowri.gowriSlots.day, ...gowri.gowriSlots.night].map(slot => ({
        type: slot.type,
        period: slot.period,
        slotIndex: slot.slotIndex,
        start: slot.start,
        end: slot.end,
        duration: slot.duration,
        quality: slot.quality,
        label: slot.label // UI compat
      })),
      calculationFactors: {
        locationAware: gowri.meta.locationAware,
        latitude: gowri.meta.latitude,
        longitude: gowri.meta.longitude,
        timezone: gowri.meta.timezone,
        sunrise: gowri.meta.sunrise,
        sunset: gowri.meta.sunset,
        sunriseSource: gowri.meta.sunriseSource,
        weekday: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
        dayDuration: gowri.meta.dayDuration,
        nightDuration: gowri.meta.nightDuration,
        daySlotMinutes: gowri.meta.daySlotMinutes,
        nightSlotMinutes: gowri.meta.nightSlotMinutes
      },
      notes: gowri.notes,
      source: 'computed'
    };

    // Combine all data
    res.json({
      date,
      city,
      sunrise: auspiciousData.sunrise,
      sunset: auspiciousData.sunset,
      sunriseSource: auspiciousData.sunriseSource,
      
      // Vedic Panchang Elements
      tithi: panchangData.tithi,
      nakshatra: panchangData.nakshatra,
      yoga: panchangData.yoga,
      karana: panchangData.karana,
      nallaNeram: nallaNeramPayload,
      
      // Inauspicious Times
      rahuKaal: auspiciousData.rahuKaal,
      yamaganda: auspiciousData.yamaganda,
      
      // Metadata
      ayanamsa: panchangData.ayanamsa,
      calculatedAt: panchangData.calculatedAt,
      timezone: panchangData.timezone || IST_TIMEZONE,
      timezoneOffsetMinutes: panchangData.timezoneOffsetMinutes || getISTOffsetMinutes(),
      serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      serverOffsetMinutes: getServerOffsetMinutes(),
      serverTimeIST: formatIST(new Date())
    });
    
  } catch (error) {
    console.error('Error calculating panchang:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: Tamil Calendar month grid (backend-driven)
app.get('/api/tamil-calendar', (req, res) => {
  try {
    const { year, month, city = 'Chennai' } = req.query;
    const y = Number(year);
    const m = Number(month);

    if (!y || !m) {
      return res.status(400).json({ error: 'year and month are required (e.g., year=2025&month=12)' });
    }
    if (!Number.isInteger(y) || y < 1900 || y > 2100) {
      return res.status(400).json({ error: 'year must be an integer between 1900 and 2100' });
    }
    if (!Number.isInteger(m) || m < 1 || m > 12) {
      return res.status(400).json({ error: 'month must be an integer between 1 and 12' });
    }

    const cityName = CITIES[city] ? city : 'Chennai';
    const payload = calculateTamilCalendarMonth(y, m, cityName);
    res.json(payload);
  } catch (error) {
    console.error('Error calculating tamil calendar:', error);
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Detailed ascendant calculation endpoint
app.get('/api/debug/ascendant', (req, res) => {
  try {
    const { date, time = '05:30', city = 'Chennai' } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    // Run calculation - this will log to console
    const chartData = calculateDailyChart(date, time, city);
    
    res.json({
      message: 'Debug logs printed to server console. Check terminal/logs.',
      chartData: {
        date,
        time,
        city,
        lagnaLongitude: chartData.lagnaLongitude,
        lagnaRasi: chartData.lagnaRasi,
        ayanamsa: chartData.ayanamsa,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[DEBUG-ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Daily Transit Chart running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Close the other process or set PORT to a free port.`);
    console.error('Example: PORT=3001 node server.js');
    process.exit(1);
  }

  console.error('Server failed to start:', err);
  process.exit(1);
});
