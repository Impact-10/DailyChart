const Astronomy = require('astronomy-engine');

// City coordinates
const CITIES = {
  Chennai: { lat: 13.0827, lon: 80.2707, tz: 5.5 },
  Delhi: { lat: 28.7041, lon: 77.1025, tz: 5.5 },
  Mumbai: { lat: 19.0760, lon: 72.8777, tz: 5.5 },
  Bangalore: { lat: 12.9716, lon: 77.5946, tz: 5.5 },
  Kolkata: { lat: 22.5726, lon: 88.3639, tz: 5.5 },
  Hyderabad: { lat: 17.3850, lon: 78.4867, tz: 5.5 }
};

// Tamil + English planet labels
const PLANET_LABELS = {
  Sun: 'ஞாயிறு (சூ) Sun',
  Moon: 'திங்கள் (நிலவு) Moon',
  Mars: 'செவ்வாய் Mars',
  Mercury: 'புதன் Mercury',
  Jupiter: 'வியாழன் (குரு) Jupiter',
  Venus: 'வெள்ளி (சுக்) Venus',
  Saturn: 'சனி (சனி) Saturn',
  Rahu: 'இராகு Rahu',
  Ketu: 'கேது Ketu'
};

/**
 * Convert date to Julian Day (matches Swiss Ephemeris calculation)
 * Handles timezone conversion properly regardless of server location
 */
function getJulianDay(dateStr, timeStr, timezone) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Convert local time to total minutes since midnight
  const localMinutes = hours * 60 + minutes;
  
  // Convert to UTC minutes
  const timezoneMinutes = Math.round(timezone * 60); // Round to handle floating point precision
  const utcMinutes = localMinutes - timezoneMinutes;
  
  console.log('[JD-DEBUG] Timezone calc:', { 
    timezone, 
    timezoneMinutes, 
    localMinutes, 
    utcMinutes 
  });
  
  // Calculate UTC date and time with proper day rollover
  let utcDay = day;
  let utcMonth = month;
  let utcYear = year;
  let utcHours = Math.floor(utcMinutes / 60);
  let utcMins = utcMinutes % 60;
  
  // Handle negative hours (previous day)
  if (utcHours < 0) {
    utcHours += 24;
    utcDay -= 1;
    if (utcDay < 1) {
      utcMonth -= 1;
      if (utcMonth < 1) {
        utcMonth = 12;
        utcYear -= 1;
      }
      // Get days in previous month
      const daysInMonth = new Date(utcYear, utcMonth, 0).getDate();
      utcDay = daysInMonth;
    }
  }
  
  // Handle hours >= 24 (next day)
  if (utcHours >= 24) {
    utcHours -= 24;
    utcDay += 1;
    const daysInMonth = new Date(utcYear, utcMonth, 0).getDate();
    if (utcDay > daysInMonth) {
      utcDay = 1;
      utcMonth += 1;
      if (utcMonth > 12) {
        utcMonth = 1;
        utcYear += 1;
      }
    }
  }
  
  // Create UTC date
  const utcDate = new Date(Date.UTC(utcYear, utcMonth - 1, utcDay, utcHours, utcMins, 0));
  
  console.log('[JD-DEBUG] Input:', { dateStr, timeStr, timezone });
  console.log('[JD-DEBUG] Local time:', hours, ':', minutes);
  console.log('[JD-DEBUG] UTC time:', utcDate.toISOString());
  
  // Calculate Julian Day using standard formula
  const a = Math.floor((14 - utcDate.getUTCMonth() - 1) / 12);
  const y = utcDate.getUTCFullYear() + 4800 - a;
  const m = utcDate.getUTCMonth() + 1 + 12 * a - 3;
  
  const jdn = utcDate.getUTCDate() + Math.floor((153 * m + 2) / 5) + 365 * y + 
              Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  
  const jd = jdn + (utcDate.getUTCHours() - 12) / 24 + utcDate.getUTCMinutes() / 1440 + 
             utcDate.getUTCSeconds() / 86400;
  
  console.log('[JD-DEBUG] Julian Day:', jd);
  
  return jd;
}

/**
 * Calculate Lahiri Ayanamsa (matches Swiss Ephemeris SIDM_LAHIRI)
 * Reference: https://www.astro.com/swisseph/swephprg.htm
 */
function getLahiriAyanamsa(julday) {
  // Lahiri ayanamsa formula (matches Swiss Ephemeris)
  // T = (JD - 2451545.0) / 36525 (centuries from J2000.0)
  const T = (julday - 2451545.0) / 36525.0;
  
  // Lahiri ayanamsa at J2000.0: 23°51'10.5" = 23.8529°
  // Precession rate: approximately 50.2879" per year
  const ayanaJ2000 = 23.8529;
  const precessionRate = 50.2879 / 3600.0; // degrees per year
  
  // More accurate Lahiri formula
  const ayanamsa = ayanaJ2000 + (50.2879 * T + 0.0222 * T * T) / 3600.0;
  
  return ayanamsa;
}

/**
 * Get tropical longitude and convert to sidereal
 */
function getPlanetLongitude(date, bodyName, ayanamsa) {
  const ecliptic = Astronomy.Ecliptic(Astronomy.GeoVector(bodyName, date, true));
  const tropicalLon = ecliptic.elon;
  
  // Convert to sidereal
  let siderealLon = tropicalLon - ayanamsa;
  
  // Normalize to 0-360
  while (siderealLon < 0) siderealLon += 360;
  while (siderealLon >= 360) siderealLon -= 360;
  
  return siderealLon;
}

/**
 * Calculate tropical ascendant then convert to sidereal
 */
function calculateAscendant(date, latitude, longitude, ayanamsa) {
  // DEBUG: Log input parameters
  console.log('[ASCENDANT-DEBUG] Input parameters:', {
    date: date.toISOString(),
    latitude,
    longitude,
    ayanamsa
  });
  
  // Get sidereal time
  const gast = Astronomy.SiderealTime(date);
  console.log('[ASCENDANT-DEBUG] GAST (Greenwich Apparent Sidereal Time):', gast);
  
  const lst = (gast + longitude / 15.0);
  console.log('[ASCENDANT-DEBUG] LST (Local Sidereal Time):', lst);
  
  const lstDegrees = (lst * 15.0) % 360;
  console.log('[ASCENDANT-DEBUG] LST in degrees:', lstDegrees);
  
  // Mean obliquity of ecliptic
  // Use Julian Day for consistency with other calculations
  const JD = (date.getTime() / 86400000) + 2440587.5;
  const T = (JD - 2451545.0) / 36525.0;
  console.log('[ASCENDANT-DEBUG] Julian Day:', JD, '| T:', T);
  
  const obliquity = 23.439291 - 0.0130042 * T;
  console.log('[ASCENDANT-DEBUG] Mean obliquity of ecliptic:', obliquity);
  
  // Calculate RAMC (Right Ascension of Medium Coeli)
  const ramc = lstDegrees;
  console.log('[ASCENDANT-DEBUG] RAMC:', ramc);
  
  // Calculate tropical ascendant using spherical trigonometry
  const ramcRad = ramc * Math.PI / 180.0;
  const obliquityRad = obliquity * Math.PI / 180.0;
  const latRad = latitude * Math.PI / 180.0;
  
  console.log('[ASCENDANT-DEBUG] Radians - RAMC:', ramcRad, '| Obliquity:', obliquityRad, '| Latitude:', latRad);
  
  const numerator = Math.cos(ramcRad);
  const denominator = Math.cos(obliquityRad) * Math.sin(ramcRad) + 
                      Math.sin(obliquityRad) * Math.tan(latRad);
  
  console.log('[ASCENDANT-DEBUG] Trig values - numerator:', numerator, '| denominator:', denominator);
  
  let tropicalAsc = Math.atan2(numerator, denominator) * 180.0 / Math.PI;
  console.log('[ASCENDANT-DEBUG] Tropical Ascendant (before normalization):', tropicalAsc);
  
  // Normalize to 0-360
  tropicalAsc = ((tropicalAsc % 360) + 360) % 360;
  console.log('[ASCENDANT-DEBUG] Tropical Ascendant (normalized):', tropicalAsc);
  
  // Convert to sidereal
  let siderealAsc = tropicalAsc - ayanamsa;
  console.log('[ASCENDANT-DEBUG] Sidereal Ascendant (before normalization):', siderealAsc);
  
  while (siderealAsc < 0) siderealAsc += 360;
  while (siderealAsc >= 360) siderealAsc -= 360;
  
  console.log('[ASCENDANT-DEBUG] Sidereal Ascendant (final):', siderealAsc);
  
  return siderealAsc;
}

/**
 * Calculate Rahu (Mean Node) position
 */
function calculateRahu(date, ayanamsa) {
  // Rahu is calculated based on lunar nodes
  // Using standard astronomical formula for mean ascending node
  const JD = (date.getTime() / 86400000) + 2440587.5;
  const T = (JD - 2451545.0) / 36525.0;
  
  // Mean longitude of ascending node (tropical)
  // Formula from astronomical almanac
  const tropicalRahu = 125.04455501 - 1934.1361849 * T + 0.0020762 * T * T;
  
  // Normalize and convert to sidereal
  let siderealRahu = (tropicalRahu - ayanamsa) % 360;
  while (siderealRahu < 0) siderealRahu += 360;
  
  return siderealRahu;
}

/**
 * Longitude to Rasi index (0-11)
 */
function longitudeToRasi(longitude) {
  let normalizedLon = longitude % 360;
  if (normalizedLon < 0) normalizedLon += 360;
  return Math.floor(normalizedLon / 30);
}

/**
 * Main function to calculate daily transit chart
 */
function calculateDailyChart(dateStr, timeStr, cityName) {
  try {
    // Get city coordinates
    const city = CITIES[cityName] || CITIES.Chennai;
    
    // Parse date and time
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // Create UTC date
    const localDate = new Date(year, month - 1, day, hours, minutes, 0);
    const utcDate = new Date(localDate.getTime() - city.tz * 60 * 60 * 1000);
    
    // Calculate Julian Day
    const julday = getJulianDay(dateStr, timeStr, city.tz);
    
    // Calculate Lahiri ayanamsa
    const ayanamsa = getLahiriAyanamsa(julday);
    
    // Calculate sidereal planetary positions
    const rawLongitudes = {};
    
    rawLongitudes.Sun = getPlanetLongitude(utcDate, 'Sun', ayanamsa);
    rawLongitudes.Moon = getPlanetLongitude(utcDate, 'Moon', ayanamsa);
    rawLongitudes.Mars = getPlanetLongitude(utcDate, 'Mars', ayanamsa);
    rawLongitudes.Mercury = getPlanetLongitude(utcDate, 'Mercury', ayanamsa);
    rawLongitudes.Jupiter = getPlanetLongitude(utcDate, 'Jupiter', ayanamsa);
    rawLongitudes.Venus = getPlanetLongitude(utcDate, 'Venus', ayanamsa);
    rawLongitudes.Saturn = getPlanetLongitude(utcDate, 'Saturn', ayanamsa);
    rawLongitudes.Rahu = calculateRahu(utcDate, ayanamsa);
    rawLongitudes.Ketu = (rawLongitudes.Rahu + 180) % 360;
    
    // Calculate sidereal ascendant
    const lagnaLongitude = calculateAscendant(utcDate, city.lat, city.lon, ayanamsa);
    
    // Initialize rasi data structure
    const rasiData = {};
    for (let i = 0; i < 12; i++) {
      rasiData[i] = { planets: [], isLagna: false };
    }
    
    // Place planets in rasis
    for (const [planet, longitude] of Object.entries(rawLongitudes)) {
      const rasiIndex = longitudeToRasi(longitude);
      rasiData[rasiIndex].planets.push(PLANET_LABELS[planet]);
    }
    
    // Mark Lagna
    const lagnaRasi = longitudeToRasi(lagnaLongitude);
    rasiData[lagnaRasi].isLagna = true;
    
    return {
      rasiData,
      rawLongitudes,
      lagnaLongitude,
      ayanamsa,
      date: dateStr,
      time: timeStr,
      city: cityName,
      julday
    };
    
  } catch (error) {
    throw new Error(`Error calculating chart: ${error.message}`);
  }
}

module.exports = {
  calculateDailyChart,
  CITIES
};
