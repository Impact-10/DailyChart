// South Indian Chart House to Grid Position Mapping
// Based on standard South Indian layout: 12 at top-left, 1 at top-center-left, clockwise
const HOUSE_TO_GRID = {
    12: [0, 0],  // Top-left
    1:  [0, 1],  // Top-center-left
    2:  [0, 2],  // Top-center-right
    3:  [0, 3],  // Top-right
    11: [1, 0],  // Middle-left
    // [1,1], [1,2] = center merged cells
    4:  [1, 3],  // Middle-right
    10: [2, 0],  // Below middle-left
    // [2,1], [2,2] = center merged cells
    5:  [2, 3],  // Below middle-right
    9:  [3, 0],  // Bottom-left
    8:  [3, 1],  // Bottom-center-left
    7:  [3, 2],  // Bottom-center-right
    6:  [3, 3]   // Bottom-right
};

// Rasi index to House number mapping (for reference/validation)
// Rasi 0 = House 1 (Mesha), Rasi 1 = House 2 (Rishabha), etc.
const RASI_TO_HOUSE = {
    0: 1,   // Mesha -> House 1
    1: 2,   // Rishabha -> House 2
    2: 3,   // Mithuna -> House 3
    3: 4,   // Kataka -> House 4
    4: 5,   // Simha -> House 5
    5: 6,   // Kanya -> House 6
    6: 7,   // Tula -> House 7
    7: 8,   // Vrischika -> House 8
    8: 9,   // Dhanus -> House 9
    9: 10,  // Makara -> House 10
    10: 11, // Kumbha -> House 11
    11: 12  // Meena -> House 12
};

const RASI_NAMES = [
    'மேஷம்', 'ரிஷபம்', 'மிதுனம்', 'கடகம்',
    'சிம்ஹம்', 'கன்னியம்', 'துலாம்', 'விருச்சிகம்',
    'தனுசு', 'மகரம்', 'கும்பம்', 'மீனம்'
];

// Get API base URL - works for both localhost and deployed versions
function getAPIBaseURL() {
    // Optional override (useful when the website is hosted separately from the API)
    // 1) Query param: ?api=https://your-api.example.com
    // 2) LocalStorage: localStorage.setItem('apiBaseUrl', 'https://your-api.example.com')
    try {
        const params = new URLSearchParams(window.location.search);
        const qp = params.get('api') || params.get('apiBaseUrl');
        if (qp && /^https?:\/\//i.test(qp)) return qp.replace(/\/$/, '');
        const ls = window.localStorage ? window.localStorage.getItem('apiBaseUrl') : null;
        if (ls && /^https?:\/\//i.test(ls)) return ls.replace(/\/$/, '');
    } catch (_) {}

    // If running on localhost, use localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return `http://localhost:${window.location.port || 3000}`;
    }
    // If deployed on production, use same origin
    return window.location.origin;
}

const API_BASE_URL = getAPIBaseURL();

// Fetch helper with retries/backoff (helps with flaky networks and slow API wake-ups)
async function fetchJsonWithRetry(url, options = {}, attempts = 3, backoffMs = 300) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
        try {
            const res = await fetch(url, options);
            if (!res.ok) {
                let msg = `HTTP ${res.status}`;
                try {
                    const j = await res.json();
                    if (j && j.error) msg = j.error;
                } catch (_) {}
                throw new Error(msg);
            }
            return await res.json();
        } catch (err) {
            lastErr = err;
            if (i < attempts - 1) {
                await new Promise((r) => setTimeout(r, backoffMs * (i + 1)));
            }
        }
    }
    throw lastErr;
}

/**
 * Get current time in IST
 */
function getCurrentTimeIST() {
    const now = new Date();
    const istTime = now.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata'
    });
    return istTime;
}

function parseISTTimeToDate(timeStr, dateStr, offsetMinutes = 330) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const trimmed = timeStr.trim();
    const hasMeridian = /AM|PM/i.test(trimmed);
    let hours = 0;
    let minutes = 0;

    if (hasMeridian) {
        const [hm, meridianRaw] = trimmed.split(/\s+/);
        const [hStr, mStr] = hm.split(':');
        hours = parseInt(hStr, 10);
        minutes = parseInt(mStr, 10);
        const meridian = meridianRaw.toUpperCase();
        if (meridian === 'PM' && hours !== 12) hours += 12;
        if (meridian === 'AM' && hours === 12) hours = 0;
    } else {
        const [hStr, mStr] = trimmed.split(':');
        hours = parseInt(hStr, 10);
        minutes = parseInt(mStr, 10);
    }

    // Create a UTC date adjusted from IST offset so comparisons use absolute time
    return new Date(Date.UTC(year, month - 1, day, hours, minutes) - offsetMinutes * 60 * 1000);
}

function isISTToday(dateStr, offsetMinutes = 330) {
    const now = new Date();
    const istNow = new Date(now.getTime() + (offsetMinutes - now.getTimezoneOffset()) * 60 * 1000);
    const istDateStr = istNow.toISOString().split('T')[0];
    return istDateStr === dateStr;
}

function formatRelativeDuration(diffMs) {
    const totalSeconds = Math.max(0, Math.floor(Math.abs(diffMs) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

/**
 * Update live clock display every second
 */
function updateLiveClock() {
    const liveTimeEl = document.getElementById('liveTime');
    if (liveTimeEl) {
        liveTimeEl.textContent = getCurrentTimeIST();
    }
}

/**
 * Update calculation time display
 */
function updateCalcTime() {
    const timeInput = document.getElementById('time');
    const calcTimeEl = document.getElementById('calcTime');
    if (timeInput && calcTimeEl && timeInput.value) {
        const [hours, minutes] = timeInput.value.split(':');
        console.log(`⏰ Updated Calculate Time: ${hours}:${minutes}:00`);
        calcTimeEl.textContent = `${hours}:${minutes}:00`;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme toggle
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'warm';
    
    if (savedTheme === 'cool') {
        document.body.classList.add('theme-cool');
        themeToggle.value = 'cool';
    }
    
    themeToggle.addEventListener('change', (e) => {
        const theme = e.target.value;
        localStorage.setItem('theme', theme);
        
        if (theme === 'cool') {
            document.body.classList.add('theme-cool');
        } else {
            document.body.classList.remove('theme-cool');
        }
    });
    
    // Set current date (IST timezone)
    const now = new Date();
    const istDate = now.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata'
    }).split(',')[0];
    const [month, day, year] = istDate.split('/');
    const dateStr = `${year}-${month}-${day}`;
    document.getElementById('date').value = dateStr;
    
    // Set current time in IST (without seconds)
    const istTime = now.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata'
    });
    document.getElementById('time').value = istTime;
    
    // Start live clock update
    updateLiveClock();
    updateCalcTime();
    setInterval(updateLiveClock, 1000);
    
    // Update calc time when time input changes
    document.getElementById('time')?.addEventListener('change', updateCalcTime);
    
    // Auto-load chart on page load
    loadChart();
    
    // Load chart on button click
    document.getElementById('showChart').addEventListener('click', loadChart);
    
    // Load chart on Enter key
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.target.classList.contains('btn-primary')) {
            loadChart();
        }
    });
    
    // Add focus animations to inputs
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.style.transform = 'translateY(-1px)';
        });
        input.addEventListener('blur', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // Show empty state on load
    document.getElementById('emptyState').style.display = 'flex';
});

async function loadChart() {
    const dateInput = document.getElementById('date');
    const timeInput = document.getElementById('time');
    const cityInput = document.getElementById('city');
    
    const date = dateInput.value;
    const time = timeInput.value;
    const city = cityInput.value;
    
    if (!date || !time) {
        showError('Please select date and time');
        return;
    }
    
    // Update calculate time display IMMEDIATELY
    updateCalcTime();
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`%c📊 LOADING CHART & PANCHANG FOR: ${date} @ ${time} IST`, 'color: #d4a574; font-weight: bold; font-size: 13px');
    console.log(`%c   City: ${city}`, 'color: #333; font-size: 12px');
    console.log(`${'═'.repeat(70)}\n`);
    
    // Hide previous results and show loading
    const emptyState = document.getElementById('emptyState');
    const chartContainer = document.getElementById('chartContainer');
    const chartInfo = document.getElementById('chartInfo');
    const errorDiv = document.getElementById('error');
    const loadingDiv = document.getElementById('loading');
    const button = document.getElementById('showChart');
    
    emptyState.style.display = 'none';
    chartContainer.style.display = 'none';
    chartInfo.style.display = 'none';
    errorDiv.style.display = 'none';
    
    // Show loading state with animation
    loadingDiv.style.display = 'flex';
    loadingDiv.style.flexDirection = 'column';
    loadingDiv.style.alignItems = 'center';
    loadingDiv.style.gap = '1rem';
    
    // Disable button and add loading state
    button.disabled = true;
    button.classList.add('loading');
    button.textContent = 'Calculating...';
    
    try {
        const url = `${API_BASE_URL}/api/daily-chart?date=${date}&time=${time}&city=${city}`;
        const data = await fetchJsonWithRetry(url);
        
        // Hide loading, show results with animation
        loadingDiv.style.display = 'none';
        
        // DEBUG: Log received data
        console.log('[FRONTEND-DEBUG] Received rasiData:', data.rasiData);
        console.log('[FRONTEND-DEBUG] Lagna Longitude:', data.lagnaLongitude);
        
        // Show chart info with animation
        document.getElementById('chartDate').textContent = 
            `Transit positions for ${date} at ${time} in ${city}`;
        chartInfo.style.display = 'block';
        
        // Render chart
        renderChart(data.rasiData);
        
        // Show chart with animation (will trigger via CSS animation)
        chartContainer.style.display = 'block';
        
        // Load auspicious times
        await loadAuspiciousTimes(date, city);
        
    } catch (error) {
        loadingDiv.style.display = 'none';
        showError(error.message);
    } finally {
        // Re-enable button
        button.disabled = false;
        button.classList.remove('loading');
        button.textContent = 'Calculate';
    }
}

function renderChart(rasiData) {
    const chartContainer = document.getElementById('rasiChart');
    chartContainer.innerHTML = '';
    
    console.log('[FRONTEND-DEBUG] Starting renderChart with rasiData keys:', Object.keys(rasiData));
    
    // Create 4x4 grid using house positions
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            // Skip center cells (already merged)
            if ((row === 1 || row === 2) && (col === 1 || col === 2)) {
                if (row === 1 && col === 1) {
                    // Create center cell once
                    const centerCell = document.createElement('div');
                    centerCell.className = 'chart-cell center';
                    centerCell.innerHTML = 'ராசி<br>RASI';
                    centerCell.setAttribute('data-tooltip', 'House Center');
                    chartContainer.appendChild(centerCell);
                }
                continue;
            }
            
            // Find which house belongs to this grid position
            let houseNum = null;
            for (const [house, gridPos] of Object.entries(HOUSE_TO_GRID)) {
                if (gridPos[0] === row && gridPos[1] === col) {
                    houseNum = parseInt(house);
                    break;
                }
            }
            
            if (houseNum !== null) {
                console.log(`[FRONTEND-DEBUG] Processing grid[${row},${col}] - House ${houseNum}`);
                
                // Convert house number to rasi index (House 1-12 -> Rasi 0-11)
                const rasiIndex = houseNum === 1 ? 0 : (houseNum - 1);
                
                const cell = document.createElement('div');
                cell.className = 'chart-cell';
                
                // House number display
                const houseNumDisplay = document.createElement('div');
                houseNumDisplay.className = 'house-number';
                houseNumDisplay.textContent = houseNum;
                cell.appendChild(houseNumDisplay);
                
                const rasiInfo = rasiData[rasiIndex];
                
                // DEBUG: Log rasi data
                if (rasiInfo.isLagna) {
                    console.log(`[FRONTEND-DEBUG] Lagna found at House ${houseNum}, Rasi Index ${rasiIndex}`, rasiInfo);
                }
                console.log(`[FRONTEND-DEBUG]   House ${houseNum} -> RasiIndex ${rasiIndex}:`, rasiInfo);
                
                // Lagna marker
                if (rasiInfo.isLagna) {
                    const lagnaMarker = document.createElement('div');
                    lagnaMarker.className = 'lagna-marker';
                    lagnaMarker.textContent = 'లక్ Asc';
                    cell.appendChild(lagnaMarker);
                    console.log(`[FRONTEND-DEBUG] Added Lagna marker to House ${houseNum}`);
                }
                
                // Planets
                const planetList = document.createElement('div');
                planetList.className = 'planet-list';
                
                let tooltipText = RASI_NAMES[rasiIndex];
                if (rasiInfo.planets && rasiInfo.planets.length > 0) {
                    rasiInfo.planets.forEach(planet => {
                        const planetItem = document.createElement('div');
                        planetItem.className = 'planet-item';
                        planetItem.textContent = planet;
                        planetList.appendChild(planetItem);
                    });
                    tooltipText = rasiInfo.planets[0] + ' in ' + RASI_NAMES[rasiIndex];
                }
                
                cell.appendChild(planetList);
                cell.setAttribute('data-tooltip', tooltipText);
                
                // Add hover event listener for interactive feedback
                cell.addEventListener('mouseenter', function() {
                    this.style.zIndex = '10';
                });
                cell.addEventListener('mouseleave', function() {
                    this.style.zIndex = '1';
                });
                
                chartContainer.appendChild(cell);
            }
        }
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem;">
            <span>⚠️</span>
            <span>${message}</span>
            <button onclick="location.reload()" style="margin-left: auto; padding: 0.5rem 1rem; background: #991b1b; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Retry</button>
        </div>
    `;
    errorDiv.style.display = 'block';
}
// =====================================================
// Auspicious Times Functions
// =====================================================

let currentAuspiciousDate = null;
let liveCountdownTimer = null;

async function loadAuspiciousTimes(dateStr, cityName) {
    try {
        // Use new panchang endpoint that includes both auspicious times and panchang data
        const data = await fetchJsonWithRetry(`${API_BASE_URL}/api/panchang?date=${dateStr}&city=${cityName}`);
        
        // ========== COMPREHENSIVE DEBUGGING ==========
        console.clear();
        console.log('%c═══════════════════════════════════════════════════════════', 'color: #d4a574; font-weight: bold');
        console.log('%c         COMPLETE PANCHANG DATA DEBUG           ', 'color: #d4a574; font-weight: bold; font-size: 14px');
        console.log('%c═══════════════════════════════════════════════════════════', 'color: #d4a574; font-weight: bold');
        
        // Metadata
        console.group('%c📅 METADATA', 'color: #333; font-weight: bold; font-size: 12px');
        console.log('Date:', data.date);
        console.log('City:', data.city);
        console.log('Timezone:', data.timezone);
        console.log('Sunrise:', data.sunrise);
        console.log('Sunset:', data.sunset);
        console.log('Ayanamsa:', data.ayanamsa);
        console.groupEnd();
        
        // TITHI
        console.group('%c🌙 TITHI (Lunar Day)', 'color: #d4a574; font-weight: bold; font-size: 12px; background: #f5f1e8; padding: 4px');
        console.log('Number:', `${data.tithi.number}/30`);
        console.log('Name (Tamil):', data.tithi.name);
        console.log('Paksha:', data.tithi.paksha);
        console.log('Progress:', `${data.tithi.progress}%`);
        console.log('Minutes Remaining:', data.tithi.minutesRemaining, 'mins');
        console.log('Is Special:', data.tithi.isSpecial);
        if (data.tithi.isSpecial) console.log('Special Note:', data.tithi.specialNote);
        console.groupEnd();
        
        // NAKSHATRA
        console.group('%c⭐ NAKSHATRA (Lunar Mansion)', 'color: #4a90a4; font-weight: bold; font-size: 12px; background: #e8f4f8; padding: 4px');
        console.log('Number:', `${data.nakshatra.number}/27`);
        console.log('Name (Tamil):', data.nakshatra.name);
        console.log('Lord:', data.nakshatra.lord);
        console.log('Deity:', data.nakshatra.deity);
        console.log('Progress:', `${data.nakshatra.progress}%`);
        console.log('Minutes Until Change:', data.nakshatra.minutesUntilChange, 'mins');
        console.log('Next Nakshatra:', data.nakshatra.nextNakshatra);
        console.groupEnd();
        
        // YOGA
        console.group('%c🔗 YOGA (Sun-Moon Combination)', 'color: #e88d3a; font-weight: bold; font-size: 12px; background: #fef4e8; padding: 4px');
        console.log('Number:', `${data.yoga.number}/27`);
        console.log('Name (Tamil):', data.yoga.name);
        console.log('Nature:', data.yoga.nature);
        console.log('Progress:', `${data.yoga.progress}%`);
        console.groupEnd();
        
        // KARANA
        console.group('%c⏱️  KARANA (Half-Tithi)', 'color: #8b6ba8; font-weight: bold; font-size: 12px; background: #f0e8f8; padding: 4px');
        console.log('Number:', `${data.karana.number}/60`);
        console.log('Name (Tamil):', data.karana.name);
        console.log('Nature:', data.karana.nature);
        console.log('Progress:', `${data.karana.progress}%`);
        console.groupEnd();
        
        // NALLA NERAM
        console.group('%c✓ NALLA NERAM (Auspicious Times)', 'color: #4caf50; font-weight: bold; font-size: 12px; background: #e8f5e9; padding: 4px');
        console.log('Day:', data.nallaNeram.day);
        console.log('Windows:', data.nallaNeram.windows);
        data.nallaNeram.windows.forEach((w, i) => {
            console.log(`  Window ${i+1}:`, w.start, '-', w.end, `(${w.duration})`);
        });
        console.groupEnd();
        
        // RAHU KAAL
        console.group('%c🔴 RAHU KAAL (Inauspicious)', 'color: #d32f2f; font-weight: bold; font-size: 12px; background: #ffebee; padding: 4px');
        console.log('Time:', data.rahuKaal.startTime, '-', data.rahuKaal.endTime);
        console.log('Duration:', data.rahuKaal.duration);
        console.log('Day:', data.rahuKaal.day);
        console.groupEnd();
        
        // YAMAGANDA
        console.group('%c⚡ YAMAGANDA (Inauspicious)', 'color: #ff9800; font-weight: bold; font-size: 12px; background: #fff3e0; padding: 4px');
        console.log('Day Period:', data.yamaganda.dayPeriod.startTime, '-', data.yamaganda.dayPeriod.endTime);
        console.log('Night Period:', data.yamaganda.nightPeriod.startTime, '-', data.yamaganda.nightPeriod.endTime);
        console.log('Ghatikas:', data.yamaganda.ghatikas.length);
        console.groupEnd();
        
        console.log('%c═══════════════════════════════════════════════════════════', 'color: #d4a574; font-weight: bold');
        console.log('%c✅ ALL VALUES LOGGED - Check above for details', 'color: #4caf50; font-weight: bold; font-size: 12px');
        console.log('%c═══════════════════════════════════════════════════════════', 'color: #d4a574; font-weight: bold');
        
        currentAuspiciousDate = dateStr;
        
        // Update UI
        renderAuspiciousTimes(data);
        renderPanchang(data);

        // Load Tamil Calendar for the month
        await loadTamilCalendar(dateStr, cityName);
        
        // Show the auspicious times section
        document.getElementById('auspiciousTimesContainer').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading auspicious times and panchang:', error);
    }
}

// =====================================================
// Tamil Calendar Functions
// =====================================================

let currentTamilCalendar = null;

function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

async function loadTamilCalendar(dateStr, cityName) {
    try {
        const [yStr, mStr] = dateStr.split('-');
        const year = Number(yStr);
        const month = Number(mStr);
        currentTamilCalendar = await fetchJsonWithRetry(`${API_BASE_URL}/api/tamil-calendar?year=${year}&month=${month}&city=${cityName}`);
        renderTamilCalendar(currentTamilCalendar);
    } catch (err) {
        console.error('Error loading tamil calendar:', err);
        const container = document.getElementById('tamilCalendarContainer');
        if (container) container.style.display = 'none';
    }
}

function renderTamilCalendar(payload) {
    const container = document.getElementById('tamilCalendarContainer');
    const grid = document.getElementById('tamilCalendarGrid');
    const label = document.getElementById('tamilCalendarMonthLabel');
    const meta = document.getElementById('tamilCalendarMeta');

    if (!container || !grid || !label || !meta) return;
    if (!payload || !Array.isArray(payload.weeks)) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';

    const monthLabel = payload?.monthLabel ? `${payload.monthLabel.tamil} (${payload.monthLabel.english})` : '--';
    label.textContent = monthLabel;
    meta.textContent = `${payload.city} • ${payload.timezone}`;

    grid.innerHTML = '';

    // Weekday header
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach((w) => {
        const el = document.createElement('div');
        el.className = 'tamil-calendar-weekday';
        el.textContent = w;
        grid.appendChild(el);
    });

    // Render weeks exactly as backend returns (including null placeholders)
    payload.weeks.forEach((week) => {
        (week || []).forEach((day) => {
            if (!day) {
                const empty = document.createElement('div');
                empty.className = 'tamil-calendar-cell tamil-calendar-cell--empty';
                grid.appendChild(empty);
                return;
            }

            const cell = document.createElement('div');
            cell.className = 'tamil-calendar-cell';

            const gregDay = day?.gregorian?.day ?? '--';
            const tamilDay = day?.tamil?.day ?? '--';

            const dayRow = document.createElement('div');
            dayRow.className = 'tamil-calendar-dayrow';
            dayRow.innerHTML = `
                <span class="tamil-calendar-gregday">${escapeHtml(gregDay)}</span>
                <span class="tamil-calendar-tamilday">${escapeHtml(tamilDay)}</span>
            `;
            cell.appendChild(dayRow);

            const tagsEl = document.createElement('div');
            tagsEl.className = 'tamil-calendar-tags';
            const tags = Array.isArray(day.tags) ? day.tags : [];
            tags.forEach((t) => {
                const tag = document.createElement('span');
                tag.className = 'tamil-calendar-tag';
                tag.textContent = t?.label ?? t?.key ?? '';
                tagsEl.appendChild(tag);
            });
            cell.appendChild(tagsEl);

            cell.addEventListener('click', () => showTamilCalendarDayDetails(day));
            grid.appendChild(cell);
        });
    });
}

function showTamilCalendarDayDetails(day) {
    const detailsCard = document.getElementById('tamilCalendarDayDetails');
    const title = document.getElementById('tamilCalendarDayTitle');
    const subtitle = document.getElementById('tamilCalendarDaySubtitle');
    const body = document.getElementById('tamilCalendarDayBody');
    if (!detailsCard || !title || !subtitle || !body) return;

    const date = day?.date ?? '--';
    const weekday = day?.weekday ?? '--';
    const tm = day?.tamil?.month;
    const tamilMonth = tm ? `${tm.tamil} (${tm.english})` : '--';
    const tamilDay = day?.tamil?.day ?? '--';

    title.textContent = `${date} • ${weekday}`;
    subtitle.textContent = `${tamilMonth} • நாள் ${tamilDay}`;

    // Keep this as a direct projection of backend payload for transparency.
    body.innerHTML = `
        <div>
            <strong>Tags:</strong> ${(Array.isArray(day.tags) && day.tags.length) ? day.tags.map(t => escapeHtml(t.label || t.key)).join(', ') : '--'}
        </div>
        <pre>${escapeHtml(JSON.stringify(day, null, 2))}</pre>
    `;

    detailsCard.style.display = 'block';
}

function renderAuspiciousTimes(data) {
    // Update sunrise/sunset
    document.getElementById('sunriseTime').textContent = data.sunrise;
    document.getElementById('sunsetTime').textContent = data.sunset;
    
    // Update Rahu Kaal
    const dayNamesInTamil = {
      'Sunday': 'ஞாயிற்றுக்கிழமை',
      'Monday': 'திங்கட்கிழமை',
      'Tuesday': 'செவ்வாய்கிழமை',
      'Wednesday': 'புதன்கிழமை',
      'Thursday': 'வியாழக்கிழமை',
      'Friday': 'வெள்ளிக்கிழமை',
      'Saturday': 'சனிக்கிழமை'
    };
    document.getElementById('rahuKaalDay').textContent = `${dayNamesInTamil[data.rahuKaal.day]} - Inauspicious Period`;
    document.getElementById('rahuKaalTime').innerHTML = `
        <span class="time-start">${data.rahuKaal.startTime}</span>
        <span class="time-separator">to</span>
        <span class="time-end">${data.rahuKaal.endTime}</span>
    `;
    document.getElementById('rahuKaalDuration').textContent = `Duration: ${data.rahuKaal.duration}`;
    
    // Update Yamaganda (now shows both day and night periods)
    document.getElementById('yamagandaDay').textContent = 'யம கண்டிகை - Yama Ghantika';
    document.getElementById('yamagandaTime').innerHTML = `
        <div style="margin-bottom: 8px;">
            <strong>Day Period (2nd Ghatika):</strong><br>
            <span class="time-start">${data.yamaganda.dayPeriod.startTime}</span>
            <span class="time-separator">to</span>
            <span class="time-end">${data.yamaganda.dayPeriod.endTime}</span>
        </div>
        <div>
            <strong>Night Period (4th Ghatika):</strong><br>
            <span class="time-start">${data.yamaganda.nightPeriod.startTime}</span>
            <span class="time-separator">to</span>
            <span class="time-end">${data.yamaganda.nightPeriod.endTime}</span>
        </div>
    `;
    document.getElementById('yamagandaDuration').textContent = `Day: ${data.yamaganda.dayPeriod.duration} | Night: ${data.yamaganda.nightPeriod.duration}`;
    
    // Render Ghatika chart
    renderGhatikaChart(data.yamaganda.ghatikas, data.yamaganda.activeGhatika);

    // Start live countdowns and highlights
    startLiveTimers(data);
}

function startLiveTimers(data) {
    if (liveCountdownTimer) {
        clearInterval(liveCountdownTimer);
    }

    const offsetMinutes = data.timezoneOffsetMinutes || 330;
    const tick = () => {
        const isToday = isISTToday(data.date, offsetMinutes);
        updateRahuCountdown(data, isToday, offsetMinutes);
        updateYamagandaCountdown(data, isToday, offsetMinutes);
        updateNallaNeramHighlight(data.nallaNeram, data.date, isToday, offsetMinutes);
        updateActiveGhatika(data.yamaganda, data.date, isToday, offsetMinutes);
    };

    tick();
    liveCountdownTimer = setInterval(tick, 1000);
}

function updateRahuCountdown(data, isToday, offsetMinutes) {
    const el = document.getElementById('rahuKaalCountdown');
    if (!el || !data?.rahuKaal) return;
    if (!isToday) {
        el.textContent = 'Live countdown available for today only';
        return;
    }

    const now = new Date();
    const start = parseISTTimeToDate(data.rahuKaal.startTime, data.date, offsetMinutes);
    const end = parseISTTimeToDate(data.rahuKaal.endTime, data.date, offsetMinutes);

    if (now < start) {
        el.textContent = `Starts in ${formatRelativeDuration(start - now)}`;
    } else if (now >= start && now <= end) {
        el.textContent = `Ends in ${formatRelativeDuration(end - now)}`;
    } else {
        el.textContent = 'Completed';
    }
}

function updateYamagandaCountdown(data, isToday, offsetMinutes) {
    const el = document.getElementById('yamagandaCountdown');
    if (!el || !data?.yamaganda) return;
    if (!isToday) {
        el.textContent = 'Live countdown available for today only';
        return;
    }

    const now = new Date();
    const segments = [
        { label: 'Day period', start: data.yamaganda.dayPeriod.startTime, end: data.yamaganda.dayPeriod.endTime },
        { label: 'Night period', start: data.yamaganda.nightPeriod.startTime, end: data.yamaganda.nightPeriod.endTime }
    ];

    let activeSegment = null;
    let nextSegment = null;

    segments.forEach(seg => {
        const segStart = parseISTTimeToDate(seg.start, data.date, offsetMinutes);
        const segEnd = parseISTTimeToDate(seg.end, data.date, offsetMinutes);
        const spansMidnight = segEnd < segStart;
        const adjustedEnd = spansMidnight ? new Date(segEnd.getTime() + 24 * 60 * 60 * 1000) : segEnd;

        if (now >= segStart && now <= adjustedEnd) {
            activeSegment = { ...seg, startDate: segStart, endDate: adjustedEnd };
        } else if (now < segStart && !nextSegment) {
            nextSegment = { ...seg, startDate: segStart, endDate: adjustedEnd };
        }
    });

    if (activeSegment) {
        el.textContent = `${activeSegment.label} ends in ${formatRelativeDuration(activeSegment.endDate - now)}`;
    } else if (nextSegment) {
        el.textContent = `${nextSegment.label} starts in ${formatRelativeDuration(nextSegment.startDate - now)}`;
    } else {
        el.textContent = 'Completed';
    }
}

function updateNallaNeramHighlight(nallaNeram, dateStr, isToday, offsetMinutes) {
    const container = document.getElementById('nallaneramWindows');
    if (!container || !nallaNeram) return;
    const now = new Date();

    Array.from(container.children).forEach(child => {
        const start = child.getAttribute('data-start');
        const end = child.getAttribute('data-end');
        if (!start || !end) return;

        if (!isToday) {
            child.classList.remove('active');
            return;
        }

        const startDate = parseISTTimeToDate(start, dateStr, offsetMinutes);
        const endDate = parseISTTimeToDate(end, dateStr, offsetMinutes);
        const spansMidnight = endDate < startDate;
        const adjustedEnd = spansMidnight ? new Date(endDate.getTime() + 24 * 60 * 60 * 1000) : endDate;

        if (now >= startDate && now <= adjustedEnd) {
            child.classList.add('active');
        } else {
            child.classList.remove('active');
        }
    });
}

function updateActiveGhatika(yamaganda, dateStr, isToday, offsetMinutes) {
    if (!yamaganda?.ghatikas) return;
    const now = new Date();
    const paths = document.querySelectorAll('#ghatikaChart .ghatika-segment');
    if (!paths.length) return;

    let activeIndex = null;
    yamaganda.ghatikas.forEach((g, idx) => {
        const startDate = parseISTTimeToDate(g.startTime, dateStr, offsetMinutes);
        const endDate = parseISTTimeToDate(g.endTime, dateStr, offsetMinutes);
        if (now >= startDate && now <= endDate) {
            activeIndex = idx + 1;
        }
    });

    paths.forEach(path => {
        const num = parseInt(path.getAttribute('data-ghatika'), 10);
        const shouldBeActive = isToday && activeIndex === num;
        path.classList.toggle('active', shouldBeActive);
    });
}

function renderGhatikaChart(ghatikas, activeGhatika) {
    const svg = document.getElementById('ghatikaChart');
    svg.innerHTML = ''; // Clear existing
    
    const centerX = 100;
    const centerY = 100;
    const radius = 80;
    const innerRadius = 40;
    
    // Create 8 segments (45 degrees each)
    ghatikas.forEach((ghatika, index) => {
        const startAngle = (index * 45 - 90) * (Math.PI / 180); // Start from top
        const endAngle = ((index + 1) * 45 - 90) * (Math.PI / 180);
        
        // Calculate outer arc points
        const x1 = centerX + radius * Math.cos(startAngle);
        const y1 = centerY + radius * Math.sin(startAngle);
        const x2 = centerX + radius * Math.cos(endAngle);
        const y2 = centerY + radius * Math.sin(endAngle);
        
        // Calculate inner arc points
        const x3 = centerX + innerRadius * Math.cos(endAngle);
        const y3 = centerY + innerRadius * Math.sin(endAngle);
        const x4 = centerX + innerRadius * Math.cos(startAngle);
        const y4 = centerY + innerRadius * Math.sin(startAngle);
        
        // Create path
        const pathData = [
            `M ${x1} ${y1}`,
            `A ${radius} ${radius} 0 0 1 ${x2} ${y2}`,
            `L ${x3} ${y3}`,
            `A ${innerRadius} ${innerRadius} 0 0 0 ${x4} ${y4}`,
            `Z`
        ].join(' ');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('class', `ghatika-segment ${ghatika.isYamaganda ? 'yamaganda' : 'normal'}`);
        path.setAttribute('data-ghatika', index + 1);
        
        // Add tooltip
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `Ghatika ${ghatika.number}: ${ghatika.startTime} - ${ghatika.endTime}${ghatika.isYamaganda ? ' (Yamaganda)' : ''}`;
        path.appendChild(title);
        
        svg.appendChild(path);
        
        // Add label
        const labelAngle = (index * 45 + 22.5 - 90) * (Math.PI / 180);
        const labelRadius = (radius + innerRadius) / 2;
        const labelX = centerX + labelRadius * Math.cos(labelAngle);
        const labelY = centerY + labelRadius * Math.sin(labelAngle);
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', labelX);
        text.setAttribute('y', labelY);
        text.setAttribute('class', 'ghatika-label');
        text.textContent = ghatika.number;
        svg.appendChild(text);
    });
    
    // Add center circle
    const centerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerCircle.setAttribute('cx', centerX);
    centerCircle.setAttribute('cy', centerY);
    centerCircle.setAttribute('r', innerRadius);
    centerCircle.setAttribute('fill', 'var(--bg-secondary)');
    centerCircle.setAttribute('stroke', 'var(--color-border)');
    centerCircle.setAttribute('stroke-width', '2');
    svg.appendChild(centerCircle);
    
    // Add center text
    const centerText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    centerText.setAttribute('x', centerX);
    centerText.setAttribute('y', centerY);
    centerText.setAttribute('text-anchor', 'middle');
    centerText.setAttribute('dominant-baseline', 'middle');
    centerText.setAttribute('fill', 'var(--color-text)');
    centerText.setAttribute('font-size', '14');
    centerText.setAttribute('font-weight', '600');
    centerText.textContent = '8 Ghatikas';
    svg.appendChild(centerText);
}

// Day navigation functions
function changeDate(direction) {
    const dateInput = document.getElementById('date');
    const currentDate = new Date(dateInput.value);
    
    if (direction === 'prev') {
        currentDate.setDate(currentDate.getDate() - 1);
    } else if (direction === 'next') {
        currentDate.setDate(currentDate.getDate() + 1);
    } else if (direction === 'today') {
        const today = new Date();
        currentDate.setTime(today.getTime());
    }
    
    const newDateStr = currentDate.toISOString().split('T')[0];
    dateInput.value = newDateStr;
    
    // Reload both chart and auspicious times
    loadChart();
}

// Panchang Rendering Function
// =====================================================

function renderPanchang(panchang) {
    if (!panchang) {
        console.error('❌ [PANCHANG RENDER] No panchang data received');
        return;
    }
    
    console.log('%c🎨 PANCHANG RENDERING START', 'color: #333; font-weight: bold; font-size: 12px');
    
    // Render Tithi
    if (panchang.tithi) {
        console.log('%c   📖 TITHI RENDERED', 'color: #d4a574');
        console.log('      →', panchang.tithi.number + '/30 -', panchang.tithi.name);
        console.log('      → Progress:', panchang.tithi.progress + '%');
        console.log('      → Mins Remaining:', panchang.tithi.minutesRemaining);
        document.getElementById('tithiNumber').textContent = `${panchang.tithi.number}/30`;
        document.getElementById('tithiName').textContent = panchang.tithi.name;
        document.getElementById('tithiPaksha').textContent = panchang.tithi.paksha;
        if (panchang.tithi.startTime && panchang.tithi.endTime) {
            document.getElementById('tithiTimeRange').textContent = `${panchang.tithi.startTime} → ${panchang.tithi.endTime}`;
        }
        document.getElementById('tithiProgress').style.width = `${panchang.tithi.progress}%`;
        document.getElementById('tithiProgressLabel').textContent = `${panchang.tithi.progress}% Complete (${panchang.tithi.minutesRemaining} min remaining)`;
        
        // Show special note for Ekadashi or other special tithis
        const tithiSpecial = document.getElementById('tithiSpecial');
        if (panchang.tithi.isSpecial) {
            tithiSpecial.textContent = panchang.tithi.specialNote;
            tithiSpecial.style.display = 'block';
            console.log('      ⭐ SPECIAL:', panchang.tithi.specialNote);
        } else {
            tithiSpecial.style.display = 'none';
        }
        
        // Update Tithi moon icon based on phase
        updateTithiMoonIcon(panchang.tithi.number);
    } else {
        console.error('❌ [TITHI] Missing tithi data');
    }
    
    // Render Nakshatra
    if (panchang.nakshatra) {
        console.log('%c   ⭐ NAKSHATRA RENDERED', 'color: #4a90a4');
        console.log('      →', panchang.nakshatra.number + '/27 -', panchang.nakshatra.name);
        console.log('      → Lord:', panchang.nakshatra.lord, '| Deity:', panchang.nakshatra.deity);
        console.log('      → Mins Until Change:', panchang.nakshatra.minutesUntilChange, '→ Next:', panchang.nakshatra.nextNakshatra);
        document.getElementById('nakshatraNumber').textContent = `${panchang.nakshatra.number}/27`;
        document.getElementById('nakshatraName').textContent = panchang.nakshatra.name;
        document.getElementById('nakshatraLord').textContent = panchang.nakshatra.lord;
        document.getElementById('nakshatraDeity').textContent = panchang.nakshatra.deity;
        if (panchang.nakshatra.startTime && panchang.nakshatra.endTime) {
            document.getElementById('nakshatraTimeRange').textContent = `${panchang.nakshatra.startTime} → ${panchang.nakshatra.endTime}`;
        }
        document.getElementById('nakshatraProgress').style.width = `${panchang.nakshatra.progress}%`;
        document.getElementById('nakshatraProgressLabel').textContent = `${panchang.nakshatra.progress}% Complete (${panchang.nakshatra.minutesUntilChange} min until ${panchang.nakshatra.nextNakshatra.split('(')[0]})`;
    } else {
        console.error('❌ [NAKSHATRA] Missing nakshatra data');
    }
    
    // Render Yoga
    if (panchang.yoga) {
        console.log('%c   🔗 YOGA RENDERED', 'color: #e88d3a');
        console.log('      →', panchang.yoga.number + '/27 -', panchang.yoga.name);
        console.log('      → Nature:', panchang.yoga.nature, '| Progress:', panchang.yoga.progress + '%');
        document.getElementById('yogaNumber').textContent = `${panchang.yoga.number}/27`;
        document.getElementById('yogaName').textContent = panchang.yoga.name;
        const yogaNature = document.getElementById('yogaNature');
        yogaNature.textContent = panchang.yoga.nature;
        yogaNature.className = 'yoga-nature ' + (panchang.yoga.nature.includes('சுபம்') || panchang.yoga.nature.includes('Auspicious') ? 'auspicious' : 'inauspicious');
        if (panchang.yoga.startTime && panchang.yoga.endTime) {
            document.getElementById('yogaTimeRange').textContent = `${panchang.yoga.startTime} → ${panchang.yoga.endTime}`;
        }
        document.getElementById('yogaProgress').style.width = `${panchang.yoga.progress}%`;
        document.getElementById('yogaProgressLabel').textContent = `${panchang.yoga.progress}% Complete`;
    } else {
        console.error('❌ [YOGA] Missing yoga data');
    }
    
    // Render Karana
    if (panchang.karana) {
        console.log('%c   ⏱️  KARANA RENDERED', 'color: #8b6ba8');
        console.log('      →', panchang.karana.number + '/60 -', panchang.karana.name);
        console.log('      → Nature:', panchang.karana.nature, '| Progress:', panchang.karana.progress + '%');
        document.getElementById('karanaNumber').textContent = `${panchang.karana.number}/60`;
        document.getElementById('karanaName').textContent = panchang.karana.name;
        const karanaNature = document.getElementById('karanaNature');
        karanaNature.textContent = panchang.karana.nature;
        karanaNature.className = 'karana-nature ' + (panchang.karana.nature.includes('சுபம்') || panchang.karana.nature.includes('Auspicious') ? 'auspicious' : 'inauspicious');
        if (panchang.karana.startTime && panchang.karana.endTime) {
            document.getElementById('karanaTimeRange').textContent = `${panchang.karana.startTime} → ${panchang.karana.endTime}`;
        }
        document.getElementById('karanaProgress').style.width = `${panchang.karana.progress}%`;
        document.getElementById('karanaProgressLabel').textContent = `${panchang.karana.progress}% Complete`;
    } else {
        console.error('❌ [KARANA] Missing karana data');
    }
    
    // Render Nalla Neram
    if (panchang.nallaNeram) {
        console.log('%c   ✓ NALLA NERAM RENDERED', 'color: #4caf50');
        console.log('      → Day:', panchang.nallaNeram.day);
        document.getElementById('nallaneramDay').textContent = panchang.nallaNeram.day;
        const windowsContainer = document.getElementById('nallaneramWindows');
        windowsContainer.innerHTML = '';
        
        panchang.nallaNeram.windows.forEach((window, index) => {
            console.log(`      → Window ${index + 1}:`, window.start, '-', window.end, '(' + window.duration + ')');
            const windowDiv = document.createElement('div');
            windowDiv.className = 'nalla-neram-window';
            windowDiv.setAttribute('data-start', window.start);
            windowDiv.setAttribute('data-end', window.end);
            windowDiv.innerHTML = `
                <div>
                    <div class="window-period">${window.period}</div>
                    <div class="window-time">${window.start} - ${window.end}</div>
                </div>
                <div class="window-duration">${window.duration}</div>
            `;
            windowsContainer.appendChild(windowDiv);
        });
    } else {
        console.error('❌ [NALLA NERAM] Missing nalla neram data');
    }
    
    console.log('%c✅ PANCHANG RENDERING COMPLETE', 'color: #4caf50; font-weight: bold; font-size: 12px');
}

// Update Tithi Moon Icon based on lunar phase
function updateTithiMoonIcon(tithiNumber) {
    const moonPath = document.getElementById('tithiMoonPath');
    if (!moonPath) return;
    
    // Calculate moon phase (0 = New Moon, 15 = Full Moon, 30 = New Moon)
    const phase = tithiNumber <= 15 ? tithiNumber : 30 - tithiNumber;
    
    // Calculate the arc parameters for the moon shape
    // Phase 0 = completely dark (new moon)
    // Phase 15 = completely light (full moon)
    const percentage = phase / 15;
    
    if (percentage < 0.5) {
        // Waxing crescent to first quarter
        const bulge = percentage * 2; // 0 to 1
        const offset = 12 * (1 - bulge);
        moonPath.setAttribute('d', `M16 4 A12 12 0 0 1 16 28 A${offset} 12 0 0 1 16 4`);
    } else {
        // First quarter to full moon
        const bulge = (percentage - 0.5) * 2; // 0 to 1
        const offset = 12 * bulge;
        moonPath.setAttribute('d', `M16 4 A12 12 0 0 1 16 28 A${offset} 12 0 0 0 16 4`);
    }
}

// Initialize day navigation buttons
document.addEventListener('DOMContentLoaded', () => {
    // Set current date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    document.getElementById('date').value = dateStr;
    
    // Set current time (IST)
    const istTime = today.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata'
    });
    const [hours, minutes] = istTime.split(':');
    document.getElementById('time').value = `${hours}:${minutes}`;
    
    console.log(`📅 Initialized with: ${dateStr} at ${hours}:${minutes} IST`);
    
    // Load chart
    loadChart();
    
    // Add event listeners
    document.getElementById('date')?.addEventListener('change', loadChart);
    document.getElementById('time')?.addEventListener('change', loadChart);
    document.getElementById('city')?.addEventListener('change', loadChart);
    document.getElementById('showChart')?.addEventListener('click', loadChart);
    
    document.getElementById('prevDay')?.addEventListener('click', () => changeDate('prev'));
    document.getElementById('nextDay')?.addEventListener('click', () => changeDate('next'));
    document.getElementById('todayBtn')?.addEventListener('click', () => changeDate('today'));
});