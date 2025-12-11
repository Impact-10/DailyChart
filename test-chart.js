#!/usr/bin/env node

/**
 * Test script to verify Swiss Ephemeris calculations
 * Compare output with online Panchanga (e.g., DrikPanchang.com)
 */

const { calculateDailyChart, CITIES } = require('./astroService');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

// Rasi names in Tamil
const RASI_NAMES = [
  'மேஷம் (Aries)',
  'ரிஷபம் (Taurus)',
  'மிதுனம் (Gemini)',
  'கடகம் (Cancer)',
  'சிம்ஹம் (Leo)',
  'கன்னியம் (Virgo)',
  'துலாம் (Libra)',
  'விருச்சிகம் (Scorpio)',
  'தனுசு (Sagittarius)',
  'மகரம் (Capricorn)',
  'கும்பம் (Aquarius)',
  'மீனம் (Pisces)'
];

function formatDegrees(longitude) {
  const rasi = Math.floor(longitude / 30);
  const degrees = Math.floor(longitude % 30);
  const minutes = Math.floor(((longitude % 30) - degrees) * 60);
  const seconds = Math.floor((((longitude % 30) - degrees) * 60 - minutes) * 60);
  
  return `${rasi + 1}:${String(degrees).padStart(2, '0')}°${String(minutes).padStart(2, '0')}'${String(seconds).padStart(2, '0')}"`;
}

function printHeader(text) {
  console.log(`\n${colors.bright}${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${text}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${'='.repeat(70)}${colors.reset}\n`);
}

function printSection(text) {
  console.log(`\n${colors.bright}${colors.cyan}${text}${colors.reset}`);
  console.log(`${colors.cyan}${'-'.repeat(70)}${colors.reset}`);
}

function testChart(date, time, city) {
  printHeader(`Daily Transit Chart Test`);
  
  console.log(`${colors.bright}Date:${colors.reset} ${date}`);
  console.log(`${colors.bright}Time:${colors.reset} ${time} (local time)`);
  console.log(`${colors.bright}City:${colors.reset} ${city}`);
  console.log(`${colors.bright}Coordinates:${colors.reset} ${CITIES[city].lat}°N, ${CITIES[city].lon}°E`);
  console.log(`${colors.bright}Timezone:${colors.reset} UTC+${CITIES[city].tz}`);
  
  try {
    const chart = calculateDailyChart(date, time, city);
    
    printSection('Calculation Details');
    console.log(`Julian Day: ${chart.julday.toFixed(6)}`);
    console.log(`Lahiri Ayanamsa: ${chart.ayanamsa.toFixed(4)}°`);
    
    printSection('Planetary Positions (Sidereal)');
    console.log(`${'Planet'.padEnd(20)} ${'Longitude'.padEnd(18)} ${'Rasi'.padEnd(25)} ${'Position'}`);
    console.log('-'.repeat(90));
    
    const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
    
    for (const planet of planets) {
      const longitude = chart.rawLongitudes[planet];
      const rasiIndex = Math.floor(longitude / 30);
      const formatted = formatDegrees(longitude);
      
      console.log(
        `${planet.padEnd(20)} ${longitude.toFixed(4).padEnd(18)} ${RASI_NAMES[rasiIndex].padEnd(25)} ${formatted}`
      );
    }
    
    printSection('Ascendant (Lagna)');
    const lagnaRasi = Math.floor(chart.lagnaLongitude / 30);
    const lagnaFormatted = formatDegrees(chart.lagnaLongitude);
    console.log(`Longitude: ${chart.lagnaLongitude.toFixed(4)}°`);
    console.log(`Rasi: ${RASI_NAMES[lagnaRasi]}`);
    console.log(`Position: ${lagnaFormatted}`);
    
    printSection('Rasi Chart Summary');
    console.log('');
    
    for (let i = 0; i < 12; i++) {
      const rasi = chart.rasiData[i];
      if (rasi.planets.length > 0 || rasi.isLagna) {
        let line = `${colors.green}${RASI_NAMES[i]} (${i + 1}):${colors.reset} `;
        
        if (rasi.isLagna) {
          line += `${colors.yellow}[LAGNA]${colors.reset} `;
        }
        
        if (rasi.planets.length > 0) {
          line += rasi.planets.join(', ');
        }
        
        console.log(line);
      }
    }
    
    console.log('\n');
    console.log(`${colors.bright}${colors.green}✓ Chart calculated successfully!${colors.reset}`);
    console.log(`\n${colors.bright}Cross-check these values with:${colors.reset}`);
    console.log(`  • https://www.drikpanchang.com/`);
    console.log(`  • https://www.vedicastrology.us.com/planetarypositions`);
    console.log(`  • https://www.astrosage.com/`);
    console.log('');
    
  } catch (error) {
    console.error(`\n${colors.bright}Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Default test case: Today at 05:30 in Chennai
const args = process.argv.slice(2);
const date = args[0] || new Date().toISOString().split('T')[0];
const time = args[1] || '05:30';
const city = args[2] || 'Chennai';

testChart(date, time, city);

console.log(`${colors.bright}Usage:${colors.reset} node test-chart.js [DATE] [TIME] [CITY]`);
console.log(`${colors.bright}Example:${colors.reset} node test-chart.js 2025-12-10 14:30 Delhi\n`);
