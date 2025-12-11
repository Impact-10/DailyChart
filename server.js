const express = require('express');
const cors = require('cors');
const path = require('path');
const { calculateDailyChart, CITIES } = require('./astroService');
const { calculateAuspiciousTimes } = require('./auspiciousTimesService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API endpoint for daily chart
app.get('/api/daily-chart', (req, res) => {
  try {
    const { date, time = '05:30', city = 'Chennai' } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    const chartData = calculateDailyChart(date, time, city);
    res.json(chartData);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Get available cities
app.get('/api/cities', (req, res) => {
  res.json(Object.keys(CITIES));
});

// API endpoint for auspicious times (Rahu Kaal, Yamaganda)
app.get('/api/auspicious-times', (req, res) => {
  try {
    const { date, city = 'Chennai' } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    const auspiciousData = calculateAuspiciousTimes(date, city);
    res.json(auspiciousData);
    
  } catch (error) {
    console.error('Error calculating auspicious times:', error);
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Detailed ascendant calculation endpoint
app.get('/api/debug/ascendant', (req, res) => {
  try {
    const { date, time = '05:30', city = 'Chennai' } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    // Run calculation - this will log to console
    const chartData = calculateDailyChart(date, time, city);
    
    res.json({
      message: 'Debug logs printed to server console. Check terminal/logs.',
      chartData: {
        date,
        time,
        city,
        lagnaLongitude: chartData.lagnaLongitude,
        lagnaRasi: chartData.lagnaRasi,
        ayanamsa: chartData.ayanamsa,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[DEBUG-ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Daily Transit Chart running on http://localhost:${PORT}`);
});
