const { getSunriseSunset } = require('./auspiciousTimesService');

// Test data from timeanddate.com and other reliable sources
const testCases = [
  // Chennai tests
  {
    city: 'Chennai',
    date: '2025-12-11',
    lat: 13.0827,
    lon: 80.2707,
    tz: 5.5,
    expected: {
      sunrise: '6:20 AM',
      sunset: '5:43 PM',
      source: 'timeanddate.com'
    }
  },
  {
    city: 'Chennai',
    date: '2025-06-21', // Summer solstice
    lat: 13.0827,
    lon: 80.2707,
    tz: 5.5,
    expected: {
      sunrise: '5:42 AM',
      sunset: '6:30 PM',
      source: 'timeanddate.com'
    }
  },
  {
    city: 'Chennai',
    date: '2025-12-21', // Winter solstice
    lat: 13.0827,
    lon: 80.2707,
    tz: 5.5,
    expected: {
      sunrise: '6:28 AM',
      sunset: '5:47 PM',
      source: 'timeanddate.com'
    }
  },
  // Mumbai tests
  {
    city: 'Mumbai',
    date: '2025-12-11',
    lat: 19.0760,
    lon: 72.8777,
    tz: 5.5,
    expected: {
      sunrise: '7:01 AM',
      sunset: '6:01 PM',
      source: 'timeanddate.com'
    }
  },
  {
    city: 'Mumbai',
    date: '2025-06-21',
    lat: 19.0760,
    lon: 72.8777,
    tz: 5.5,
    expected: {
      sunrise: '6:01 AM',
      sunset: '7:18 PM',
      source: 'timeanddate.com'
    }
  },
  // Delhi tests
  {
    city: 'Delhi',
    date: '2025-12-11',
    lat: 28.6139,
    lon: 77.2090,
    tz: 5.5,
    expected: {
      sunrise: '7:06 AM',
      sunset: '5:28 PM',
      source: 'timeanddate.com'
    }
  },
  {
    city: 'Delhi',
    date: '2025-06-21',
    lat: 28.6139,
    lon: 77.2090,
    tz: 5.5,
    expected: {
      sunrise: '5:24 AM',
      sunset: '7:22 PM',
      source: 'timeanddate.com'
    }
  },
  // Bangalore tests
  {
    city: 'Bangalore',
    date: '2025-12-11',
    lat: 12.9716,
    lon: 77.5946,
    tz: 5.5,
    expected: {
      sunrise: '6:28 AM',
      sunset: '5:52 PM',
      source: 'timeanddate.com'
    }
  },
  // Kolkata tests
  {
    city: 'Kolkata',
    date: '2025-12-11',
    lat: 22.5726,
    lon: 88.3639,
    tz: 5.5,
    expected: {
      sunrise: '6:12 AM',
      sunset: '4:56 PM',
      source: 'timeanddate.com'
    }
  }
];

function parseTime(timeStr) {
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes;
  if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
  if (period === 'AM' && hours === 12) totalMinutes -= 12 * 60;
  return totalMinutes;
}

function getTimeDifference(time1, time2) {
  const diff = Math.abs(parseTime(time1) - parseTime(time2));
  return diff;
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('        SUNRISE/SUNSET ACCURACY TEST');
console.log('═══════════════════════════════════════════════════════════════\n');

let passCount = 0;
let failCount = 0;
const tolerance = 3; // 3 minutes tolerance

testCases.forEach((test, index) => {
  console.log(`\n${index + 1}. ${test.city} - ${test.date}`);
  console.log('─'.repeat(60));
  
  try {
    const result = getSunriseSunset(test.date, test.lat, test.lon, test.tz, test.city);
    
    const sunriseDiff = getTimeDifference(result.sunrise, test.expected.sunrise);
    const sunsetDiff = getTimeDifference(result.sunset, test.expected.sunset);
    
    const sunrisePass = sunriseDiff <= tolerance;
    const sunsetPass = sunsetDiff <= tolerance;
    
    console.log(`   Expected Sunrise: ${test.expected.sunrise}`);
    console.log(`   Calculated:       ${result.sunrise}   ${sunrisePass ? '✅' : '❌'} (${sunriseDiff} min diff)`);
    
    console.log(`   Expected Sunset:  ${test.expected.sunset}`);
    console.log(`   Calculated:       ${result.sunset}   ${sunsetPass ? '✅' : '❌'} (${sunsetDiff} min diff)`);
    
    if (sunrisePass && sunsetPass) {
      console.log(`   Status: ✅ PASS`);
      passCount++;
    } else {
      console.log(`   Status: ❌ FAIL`);
      failCount++;
    }
    
    console.log(`   Source: ${test.expected.source}`);
    
  } catch (error) {
    console.log(`   Status: ❌ ERROR - ${error.message}`);
    failCount++;
  }
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`                    TEST SUMMARY`);
console.log('═══════════════════════════════════════════════════════════════');
console.log(`   Total Tests:  ${testCases.length}`);
console.log(`   Passed:       ${passCount} ✅`);
console.log(`   Failed:       ${failCount} ❌`);
console.log(`   Accuracy:     ${((passCount / testCases.length) * 100).toFixed(1)}%`);
console.log(`   Tolerance:    ±${tolerance} minutes`);
console.log('═══════════════════════════════════════════════════════════════\n');

if (passCount === testCases.length) {
  console.log('🎉 ALL TESTS PASSED! Sunrise/sunset calculations are accurate!\n');
} else {
  console.log('⚠️  Some tests failed. Check calculations or expected values.\n');
}
