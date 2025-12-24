const Astronomy = require('astronomy-engine');
const fs = require('fs');
const path = require('path');
const { formatIST, IST_TIMEZONE, getServerOffsetMinutes, getISTOffsetMinutes } = require('./timeUtils');

// Load precomputed sunrise/sunset cache (AstroCamp-aligned)
let SUN_CACHE = {};
try {
  const cachePath = path.join(__dirname, 'data', 'sunriseSunsetCache.json');
  if (fs.existsSync(cachePath)) {
    SUN_CACHE = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }
} catch (err) {
  console.warn('[SUN-CACHE] Failed to load cache file:', err.message);
}

// Helper to build a Date from local time string (HH:MM) and timezone offset (e.g., 5.5)
function toLocalDate(dateStr, timeStr, timezone) {
  const [hh, mm] = timeStr.split(':').map(Number);
  const tzHours = Math.trunc(timezone);
  const tzMinutes = Math.round((timezone - tzHours) * 60);
  const sign = timezone >= 0 ? '+' : '-';
  const pad = (n) => String(Math.abs(n)).padStart(2, '0');
  const offset = `${sign}${pad(tzHours)}:${pad(tzMinutes)}`;
  return new Date(`${dateStr}T${pad(hh)}:${pad(mm)}:00${offset}`);
}

function getCachedSunriseSunset(dateStr, city, timezone) {
  const cityEntry = SUN_CACHE[city];
  if (!cityEntry) return null;
  const entry = cityEntry[dateStr];
  if (!entry || !entry.sunrise || !entry.sunset) return null;
  const sunriseDate = toLocalDate(dateStr, entry.sunrise, timezone);
  const sunsetDate = toLocalDate(dateStr, entry.sunset, timezone);
  return {
    sunrise: formatTime(sunriseDate),
    sunset: formatTime(sunsetDate),
    sunriseDate,
    sunsetDate,
    source: 'cache'
  };
}

function addDaysToDateStr(dateStr, days) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  const yyyy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utc.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Get sunrise and sunset times for a given date and location
 * Using astronomy-engine for accurate calculations
 */
function toJsDate(value) {
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
}

function getSunriseSunset(dateStr, latitude, longitude, timezone, cityName) {
  // 1) Try cache first for AstroCamp-aligned accuracy
  if (cityName) {
    const cached = getCachedSunriseSunset(dateStr, cityName, timezone);
    if (cached) return cached;
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Create midnight in UTC (not local), then pass to astronomy-engine
  const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  
  const observer = new Astronomy.Observer(latitude, longitude, 0);
  
  // Get sunrise (direction = +1 for rise)
  const sunriseResult = Astronomy.SearchRiseSet(
    Astronomy.Body.Sun,
    observer,
    1,
    utcMidnight,
    1 // Search within 1 day
  );
  
  // Get sunset (direction = -1 for set)
  const sunsetResult = Astronomy.SearchRiseSet(
    Astronomy.Body.Sun,
    observer,
    -1,
    utcMidnight,
    1
  );
  
  if (!sunriseResult || !sunsetResult) {
    throw new Error('Could not calculate sunrise/sunset for the given date and location');
  }
  
  // astronomy-engine may return AstroTime (.toDate) or a native Date. Normalize.
  const sunriseLocal = toJsDate(sunriseResult.date);
  const sunsetLocal = toJsDate(sunsetResult.date);
  
  return {
    sunrise: formatIST(sunriseLocal),
    sunset: formatIST(sunsetLocal),
    sunriseDate: sunriseLocal,
    sunsetDate: sunsetLocal,
    source: 'astronomy-engine'
  };
}

/**
 * Calculate Rahu Kaal timings based on day of week and sunrise/sunset
 * Standard Jyotish rules with proportional adjustment
 */
function calculateRahuKaal(dateStr, latitude, longitude, timezone, cityName) {
  const { sunrise, sunset, sunriseDate, sunsetDate } = getSunriseSunset(dateStr, latitude, longitude, timezone, cityName);
  
  // Get day of week (0 = Sunday, 6 = Saturday) from the IST date string
  const [year, month, day] = dateStr.split('-').map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();
  
  // Calculate day duration in minutes
  const dayDurationMs = sunsetDate.getTime() - sunriseDate.getTime();
  const dayDurationMinutes = dayDurationMs / (60 * 1000);
  
  // Divide day into 8 equal parts (each part = dayDuration / 8)
  const partDuration = dayDurationMinutes / 8;
  
  // Rahu Kaal is different part for each day (standard Vedic astrology)
  // Based on AstroCamp.com verified timings for Chennai
  const rahuKaalSlots = {
    0: 8, // Sunday - 8th slot (4:30 PM - 6:00 PM standard)
    1: 2, // Monday - 2nd slot (7:30 AM - 9:00 AM standard)
    2: 7, // Tuesday - 7th slot (3:00 PM - 4:30 PM standard)
    3: 5, // Wednesday - 5th slot (12:00 PM - 1:30 PM standard)
    4: 6, // Thursday - 6th slot (1:30 PM - 3:00 PM standard)
    5: 4, // Friday - 4th slot (10:30 AM - 12:00 PM standard)
    6: 3  // Saturday - 3rd slot (9:00 AM - 10:30 AM standard)
  };
  
  const slotNumber = rahuKaalSlots[dayOfWeek];
  
  // Calculate start and end times
  // Start at beginning of slot: (slotNumber - 1) × duration from sunrise
  const startOffsetMinutes = (slotNumber - 1) * partDuration;
  const endOffsetMinutes = slotNumber * partDuration;
  
  const startTime = new Date(sunriseDate.getTime() + startOffsetMinutes * 60 * 1000);
  const endTime = new Date(sunriseDate.getTime() + endOffsetMinutes * 60 * 1000);
  
  const durationMinutes = Math.round(partDuration);
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  return {
    startTime: formatTime(startTime),
    endTime: formatTime(endTime),
    duration: `${hours}h ${minutes}m`,
    durationMinutes: durationMinutes,
    day: dayNames[dayOfWeek],
    dayOfWeek: dayOfWeek
  };
}

/**
 * Calculate Yamaganda (Yama Ghantika) timings
 * ✅ SINGLE-SOURCE: Uses ONLY ghatika-based 8-part division
 * 
 * Traditional rule: Yamaganda is assigned to a specific ghatika for each weekday
 * - DAY: 8 equal parts from sunrise to sunset
 * - NIGHT: 8 equal parts from sunset to next sunrise
 * 
 * Weekday → Day Ghatika mapping: Sun=5, Mon=4, Tue=3, Wed=2, Thu=1, Fri=6, Sat=7
 * Night Yamaganda: Always 4th night ghatika (traditional rule)
 */
function calculateYamaganda(dateStr, latitude, longitude, timezone, cityName) {
  const { sunriseDate, sunsetDate } = getSunriseSunset(dateStr, latitude, longitude, timezone, cityName);

  // Get day of week (0 = Sunday, 6 = Saturday)
  const [year, month, day] = dateStr.split('-').map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();

  // DAY Yamaganda ghatika assignment (weekday-based)
  const dayYamagandaGhatikaMap = {
    0: 5, // Sunday: 5th day ghatika
    1: 4, // Monday: 4th day ghatika
    2: 3, // Tuesday: 3rd day ghatika
    3: 2, // Wednesday: 2nd day ghatika
    4: 1, // Thursday: 1st day ghatika
    5: 6, // Friday: 6th day ghatika
    6: 7  // Saturday: 7th day ghatika
  };

  const dayYamagandaGhatikaNumber = dayYamagandaGhatikaMap[dayOfWeek];

  // NIGHT Yamaganda: Always 4th night ghatika (traditional rule)
  const nightYamagandaGhatikaNumber = 4;

  // === DAY PERIOD (sunrise to sunset) ===
  const dayDurationMs = sunsetDate.getTime() - sunriseDate.getTime();
  const dayDurationMinutes = dayDurationMs / (60 * 1000);
  const dayGhatikaDurationMinutes = dayDurationMinutes / 8;

  const dayGhatikas = [];
  let dayYamagandaStart = null;
  let dayYamagandaEnd = null;

  for (let i = 1; i <= 8; i++) {
    const gStart = new Date(sunriseDate.getTime() + (i - 1) * dayGhatikaDurationMinutes * 60 * 1000);
    const gEnd = new Date(sunriseDate.getTime() + i * dayGhatikaDurationMinutes * 60 * 1000);
    
    const isYamaganda = (i === dayYamagandaGhatikaNumber);
    
    if (isYamaganda) {
      dayYamagandaStart = gStart;
      dayYamagandaEnd = gEnd;
    }
    
    dayGhatikas.push({
      number: i,
      startTime: formatTime(gStart),
      endTime: formatTime(gEnd),
      isYamaganda: isYamaganda
    });
  }

  const dayDuration = Math.round(dayGhatikaDurationMinutes);
  const dayHours = Math.floor(dayDuration / 60);
  const dayMinutes = dayDuration % 60;

  // === NIGHT PERIOD (sunset to next sunrise) ===
  // Get next day's sunrise using timezone-safe date arithmetic (avoid toISOString() UTC drift)
  const nextDateStr = addDaysToDateStr(dateStr, 1);
  let { sunriseDate: nextSunriseDate } = getSunriseSunset(nextDateStr, latitude, longitude, timezone, cityName);
  // Safety: ensure night window is strictly sunset -> next sunrise
  if (nextSunriseDate.getTime() <= sunsetDate.getTime()) {
    nextSunriseDate = new Date(nextSunriseDate.getTime() + 24 * 60 * 60 * 1000);
  }

  const nightDurationMs = nextSunriseDate.getTime() - sunsetDate.getTime();
  const nightDurationMinutes = nightDurationMs / (60 * 1000);
  const nightGhatikaDurationMinutes = nightDurationMinutes / 8;

  const nightGhatikas = [];
  let nightYamagandaStart = null;
  let nightYamagandaEnd = null;

  for (let i = 1; i <= 8; i++) {
    const gStart = new Date(sunsetDate.getTime() + (i - 1) * nightGhatikaDurationMinutes * 60 * 1000);
    const gEnd = new Date(sunsetDate.getTime() + i * nightGhatikaDurationMinutes * 60 * 1000);
    
    const isYamaganda = (i === nightYamagandaGhatikaNumber);
    
    if (isYamaganda) {
      nightYamagandaStart = gStart;
      nightYamagandaEnd = gEnd;
    }
    
    nightGhatikas.push({
      number: i,
      startTime: formatTime(gStart),
      endTime: formatTime(gEnd),
      isYamaganda: isYamaganda
    });
  }

  const nightDuration = Math.round(nightGhatikaDurationMinutes);
  const nightHours = Math.floor(nightDuration / 60);
  const nightMinutes = nightDuration % 60;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return {
    method: 'ghatika-based (8-part day/night division)',
    day: dayNames[dayOfWeek],
    dayOfWeek: dayOfWeek,
    dayPeriod: {
      activeGhatika: dayYamagandaGhatikaNumber,
      startTime: formatIST(dayYamagandaStart),
      endTime: formatIST(dayYamagandaEnd),
      duration: `${dayHours}h ${dayMinutes}m`,
      durationMinutes: dayDuration,
      ghatikas: dayGhatikas
    },
    nightPeriod: {
      activeGhatika: nightYamagandaGhatikaNumber,
      startTime: formatIST(nightYamagandaStart),
      endTime: formatIST(nightYamagandaEnd),
      duration: `${nightHours}h ${nightMinutes}m`,
      durationMinutes: nightDuration,
      ghatikas: nightGhatikas
    },
    // Legacy fields for backward compatibility (use dayPeriod values)
    startTime: formatIST(dayYamagandaStart),
    endTime: formatIST(dayYamagandaEnd),
    duration: `${dayHours}h ${dayMinutes}m`,
    durationMinutes: dayDuration,
    ghatikas: dayGhatikas
  };
}

// Legacy wrappers retained for minimal churn
function formatTime(date) {
  return formatIST(date);
}

function formatTime24(date) {
  return date.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: IST_TIMEZONE
  });
}

/**
 * Main function to calculate all auspicious times
 */
function calculateAuspiciousTimes(dateStr, cityName) {
  const CITIES = {
    Chennai: { lat: 13.0827, lon: 80.2707, tz: 5.5 },
    Mumbai: { lat: 19.0760, lon: 72.8777, tz: 5.5 },
    Delhi: { lat: 28.6139, lon: 77.2090, tz: 5.5 },
    Bangalore: { lat: 12.9716, lon: 77.5946, tz: 5.5 },
    Kolkata: { lat: 22.5726, lon: 88.3639, tz: 5.5 }
  };
  
  const city = CITIES[cityName] || CITIES.Chennai;
  
  try {
    const sunTimes = getSunriseSunset(dateStr, city.lat, city.lon, city.tz, cityName);
    const rahuKaal = calculateRahuKaal(dateStr, city.lat, city.lon, city.tz, cityName);
    const yamaganda = calculateYamaganda(dateStr, city.lat, city.lon, city.tz, cityName);
    
    return {
      date: dateStr,
      city: cityName,
      sunrise: sunTimes.sunrise,
      sunset: sunTimes.sunset,
      sunriseSource: sunTimes.source,
      rahuKaal: rahuKaal,
      yamaganda: yamaganda,
      calculatedAt: new Date().toISOString(),
      timezone: IST_TIMEZONE,
      timezoneOffsetMinutes: getISTOffsetMinutes(),
      serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      serverOffsetMinutes: getServerOffsetMinutes(),
      serverTimeIST: formatIST(new Date())
    };
  } catch (error) {
    console.error('Error calculating auspicious times:', error);
    throw error;
  }
}

module.exports = {
  calculateAuspiciousTimes,
  getSunriseSunset,
  calculateRahuKaal,
  calculateYamaganda,
  calculateGowriNallaNeram
};

/**
 * Calculate Gowri Nalla Neram windows
 * Logic:
 * - Compute accurate sunrise/sunset (location-based)
 * - Day duration = sunset - sunrise; Night duration = 24h - day
 * - Divide each into 8 equal slots
 * - Map slots to Good/Average/Bad per weekday table
 * - Exclude overlaps with Rahu Kaal and Yamaganda (day)
 */
function calculateGowriNallaNeram(dateStr, cityName) {
  const CITIES = {
    Chennai: { lat: 13.0827, lon: 80.2707, tz: 5.5 },
    Mumbai: { lat: 19.0760, lon: 72.8777, tz: 5.5 },
    Delhi: { lat: 28.6139, lon: 77.2090, tz: 5.5 },
    Bangalore: { lat: 12.9716, lon: 77.5946, tz: 5.5 },
    Kolkata: { lat: 22.5726, lon: 88.3639, tz: 5.5 },
    Hyderabad: { lat: 17.3850, lon: 78.4867, tz: 5.5 }
  };
  const city = CITIES[cityName] || CITIES.Chennai;

  const { sunriseDate, sunsetDate, sunrise, sunset, source } = getSunriseSunset(dateStr, city.lat, city.lon, city.tz, cityName);

  // Weekday mapping: 0=Sun ... 6=Sat
  const [y, m, d] = dateStr.split('-').map(Number);
  const weekday = new Date(y, m - 1, d).getDay();

  // Day/Night durations
  const dayDurationMin = Math.round((sunsetDate.getTime() - sunriseDate.getTime()) / (60 * 1000));
  const nightDurationMin = (24 * 60) - dayDurationMin;

  const daySlotMin = dayDurationMin / 8;
  const nightSlotMin = nightDurationMin / 8;

  // Gowri quality table (standard Tamil Panchangam)
  // Slots: 1-8 for day, 1-8 for night
  const gowriQualityTable = {
    0: { day: { good: [1, 8], average: [2, 3, 4, 5, 6, 7], bad: [] }, night: { good: [4, 7], average: [1, 2, 3, 5, 6, 8], bad: [] } }, // Sunday
    1: { day: { good: [1, 6], average: [2, 3, 4, 5, 7, 8], bad: [] }, night: { good: [2, 7], average: [1, 3, 4, 5, 6, 8], bad: [] } }, // Monday
    2: { day: { good: [2, 7], average: [1, 3, 4, 5, 6, 8], bad: [] }, night: { good: [1, 6], average: [2, 3, 4, 5, 7, 8], bad: [] } }, // Tuesday
    3: { day: { good: [3, 8], average: [1, 2, 4, 5, 6, 7], bad: [] }, night: { good: [4], average: [1, 2, 3, 5, 6, 7, 8], bad: [] } },    // Wednesday
    4: { day: { good: [4, 5], average: [1, 2, 3, 6, 7, 8], bad: [] }, night: { good: [3, 8], average: [1, 2, 4, 5, 6, 7], bad: [] } }, // Thursday
    5: { day: { good: [6, 7], average: [1, 2, 3, 4, 5, 8], bad: [] }, night: { good: [1], average: [2, 3, 4, 5, 6, 7, 8], bad: [] } },    // Friday
    6: { day: { good: [5], average: [1, 2, 3, 4, 6, 7, 8], bad: [] }, night: { good: [2, 6], average: [1, 3, 4, 5, 7, 8], bad: [] } }     // Saturday
  };

  function getGowriQuality(weekday, period, slotIndex) {
    const table = gowriQualityTable[weekday][period];
    if (table.good.includes(slotIndex)) return 'Good';
    if (table.bad.includes(slotIndex)) return 'Bad';
    return 'Average';
  }

  // Build day slots (strict 8-part division)
  const daySlots = [];
  for (let i = 1; i <= 8; i++) {
    const start = new Date(sunriseDate.getTime() + (i - 1) * daySlotMin * 60 * 1000);
    const end = new Date(sunriseDate.getTime() + i * daySlotMin * 60 * 1000);
    const quality = getGowriQuality(weekday, 'day', i);
    daySlots.push({
      type: 'gowri',
      period: 'day',
      slotIndex: i,
      quality,
      start: formatIST(start),
      end: formatIST(end),
      duration: `${Math.floor(daySlotMin / 60)}h ${Math.round(daySlotMin % 60)}m`,
      label: quality // Keep for UI compat
    });
  }

  // Build night slots (strict 8-part division from sunset)
  const nightStart = sunsetDate;
  const nightSlots = [];
  for (let i = 1; i <= 8; i++) {
    const start = new Date(nightStart.getTime() + (i - 1) * nightSlotMin * 60 * 1000);
    const end = new Date(nightStart.getTime() + i * nightSlotMin * 60 * 1000);
    const quality = getGowriQuality(weekday, 'night', i);
    nightSlots.push({
      type: 'gowri',
      period: 'night',
      slotIndex: i,
      quality,
      start: formatIST(start),
      end: formatIST(end),
      duration: `${Math.floor(nightSlotMin / 60)}h ${Math.round(nightSlotMin % 60)}m`,
      label: quality // Keep for UI compat
    });
  }

  // NALLA NERAM DERIVATION:
  // Start with Gowri Good slots, then exclude inauspicious overlaps
  const rahuSlotsMap = { 0: 8, 1: 2, 2: 7, 3: 5, 4: 6, 5: 4, 6: 3 };
  const rahuSlotIndex = rahuSlotsMap[weekday];
  const yamaganda = calculateYamaganda(dateStr, city.lat, city.lon, city.tz, cityName);
  const dayGhatikas = yamaganda?.ghatikas || [];

  // Day slots: exclude Rahu Kaal and Yamaganda overlaps
  const nallaNeramDaySlots = daySlots
    .filter((s) => s.quality === 'Good')
    .map((s) => {
      const filtersApplied = [];
      const isRahu = s.slotIndex === rahuSlotIndex;
      const yg = dayGhatikas.find((g) => g.number === s.slotIndex);
      const isYamaganda = yg ? yg.isYamaganda : false;
      
      if (isRahu) filtersApplied.push('rahuExcluded');
      if (isYamaganda) filtersApplied.push('yamagandaExcluded');
      
      return {
        ...s,
        derivedFrom: 'gowri',
        gowriSlotIndex: s.slotIndex,
        filtersApplied,
        excluded: isRahu || isYamaganda
      };
    })
    .filter((s) => !s.excluded);

  // Night slots: no exclusions (Rahu/Yamaganda are daytime only)
  const nallaNeramNightSlots = nightSlots
    .filter((s) => s.quality === 'Good')
    .map((s) => ({
      ...s,
      derivedFrom: 'gowri',
      gowriSlotIndex: s.slotIndex,
      filtersApplied: [],
      excluded: false
    }));

  return {
    calculationMethod: 'Location-based Gowri 8-part division system',
    meta: {
      locationAware: true,
      latitude: city.lat,
      longitude: city.lon,
      timezone: city.tz,
      weekday,
      sunrise,
      sunset,
      sunriseSource: source,
      dayDuration: `${Math.floor(dayDurationMin / 60)}h ${dayDurationMin % 60}m`,
      nightDuration: `${Math.floor(nightDurationMin / 60)}h ${nightDurationMin % 60}m`,
      daySlotMinutes: Math.round(daySlotMin),
      nightSlotMinutes: Math.round(nightSlotMin)
    },
    gowriSlots: {
      day: daySlots,
      night: nightSlots
    },
    nallaNeramSlots: [...nallaNeramDaySlots, ...nallaNeramNightSlots],
    notes: 'Auspicious timings vary by Panchangam tradition. This uses standard Tamil Gowri system.'
  };
}
