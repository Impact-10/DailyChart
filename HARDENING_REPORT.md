# Nalla Neram & Gowri Nalla Neram - System Hardening Report

## ✅ Executive Summary

The Nalla Neram and Gowri Nalla Neram calculation system has been completely hardened to ensure astronomical consistency, full transparency, and defensibility. **ZERO** hardcoded times or weekday assumptions remain.

---

## 📋 Requirements Checklist

| Requirement | Status | Implementation |
|------------|--------|----------------|
| ❌ No hardcoded times | ✅ COMPLETE | All times computed from sunrise/sunset |
| ❌ No weekday-only reuse | ✅ COMPLETE | Daily calculation with date-specific astronomy |
| ❌ No UI-driven approximations | ✅ COMPLETE | Backend computes all values |
| ✅ Astronomical consistency | ✅ COMPLETE | astronomy-engine for sunrise/sunset |
| ✅ Location-aware | ✅ COMPLETE | lat, lon, timezone for each city |
| ✅ Accurate sunrise/sunset | ✅ COMPLETE | astronomy-engine with source tracking |
| ✅ Gowri strict 8-part division | ✅ COMPLETE | Divides day/night into exactly 8 equal parts |
| ✅ Nalla Neram filtered from Gowri | ✅ COMPLETE | Good slots minus Rahu/Yamaganda overlaps |
| ✅ Full transparency | ✅ COMPLETE | Every value traceable to source |

---

## 🏗️ System Architecture

### 1. **Gowri Nalla Neram Calculation**
Located in: `auspiciousTimesService.js::calculateGowriNallaNeram()`

#### Input:
- `dateStr`: YYYY-MM-DD format
- `cityName`: City for lat/lon/timezone lookup

#### Process:
1. **Sunrise/Sunset**: astronomy-engine computes exact times for location and date
2. **8-Part Division**: 
   - Day: Sunrise → Sunset divided into 8 equal slots
   - Night: Sunset → Next Sunrise divided into 8 equal slots
3. **Quality Assignment**: Apply Tamil Panchangam Gowri quality table (weekday-based)
4. **Nalla Neram Derivation**: Filter Gowri Good slots, exclude Rahu Kaal and Yamaganda overlaps

#### Quality Table Structure:
```javascript
gowriQualityTable = {
  0: { day: { good: [1,8], average: [2,3,4,5,6,7], bad: [] }, night: {...} }, // Sunday
  1: { day: { good: [1,6], average: [2,3,4,5,7,8], bad: [] }, night: {...} }, // Monday
  ... // Tuesday-Saturday
}
```

#### Output Structure:
```javascript
{
  calculationMethod: "Location-based Gowri 8-part division system",
  meta: {
    locationAware: true,
    latitude: 13.0827,
    longitude: 80.2707,
    timezone: 5.5,
    sunrise: "6:27 AM",
    sunset: "5:48 PM",
    sunriseSource: "astronomy-engine",
    dayDuration: "11h 22m",
    nightDuration: "12h 38m",
    daySlotMinutes: 85,
    nightSlotMinutes: 95
  },
  gowriSlots: {
    day: [/* 8 slots with type, period, slotIndex, quality, start, end, duration */],
    night: [/* 8 slots */]
  },
  nallaNeramSlots: [
    {
      type: "gowri",
      derivedFrom: "gowri",
      gowriSlotIndex: 1,
      period: "night",
      start: "5:48 PM",
      end: "7:23 PM",
      duration: "1h 35m",
      quality: "Good",
      filtersApplied: [] // e.g., ["rahuExcluded", "yamagandaExcluded"]
    }
    // ... more slots
  ],
  notes: "Auspicious timings vary by Panchangam tradition. This uses standard Tamil Gowri system."
}
```

---

### 2. **API Endpoint**
Located in: `server.js::/api/panchang`

Returns:
```json
{
  "nallaNeram": {
    "calculationMethod": "Location-based Gowri 8-part division system",
    "day": "Tuesday, December 23, 2025",
    "nallaNeram": [/* Array with transparency fields */],
    "gowriNallaNeram": [/* All 16 slots (8 day + 8 night) */],
    "calculationFactors": {
      "locationAware": true,
      "latitude": 13.0827,
      "longitude": 80.2707,
      "timezone": 5.5,
      "sunrise": "6:27 AM",
      "sunset": "5:48 PM",
      "sunriseSource": "astronomy-engine",
      "weekday": "Tuesday",
      "dayDuration": "11h 22m",
      "nightDuration": "12h 38m",
      "daySlotMinutes": 85,
      "nightSlotMinutes": 95
    },
    "notes": "..."
  }
}
```

---

### 3. **Flutter Integration**
Located in: `mobile_app/lib/screens/panchang_screen.dart`

#### Nalla Neram Display:
- Shows filtered Good windows with factor annotations
- Null-safe list extraction: `((_data['nallaNeram'] as Map?)?['nallaNeram'] as List?) ?? []`

#### Gowri Display:
- Filters to show only Good quality windows:
  ```dart
  .where((window) => window['label'] == 'Good')
  ```
- Subtitle: "Alternative Auspicious Windows"

---

## 🔍 Transparency & Traceability

### Every Nalla Neram Slot Includes:
1. **type**: "gowri" - Indicates source calculation
2. **derivedFrom**: "gowri" - Derivation method
3. **gowriSlotIndex**: 1-8 - Original Gowri slot number
4. **period**: "day" or "night"
5. **quality**: "Good", "Average", or "Bad"
6. **filtersApplied**: Array of exclusion reasons (e.g., `["rahuExcluded"]`)
7. **start/end/duration**: Time window
8. **factor**: Human-readable description

### Calculation Factors Include:
- **locationAware**: Boolean confirmation
- **latitude/longitude/timezone**: Exact location
- **sunriseSource**: "astronomy-engine" or "cache"
- **daySlotMinutes/nightSlotMinutes**: Slot durations

---

## ✅ Validation & Verification

### Verification Script: `scripts/verify_gowri.js`
- Recomputes expected Gowri slots from sunrise/sunset
- Validates API response matches mathematical expectations
- Checks Yamaganda overlap exclusion
- ±2 minute tolerance for time comparisons

### Test Results (Chennai):
```
Date 2025-12-23 @ Chennai
Sunrise 6:27 AM | Sunset 5:48 PM
Slots(min) Day 85 Night 95
Nalla count API 2 vs expected 2
✅ All slots match expected Gowri logic.

Date 2025-12-30 @ Chennai
Sunrise 6:30 AM | Sunset 5:52 PM
Slots(min) Day 85 Night 95
Nalla count API 2 vs expected 2
✅ All slots match expected Gowri logic.

Date 2026-01-05 @ Chennai
Sunrise 6:32 AM | Sunset 5:55 PM
Slots(min) Day 85 Night 95
Nalla count API 4 vs expected 4
✅ All slots match expected Gowri logic.
```

### Transparency Validator: `scripts/validate_transparency.js`
Shows complete calculation transparency:
- Location metadata (lat, lon, timezone)
- Astronomical data (sunrise, sunset, durations, slot sizes)
- Calculation method
- Gowri slots by quality
- Nalla Neram with derivation tracking
- Defensibility statement

---

## 📊 Example Transparency Report

```
================================================================================
TRANSPARENCY REPORT: 2025-12-23 @ Chennai
================================================================================

📍 LOCATION METADATA:
  Latitude: 13.0827
  Longitude: 80.2707
  Timezone: UTC+5.5
  Location Aware: true

☀️ ASTRONOMICAL DATA:
  Sunrise: 6:27 AM (source: astronomy-engine)
  Sunset: 5:48 PM
  Day Duration: 11h 22m (85 min/slot)
  Night Duration: 12h 38m (95 min/slot)

🔢 CALCULATION METHOD:
  Location-based Gowri 8-part division system
  Weekday: Tuesday

✨ GOWRI SLOTS (8-part division):
  Good: 4 slots [day/2, day/7, night/1, night/6]
  Average: 12 slots
  Bad: 0 slots

🌙 NALLA NERAM (Filtered Gowri Good):
  Total: 2 auspicious windows
  • 5:48 PM → 7:23 PM (1h 35m)
    ↳ Derived from Gowri night slot 1
  • 1:42 AM → 3:17 AM (1h 35m)
    ↳ Derived from Gowri night slot 6

📋 DEFENSIBILITY:
  • All times computed from sunrise/sunset for Chennai
  • Gowri slots are strict 8-part divisions
  • Nalla Neram = Gowri Good slots - [Rahu Kaal, Yamaganda]
  • Zero hardcoded times or weekday assumptions
```

---

## 🎯 Key Achievements

1. **Zero Hardcoding**: All times derived from astronomical calculations
2. **Daily Computation**: Each date uses its specific sunrise/sunset
3. **Location Precision**: astronomy-engine provides accurate times for lat/lon
4. **Full Traceability**: Every slot traceable to source Gowri slot with filters
5. **Mathematical Validation**: Verification script confirms correctness
6. **UI Filtering**: Shows only relevant Good-quality windows
7. **Transparency**: Complete metadata for audit and debugging

---

## 🔧 Maintenance Notes

### Night Nalla Neram Policy
⚠️ **IMPORTANT**: This system shows night auspicious times (including post-midnight) per Gowri system.
- Some Tamil calendars omit night slots or shift post-midnight to next day
- Our approach is mathematically complete and clearly labeled
- See [NIGHT_NALLA_POLICY.md](NIGHT_NALLA_POLICY.md) for full policy documentation
- Optional: Add toggle in settings to hide night slots if users prefer traditional view

### To Add New Cities:
1. Add to `CITIES` object in `auspiciousTimesService.js` with lat/lon/tz
2. Server automatically uses astronomy-engine for calculations

### To Modify Gowri Quality Table:
1. Edit `gowriQualityTable` in `calculateGowriNallaNeram()`
2. Maintain structure: `weekday: { day: { good: [...], average: [...], bad: [...] }, night: {...} }`

### To Add New Exclusion Filters:
1. Compute exclusion window (like Rahu Kaal)
2. Add to `filtersApplied` array when applicable
3. Set `excluded: true` to filter out

---

## 📚 References

- **Astronomy Engine**: Used for precise sunrise/sunset calculations
- **Tamil Panchangam Tradition**: Gowri quality table follows standard Tamil system
- **Rahu Kaal**: Traditional inauspicious period (1 slot per weekday)
- **Yamaganda**: Computed using ghatikas system for daily exclusions

---

## ✅ System Status: HARDENED

All requirements met. System is production-ready with full transparency and defensibility.

**Last Updated**: December 2024  
**Validation**: All test dates pass verification  
**Transparency**: Complete traceability for all values
