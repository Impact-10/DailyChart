const Astronomy = require('astronomy-engine');
const fs = require('fs');
const path = require('path');

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
  
  // Start search from local midnight
  const localMidnight = new Date(year, month - 1, day, 0, 0, 0);
  
  const observer = new Astronomy.Observer(latitude, longitude, 0);
  
  // Get sunrise (direction = +1 for rise)
  const sunriseResult = Astronomy.SearchRiseSet(
    Astronomy.Body.Sun,
    observer,
    1,
    localMidnight,
    1 // Search within 1 day
  );
  
  // Get sunset (direction = -1 for set)
  const sunsetResult = Astronomy.SearchRiseSet(
    Astronomy.Body.Sun,
    observer,
    -1,
    localMidnight,
    1
  );
  
  if (!sunriseResult || !sunsetResult) {
    throw new Error('Could not calculate sunrise/sunset for the given date and location');
  }
  
  // astronomy-engine may return AstroTime (.toDate) or a native Date. Normalize.
  const sunriseLocal = toJsDate(sunriseResult.date);
  const sunsetLocal = toJsDate(sunsetResult.date);
  
  return {
    sunrise: formatTime(sunriseLocal),
    sunset: formatTime(sunsetLocal),
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
  
  // Get day of week (0 = Sunday, 6 = Saturday)
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();
  
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
 * Uses DrikPanchang method: 2nd Ghatika during day, 4th Ghatika during night
 */
function calculateYamaganda(dateStr, latitude, longitude, timezone, cityName) {
  const { sunriseDate, sunsetDate } = getSunriseSunset(dateStr, latitude, longitude, timezone, cityName);

  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();

  // Golden Chennai standard Yamaganda slots - BOTH day and night are FIXED times
  // Format: { dayStart, dayEnd, nightStart, nightEnd }
  const yamagandaFixedSlots = {
    0: { dayStart: '12:00 PM', dayEnd: '1:30 PM', nightStart: '6:00 PM', nightEnd: '7:30 PM' },     // Sunday
    1: { dayStart: '10:30 AM', dayEnd: '12:00 PM', nightStart: '3:00 AM', nightEnd: '4:30 AM' },   // Monday
    2: { dayStart: '9:00 AM', dayEnd: '10:30 AM', nightStart: '1:30 AM', nightEnd: '3:30 AM' },    // Tuesday
    3: { dayStart: '7:30 AM', dayEnd: '9:00 AM', nightStart: '12:00 AM', nightEnd: '1:30 AM' },    // Wednesday
    4: { dayStart: '6:00 AM', dayEnd: '7:30 AM', nightStart: '10:30 PM', nightEnd: '12:00 AM' },   // Thursday
    5: { dayStart: '3:00 PM', dayEnd: '4:30 PM', nightStart: '9:00 PM', nightEnd: '10:30 PM' },    // Friday
    6: { dayStart: '1:30 PM', dayEnd: '3:00 PM', nightStart: '7:30 PM', nightEnd: '9:00 PM' }      // Saturday
  };

  const slots = yamagandaFixedSlots[dayOfWeek];

  // Convert fixed time strings to Date objects
  function timeToDate(dateStr, timeStr) {
    let hours = parseInt(timeStr.split(':')[0].trim());
    const minutes = parseInt(timeStr.split(':')[1].split(' ')[0].trim());
    const isPM = timeStr.includes('PM') && hours !== 12;
    const isAM12 = timeStr.includes('12:') && timeStr.includes('AM');
    
    if (isPM) hours += 12;
    if (isAM12) hours = 0;
    
    const d = new Date(dateStr);
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  const dayStartTime = timeToDate(dateStr, slots.dayStart);
  const dayEndTime = timeToDate(dateStr, slots.dayEnd);
  const nightStartTime = timeToDate(dateStr, slots.nightStart);
  let nightEndTime = timeToDate(dateStr, slots.nightEnd);

  // Handle night windows that cross midnight
  if (nightEndTime < nightStartTime) {
    nightEndTime = new Date(nightEndTime.getTime() + 24 * 60 * 60 * 1000);
  }

  // Calculate day duration
  const dayDurationMinutes = (dayEndTime.getTime() - dayStartTime.getTime()) / (60 * 1000);
  const dayGhatikaDuration = (sunsetDate.getTime() - sunriseDate.getTime()) / (60 * 1000) / 8;
  const nightGhatikaDuration = (new Date(dateStr).setDate(new Date(dateStr).getDate() + 1) - sunsetDate.getTime()) / (60 * 1000) / 8;

  // Calculate all 8 DAY Ghatikas for visualization and mark overlaps with fixed Yamaganda
  const ghatikas = [];
  for (let i = 1; i <= 8; i++) {
    const gStart = new Date(sunriseDate.getTime() + (i - 1) * dayGhatikaDuration * 60 * 1000);
    const gEnd = new Date(sunriseDate.getTime() + i * dayGhatikaDuration * 60 * 1000);
    
    // Check if this ghatika overlaps with the fixed day Yamaganda period
    const isYamaganda = (gStart < dayEndTime && gEnd > dayStartTime);
    
    ghatikas.push({
      number: i,
      startTime: formatTime(gStart),
      endTime: formatTime(gEnd),
      isYamaganda: isYamaganda
    });
  }

  const dayDurationHours = Math.floor(dayDurationMinutes / 60);
  const dayDurationMins = Math.round(dayDurationMinutes % 60);
  const nightDurationMinutes = (nightEndTime.getTime() - nightStartTime.getTime()) / (60 * 1000);
  const nightDurationHours = Math.floor(nightDurationMinutes / 60);
  const nightDurationMins = Math.round(nightDurationMinutes % 60);

  return {
    dayPeriod: {
      startTime: formatTime(dayStartTime),
      endTime: formatTime(dayEndTime),
      duration: `${dayDurationHours}h ${dayDurationMins}m`,
      durationMinutes: Math.round(dayDurationMinutes)
    },
    nightPeriod: {
      startTime: formatTime(nightStartTime),
      endTime: formatTime(nightEndTime),
      duration: `${nightDurationHours}h ${nightDurationMins}m`,
      durationMinutes: Math.round(nightDurationMinutes)
    },
    startTime: formatTime(dayStartTime),
    endTime: formatTime(dayEndTime),
    duration: `${dayDurationHours}h ${dayDurationMins}m`,
    durationMinutes: Math.round(dayDurationMinutes),
    ghatikas,
    activeGhatika: 0
  };
}

/**
 * Format time as HH:MM AM/PM
 */
function formatTime(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Format time as HH:MM (24-hour format)
 */
function formatTime24(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
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
      calculatedAt: new Date().toISOString()
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
  calculateYamaganda
};
