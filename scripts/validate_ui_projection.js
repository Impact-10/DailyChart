#!/usr/bin/env node

/**
 * UI/API Count Validation Script
 * 
 * Ensures Flutter UI displays exactly what backend sends with no filtering/merging/omission.
 * 
 * Usage: node scripts/validate_ui_projection.js http://localhost:3000 Chennai 2025-12-23
 */

async function validateProjection(baseUrl, city, date) {
  const url = `${baseUrl}/api/panchang?date=${date}&city=${encodeURIComponent(city)}`;
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`UI PROJECTION VALIDATION: ${date} @ ${city}`);
  console.log('='.repeat(80));
  
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API fetch failed: ${res.status}`);
  
  const data = await res.json();
  const nn = data.nallaNeram;
  
  // Count checks
  const nallaCount = (nn.nallaNeram || []).length;
  const gowriCount = (nn.gowriNallaNeram || []).length;
  
  console.log('\n📊 EXPECTED UI COUNTS:');
  console.log(`  Nalla Neram windows: ${nallaCount}`);
  console.log(`  Gowri windows (ALL): ${gowriCount}`);
  
  // Detailed breakdown
  console.log('\n🌙 NALLA NERAM (UI must show ALL):');
  if (nallaCount === 0) {
    console.log('  → UI should show: "No auspicious time today"');
  } else {
    (nn.nallaNeram || []).forEach((w, i) => {
      console.log(`  [${i + 1}] ${w.start} → ${w.end} (${w.duration})`);
      console.log(`      Period: ${w.period || 'N/A'}, Quality: ${w.quality || 'N/A'}`);
      console.log(`      Factor: ${w.factor || 'N/A'}`);
    });
  }
  
  console.log('\n✨ GOWRI (UI must show ALL - NO FILTERING):');
  if (gowriCount === 0) {
    console.log('  → UI should show: "No Gowri data"');
  } else {
    const byQuality = { Good: [], Average: [], Bad: [], Other: [] };
    (nn.gowriNallaNeram || []).forEach((w) => {
      const q = w.quality || w.label || 'Other';
      if (!byQuality[q]) byQuality[q] = [];
      byQuality[q].push(w);
    });
    
    console.log(`  Good: ${byQuality.Good.length} slots`);
    console.log(`  Average: ${byQuality.Average.length} slots`);
    console.log(`  Bad: ${byQuality.Bad.length} slots`);
    console.log(`  Other: ${byQuality.Other.length} slots`);
    console.log(`  TOTAL: ${gowriCount} slots (UI must render ALL)`);
    
    console.log('\n  Full list (as UI should render):');
    (nn.gowriNallaNeram || []).forEach((w, i) => {
      const q = w.quality || w.label || '?';
      const p = w.period || '?';
      console.log(`  [${i + 1}] ${w.start} → ${w.end} [${p}] [${q}]`);
    });
  }
  
  // Metadata check
  console.log('\n📋 METADATA (UI should display verbatim):');
  console.log(`  Calculation Method: ${nn.calculationMethod || 'N/A'}`);
  console.log(`  Notes: ${nn.notes || 'N/A'}`);
  
  // Validation rules
  console.log('\n✅ UI VALIDATION RULES:');
  console.log('  ❌ NO filtering (e.g., .where(quality == "Good"))');
  console.log('  ❌ NO reformatting times (use backend strings exactly)');
  console.log('  ❌ NO merging slots');
  console.log('  ❌ NO reordering');
  console.log('  ❌ NO hiding night slots');
  console.log('  ✅ RENDER array[i] → UI item[i] (1:1 mapping)');
  console.log(`  ✅ UI Nalla count MUST = ${nallaCount}`);
  console.log(`  ✅ UI Gowri count MUST = ${gowriCount}`);
  
  console.log('\n🧪 TESTING CHECKLIST:');
  console.log(`  [ ] Open Flutter app for ${date}`);
  console.log(`  [ ] Count Nalla Neram items: should be ${nallaCount}`);
  console.log(`  [ ] Count Gowri items: should be ${gowriCount} (ALL qualities)`);
  console.log('  [ ] Verify times match exactly (no reformatting)');
  console.log('  [ ] Verify period/quality labels present');
  console.log('  [ ] Check metadata card shows calculationMethod & notes');
  
  console.log('\n' + '='.repeat(80));
}

async function main() {
  const [baseUrl, city, ...dates] = process.argv.slice(2);
  if (!baseUrl || !city || dates.length === 0) {
    console.log('Usage: node scripts/validate_ui_projection.js <baseUrl> <city> <date1> [date2 ...]');
    console.log('Example: node scripts/validate_ui_projection.js http://localhost:3000 Chennai 2025-12-23');
    process.exit(1);
  }
  
  for (const date of dates) {
    try {
      await validateProjection(baseUrl, city, date);
    } catch (e) {
      console.error(`Error validating ${date}:`, e.message);
    }
  }
}

main();
