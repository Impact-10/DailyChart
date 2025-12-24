const Astronomy = require('astronomy-engine');
const { calculateCompletePanchang } = require('./panchangService');
const { IST_TIMEZONE, getISTOffsetMinutes, getServerOffsetMinutes, formatIST } = require('./timeUtils');
const { CITIES } = require('./astroService');

const TAMIL_MONTHS = [
  { index: 0, tamil: 'சித்திரை', english: 'Chittirai' },
  { index: 1, tamil: 'வைகாசி', english: 'Vaikasi' },
  { index: 2, tamil: 'ஆனி', english: 'Aani' },
  { index: 3, tamil: 'ஆடி', english: 'Aadi' },
  { index: 4, tamil: 'ஆவணி', english: 'Aavani' },
  { index: 5, tamil: 'புரட்டாசி', english: 'Purattasi' },
  { index: 6, tamil: 'ஐப்பசி', english: 'Aippasi' },
  { index: 7, tamil: 'கார்த்திகை', english: 'Karthigai' },
  { index: 8, tamil: 'மார்கழி', english: 'Margazhi' },
  { index: 9, tamil: 'தை', english: 'Thai' },
  { index: 10, tamil: 'மாசி', english: 'Maasi' },
  { index: 11, tamil: 'பங்குனி', english: 'Panguni' }
];

// Standard 60-year Samvatsara cycle (commonly used across Hindu calendars)
const SAMVATSARA_60 = [
  'Prabhava', 'Vibhava', 'Shukla', 'Pramodoota', 'Prajothpatti', 'Aangirasa', 'Shrimukha', 'Bhava', 'Yuva', 'Dhata',
  'Eeshwara', 'Bahudhanya', 'Pramathi', 'Vikrama', 'Vishu', 'Chitrabhanu', 'Subhanu', 'Dharana', 'Parthiva', 'Vyaya',
  'Sarvajit', 'Sarvadhari', 'Virodhi', 'Vikruti', 'Khara', 'Nandana', 'Vijaya', 'Jaya', 'Manmatha', 'Durmukhi',
  'Hevilambi', 'Vilambi', 'Vikari', 'Sharvari', 'Plava', 'Shubhakrit', 'Shobhakrit', 'Krodhi', 'Vishvavasu', 'Parabhava',
  'Plavanga', 'Keelaka', 'Saumya', 'Sadharana', 'Virodhikrit', 'Paridhavi', 'Pramadeesha', 'Ananda', 'Rakshasa', 'Nala',
  'Pingala', 'Kalayukti', 'Siddharthi', 'Raudri', 'Durmati', 'Dundubhi', 'Rudhirodgari', 'Raktakshi', 'Krodhana', 'Akshaya'
];

function addDaysToDateStr(dateStr, days) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  const yyyy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utc.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function daysBetween(dateStrA, dateStrB) {
  const [ya, ma, da] = dateStrA.split('-').map(Number);
  const [yb, mb, db] = dateStrB.split('-').map(Number);
  const a = Date.UTC(ya, ma - 1, da);
  const b = Date.UTC(yb, mb - 1, db);
  return Math.round((b - a) / 86400000);
}

function computeLahiriAyanamsaDegrees(dateUtc) {
  const JD = (dateUtc.getTime() / 86400000) + 2440587.5;
  const T = (JD - 2451545.0) / 36525.0;
  return 23.8529 + (50.2879 * T + 0.0222 * T * T) / 3600.0;
}

function getSunSiderealLongitudeAtNoonIST(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Noon IST ~ 06:30 UTC
  const dateUtc = new Date(Date.UTC(year, month - 1, day, 6, 30, 0));
  const sunEcl = Astronomy.Ecliptic(Astronomy.GeoVector('Sun', dateUtc, true));
  const ayanamsa = computeLahiriAyanamsaDegrees(dateUtc);
  return (sunEcl.elon - ayanamsa + 360) % 360;
}

function getTamilMonthIndex(dateStr) {
  const sunLong = getSunSiderealLongitudeAtNoonIST(dateStr);
  return Math.floor(sunLong / 30);
}

function findTamilMonthStart(dateStr) {
  const monthIndex = getTamilMonthIndex(dateStr);
  let cursor = dateStr;
  for (let i = 0; i < 40; i++) {
    const prev = addDaysToDateStr(cursor, -1);
    if (getTamilMonthIndex(prev) !== monthIndex) {
      return cursor;
    }
    cursor = prev;
  }
  return dateStr;
}

function findTamilYearStart(dateStr) {
  // Find the most recent day where Sun entered Mesha (index 0):
  // i.e., rasi == 0 and previous day rasi == 11.
  let cursor = dateStr;
  for (let i = 0; i < 420; i++) {
    const r = getTamilMonthIndex(cursor);
    if (r === 0) {
      const prev = addDaysToDateStr(cursor, -1);
      const prevR = getTamilMonthIndex(prev);
      if (prevR === 11) return cursor;
    }
    cursor = addDaysToDateStr(cursor, -1);
  }
  return null;
}

function getSamvatsaraNameForStartGregorianYear(startGregorianYear) {
  const base = 1987; // commonly referenced anchor for this 60-year cycle
  if (!Number.isInteger(startGregorianYear)) return null;
  const delta = startGregorianYear - base;
  const idx = ((delta % 60) + 60) % 60;
  // Only provide within a reasonable bounded range to avoid implying certainty for all eras.
  if (startGregorianYear < base || startGregorianYear > 2100) return null;
  return SAMVATSARA_60[idx] || null;
}

function deriveObservanceTags(panchang) {
  const tags = [];
  const tithiNum = panchang?.tithi?.number;
  const nakNum = panchang?.nakshatra?.number;

  if (tithiNum === 30) tags.push({ key: 'AMAVASAI', label: 'Amavasai' });
  if (tithiNum === 15) tags.push({ key: 'POURNAMI', label: 'Pournami' });
  if (tithiNum === 11 || tithiNum === 26) tags.push({ key: 'EKADASHI', label: 'Ekadashi' });
  if (tithiNum === 6 || tithiNum === 21) tags.push({ key: 'SASHTI', label: 'Sashti' });
  if (nakNum === 3) tags.push({ key: 'KIRUTHIGAI', label: 'Kiruthigai' });

  // Pradosham is classically Trayodashi around sunset; for MVP we tag by tithi number only.
  if (tithiNum === 13 || tithiNum === 28) {
    tags.push({ key: 'PRADOSHAM', label: 'Pradosham', method: 'tithiNumberOnly' });
  }

  return tags;
}

function buildDayPayload(dateStr, cityName) {
  const cityData = CITIES[cityName] || CITIES.Chennai;
  const panchang = calculateCompletePanchang(dateStr, cityData.tz);

  const tamilMonthIndex = getTamilMonthIndex(dateStr);
  const tamilMonth = TAMIL_MONTHS[tamilMonthIndex];
  const tamilMonthStart = findTamilMonthStart(dateStr);
  const tamilDayNumber = daysBetween(tamilMonthStart, dateStr) + 1;

  const yearStart = findTamilYearStart(dateStr);
  const yearStartGregorianYear = yearStart ? Number(yearStart.split('-')[0]) : null;
  const samvatsaraName = yearStartGregorianYear ? getSamvatsaraNameForStartGregorianYear(yearStartGregorianYear) : null;

  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 0, 0, 0)).getUTCDay();
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return {
    date: dateStr,
    weekday: weekdayNames[dow],
    gregorian: { year: y, month: m, day: d },
    tamil: {
      month: tamilMonth,
      day: tamilDayNumber,
      monthStartDate: tamilMonthStart,
      year: {
        startDate: yearStart,
        startGregorianYear: yearStartGregorianYear,
        name: samvatsaraName
      }
    },
    panchang,
    tags: deriveObservanceTags(panchang)
  };
}

function calculateTamilCalendarMonth(year, month, cityName = 'Chennai') {
  const cityData = CITIES[cityName] || CITIES.Chennai;
  const timezoneOffsetMinutes = getISTOffsetMinutes();

  const firstDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  // Day-of-week in IST/local (fixed offset for India)
  const firstLocalMidnightUtcMs = Date.UTC(year, month - 1, 1, 0, 0, 0) - timezoneOffsetMinutes * 60 * 1000;
  const firstDow = new Date(firstLocalMidnightUtcMs).getUTCDay();

  const weeks = [];
  let week = new Array(7).fill(null);
  let dayOfWeekCursor = firstDow;

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    week[dayOfWeekCursor] = buildDayPayload(dateStr, cityName);

    if (dayOfWeekCursor === 6) {
      weeks.push(week);
      week = new Array(7).fill(null);
      dayOfWeekCursor = 0;
    } else {
      dayOfWeekCursor++;
    }
  }

  if (week.some((x) => x !== null)) {
    weeks.push(week);
  }

  // Provide a month label using the tamil month of the 15th (often stable within a Gregorian month)
  const midDateStr = `${year}-${String(month).padStart(2, '0')}-${String(Math.min(15, lastDay)).padStart(2, '0')}`;
  const midMonthIndex = getTamilMonthIndex(midDateStr);
  const midMonth = TAMIL_MONTHS[midMonthIndex];

  return {
    year,
    month,
    city: cityName,
    location: {
      name: cityName,
      latitude: cityData.lat,
      longitude: cityData.lon,
      timezone: IST_TIMEZONE
    },
    timezone: IST_TIMEZONE,
    timezoneOffsetMinutes,
    monthLabel: {
      tamil: midMonth.tamil,
      english: midMonth.english,
      index: midMonth.index
    },
    weeks,
    notes: [
      'Tamil month/day derived from Sun sidereal longitude (Lahiri ayanamsa, noon-local approximation).',
      'Observance tags are rule-based heuristics derived from the computed panchang; they are not scraped and may differ from local almanacs.',
      'Pradosham tagging is based on tithi number only (Trayodashi), not sunset intersection (MVP).' 
    ],
    generatedAt: new Date().toISOString(),
    serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    serverOffsetMinutes: getServerOffsetMinutes(),
    serverTimeIST: formatIST(new Date())
  };
}

module.exports = {
  calculateTamilCalendarMonth
};
