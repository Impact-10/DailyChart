const express = require('express');
const cors = require('cors');
const path = require('path');
const { calculateDailyChart, CITIES } = require('./astroService');

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

// Get available cities
app.get('/api/cities', (req, res) => {
  res.json(Object.keys(CITIES));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Daily Transit Chart running on http://localhost:${PORT}`);
});
