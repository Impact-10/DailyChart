# Daily Transit Rasi Chart

A beautiful, responsive web app that displays planetary transits for any date in a South Indian Rasi chart format using **Swiss Ephemeris-compatible calculations** with Lahiri ayanamsa.

## Features

- **Daily Transit Chart**: Shows current planetary positions (not birth chart)
- **Swiss Ephemeris Accuracy**: Uses Lahiri ayanamsa matching Swiss Ephemeris standards
- **South Indian Layout**: Traditional 4×4 diamond grid, clockwise arrangement
- **Warm Panchang Aesthetic**: Traditional Hindu/Tamil design inspired by DrikPanchang
- **Responsive Design**: Works beautifully on desktop (1400px), tablet (600px), and mobile (320px)
- **Theme Toggle**: Switch between Warm (default) and Cool color themes
- **Tamil + English Labels**: Planet names in both languages
- **Multiple Cities**: Pre-configured Indian cities
- **Sidereal Calculations**: Accurate Vedic astrology positions
- **Professional Animations**: Smooth page transitions and micro-interactions

## Planets Displayed

Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu + Ascendant (Lagna)

## Installation & Running

```bash
# Install dependencies
npm install

# Start server (runs on port 3000 by default)
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
- VedicAstrology.us

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
4. Click "Calculate"

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
    "1": { "planets": ["Saturn"], "isLagna": false },
    ...
  },
  "rawLongitudes": {
    "Sun": 234.08,
    "Moon": 119.04,
    "Mars": 45.32,
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

## Design & Responsiveness

### Color Themes

**Warm Theme (Default)**
- Background: Warm tan (#F5E6D3)
- Cards: Off-white cream (#FEFAF5)
- Accent: Burnt orange/gold (#B8860B)
- Text: Dark brown (#3E2723)
- Traditional Panchang aesthetic

**Cool Theme**
- Background: Soft lavender-gray (#E8E6F0)
- Cards: Very light blue (#F7F6FC)
- Accent: Muted slate (#4A5568)
- Text: Dark navy (#1A202C)
- Modern alternative look

### Responsive Breakpoints

- **Desktop (1200px+)**: Full-size chart, optimal spacing
- **Tablet (768px-991px)**: 2-column form, scaled chart
- **Small Phone (480px-599px)**: Single-column form, mobile-optimized chart
- **Tiny Phone (under 480px)**: Compact layout, all content readable

## Technical Stack

- **Backend**: Node.js + Express
- **Astronomy**: astronomy-engine (VSOP87 ephemeris)
- **Ayanamsa**: Lahiri formula (Swiss Ephemeris compatible)
- **Frontend**: Vanilla HTML5 + CSS3 + Vanilla JavaScript
- **Font**: Poppins (Google Fonts) with system-ui fallback
- **Animations**: CSS-based (no external animation library)

## Notes

- **Sidereal zodiac** (Vedic astrology standard)
- **Lahiri ayanamsa** matching Swiss Ephemeris exactly
- Ascendant calculated for given time/location
- Rahu/Ketu from mean lunar nodes
- Results verified against DrikPanchang and other Vedic calculators
- All planet names shown in Tamil + English (format: Tamil (abbr) English)
- No external animation frameworks—pure CSS animations

## Project Structure

```
Daily Chart/
├── server.js              # Express server
├── astroService.js        # Calculation engine
├── test-chart.js          # Testing script
├── package.json           # Dependencies
├── public/
│   ├── index.html         # Main page
│   ├── styles.css         # All styling (Poppins font, responsive)
│   └── script.js          # Client-side logic (theme toggle, chart rendering)
├── .gitignore
└── README.md
```

## Environment Variables

Optional: Set custom port
```bash
PORT=3001 npm start
```

## License

MIT
