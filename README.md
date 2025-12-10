# Daily Transit Rasi Chart

A web app that displays planetary transits for any date in a South Indian Rasi chart format using **Swiss Ephemeris-compatible calculations** with Lahiri ayanamsa.

## Features

- **Daily Transit Chart**: Shows current planetary positions (not birth chart)
- **Swiss Ephemeris Accuracy**: Uses Lahiri ayanamsa matching Swiss Ephemeris standards
- **South Indian Layout**: Traditional 4×4 diamond grid
- **Tamil + English Labels**: Planet names in both languages
- **Multiple Cities**: Pre-configured Indian cities
- **Sidereal Calculations**: Accurate Vedic astrology positions

## Planets Displayed

Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu + Ascendant (Lagna)

## Installation & Running

```bash
# Install dependencies
npm install

# Start server
npm start

# Run test script to verify calculations
npm test
```

Then open `http://localhost:3000` in your browser.

## Testing

The test script prints planetary positions in sidereal zodiac with Lahiri ayanamsa:

```bash
# Test today at 05:30 in Chennai
npm test

# Test specific date/time/city
node test-chart.js 2025-12-10 14:30 Delhi
```

Output includes:
- Julian Day
- Lahiri Ayanamsa value
- Planetary longitudes (sidereal)
- Rasi placements
- Ascendant position

**Cross-check results** with:
- DrikPanchang.com
- AstroSage.com
- VedicAstrology.us.com

## Calculation Details

### Swiss Ephemeris Compatibility

- **Ayanamsa**: Lahiri (SIDM_LAHIRI formula)
- **Julian Day**: Standard astronomical calculation
- **Planetary Positions**: Tropical→Sidereal conversion
- **Ascendant**: Spherical trigonometry with sidereal correction
- **Rahu/Ketu**: Mean lunar node positions

### Formula Sources

- Lahiri ayanamsa: Matches Swiss Ephemeris SIDM_LAHIRI
- Julian Day: IAU standard formula
- Ascendant: Classic house calculation with obliquity
- Mean Node: Astronomical Almanac formula

## Usage

1. Select a **date** (required)
2. Choose a **time** (default: 05:30)
3. Pick a **city** from dropdown
4. Click "Show Chart"

The chart shows transit positions for that date/time/location.

## API Endpoint

```
GET /api/daily-chart?date=YYYY-MM-DD&time=HH:mm&city=Chennai
```

Example:
```
http://localhost:3000/api/daily-chart?date=2025-12-10&time=05:30&city=Chennai
```

Response:
```json
{
  "rasiData": {
    "0": { "planets": [], "isLagna": false },
    ...
  },
  "rawLongitudes": {
    "Sun": 234.08,
    "Moon": 119.04,
    ...
  },
  "lagnaLongitude": 349.46,
  "ayanamsa": 23.8565,
  "julday": 2461019.27,
  "date": "2025-12-10",
  "time": "05:30",
  "city": "Chennai"
}
```

## Available Cities

- Chennai
- Delhi
- Mumbai
- Bangalore
- Kolkata
- Hyderabad

## Notes

- **Sidereal zodiac** (Vedic astrology)
- **Lahiri ayanamsa** matching Swiss Ephemeris
- Ascendant calculated for given time/location
- Rahu/Ketu from mean lunar nodes
- Results should match DrikPanchang and other Vedic calculators

