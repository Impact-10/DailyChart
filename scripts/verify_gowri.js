// Verification script: compares our Panchang API Gowri/NallaNeram against sunrise/sunset-based calculations
// Run: node scripts/verify_gowri.js http://localhost:3000 Chennai 2025-12-23 2025-12-30 2026-01-05

// Using Node 18+ global fetch; no import needed

function fmt(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = Math.round(mins % 60);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

function parseTime(timeStr) {
  const parts = timeStr.trim().split(/\s+/);
  const [h, m] = parts[0].split(':').map(Number);
  const period = parts[1];
  let hours = h;
  if (period === 'PM' && h !== 12) hours += 12;
  if (period === 'AM' && h === 12) hours = 0;
  return hours * 60 + m; // minutes from midnight
}

const gowriGood = {
  0: { day: [1, 8], night: [4, 7] }, // Sunday
  1: { day: [1, 6], night: [2, 7] }, // Monday
  2: { day: [2, 7], night: [1, 6] }, // Tuesday
  3: { day: [3, 8], night: [4] },    // Wednesday
  4: { day: [4, 5], night: [3, 8] }, // Thursday
  5: { day: [6, 7], night: [1] },    // Friday
  6: { day: [5],    night: [2, 6] }  // Saturday
};

const rahuSlotsMap = { 0: 8, 1: 2, 2: 7, 3: 5, 4: 6, 5: 4, 6: 3 };

async function verify(baseUrl, city, date) {
  const url = `${baseUrl}/api/panchang?date=${date}&city=${encodeURIComponent(city)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  const data = await res.json();

  const sunrise = data.sunrise;
  const sunset = data.sunset;
  const weekday = new Date(date).getDay();

  const sunriseMin = parseTime(sunrise);
  const sunsetMin = parseTime(sunset);
  const dayDurationMin = sunsetMin - sunriseMin;
  const nightDurationMin = (24 * 60) - dayDurationMin;
  const daySlotMin = dayDurationMin / 8;
  const nightSlotMin = nightDurationMin / 8;

  // Build expected day slots
  const expectedDaySlots = [];
  for (let i = 1; i <= 8; i++) {
    const start = sunriseMin + (i - 1) * daySlotMin;
    const end = sunriseMin + i * daySlotMin;
    const label = gowriGood[weekday].day.includes(i) ? 'Good' : 'Average';
    expectedDaySlots.push({ index: i, start: fmt(start), end: fmt(end), label });
  }

  // Build expected night slots
  const nightStart = sunsetMin;
  const expectedNightSlots = [];
  for (let i = 1; i <= 8; i++) {
    const start = nightStart + (i - 1) * nightSlotMin;
    const end = nightStart + i * nightSlotMin;
    const label = gowriGood[weekday].night.includes(i) ? 'Good' : 'Average';
    expectedNightSlots.push({ index: i, start: fmt(start), end: fmt(end), label });
  }

  const rahuIndex = rahuSlotsMap[weekday];
  // Filter expected good day slots excluding Rahu and Yamaganda overlaps
  const yg = data.yamaganda?.dayPeriod;
  const ygStartMin = yg ? parseTime(yg.startTime) : null;
  const ygEndMin = yg ? parseTime(yg.endTime) : null;

  function overlaps(startMinA, endMinA, startMinB, endMinB) {
    return startMinA < endMinB && endMinA > startMinB;
  }

  const expectedGoodDay = expectedDaySlots.filter(s => {
    const idxOk = s.index !== rahuIndex;
    const labelOk = s.label === 'Good';
    if (!idxOk || !labelOk) return false;
    if (ygStartMin != null && ygEndMin != null) {
      const sMin = parseTime(s.start);
      const eMin = parseTime(s.end);
      if (overlaps(sMin, eMin, ygStartMin, ygEndMin)) return false;
    }
    return true;
  });
  const expectedGoodNight = expectedNightSlots.filter(s => s.label === 'Good');
  const expectedGood = [...expectedGoodDay, ...expectedGoodNight];

  const apiGowri = (data.nallaNeram?.gowriNallaNeram ?? []);
  const apiNalla = (data.nallaNeram?.nallaNeram ?? []);

  function approxEqualTime(a, b, tolMin = 2) {
    return Math.abs(parseTime(a) - parseTime(b)) <= tolMin;
  }

  function findSlotMatch(slots, slot) {
    return slots.find(s => approxEqualTime(s.start, slot.start) && approxEqualTime(s.end, slot.end));
  }

  const mismatches = [];
  for (const slot of expectedDaySlots.concat(expectedNightSlots)) {
    const match = findSlotMatch(apiGowri, slot);
    if (!match) mismatches.push({ type: 'gowri-slot-missing', slot });
  }

  for (const g of expectedGood) {
    const match = findSlotMatch(apiNalla, g);
    if (!match) mismatches.push({ type: 'nalla-missing', slot: g });
  }

  return {
    date,
    city,
    sunrise,
    sunset,
    daySlotMin: Math.round(daySlotMin),
    nightSlotMin: Math.round(nightSlotMin),
    expectedGoodCount: expectedGood.length,
    apiNallaCount: apiNalla.length,
    mismatches,
  };
}

async function main() {
  const [baseUrl, city, ...dates] = process.argv.slice(2);
  if (!baseUrl || !city || dates.length === 0) {
    console.log('Usage: node scripts/verify_gowri.js <baseUrl> <city> <date1> [date2 date3 ...]');
    process.exit(1);
  }

  for (const date of dates) {
    try {
      const result = await verify(baseUrl, city, date);
      console.log(`\nDate ${date} @ ${city}`);
      console.log(`Sunrise ${result.sunrise} | Sunset ${result.sunset}`);
      console.log(`Slots(min) Day ${result.daySlotMin} Night ${result.nightSlotMin}`);
      console.log(`Nalla count API ${result.apiNallaCount} vs expected ${result.expectedGoodCount}`);
      if (result.mismatches.length) {
        console.log('Mismatches:');
        for (const m of result.mismatches) console.log(m);
      } else {
        console.log('All slots match expected Gowri logic.');
      }
    } catch (e) {
      console.error('Error verifying', date, e.message);
    }
  }
}

main();
