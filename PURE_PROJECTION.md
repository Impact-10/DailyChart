# Pure Projection Pattern - UI Lock Documentation

## Principle

**The Flutter UI is a PURE PROJECTION of backend data.**

No filtering. No reformatting. No merging. No client-side logic.  
Backend changes → UI changes automatically, with zero code edits.

---

## Strict Rules

### ❌ FORBIDDEN Operations

1. **NO Filtering**
   ```dart
   // ❌ WRONG
   .where((window) => window['label'] == 'Good')
   
   // ✅ CORRECT
   // Render ALL items as-is
   ```

2. **NO Reformatting**
   ```dart
   // ❌ WRONG
   DateTime.parse(window['start']).format('hh:mm a')
   
   // ✅ CORRECT
   window['start']  // Use backend string exactly
   ```

3. **NO Merging**
   ```dart
   // ❌ WRONG
   if (slots[i].end == slots[i+1].start) merge()
   
   // ✅ CORRECT
   // Render each slot independently
   ```

4. **NO Reordering**
   ```dart
   // ❌ WRONG
   .sort((a, b) => a['start'].compareTo(b['start']))
   
   // ✅ CORRECT
   // Preserve backend array order
   ```

5. **NO Computation**
   ```dart
   // ❌ WRONG
   final duration = endTime.difference(startTime)
   
   // ✅ CORRECT
   window['duration']  // Use backend-computed value
   ```

6. **NO Fabrication**
   ```dart
   // ❌ WRONG
   if (windows.isEmpty) return [defaultWindow]
   
   // ✅ CORRECT
   if (windows.isEmpty) return ['No data']
   ```

### ✅ ALLOWED Operations

1. **Display Backend Strings Verbatim**
   ```dart
   Text('${window['start']} → ${window['end']} (${window['duration']})')
   ```

2. **Conditional Rendering Based on Data Presence**
   ```dart
   if (window['period'] != null)
     Text('Period: ${window['period']}')
   ```

3. **Empty State Handling**
   ```dart
   if (windows.isEmpty)
     return [const Text('No auspicious time today')]
   ```

4. **Minimal Styling Logic** (no data transformation)
   ```dart
   Color _getQualityColor(String quality) {
     switch (quality) {
       case 'Good': return Colors.green;
       case 'Average': return Colors.orange;
       case 'Bad': return Colors.red;
       default: return Colors.grey;
     }
   }
   ```

---

## Implementation

### Nalla Neram Card (PURE PROJECTION)

```dart
final windows = ((_data!['nallaNeram'] as Map?)?['nallaNeram'] as List?) ?? const [];

if (windows.isEmpty) {
  return [const Text('No auspicious time today')];
}

return windows.map((window) {
  return Column(
    children: [
      // Use backend strings exactly
      Text('${window['start']} → ${window['end']} (${window['duration']})'),
      
      // Display all provided fields
      if (window['period'] != null)
        Text('Period: ${window['period']}'),
      if (window['quality'] != null)
        Text('Quality: ${window['quality']}'),
      if (window['factor'] != null)
        Text('Source: ${window['factor']}'),
    ],
  );
}).toList();
```

### Gowri Card (NO FILTERING)

```dart
final windows = ((_data!['nallaNeram'] as Map?)?['gowriNallaNeram'] as List?) ?? const [];

if (windows.isEmpty) {
  return [const Text('No Gowri data')];
}

// RENDER ALL - NO .where() FILTER
return windows.map((window) {
  return Row(
    children: [
      Expanded(
        child: Text('${window['start']} → ${window['end']} (${window['duration']})'),
      ),
      if (window['period'] != null)
        Text('[${window['period']}]'),
      // Display quality badge exactly as backend sends
      if (window['quality'] != null)
        QualityBadge(window['quality']),
      else if (window['label'] != null)
        QualityBadge(window['label']),
    ],
  );
}).toList();
```

### Metadata Display (Verbatim)

```dart
if ((_data!['nallaNeram'] as Map?)?['calculationMethod'] != null ||
    (_data!['nallaNeram'] as Map?)?['notes'] != null)
  Card(
    child: Column(
      children: [
        // Display backend-provided metadata exactly
        if ((_data!['nallaNeram'] as Map?)?['calculationMethod'] != null)
          Text((_data!['nallaNeram'] as Map?)!['calculationMethod']),
        if ((_data!['nallaNeram'] as Map?)?['notes'] != null)
          Text((_data!['nallaNeram'] as Map?)!['notes']),
      ],
    ),
  ),
```

---

## Validation

### Count Verification

**API Response**: 2025-12-23 @ Chennai
```json
{
  "nallaNeram": 2,
  "gowriNallaNeram": 16
}
```

**UI Must Show**:
- Nalla Neram: Exactly **2 items** (both night slots)
- Gowri: Exactly **16 items** (4 Good + 12 Average)

### Testing Script

```bash
node scripts/validate_ui_projection.js http://localhost:3000 Chennai 2025-12-23
```

**Output**:
```
📊 EXPECTED UI COUNTS:
  Nalla Neram windows: 2
  Gowri windows (ALL): 16

🧪 TESTING CHECKLIST:
  [ ] Count Nalla Neram items: should be 2
  [ ] Count Gowri items: should be 16 (ALL qualities)
  [ ] Verify times match exactly
  [ ] Verify period/quality labels present
```

### Manual Testing

1. **Open Flutter app** for test date
2. **Count UI items** in each card
3. **Compare with API** using curl:
   ```bash
   curl -s "http://localhost:3000/api/panchang?date=2025-12-23&city=Chennai" | jq '.nallaNeram'
   ```
4. **Verify**:
   - UI count = API count ✅
   - Times match exactly ✅
   - No missing items ✅
   - No extra items ✅

---

## Benefits

### 1. **Zero Client-Side Logic**
- No bugs from filtering/merging/reformatting
- Backend controls ALL display semantics

### 2. **Automatic Updates**
- Backend changes quality labels → UI updates automatically
- Backend adds fields → UI shows automatically
- Backend changes format → UI reflects automatically

### 3. **Debugging Simplicity**
- UI bug? → Check API response
- API correct? → UI is correct (by definition)
- No "UI drift" from backend

### 4. **Maintainability**
- Backend team owns ALL logic
- Frontend team just projects data
- Clear separation of concerns

### 5. **Transparency**
- Users see EXACTLY what backend computed
- No hidden filtering
- No "friendly adjustments" that obscure truth

---

## Examples

### Scenario 1: Backend Adds New Quality

**Backend Change**: Add "Excellent" quality
```json
{
  "quality": "Excellent"
}
```

**UI Impact**: Automatically displays "Excellent" badge  
**Code Changes**: 0 (just add color to `_getQualityColor`)

### Scenario 2: Backend Changes Time Format

**Backend Change**: Switch to 24-hour format
```json
{
  "start": "17:48",
  "end": "19:23"
}
```

**UI Impact**: Automatically shows 24-hour format  
**Code Changes**: 0

### Scenario 3: Backend Adds New Field

**Backend Change**: Add slot index
```json
{
  "slotIndex": 1
}
```

**UI Impact**: Automatically displays if conditional rendering present  
**Code Changes**: Add `if (window['slotIndex'] != null)` block

---

## Anti-Patterns

### ❌ DO NOT: Client-Side "Smart" Filtering

```dart
// ❌ WRONG - UI decides what to show
.where((w) => w['quality'] == 'Good' && w['period'] == 'day')
```

**Why**: Backend already filtered. UI re-filtering = logic duplication.

### ❌ DO NOT: Time Reformatting

```dart
// ❌ WRONG - UI reformats backend times
final time = DateFormat('h:mm a').format(DateTime.parse(window['start']));
```

**Why**: Backend controls format. Client reformatting breaks consistency.

### ❌ DO NOT: Friendly Merging

```dart
// ❌ WRONG - UI merges adjacent slots
if (slots[i].end == slots[i+1].start) {
  return MergedSlot(slots[i], slots[i+1]);
}
```

**Why**: Backend sent 2 slots → UI must show 2 slots.

### ❌ DO NOT: Default Fallbacks

```dart
// ❌ WRONG - UI fabricates data
final duration = window['duration'] ?? 'Unknown';
```

**Why**: If backend didn't send duration, show nothing or error.

---

## Enforcement

### Code Review Checklist

- [ ] No `.where()` filters on backend arrays
- [ ] No `DateTime.parse()` + reformatting
- [ ] No slot merging logic
- [ ] No computed durations/times
- [ ] No default value fabrication
- [ ] Backend strings used verbatim
- [ ] Count validation script passes

### Automated Testing

```bash
# Run validation
npm run validate-ui-projection

# Expected output
✅ UI Nalla count = API count
✅ UI Gowri count = API count
✅ Times match exactly
✅ No filtering detected
```

---

## Summary

**Goal**: Flutter UI = Pure Projection of Backend Data

**Rule**: `UI[i] = API[i]` for all `i`

**Test**: `count(UI items) == count(API items)`

**Benefit**: Backend controls EVERYTHING, UI just renders.

**Result**: Zero drift, zero bugs, zero maintenance.

---

## Status

- ✅ Nalla Neram card: PURE PROJECTION
- ✅ Gowri card: NO FILTERING (shows all 16 slots)
- ✅ Metadata card: Verbatim display
- ✅ Empty states: Neutral messages
- ✅ Validation script: Available
- ✅ Documentation: Complete

**Last Updated**: December 2024  
**Pattern**: Pure Projection (no client-side logic)  
**Status**: LOCKED 🔒
