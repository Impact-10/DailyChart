// South Indian chart cell mapping - CLOCKWISE (Rasi index 0-11 to grid position)
const SOUTH_INDIAN_POSITIONS = {
    0: [0, 1],  // Mesha
    1: [0, 2],  // Rishabha
    2: [0, 3],  // Mithuna
    3: [1, 3],  // Kataka
    4: [2, 3],  // Simha
    5: [3, 3],  // Kanya
    6: [3, 2],  // Tula
    7: [3, 1],  // Vrischika
    8: [3, 0],  // Dhanus
    9: [2, 0],  // Makara
    10: [1, 0], // Kumbha
    11: [0, 0]  // Meena
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
    
    // Create 4x4 grid
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
            
            // Find which rasi belongs to this position
            let rasiIndex = -1;
            for (let i = 0; i < 12; i++) {
                const pos = SOUTH_INDIAN_POSITIONS[i];
                if (pos[0] === row && pos[1] === col) {
                    rasiIndex = i;
                    break;
                }
            }
            
            if (rasiIndex !== -1) {
                const cell = document.createElement('div');
                cell.className = 'chart-cell';
                
                // House number
                const houseNum = document.createElement('div');
                houseNum.className = 'house-number';
                houseNum.textContent = rasiIndex + 1;
                cell.appendChild(houseNum);
                
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
