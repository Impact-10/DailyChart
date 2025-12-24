# Nalla Neram API Response Guide

## Quick Reference: Understanding the Transparency Fields

### Example API Call
```bash
GET /api/panchang?date=2025-12-23&city=Chennai
```

### Key Response Structure

```json
{
  "nallaNeram": {
    "calculationMethod": "Location-based Gowri 8-part division system",
    "day": "Tuesday, December 23, 2025",
    
    "nallaNeram": [
      {
        "type": "gowri",                    // Source: Gowri system
        "derivedFrom": "gowri",             // Derivation method
        "gowriSlotIndex": 1,                // Original Gowri slot (1-8)
        "period": "night",                  // "day" or "night"
        "start": "5:48 PM",                 // Window start
        "end": "7:23 PM",                   // Window end
        "duration": "1h 35m",               // Window length
        "quality": "Good",                  // Gowri quality
        "filtersApplied": [],               // Exclusion filters (if any)
        "factor": "Gowri night slot 1 (Good)" // Human description
      }
    ],
    
    "gowriNallaNeram": [
      // All 16 Gowri slots (8 day + 8 night)
      {
        "type": "gowri",
        "period": "day",
        "slotIndex": 1,
        "start": "6:27 AM",
        "end": "7:52 AM",
        "duration": "1h 25m",
        "quality": "Average",              // "Good", "Average", or "Bad"
        "label": "Average"                 // UI-compatible field
      }
    ],
    
    "calculationFactors": {
      "locationAware": true,
      "latitude": 13.0827,
      "longitude": 80.2707,
      "timezone": 5.5,
      "sunrise": "6:27 AM",
      "sunset": "5:48 PM",
      "sunriseSource": "astronomy-engine", // or "cache"
      "weekday": "Tuesday",
      "dayDuration": "11h 22m",
      "nightDuration": "12h 38m",
      "daySlotMinutes": 85,               // Day divided by 8
      "nightSlotMinutes": 95              // Night divided by 8
    },
    
    "notes": "Auspicious timings vary by Panchangam tradition. This uses standard Tamil Gowri system.",
    "source": "computed"
  }
}
```

---

## 🔍 Field Explanations

### nallaNeram Array (Filtered Auspicious Windows)

| Field | Type | Meaning |
|-------|------|---------|
| `type` | string | Always "gowri" - indicates Gowri system |
| `derivedFrom` | string | Always "gowri" - derivation method |
| `gowriSlotIndex` | number | Original Gowri slot number (1-8) |
| `period` | string | "day" or "night" |
| `start` | string | Window start time (12-hour format) |
| `end` | string | Window end time (12-hour format) |
| `duration` | string | Window length (e.g., "1h 35m") |
| `quality` | string | Gowri quality: "Good", "Average", "Bad" |
| `filtersApplied` | array | Exclusion reasons (e.g., `["rahuExcluded"]`) |
| `factor` | string | Human-readable description |

### gowriNallaNeram Array (All Gowri Slots)

Contains all 16 Gowri slots (8 day + 8 night) with quality labels.  
**Flutter UI filters this to show only "Good" quality slots.**

### calculationFactors Object

| Field | Type | Meaning |
|-------|------|---------|
| `locationAware` | boolean | Confirms location-based calculation |
| `latitude` | number | City latitude |
| `longitude` | number | City longitude |
| `timezone` | number | UTC offset (e.g., 5.5 for IST) |
| `sunrise` | string | Sunrise time for location and date |
| `sunset` | string | Sunset time for location and date |
| `sunriseSource` | string | "astronomy-engine" or "cache" |
| `weekday` | string | Day of week (affects Gowri quality) |
| `dayDuration` | string | Sunrise to Sunset duration |
| `nightDuration` | string | Sunset to Sunrise duration |
| `daySlotMinutes` | number | Each day slot duration (day/8) |
| `nightSlotMinutes` | number | Each night slot duration (night/8) |

---

## 📊 Understanding filtersApplied

When a Gowri Good slot overlaps with inauspicious periods, it's excluded from Nalla Neram.  
The `filtersApplied` array documents why:

```json
"filtersApplied": ["rahuExcluded"]        // Overlaps with Rahu Kaal
"filtersApplied": ["yamagandaExcluded"]   // Overlaps with Yamaganda
"filtersApplied": []                       // No exclusions, safe to use
```

**Note**: Slots with filters are already excluded from the `nallaNeram` array.  
You only see clean, auspicious windows.

---

## 🎯 Usage Examples

### Frontend: Display Nalla Neram
```javascript
const windows = response.nallaNeram.nallaNeram;
windows.forEach(window => {
  console.log(`${window.start} - ${window.end}`);
  console.log(`  Source: ${window.factor}`);
  console.log(`  Filters: ${window.filtersApplied.join(', ') || 'None'}`);
});
```

### Frontend: Display Gowri Good Slots Only
```javascript
const allGowri = response.nallaNeram.gowriNallaNeram;
const goodSlots = allGowri.filter(slot => slot.quality === 'Good');
goodSlots.forEach(slot => {
  console.log(`${slot.period} slot ${slot.slotIndex}: ${slot.start} - ${slot.end}`);
});
```

### Validation: Check Transparency
```javascript
const cf = response.nallaNeram.calculationFactors;
console.log(`Location: ${cf.latitude}, ${cf.longitude}`);
console.log(`Sunrise: ${cf.sunrise} (source: ${cf.sunriseSource})`);
console.log(`Day slot size: ${cf.daySlotMinutes} min`);
console.log(`Night slot size: ${cf.nightSlotMinutes} min`);
```

---

## ✅ Quality Assurance

### How to Verify a Slot:
1. **Check gowriSlotIndex**: Identifies original Gowri slot (1-8)
2. **Check period**: "day" or "night"
3. **Check quality**: Should always be "Good" in nallaNeram
4. **Check filtersApplied**: Should be empty (excluded slots filtered out)
5. **Check calculationFactors**: Verify sunrise/sunset for date

### How to Trace Calculation:
1. Look up `calculationFactors.weekday`
2. Find Gowri quality table for that weekday
3. Check `gowriSlotIndex` in `period` (day/night)
4. Verify it's marked "Good" in quality table
5. Confirm no overlap with Rahu/Yamaganda

---

## 🔧 Debugging Tips

### If Nalla Neram Count Seems Wrong:
1. Check `gowriNallaNeram` for all Good slots
2. Compare with `nallaNeram` to see which were excluded
3. Check Rahu Kaal and Yamaganda times in main response
4. Verify exclusions align with overlaps

### If Times Seem Off:
1. Check `calculationFactors.sunriseSource` (should be "astronomy-engine")
2. Verify `latitude`/`longitude` match expected city
3. Check `daySlotMinutes` = (sunset - sunrise) / 8
4. Check `nightSlotMinutes` = (24h - day duration) / 8

### If Quality Seems Wrong:
1. Verify `calculationFactors.weekday` matches date
2. Look up Gowri quality table for that weekday
3. Check `gowriSlotIndex` in correct period (day/night)
4. Confirm quality matches table

---

## ⚠️ Policy Note: Night Nalla Neram

This API includes **night auspicious times** (including post-midnight) per the Gowri system.

**Key Points**:
- Night slots from sunset → sunrise are divided into 8 equal parts
- Good-quality night slots are included in `nallaNeram` array
- Post-midnight times (e.g., 1:42 AM) belong to the previous civil day
- Each slot includes `"period": "night"` for easy filtering

**Variations in Tamil Calendars**:
- Some omit night slots entirely
- Some shift post-midnight to next day
- **Our approach**: Mathematical completeness with clear labeling

**To Filter Night Slots** (if desired):
```javascript
const dayOnly = response.nallaNeram.nallaNeram
  .filter(slot => slot.period === 'day');
```

**See**: [NIGHT_NALLA_POLICY.md](NIGHT_NALLA_POLICY.md) for detailed policy documentation.

---

## 📚 Additional Resources

- **Hardening Report**: `HARDENING_REPORT.md` - Complete system architecture
- **Verification Script**: `scripts/verify_gowri.js` - Mathematical validation
- **Transparency Validator**: `scripts/validate_transparency.js` - Field inspection

---

## 🎉 Summary

The Nalla Neram API provides:
- ✅ Astronomically accurate calculations
- ✅ Full transparency with traceability
- ✅ Location-aware precision
- ✅ Zero hardcoded values
- ✅ Defensible derivation tracking

Every field has a purpose. Every value is traceable. Every calculation is defendable.
