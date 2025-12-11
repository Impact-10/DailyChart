const svc = require('./auspiciousTimesService.js');

const r = svc.calculateAuspiciousTimes('2025-12-12', 'Chennai');

console.log('Chennai 2025-12-12 (Friday):');
console.log('Sunrise:', r.sunrise, '| Sunset:', r.sunset);
console.log('Rahu Kaal:', r.rahuKaal.startTime, '-', r.rahuKaal.endTime);
console.log('Yamaganda Day:', r.yamaganda.dayPeriod.startTime, '-', r.yamaganda.dayPeriod.endTime);
console.log('Yamaganda Night:', r.yamaganda.nightPeriod.startTime, '-', r.yamaganda.nightPeriod.endTime);
console.log('Source:', r.sunriseSource);
