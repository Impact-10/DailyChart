/**
 * Debug timezone handling
 */

process.env.TZ = 'UTC';

const service = require('./auspiciousTimesService');

console.log('Testing toLocalDate function...');
const testDate = '2025-12-12';
const testCity = 'Chennai';
const timezone = 5.5;

// Test the helper directly (we can't access it directly, so let's test through the service)
console.log('\n🧪 Testing with Chennai 2025-12-12:');
try {
  const result = service.calculateAuspiciousTimes(testDate, testCity);
  console.log('✅ Success!');
  console.log('Sunrise:', result.sunrise);
  console.log('Sunset:', result.sunset);
  console.log('Source:', result.sunriseSource);
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
