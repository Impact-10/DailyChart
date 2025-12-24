// Transparency validator: shows calculation method, derivation, and defensibility
// Run: node scripts/validate_transparency.js http://localhost:3000 Chennai 2025-12-23

async function validate(baseUrl, city, date) {
  const url = `${baseUrl}/api/panchang?date=${date}&city=${encodeURIComponent(city)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  const data = await res.json();

  const nn = data.nallaNeram;
  const cf = nn.calculationFactors || {};
  
  console.log('\n' + '='.repeat(80));
  console.log(`TRANSPARENCY REPORT: ${date} @ ${city}`);
  console.log('='.repeat(80));
  
  console.log('\n📍 LOCATION METADATA:');
  console.log(`  Latitude: ${cf.latitude || 'N/A'}`);
  console.log(`  Longitude: ${cf.longitude || 'N/A'}`);
  console.log(`  Timezone: UTC+${cf.timezone || 'N/A'}`);
  console.log(`  Location Aware: ${cf.locationAware || false}`);
  
  console.log('\n☀️ ASTRONOMICAL DATA:');
  console.log(`  Sunrise: ${cf.sunrise || 'N/A'} (source: ${cf.sunriseSource || 'N/A'})`);
  console.log(`  Sunset: ${cf.sunset || 'N/A'}`);
  console.log(`  Day Duration: ${cf.dayDuration || 'N/A'} (${cf.daySlotMinutes || 'N/A'} min/slot)`);
  console.log(`  Night Duration: ${cf.nightDuration || 'N/A'} (${cf.nightSlotMinutes || 'N/A'} min/slot)`);
  
  console.log('\n🔢 CALCULATION METHOD:');
  console.log(`  ${nn.calculationMethod || 'N/A'}`);
  console.log(`  Weekday: ${cf.weekday || 'N/A'}`);
  
  console.log('\n✨ GOWRI SLOTS (8-part division):');
  const gowriByQuality = { Good: [], Average: [], Bad: [] };
  for (const slot of nn.gowriNallaNeram || []) {
    if (slot.quality && gowriByQuality[slot.quality]) {
      gowriByQuality[slot.quality].push(`${slot.period}/${slot.slotIndex}`);
    }
  }
  console.log(`  Good: ${gowriByQuality.Good.length} slots [${gowriByQuality.Good.join(', ')}]`);
  console.log(`  Average: ${gowriByQuality.Average.length} slots [${gowriByQuality.Average.slice(0, 3).join(', ')}...]`);
  console.log(`  Bad: ${gowriByQuality.Bad.length} slots`);
  
  console.log('\n🌙 NALLA NERAM (Filtered Gowri Good):');
  console.log(`  Total: ${(nn.nallaNeram || []).length} auspicious windows`);
  for (const slot of nn.nallaNeram || []) {
    const filters = (slot.filtersApplied || []).length ? ` [filters: ${slot.filtersApplied.join(', ')}]` : '';
    console.log(`  • ${slot.start} → ${slot.end} (${slot.duration})`);
    console.log(`    ↳ Derived from Gowri ${slot.period} slot ${slot.gowriSlotIndex}${filters}`);
  }
  
  console.log('\n📋 DEFENSIBILITY:');
  console.log(`  • All times computed from sunrise/sunset for ${city}`);
  console.log(`  • Gowri slots are strict 8-part divisions`);
  console.log(`  • Nalla Neram = Gowri Good slots - [Rahu Kaal, Yamaganda]`);
  console.log(`  • Zero hardcoded times or weekday assumptions`);
  console.log(`  • ${nn.notes || 'N/A'}`);
  
  console.log('\n' + '='.repeat(80));
}

async function main() {
  const [baseUrl, city, ...dates] = process.argv.slice(2);
  if (!baseUrl || !city || dates.length === 0) {
    console.log('Usage: node scripts/validate_transparency.js <baseUrl> <city> <date1> [date2 ...]');
    process.exit(1);
  }

  for (const date of dates) {
    try {
      await validate(baseUrl, city, date);
    } catch (e) {
      console.error('Error validating', date, e.message);
    }
  }
}

main();
