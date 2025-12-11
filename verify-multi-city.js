const service = require('./auspiciousTimesService.js');

console.log('═══════════════════════════════════════════════════════════════');
console.log('   MULTI-CITY RAHU KAAL VERIFICATION (Dec 5-11, 2025)');
console.log('   Reference: AstroCamp.com');
console.log('═══════════════════════════════════════════════════════════════\n');

// Reference data from AstroCamp.com for Dec 5-11, 2025
const testData = [
  // Friday, Dec 5
  {
    date: '2025-12-05',
    day: 'Friday',
    cities: {
      Chennai: '10:35 AM - 12:00 PM',
      Mumbai: '11:56 AM - 1:11 PM',
      Delhi: '11:21 AM - 12:35 PM',
      Kolkata: '11:29 AM - 12:43 PM'
    }
  },
  // Saturday, Dec 6
  {
    date: '2025-12-06',
    day: 'Saturday',
    cities: {
      Chennai: '9:10 AM - 10:35 AM',
      Mumbai: '10:41 AM - 11:56 AM',
      Delhi: '10:07 AM - 11:21 AM',
      Kolkata: '10:15 AM - 11:29 AM'
    }
  },
  // Sunday, Dec 7
  {
    date: '2025-12-07',
    day: 'Sunday',
    cities: {
      Chennai: '4:17 PM - 5:42 PM',
      Mumbai: '4:57 PM - 6:12 PM',
      Delhi: '4:18 PM - 5:32 PM',
      Kolkata: '4:26 PM - 5:40 PM'
    }
  },
  // Monday, Dec 8
  {
    date: '2025-12-08',
    day: 'Monday',
    cities: {
      Chennai: '7:46 AM - 9:11 AM',
      Mumbai: '9:28 AM - 10:43 AM',
      Delhi: '8:54 AM - 10:08 AM',
      Kolkata: '9:02 AM - 10:16 AM'
    }
  },
  // Tuesday, Dec 9
  {
    date: '2025-12-09',
    day: 'Tuesday',
    cities: {
      Chennai: '2:53 PM - 4:18 PM',
      Mumbai: '3:43 PM - 4:58 PM',
      Delhi: '3:06 PM - 4:20 PM',
      Kolkata: '3:13 PM - 4:27 PM'
    }
  },
  // Wednesday, Dec 10
  {
    date: '2025-12-10',
    day: 'Wednesday',
    cities: {
      Chennai: '12:03 PM - 1:28 PM',
      Mumbai: '1:14 PM - 2:29 PM',
      Delhi: '12:38 PM - 1:52 PM',
      Kolkata: '12:46 PM - 2:00 PM'
    }
  },
  // Thursday, Dec 11
  {
    date: '2025-12-11',
    day: 'Thursday',
    cities: {
      Chennai: '1:27 PM - 2:52 PM',
      Mumbai: '2:28 PM - 3:43 PM',
      Delhi: '1:51 PM - 3:05 PM',
      Kolkata: '1:59 PM - 3:13 PM'
    }
  }
];

function normalizeTime(str) {
  return str.replace(/\b0(\d)/g, '$1').replace(/\s+/g, ' ');
}

function parseTime12Hour(timeStr) {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  
  let [, hours, minutes, period] = match;
  hours = parseInt(hours);
  minutes = parseInt(minutes);
  
  if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
  if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
}

function getTimeDifference(time1, time2) {
  const mins1 = parseTime12Hour(time1);
  const mins2 = parseTime12Hour(time2);
  if (mins1 === null || mins2 === null) return null;
  return Math.abs(mins1 - mins2);
}

let totalTests = 0;
let passedTests = 0;

testData.forEach(({date, day, cities}) => {
  console.log(`\n${'═'.repeat(67)}`);
  console.log(`${day.toUpperCase()}, ${date}`);
  console.log(`${'═'.repeat(67)}`);
  
  Object.entries(cities).forEach(([city, expected]) => {
    try {
      const result = service.calculateAuspiciousTimes(date, city);
      const actual = `${result.rahuKaal.startTime} - ${result.rahuKaal.endTime}`;
      
      // Check if times match (allowing 5-minute tolerance)
      const expectedStart = expected.split(' - ')[0];
      const actualStart = actual.split(' - ')[0];
      const diff = getTimeDifference(expectedStart, actualStart);
      
      const match = diff !== null && diff <= 5;
      const status = match ? '✅ PASS' : '❌ FAIL';
      
      totalTests++;
      if (match) passedTests++;
      
      console.log(`${city.padEnd(10)} | ${actual.padEnd(23)} | ${expected.padEnd(23)} | ${status}`);
      
      if (!match && diff !== null) {
        console.log(`           ${' '.repeat(47)} (${diff} min difference)`);
      }
    } catch (error) {
      console.log(`${city.padEnd(10)} | ERROR: ${error.message}`);
      totalTests++;
    }
  });
});

console.log(`\n${'═'.repeat(67)}`);
console.log('SUMMARY');
console.log(`${'═'.repeat(67)}`);
console.log(`Total Tests:  ${totalTests}`);
console.log(`Passed:       ${passedTests} ✅`);
console.log(`Failed:       ${totalTests - passedTests} ❌`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log(`${'═'.repeat(67)}\n`);

if (passedTests === totalTests) {
  console.log('🎉 EXCELLENT! All Rahu Kaal calculations match AstroCamp.com reference!');
} else {
  console.log(`⚠️  ${totalTests - passedTests} tests failed. Review calculations for accuracy.`);
}
