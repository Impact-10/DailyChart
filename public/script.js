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
    'Mesha', 'Rishabha', 'Mithuna', 'Kataka',
    'Simha', 'Kanya', 'Tula', 'Vrischika',
    'Dhanus', 'Makara', 'Kumbha', 'Meena'
];

// Get API base URL - works for both localhost and deployed versions
function getAPIBaseURL() {
    // If running on localhost, use localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return `http://localhost:${window.location.port || 3000}`;
    }
    // If deployed on production, use same origin
    return window.location.origin;
}

const API_BASE_URL = getAPIBaseURL();

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
    
    // Set today's date and default time
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    // Set default time if not already set
    if (!document.getElementById('time').value) {
        document.getElementById('time').value = '05:30';
    }
    
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
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const city = document.getElementById('city').value;
    
    if (!date) {
        showError('Please select a date');
        return;
    }
    
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
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to load chart');
        }
        
        const data = await response.json();
        
        // Hide loading, show results with animation
        loadingDiv.style.display = 'none';
        
        // Show chart info with animation
        document.getElementById('chartDate').textContent = 
            `Transit positions for ${date} at ${time} in ${city}`;
        chartInfo.style.display = 'block';
        
        // Render chart
        renderChart(data.rasiData);
        
        // Show chart with animation (will trigger via CSS animation)
        chartContainer.style.display = 'block';
        
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
                
                // Lagna marker
                if (rasiInfo.isLagna) {
                    const lagnaMarker = document.createElement('div');
                    lagnaMarker.className = 'lagna-marker';
                    lagnaMarker.textContent = 'లక్ Asc';
                    cell.appendChild(lagnaMarker);
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
