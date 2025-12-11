/**
 * Test timezone handling as if running on Render (UTC server)
 * This simulates the production environment
 */

const service = require('./auspiciousTimesService');

// Override process.env.TZ to UTC to simulate Render environment
process.env.TZ = 'UTC';

console.log('\n🌍 Simulating Render environment (UTC timezone)...');
console.log('Server timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('Server local time:', new Date().toString());
console.log('IST time:', new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

const testCases = [
  { date: '2025-12-12', city: 'Chennai', expectedSunrise: '6:20 AM', expectedSunset: '5:43 PM' },
  { date: '2025-12-11', city: 'Chennai', expectedSunrise: '6:20 AM', expectedSunset: '5:43 PM' },
  { date: '2025-06-21', city: 'Chennai', expectedSunrise: '5:42 AM', expectedSunset: '6:30 PM' }
];

console.log('\n📅 Testing sunrise/sunset times (should display in IST):\n');

testCases.forEach(({ date, city, expectedSunrise, expectedSunset }) => {
  const result = service.calculateAuspiciousTimes(date, city);
  
  const sunriseMatch = result.sunrise === expectedSunrise ? '✅' : '❌';
  const sunsetMatch = result.sunset === expectedSunset ? '✅' : '❌';
  
  console.log(`${city} ${date}:`);
  console.log(`  Sunrise: ${result.sunrise} (expected: ${expectedSunrise}) ${sunriseMatch}`);
  console.log(`  Sunset: ${result.sunset} (expected: ${expectedSunset}) ${sunsetMatch}`);
  console.log(`  Rahu Kaal: ${result.rahuKaal.startTime} - ${result.rahuKaal.endTime}`);
  console.log(`  Yamaganda (Day): ${result.yamaganda.dayPeriod.startTime} - ${result.yamaganda.dayPeriod.endTime}`);
  console.log(`  Yamaganda (Night): ${result.yamaganda.nightPeriod.startTime} - ${result.yamaganda.nightPeriod.endTime}`);
  console.log('');
});

// Test a specific date with detailed output
console.log('🔍 Detailed test for Chennai 2025-12-12:\n');
const detailedResult = service.calculateAuspiciousTimes('2025-12-12', 'Chennai');
console.log('Sunrise:', detailedResult.sunrise);
console.log('Sunset:', detailedResult.sunset);
console.log('Rahu Kaal:', detailedResult.rahuKaal.startTime, '-', detailedResult.rahuKaal.endTime);
console.log('Yamaganda (Day):', detailedResult.yamaganda.dayPeriod.startTime, '-', detailedResult.yamaganda.dayPeriod.endTime);
console.log('Yamaganda (Night):', detailedResult.yamaganda.nightPeriod.startTime, '-', detailedResult.yamaganda.nightPeriod.endTime);
console.log('Duration (minutes):', detailedResult.rahuKaal.durationMinutes);
console.log('Source:', detailedResult.sunriseSource);

console.log('\n✅ All times should be in IST, regardless of server timezone!');
