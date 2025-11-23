# Elpriser Sverige PWA - Improvement Suggestions

This document outlines potential improvements and enhancements for the Elpriser Sverige PWA, including extending the price forecast beyond 7 hours.

---

## 🎯 Priority Improvements

### 1. **Extended Price Forecast (7+ Hours)**

#### Current State
- Shows 8-hour forecast in price boxes
- Shows 16-hour forecast in chart
- Limited to available API data

#### Proposed Enhancement: 24-Hour Forecast

**Implementation Steps:**

1. **Modify [`script.js`](script.js) - Update forecast display**
   ```javascript
   // Current: 8 hours for boxes, 16 hours for chart
   // Proposed: 24 hours for both
   
   // Line 583: Change from 8 to 24
   const nextHours = data.slice(0, 24);  // 24-hour forecast
   
   // Line 672: Change from 16 to 24
   const nextSixteenHours = sortedData.slice(currentIndex, currentIndex + 24);
   ```

2. **Update HTML layout**
   - Create scrollable price box container for 24 hours
   - Add time labels (00:00, 06:00, 12:00, 18:00, 24:00)
   - Implement horizontal scroll on mobile

3. **Update CSS for responsive grid**
   ```css
   /* Current: 8 columns */
   .hourly-prices {
       grid-template-columns: repeat(8, 1fr);
   }
   
   /* Proposed: 24 columns with scroll */
   .hourly-prices {
       display: flex;
       overflow-x: auto;
       gap: 10px;
       padding: 10px;
   }
   
   .price-box {
       flex: 0 0 calc(100% / 8);  /* 8 visible at once */
       min-width: 60px;
   }
   ```

4. **Update chart to show 24-hour view**
   - Extend chart to display full 24-hour period
   - Add time markers every 6 hours
   - Implement zoom/scroll for detailed view

**Benefits:**
- Users can plan electricity usage for entire day
- Better long-term price analysis
- More informed decision-making

**Challenges:**
- API may not provide 24-hour data (only today + tomorrow)
- Mobile screen space limitations
- Performance impact with more data points

---

### 2. **Multi-Day Price Forecast**

#### Proposed Enhancement: 7-Day Forecast

**Implementation:**

1. **Fetch data for multiple days**
   ```javascript
   // Current: Fetch today + tomorrow
   // Proposed: Fetch today + next 6 days
   
   async function fetchMultipleDays(region, days = 7) {
       const promises = [];
       for (let i = 0; i < days; i++) {
           const date = new Date();
           date.setDate(date.getDate() + i);
           const formattedDate = formatDateForApi(date);
           promises.push(
               tryFetchWithProxies(`${API_BASE_URL}/${formattedDate}_${region}.json`)
           );
       }
       return Promise.allSettled(promises);
   }
   ```

2. **Create daily summary view**
   - Show daily min/max/average prices
   - Color-code days by price level
   - Allow clicking to see hourly breakdown

3. **Add calendar view**
   - Visual calendar with price indicators
   - Highlight cheapest/most expensive days
   - Quick navigation between days

**Benefits:**
- Weekly planning capability
- Identify cheapest days for energy-intensive tasks
- Better budget forecasting

---

### 3. **Price Comparison & Analytics**

#### Proposed Features

1. **Region Comparison**
   ```javascript
   // Show prices for all 4 regions simultaneously
   // Allow side-by-side comparison
   // Highlight price differences
   ```

2. **Historical Price Data**
   - Store prices in IndexedDB
   - Show price trends over time
   - Calculate average prices by day/week/month

3. **Price Alerts**
   - Notify when prices drop below threshold
   - Alert for peak price hours
   - Customizable alert settings

4. **Statistics Dashboard**
   - Weekly/monthly average prices
   - Price volatility metrics
   - Trend analysis

---

### 4. **User Experience Enhancements**

#### A. **Settings & Preferences**
```javascript
// Add settings panel with:
- Forecast duration (8, 16, 24 hours)
- Update frequency (5, 10, 15 minutes)
- Price alert thresholds
- Display preferences (chart type, colors)
- Data retention (how long to keep history)
```

#### B. **Improved Mobile Experience**
- Swipe gestures for region switching
- Tap to expand hourly details
- Bottom sheet for settings
- Gesture-based chart navigation

#### C. **Accessibility Improvements**
- Screen reader optimization
- Keyboard navigation
- High contrast mode
- Font size adjustment

#### D. **Data Visualization**
- Multiple chart types (line, bar, area)
- Heatmap for price intensity
- Comparison overlays
- Export data as CSV/JSON

---

### 5. **Performance Optimizations**

#### A. **Data Caching Strategy**
```javascript
// Implement IndexedDB for persistent storage
const db = new Dexie('ElprisetDB');
db.version(1).stores({
    prices: 'date, region',
    preferences: 'key'
});

// Store historical data
await db.prices.add({
    date: new Date(),
    region: 'SE3',
    prices: [...],
    timestamp: Date.now()
});
```

#### B. **Lazy Loading**
- Load chart only when visible
- Defer non-critical data fetching
- Progressive enhancement

#### C. **Web Workers**
- Move data processing to worker thread
- Calculate statistics in background
- Prevent UI blocking

---

### 6. **Backend Enhancements**

#### A. **Custom API Endpoint**
Create a backend service to:
- Cache API responses
- Provide extended forecast
- Aggregate data from multiple sources
- Add authentication if needed

```javascript
// Instead of direct API calls
const response = await fetch('https://api.elpriset.example.com/prices', {
    params: {
        region: 'SE3',
        days: 7,
        format: 'json'
    }
});
```

#### B. **Data Aggregation**
- Combine data from multiple providers
- Fill gaps in API data
- Provide more reliable forecasts

#### C. **Webhook Support**
- Real-time price updates
- Push notifications
- Reduced polling frequency

---

### 7. **Advanced Features**

#### A. **Price Prediction**
- Machine learning model for price forecasting
- Trend analysis
- Anomaly detection

#### B. **Smart Recommendations**
- Suggest optimal times for energy usage
- Recommend appliance scheduling
- Cost optimization tips

#### C. **Integration with Smart Home**
- IFTTT integration
- Home Assistant support
- Smart device automation

#### D. **Export & Reporting**
- Generate PDF reports
- Email summaries
- Data export (CSV, JSON)

---

## 📋 Implementation Roadmap

### Phase 1: Quick Wins (1-2 weeks)
- [ ] Extend forecast to 24 hours
- [ ] Add scrollable price boxes
- [ ] Improve mobile layout
- [ ] Add settings panel

### Phase 2: Core Features (2-4 weeks)
- [ ] Multi-day forecast (7 days)
- [ ] Region comparison
- [ ] Historical data storage (IndexedDB)
- [ ] Price alerts

### Phase 3: Advanced Features (4-8 weeks)
- [ ] Analytics dashboard
- [ ] Data visualization improvements
- [ ] Performance optimizations
- [ ] Accessibility enhancements

### Phase 4: Premium Features (8+ weeks)
- [ ] Machine learning predictions
- [ ] Smart home integration
- [ ] Custom backend API
- [ ] Advanced reporting

---

## 🔧 Technical Implementation Details

### Extending to 24-Hour Forecast

**File: [`script.js`](script.js)**

```javascript
// Current implementation (lines 582-583)
const nextHours = data.slice(0, 8);
const nextSixteenHours = data.slice(0, 16);

// Proposed implementation
const nextHours = data.slice(0, 24);      // 24-hour forecast
const nextSixteenHours = data.slice(0, 24); // Same for chart

// Update updateHourlyPrices function
function updateHourlyPrices(data) {
    const hourlyPricesContainer = elements.hourlyPrices;
    hourlyPricesContainer.innerHTML = '';
    
    if (!Array.isArray(data) || data.length === 0) {
        // ... error handling
        return;
    }
    
    const prices = data.map(item => item.parsedPrice || parseFloat((item.SEK_per_kWh * 100).toFixed(2)));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // Get next 24 hours instead of 8
    const nextHours = data.slice(0, 24);
    
    nextHours.forEach((hourData, index) => {
        const price = prices[index];
        const time = formatTime(hourData.time_start);
        const category = getPriceCategory(price, minPrice, maxPrice);
        
        const box = document.createElement('div');
        box.className = `price-box ${category}`;
        box.innerHTML = `
            <div class="time">${time}</div>
            <div class="price">${price.toFixed(2)} öre</div>
        `;
        hourlyPricesContainer.appendChild(box);
    });
}
```

**File: [`styles.css`](styles.css)**

```css
/* Update for 24-hour display */
.hourly-prices {
    display: flex;
    overflow-x: auto;
    gap: 10px;
    padding: 10px;
    scroll-behavior: smooth;
}

.price-box {
    flex: 0 0 calc(100% / 8);  /* Show 8 boxes at once */
    min-width: 60px;
    background: var(--surface-color);
    border-radius: 8px;
    padding: 12px;
    text-align: center;
    box-shadow: var(--box-shadow);
    transition: transform 0.2s;
}

.price-box:hover {
    transform: translateY(-2px);
}

/* Mobile adjustments */
@media (max-width: 768px) {
    .price-box {
        flex: 0 0 calc(100% / 4);  /* Show 4 boxes on mobile */
        min-width: 50px;
        padding: 8px;
    }
}

@media (max-width: 480px) {
    .price-box {
        flex: 0 0 calc(100% / 3);  /* Show 3 boxes on small mobile */
        min-width: 45px;
        padding: 6px;
    }
}
```

---

## 📊 Feature Comparison

| Feature | Current | Proposed | Priority |
|---------|---------|----------|----------|
| **Forecast Duration** | 8 hours | 24 hours | High |
| **Chart Duration** | 16 hours | 24 hours | High |
| **Multi-Day View** | No | 7 days | Medium |
| **Region Comparison** | No | Yes | Medium |
| **Historical Data** | No | Yes | Medium |
| **Price Alerts** | No | Yes | Medium |
| **Settings Panel** | No | Yes | Low |
| **Analytics** | No | Yes | Low |
| **Data Export** | No | Yes | Low |
| **Smart Home Integration** | No | Yes | Low |

---

## 🚀 Quick Start: 24-Hour Forecast

To implement the 24-hour forecast immediately:

1. **Update [`script.js`](script.js) line 583:**
   ```javascript
   // Change from:
   const nextHours = data.slice(0, 8);
   // To:
   const nextHours = data.slice(0, 24);
   ```

2. **Update [`styles.css`](styles.css) line 220:**
   ```css
   /* Change from:
   grid-template-columns: repeat(8, 1fr);
   /* To:
   grid-template-columns: repeat(4, 1fr);  /* 4 columns, scroll horizontally */
   ```

3. **Add scroll styling:**
   ```css
   .hourly-prices {
       overflow-x: auto;
       scroll-behavior: smooth;
   }
   ```

4. **Test and deploy:**
   ```bash
   cd /var/www/elpriset
   sudo git add .
   sudo git commit -m "feat: extend forecast to 24 hours"
   sudo git push origin main
   sudo systemctl reload nginx
   ```

---

## 💡 Additional Suggestions

### 1. **API Reliability**
- Implement circuit breaker pattern
- Add request retry logic with exponential backoff
- Cache responses more aggressively

### 2. **User Engagement**
- Add onboarding tutorial
- Implement feature discovery
- Add tips and tricks

### 3. **Monetization (Optional)**
- Premium features (advanced analytics)
- Sponsored content
- API access for developers

### 4. **Community**
- GitHub discussions
- User feedback form
- Feature voting

### 5. **Localization**
- Support multiple languages
- Regional customization
- Currency conversion

---

## 📚 Resources

- **Chart.js Documentation**: https://www.chartjs.org/docs/latest/
- **IndexedDB Guide**: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- **Web Workers**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
- **PWA Best Practices**: https://web.dev/progressive-web-apps/
- **Performance Optimization**: https://web.dev/performance/

---

## 🎯 Success Metrics

Track these metrics to measure improvement success:

- **User Engagement**: Time on site, return visits
- **Performance**: Page load time, Time to Interactive
- **Reliability**: Uptime, error rate
- **User Satisfaction**: Ratings, feedback
- **Feature Usage**: Which features are most used

---

## 📝 Notes

- All improvements should maintain backward compatibility
- Test thoroughly before deploying to production
- Monitor performance impact of new features
- Gather user feedback before major changes
- Document all changes in commit messages

---

**Last Updated**: October 31, 2025
**Status**: Ready for Implementation