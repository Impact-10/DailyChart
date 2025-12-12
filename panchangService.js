const Astronomy = require('astronomy-engine');

/**
 * Complete Vedic Panchang Service
 * Calculates: Tithi, Nakshatra, Yoga, Karana, Nalla Neram
 * All times returned in IST (Asia/Kolkata)
 */

/**
 * CRITICAL: Format time in IST regardless of server timezone
 */
function formatTimeIST(date) {
  return date.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  }).replace(/^(\d{1,2}):(\d{2})\s(AM|PM)$/, (match, h, m, period) => {
    return `${parseInt(h, 10)}:${m} ${period}`;
  });
}

/**
 * Get planetary longitudes for given date
 */
function getPlanetaryPositions(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  
  // Get tropical longitudes
  const sunEcl = Astronomy.Ecliptic(Astronomy.GeoVector('Sun', date, true));
  const moonEcl = Astronomy.Ecliptic(Astronomy.GeoVector('Moon', date, true));
  
  // Calculate Lahiri ayanamsa
  const JD = (date.getTime() / 86400000) + 2440587.5;
  const T = (JD - 2451545.0) / 36525.0;
  const ayanamsa = 23.8529 + (50.2879 * T + 0.0222 * T * T) / 3600.0;
  
  // Convert to sidereal
  let sunLong = (sunEcl.elon - ayanamsa + 360) % 360;
  let moonLong = (moonEcl.elon - ayanamsa + 360) % 360;
  
  return {
    sun: { longitude: sunLong },
    moon: { longitude: moonLong },
    ayanamsa
  };
}

/**
 * 1. TITHI CALCULATION
 * Formula: Tithi = Floor((Moon° - Sun°) / 12) + 1
 * Range: 1-30 (15 Sukla Paksha + 15 Krishna Paksha)
 * Includes end time calculation
 */
function calculateTithi(sunLong, moonLong) {
  let diff = (moonLong - sunLong + 360) % 360;
  const tithiNum = Math.floor(diff / 12) + 1;
  
  const tithiNames = [
    'பிரதமை (Prathamai)', 'துவிதியை (Dwitiya)', 'திரிதியை (Tritiya)', 
    'சதுர்த்தி (Chaturthi)', 'பஞ்சமி (Panchami)', 'சஷ்டி (Shashti)',
    'சப்தமி (Saptami)', 'அஷ்டமி (Ashtami)', 'நவமி (Navami)', 
    'தசமி (Dasami)', 'ஏகாதசி (Ekadashi)', 'துவாதசி (Dwadashi)',
    'திரயோதசி (Trayodashi)', 'சதுர்த்தசி (Chaturdashi)', 'பௌர்ணமி (Pournami)',
    // Krishna Paksha
    'பிரதமை க (Prathamai K)', 'துவிதியை க (Dwitiya K)', 'திரிதியை க (Tritiya K)',
    'சதுர்த்தி க (Chaturthi K)', 'பஞ்சமி க (Panchami K)', 'சஷ்டி க (Shashti K)',
    'சப்தமி க (Saptami K)', 'அஷ்டமி க (Ashtami K)', 'நவமி க (Navami K)',
    'தசமி க (Dasami K)', 'ஏகாதசி க (Ekadashi K)', 'துவாதசி க (Dwadashi K)',
    'திரயோதசி க (Trayodashi K)', 'சதுர்த்தசி க (Chaturdashi K)', 'அமாவாசை (Amavasya)'
  ];
  
  const paksha = tithiNum <= 15 ? 'சுக்ல பக்ஷம் (Sukla Paksha)' : 'கிருஷ்ண பக்ஷம் (Krishna Paksha)';
  const progress = Math.round(((diff % 12) / 12) * 100);
  
  // Calculate minutes until tithi change
  // Moon moves at 0.549°/hour, so degrees to next tithi / 0.549
  const degToNextTithi = 12 - (diff % 12);
  const moonSpeed = 0.549; // degrees per hour
  const hoursUntilChange = degToNextTithi / moonSpeed;
  const minutesUntilChange = Math.round(hoursUntilChange * 60);
  
  // Special tithis (Ekadashi fasting days)
  const isEkadashi = tithiNum === 11 || tithiNum === 26;
  
  return {
    number: tithiNum,
    name: tithiNames[tithiNum - 1],
    paksha,
    progress,
    minutesRemaining: minutesUntilChange,
    isSpecial: isEkadashi,
    specialNote: isEkadashi ? 'ஏகாதசி விரதம் (Ekadashi Fasting)' : null
  };
}

/**
 * 2. NAKSHATRA CALCULATION
 * Formula: Nakshatra = Floor(Moon° / 13.333) + 1
 * Range: 1-27
 */
function calculateNakshatra(moonLong) {
  const nakshatraNum = Math.floor(moonLong / 13.33333333) + 1;
  
  const nakshatras = [
    { name: 'அஸ்வினி (Ashwini)', lord: 'கேது (Ketu)', deity: 'அஸ்வினி தேவர்கள்' },
    { name: 'பரணி (Bharani)', lord: 'சுக்ரன் (Venus)', deity: 'யமன்' },
    { name: 'கார்த்திகை (Krittika)', lord: 'சூரியன் (Sun)', deity: 'அக்னி' },
    { name: 'ரோகிணி (Rohini)', lord: 'சந்திரன் (Moon)', deity: 'பிரம்மா' },
    { name: 'மிருகசீரிஷம் (Mrigashira)', lord: 'செவ்வாய் (Mars)', deity: 'சோமன்' },
    { name: 'திருவாதிரை (Ardra)', lord: 'ராகு (Rahu)', deity: 'ருத்ரன்' },
    { name: 'புனர்பூசம் (Punarvasu)', lord: 'குரு (Jupiter)', deity: 'அதிதி' },
    { name: 'பூசம் (Pushya)', lord: 'சனி (Saturn)', deity: 'பிருஹஸ்பதி' },
    { name: 'ஆயில்யம் (Ashlesha)', lord: 'புதன் (Mercury)', deity: 'நாக தேவதைகள்' },
    { name: 'மகம் (Magha)', lord: 'கேது (Ketu)', deity: 'பிதுர்கள்' },
    { name: 'பூரம் (Purva Phalguni)', lord: 'சுக்ரன் (Venus)', deity: 'பக்யன்' },
    { name: 'உத்திரம் (Uttara Phalguni)', lord: 'சூரியன் (Sun)', deity: 'அர்யமன்' },
    { name: 'ஹஸ்தம் (Hasta)', lord: 'சந்திரன் (Moon)', deity: 'சவிதா' },
    { name: 'சித்திரை (Chitra)', lord: 'செவ்வாய் (Mars)', deity: 'த்வஷ்டா' },
    { name: 'ஸ்வாதி (Swati)', lord: 'ராகு (Rahu)', deity: 'வாயு' },
    { name: 'விசாகம் (Vishakha)', lord: 'குரு (Jupiter)', deity: 'இந்திராக்னி' },
    { name: 'அனுஷம் (Anuradha)', lord: 'சனி (Saturn)', deity: 'மித்ரன்' },
    { name: 'கேட்டை (Jyeshtha)', lord: 'புதன் (Mercury)', deity: 'இந்திரன்' },
    { name: 'மூலம் (Mula)', lord: 'கேது (Ketu)', deity: 'நிருதி' },
    { name: 'பூராடம் (Purva Ashadha)', lord: 'சுக்ரன் (Venus)', deity: 'ஜலம்' },
    { name: 'உத்திராடம் (Uttara Ashadha)', lord: 'சூரியன் (Sun)', deity: 'விச்வேதேவர்கள்' },
    { name: 'திருவோணம் (Shravana)', lord: 'சந்திரன் (Moon)', deity: 'விஷ்ணு' },
    { name: 'அவிட்டம் (Dhanishta)', lord: 'செவ்வாய் (Mars)', deity: 'வசுக்கள்' },
    { name: 'சதயம் (Shatabhisha)', lord: 'ராகு (Rahu)', deity: 'வருணன்' },
    { name: 'பூரட்டாதி (Purva Bhadrapada)', lord: 'குரு (Jupiter)', deity: 'அஜ ஏகபாத்' },
    { name: 'உத்திரட்டாதி (Uttara Bhadrapada)', lord: 'சனி (Saturn)', deity: 'அஹிர்புத்னியன்' },
    { name: 'ரேவதி (Revati)', lord: 'புதன் (Mercury)', deity: 'பூஷன்' }
  ];
  
  const nakshatra = nakshatras[nakshatraNum - 1];
  const progress = Math.round(((moonLong % 13.33333333) / 13.33333333) * 100);
  
  // Calculate transition to next nakshatra
  const nextNakshatraStart = (nakshatraNum % 27 + 1) * 13.33333333;
  const degToNextNak = (nextNakshatraStart - moonLong + 360) % 360;
  const moonSpeed = 0.549; // degrees per hour
  const hoursUntilChange = degToNextNak / moonSpeed;
  const minutesUntilChange = Math.round(hoursUntilChange * 60);
  const nextNakshatraIndex = nakshatraNum % 27;
  
  return {
    number: nakshatraNum,
    name: nakshatra.name,
    lord: nakshatra.lord,
    deity: nakshatra.deity,
    progress,
    minutesUntilChange,
    nextNakshatra: nakshatras[nextNakshatraIndex].name
  };
}

/**
 * 3. YOGA CALCULATION
 * Formula: Yoga = Floor((Sun° + Moon°) / 13.333) + 1
 * Range: 1-27
 */
function calculateYoga(sunLong, moonLong) {
  const combined = (sunLong + moonLong) % 360;
  const yogaNum = Math.floor(combined / 13.33333333) + 1;
  
  const yogas = [
    { name: 'விஷ்கம்பம் (Vishkambha)', nature: 'சுபம் (Auspicious)' },
    { name: 'ப்ரீதி (Priti)', nature: 'சுபம் (Auspicious)' },
    { name: 'ஆயுஷ்மான் (Ayushman)', nature: 'சுபம் (Auspicious)' },
    { name: 'சௌபாக்யம் (Saubhagya)', nature: 'சுபம் (Auspicious)' },
    { name: 'சோபன (Shobhana)', nature: 'சுபம் (Auspicious)' },
    { name: 'அதிகண்டா (Atiganda)', nature: 'அசுபம் (Inauspicious)' },
    { name: 'சுகர்மா (Sukarma)', nature: 'சுபம் (Auspicious)' },
    { name: 'த்ருதி (Dhriti)', nature: 'சுபம் (Auspicious)' },
    { name: 'சூலா (Shula)', nature: 'அசுபம் (Inauspicious)' },
    { name: 'கண்டா (Ganda)', nature: 'அசுபம் (Inauspicious)' },
    { name: 'வ்ருத்தி (Vriddhi)', nature: 'சுபம் (Auspicious)' },
    { name: 'த்ருவ (Dhruva)', nature: 'சுபம் (Auspicious)' },
    { name: 'வ்யாகாத (Vyaghata)', nature: 'அசுபம் (Inauspicious)' },
    { name: 'ஹர்ஷன (Harshana)', nature: 'சுபம் (Auspicious)' },
    { name: 'வஜ்ரா (Vajra)', nature: 'சுபம் (Auspicious)' },
    { name: 'சித்தி (Siddhi)', nature: 'சுபம் (Auspicious)' },
    { name: 'வ்யதீபாத (Vyatipata)', nature: 'அசுபம் (Inauspicious)' },
    { name: 'வரியான் (Variyan)', nature: 'அசுபம் (Inauspicious)' },
    { name: 'பரிகா (Parigha)', nature: 'அசுபம் (Inauspicious)' },
    { name: 'சிவா (Shiva)', nature: 'நடுநிலை (Neutral)' },
    { name: 'சித்த (Siddha)', nature: 'சுபம் (Auspicious)' },
    { name: 'சாத்யா (Sadhya)', nature: 'சுபம் (Auspicious)' },
    { name: 'சுப (Shubha)', nature: 'சுபம் (Auspicious)' },
    { name: 'சுக்லா (Shukla)', nature: 'சுபம் (Auspicious)' },
    { name: 'பிரம்மா (Brahma)', nature: 'சுபம் (Auspicious)' },
    { name: 'ஐந்த்ரா (Aindra)', nature: 'சுபம் (Auspicious)' },
    { name: 'வைத்ருதி (Vaidhriti)', nature: 'அசுபம் (Inauspicious)' }
  ];
  
  const yoga = yogas[yogaNum - 1];
  const progress = Math.round(((combined % 13.33333333) / 13.33333333) * 100);
  
  return {
    number: yogaNum,
    name: yoga.name,
    nature: yoga.nature,
    progress
  };
}

/**
 * 4. KARANA CALCULATION
 * Formula: Karana = Floor((Moon° - Sun°) / 6) mod 60
 * Range: 1-60 (11 karanas cycling)
 */
function calculateKarana(sunLong, moonLong) {
  let angle = (moonLong - sunLong + 360) % 360;
  const karanaNum = Math.floor(angle / 6) + 1;
  
  const karanas = [
    'பவ (Bava)', 'பாலவ (Balava)', 'கௌலவ (Kaulava)', 'தைதில (Taitila)',
    'கர (Gara)', 'வணிஜ (Vanija)', 'விஷ்டி (Vishti)',
    'சகுனி (Shakuni)', 'சதுஷ்பாத (Chatushpada)', 'நாக (Naga)', 'கிம்ஸ்துக்ன (Kimstughna)'
  ];
  
  // Karanas cycle through the 11 names
  const karanaName = karanas[(karanaNum - 1) % 11];
  const progress = Math.round(((angle % 6) / 6) * 100);
  
  // Vishti (Bhadra) is inauspicious
  const isInauspicious = karanaName.includes('விஷ்டி');
  
  return {
    number: karanaNum,
    name: karanaName,
    progress,
    nature: isInauspicious ? 'அசுபம் (Inauspicious)' : 'சுபம் (Auspicious)'
  };
}

/**
 * 5. NALLA NERAM CALCULATION
 * Fixed auspicious time windows based on day of week
 * All times in IST (Asia/Kolkata timezone)
 * Source: https://www.drikpanchang.com/panchang/nalla-neram.html
 */
function calculateNallaNeram(dateStr, timezone) {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();
  
  // CORRECTED Nalla Neram times in IST for all 7 days
  const nallaWindows = {
    0: [{ start: '06:00 AM', end: '09:00 AM' }, { start: '04:00 PM', end: '06:00 PM' }], // Sunday
    1: [{ start: '07:00 AM', end: '10:00 AM' }, { start: '01:00 PM', end: '03:00 PM' }], // Monday
    2: [{ start: '08:00 AM', end: '11:00 AM' }, { start: '05:00 PM', end: '07:00 PM' }], // Tuesday
    3: [{ start: '06:00 AM', end: '08:00 AM' }, { start: '12:00 PM', end: '02:00 PM' }], // Wednesday
    4: [{ start: '09:00 AM', end: '11:00 AM' }, { start: '04:00 PM', end: '06:00 PM' }], // Thursday
    5: [{ start: '09:00 AM', end: '10:30 AM' }, { start: '02:00 PM', end: '03:30 PM' }], // Friday (FIXED)
    6: [{ start: '10:00 AM', end: '12:00 PM' }, { start: '05:00 PM', end: '07:00 PM' }]  // Saturday
  };
  
  const dayNames = [
    'ஞாயிற்றுக்கிழமை (Sunday)',
    'திங்கட்கிழமை (Monday)',
    'செவ்வாய்கிழமை (Tuesday)',
    'புதன்கிழமை (Wednesday)',
    'வியாழக்கிழமை (Thursday)',
    'வெள்ளிக்கிழமை (Friday)',
    'சனிக்கிழமை (Saturday)'
  ];
  
  // Calculate durations based on time windows
  function calculateDuration(startStr, endStr) {
    // Remove AM/PM and parse time
    const parseTime = (timeStr) => {
      const parts = timeStr.trim().split(/\s+/);
      const [h, m] = parts[0].split(':').map(Number);
      const period = parts[1]; // AM or PM
      let hours = h;
      if (period === 'PM' && h !== 12) hours += 12;
      if (period === 'AM' && h === 12) hours = 0;
      return hours + m / 60;
    };
    
    const start = parseTime(startStr);
    const end = parseTime(endStr);
    let duration = end - start;
    if (duration < 0) duration += 24; // Handle day wraparound
    
    const hours = Math.floor(duration);
    const minutes = Math.round((duration - hours) * 60);
    return `${hours}.${minutes === 0 ? '0' : minutes} Hours`;
  }
  
  const windows = nallaWindows[dayOfWeek];
  
  return {
    day: dayNames[dayOfWeek],
    windows: windows.map((w, i) => ({
      period: i + 1,
      start: w.start,
      end: w.end,
      duration: calculateDuration(w.start, w.end)
    }))
  };
}

/**
 * Main function to calculate complete Panchang
 */
function calculateCompletePanchang(dateStr, timezone = 5.5) {
  try {
    // Get planetary positions
    const planets = getPlanetaryPositions(dateStr);
    
    // Calculate all Vedic elements
    const tithi = calculateTithi(planets.sun.longitude, planets.moon.longitude);
    const nakshatra = calculateNakshatra(planets.moon.longitude);
    const yoga = calculateYoga(planets.sun.longitude, planets.moon.longitude);
    const karana = calculateKarana(planets.sun.longitude, planets.moon.longitude);
    const nallaNeram = calculateNallaNeram(dateStr, timezone);
    
    return {
      date: dateStr,
      tithi,
      nakshatra,
      yoga,
      karana,
      nallaNeram,
      ayanamsa: planets.ayanamsa.toFixed(4),
      calculatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error calculating panchang:', error);
    throw error;
  }
}

module.exports = {
  calculateCompletePanchang,
  calculateTithi,
  calculateNakshatra,
  calculateYoga,
  calculateKarana,
  calculateNallaNeram,
  formatTimeIST
};
