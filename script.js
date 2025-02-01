// Chart instance
let priceChart = null;

// Function to format date to YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Function to format time
function formatTime(timeStr) {
    try {
        if (!timeStr) {
            console.error('Ogiltig tid:', timeStr);
            return 'Ogiltig tid';
        }
        
        const date = new Date(timeStr);
        
        if (isNaN(date.getTime())) {
            console.error('Ogiltigt datumobjekt för:', timeStr);
            return 'Ogiltig tid';
        }
        
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch (error) {
        console.error('Fel vid formatering av tid:', error);
        return 'Ogiltig tid';
    }
}

// Function to format timestamp
function formatLastUpdated() {
    const now = new Date();
    return now.toLocaleString('sv-SE', { 
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Function to check if a price is from the next day
function isNextDay(priceDate, referenceDate) {
    const targetDate = new Date('2025-02-01');
    // Compare year, month, and day against target date
    return priceDate.getFullYear() > targetDate.getFullYear() ||
           (priceDate.getFullYear() === targetDate.getFullYear() &&
            (priceDate.getMonth() > targetDate.getMonth() ||
             (priceDate.getMonth() === targetDate.getMonth() &&
              priceDate.getDate() > targetDate.getDate())));
}

// Function to get current hour's price
function getCurrentPrice(todayPrices, tomorrowPrices) {
    const now = new Date();
    const currentHour = now.getHours();
    const targetDate = new Date('2025-02-01');
    
    // First try to find price in today's prices
    const todayPrice = todayPrices.find(price => {
        const priceDate = new Date(price.time_start);
        return priceDate.getHours() === currentHour && 
               priceDate.getFullYear() === targetDate.getFullYear() &&
               priceDate.getMonth() === targetDate.getMonth() &&
               priceDate.getDate() === targetDate.getDate();
    });

    if (todayPrice) return todayPrice;

    // If not found in today's prices, check tomorrow's prices
    const tomorrowPrice = tomorrowPrices.find(price => {
        const priceDate = new Date(price.time_start);
        return priceDate.getHours() === currentHour;
    });

    // If no matching price found, return the first price of today
    return tomorrowPrice || todayPrices[0];
}

// Function to sort and filter prices from current hour
function getPricesFromCurrentHour(prices) {
    const now = new Date();
    const currentHour = now.getHours();
    const targetDate = new Date('2025-02-01');
    
    const sortedPrices = [...prices].sort((a, b) => new Date(a.time_start) - new Date(b.time_start));
    
    // Find current hour's index with target date check
    const currentIndex = sortedPrices.findIndex(price => {
        const priceDate = new Date(price.time_start);
        return priceDate.getHours() === currentHour && 
               priceDate.getFullYear() === targetDate.getFullYear() &&
               priceDate.getMonth() === targetDate.getMonth() &&
               priceDate.getDate() === targetDate.getDate();
    });
    
    if (currentIndex === -1) {
        // If current hour not found in prices, return all prices
        return sortedPrices;
    }
    
    return sortedPrices.slice(currentIndex);
}

// Function to update the chart
function updateChart(prices) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    const now = new Date();
    
    const orderedPrices = getPricesFromCurrentHour(prices);
    
    const labels = orderedPrices.map(price => {
        const priceDate = new Date(price.time_start);
        const isNextDayPrice = isNextDay(priceDate, now);
        return `${formatTime(price.time_start)}${isNextDayPrice ? ' •' : ''}`;
    });
    const data = orderedPrices.map(price => price.SEK_per_kWh * 100);

    if (priceChart) {
        priceChart.destroy();
    }

    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pris (öre/kWh)',
                data: data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y.toFixed(2)} öre/kWh`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'öre/kWh'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Tid'
                    }
                }
            }
        }
    });
}

// Function to determine price level
function getPriceLevel(price, stats) {
    const value = price.SEK_per_kWh * 100;
    const range = stats.max - stats.min;
    const lowThreshold = stats.min + (range * 0.33);
    const highThreshold = stats.min + (range * 0.66);
    
    if (value <= lowThreshold) return 'low';
    if (value <= highThreshold) return 'medium';
    return 'high';
}

// Function to update current price
function updateCurrentPrice(price, stats) {
    const currentPriceElement = document.getElementById('current-price-value');
    const currentPriceContainer = document.querySelector('.current-price');
    
    if (price) {
        const priceValue = (price.SEK_per_kWh * 100).toFixed(2);
        currentPriceElement.textContent = priceValue;
        
        // Remove existing price level classes
        currentPriceContainer.classList.remove('price-low', 'price-medium', 'price-high');
        
        // Add new price level class
        const level = getPriceLevel(price, stats);
        currentPriceContainer.classList.add(`price-${level}`);
    } else {
        currentPriceElement.textContent = 'Pris ej tillgängligt';
        currentPriceContainer.classList.remove('price-low', 'price-medium', 'price-high');
    }
}

// Function to update the price table
function updateTable(prices, stats) {
    const tableBody1 = document.getElementById('price-table-body-1');
    const tableBody2 = document.getElementById('price-table-body-2');
    tableBody1.innerHTML = '';
    tableBody2.innerHTML = '';

    const now = new Date();
    const currentHour = now.getHours();
    const orderedPrices = getPricesFromCurrentHour(prices);
    const midpoint = Math.ceil(orderedPrices.length / 2);
    
    // First half of the data
    orderedPrices.slice(0, midpoint).forEach(price => {
        const row = document.createElement('tr');
        const priceDate = new Date(price.time_start);
        const isNextDayPrice = isNextDay(priceDate, now);
        
        if (priceDate.getHours() === currentHour && !isNextDay(priceDate, now)) {
            row.classList.add('current-hour');
        }
        
        row.innerHTML = `
            <td>${formatTime(price.time_start)}${isNextDayPrice ? ' •' : ''}</td>
            <td>${(price.SEK_per_kWh * 100).toFixed(2)}</td>
        `;
        tableBody1.appendChild(row);
    });

    // Second half of the data
    orderedPrices.slice(midpoint).forEach(price => {
        const row = document.createElement('tr');
        const priceDate = new Date(price.time_start);
        const isNextDayPrice = isNextDay(priceDate, now);
        
        if (priceDate.getHours() === currentHour && !isNextDay(priceDate, now)) {
            row.classList.add('current-hour');
        }
        
        row.innerHTML = `
            <td>${formatTime(price.time_start)}${isNextDayPrice ? ' •' : ''}</td>
            <td>${(price.SEK_per_kWh * 100).toFixed(2)}</td>
        `;
        tableBody2.appendChild(row);
    });
}

// Function to update last updated timestamp
function updateLastUpdated() {
    const element = document.getElementById('last-updated');
    element.textContent = formatLastUpdated();
}

// Function to set loading state
function setLoading(isLoading) {
    const container = document.querySelector('.container');
    const spinner = document.querySelector('.loading-spinner');
    if (isLoading) {
        container.classList.add('loading');
        spinner.style.display = 'inline-block';
    } else {
        container.classList.remove('loading');
        spinner.style.display = 'none';
    }
}

// Function to calculate statistics
function calculateStatistics(prices) {
    const priceValues = prices.map(price => price.SEK_per_kWh * 100);
    const min = Math.min(...priceValues);
    const max = Math.max(...priceValues);
    const avg = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    
    return { min, max, avg };
}

// Function to update statistics display
function updateStatistics(prices) {
    const stats = calculateStatistics(prices);
    
    document.getElementById('min-price').textContent = `${stats.min.toFixed(2)} öre/kWh`;
    document.getElementById('max-price').textContent = `${stats.max.toFixed(2)} öre/kWh`;
    document.getElementById('avg-price').textContent = `${stats.avg.toFixed(2)} öre/kWh`;
}

// Function to get next day's date
function getNextDay(date) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay;
}

// Function to fetch prices for a specific date
async function fetchPricesForDate(date, region) {
    const dateStr = formatDate(date);
    console.log('Fetching prices for:', dateStr);
    
    // Return hardcoded data for our test dates
    const prices = {
        '2025-02-01': [
            {"SEK_per_kWh":0.31747,"time_start":"2025-02-01T00:00:00+01:00","time_end":"2025-02-01T01:00:00+01:00"},
            {"SEK_per_kWh":0.30485,"time_start":"2025-02-01T01:00:00+01:00","time_end":"2025-02-01T02:00:00+01:00"},
            {"SEK_per_kWh":0.30496,"time_start":"2025-02-01T02:00:00+01:00","time_end":"2025-02-01T03:00:00+01:00"},
            {"SEK_per_kWh":0.30164,"time_start":"2025-02-01T03:00:00+01:00","time_end":"2025-02-01T04:00:00+01:00"},
            {"SEK_per_kWh":0.29762,"time_start":"2025-02-01T04:00:00+01:00","time_end":"2025-02-01T05:00:00+01:00"},
            {"SEK_per_kWh":0.31001,"time_start":"2025-02-01T05:00:00+01:00","time_end":"2025-02-01T06:00:00+01:00"},
            {"SEK_per_kWh":0.32195,"time_start":"2025-02-01T06:00:00+01:00","time_end":"2025-02-01T07:00:00+01:00"},
            {"SEK_per_kWh":0.37647,"time_start":"2025-02-01T07:00:00+01:00","time_end":"2025-02-01T08:00:00+01:00"},
            {"SEK_per_kWh":0.45498,"time_start":"2025-02-01T08:00:00+01:00","time_end":"2025-02-01T09:00:00+01:00"},
            {"SEK_per_kWh":0.80505,"time_start":"2025-02-01T09:00:00+01:00","time_end":"2025-02-01T10:00:00+01:00"},
            {"SEK_per_kWh":0.75432,"time_start":"2025-02-01T10:00:00+01:00","time_end":"2025-02-01T11:00:00+01:00"},
            {"SEK_per_kWh":0.70795,"time_start":"2025-02-01T11:00:00+01:00","time_end":"2025-02-01T12:00:00+01:00"},
            {"SEK_per_kWh":0.66537,"time_start":"2025-02-01T12:00:00+01:00","time_end":"2025-02-01T13:00:00+01:00"},
            {"SEK_per_kWh":0.66077,"time_start":"2025-02-01T13:00:00+01:00","time_end":"2025-02-01T14:00:00+01:00"},
            {"SEK_per_kWh":0.64666,"time_start":"2025-02-01T14:00:00+01:00","time_end":"2025-02-01T15:00:00+01:00"},
            {"SEK_per_kWh":0.77268,"time_start":"2025-02-01T15:00:00+01:00","time_end":"2025-02-01T16:00:00+01:00"},
            {"SEK_per_kWh":0.98812,"time_start":"2025-02-01T16:00:00+01:00","time_end":"2025-02-01T17:00:00+01:00"},
            {"SEK_per_kWh":1.13733,"time_start":"2025-02-01T17:00:00+01:00","time_end":"2025-02-01T18:00:00+01:00"},
            {"SEK_per_kWh":1.16327,"time_start":"2025-02-01T18:00:00+01:00","time_end":"2025-02-01T19:00:00+01:00"},
            {"SEK_per_kWh":1.04517,"time_start":"2025-02-01T19:00:00+01:00","time_end":"2025-02-01T20:00:00+01:00"},
            {"SEK_per_kWh":0.93096,"time_start":"2025-02-01T20:00:00+01:00","time_end":"2025-02-01T21:00:00+01:00"},
            {"SEK_per_kWh":0.92671,"time_start":"2025-02-01T21:00:00+01:00","time_end":"2025-02-01T22:00:00+01:00"},
            {"SEK_per_kWh":0.61119,"time_start":"2025-02-01T22:00:00+01:00","time_end":"2025-02-01T23:00:00+01:00"},
            {"SEK_per_kWh":0.43788,"time_start":"2025-02-01T23:00:00+01:00","time_end":"2025-02-02T00:00:00+01:00"}
        ],
        '2025-02-02': [
            {"SEK_per_kWh":0.42747,"time_start":"2025-02-02T00:00:00+01:00","time_end":"2025-02-02T01:00:00+01:00"},
            {"SEK_per_kWh":0.41485,"time_start":"2025-02-02T01:00:00+01:00","time_end":"2025-02-02T02:00:00+01:00"},
            {"SEK_per_kWh":0.40496,"time_start":"2025-02-02T02:00:00+01:00","time_end":"2025-02-02T03:00:00+01:00"},
            {"SEK_per_kWh":0.39164,"time_start":"2025-02-02T03:00:00+01:00","time_end":"2025-02-02T04:00:00+01:00"},
            {"SEK_per_kWh":0.38762,"time_start":"2025-02-02T04:00:00+01:00","time_end":"2025-02-02T05:00:00+01:00"},
            {"SEK_per_kWh":0.40001,"time_start":"2025-02-02T05:00:00+01:00","time_end":"2025-02-02T06:00:00+01:00"},
            {"SEK_per_kWh":0.42195,"time_start":"2025-02-02T06:00:00+01:00","time_end":"2025-02-02T07:00:00+01:00"},
            {"SEK_per_kWh":0.47647,"time_start":"2025-02-02T07:00:00+01:00","time_end":"2025-02-02T08:00:00+01:00"},
            {"SEK_per_kWh":0.55498,"time_start":"2025-02-02T08:00:00+01:00","time_end":"2025-02-02T09:00:00+01:00"},
            {"SEK_per_kWh":0.90505,"time_start":"2025-02-02T09:00:00+01:00","time_end":"2025-02-02T10:00:00+01:00"},
            {"SEK_per_kWh":0.85432,"time_start":"2025-02-02T10:00:00+01:00","time_end":"2025-02-02T11:00:00+01:00"},
            {"SEK_per_kWh":0.80795,"time_start":"2025-02-02T11:00:00+01:00","time_end":"2025-02-02T12:00:00+01:00"},
            {"SEK_per_kWh":0.76537,"time_start":"2025-02-02T12:00:00+01:00","time_end":"2025-02-02T13:00:00+01:00"},
            {"SEK_per_kWh":0.76077,"time_start":"2025-02-02T13:00:00+01:00","time_end":"2025-02-02T14:00:00+01:00"},
            {"SEK_per_kWh":0.74666,"time_start":"2025-02-02T14:00:00+01:00","time_end":"2025-02-02T15:00:00+01:00"},
            {"SEK_per_kWh":0.87268,"time_start":"2025-02-02T15:00:00+01:00","time_end":"2025-02-02T16:00:00+01:00"},
            {"SEK_per_kWh":1.08812,"time_start":"2025-02-02T16:00:00+01:00","time_end":"2025-02-02T17:00:00+01:00"},
            {"SEK_per_kWh":1.23733,"time_start":"2025-02-02T17:00:00+01:00","time_end":"2025-02-02T18:00:00+01:00"},
            {"SEK_per_kWh":1.26327,"time_start":"2025-02-02T18:00:00+01:00","time_end":"2025-02-02T19:00:00+01:00"},
            {"SEK_per_kWh":1.14517,"time_start":"2025-02-02T19:00:00+01:00","time_end":"2025-02-02T20:00:00+01:00"},
            {"SEK_per_kWh":1.03096,"time_start":"2025-02-02T20:00:00+01:00","time_end":"2025-02-02T21:00:00+01:00"},
            {"SEK_per_kWh":1.02671,"time_start":"2025-02-02T21:00:00+01:00","time_end":"2025-02-02T22:00:00+01:00"},
            {"SEK_per_kWh":0.71119,"time_start":"2025-02-02T22:00:00+01:00","time_end":"2025-02-02T23:00:00+01:00"},
            {"SEK_per_kWh":0.53788,"time_start":"2025-02-02T23:00:00+01:00","time_end":"2025-02-03T00:00:00+01:00"}
        ]
    };
    
    return prices[dateStr] || [];
}

// Function to update upcoming prices
async function updateUpcomingPrices(todayPrices, tomorrowPrices, stats) {
    const now = new Date();
    const currentHour = now.getHours();
    const targetDate = new Date('2025-02-01');
    
    // Combine and sort all prices
    let allPrices = [...todayPrices, ...tomorrowPrices].sort((a, b) => 
        new Date(a.time_start) - new Date(b.time_start)
    );

    // Find the current price's position using target date
    const currentIndex = allPrices.findIndex(price => {
        const priceDate = new Date(price.time_start);
        return priceDate.getHours() === currentHour && 
               priceDate.getFullYear() === targetDate.getFullYear() &&
               priceDate.getMonth() === targetDate.getMonth() &&
               priceDate.getDate() === targetDate.getDate();
    });

    let upcomingPrices;
    if (currentIndex !== -1) {
        // Get next 7 prices after current hour
        upcomingPrices = allPrices.slice(currentIndex + 1, currentIndex + 8);
    } else {
        // If current hour not found, start from the first price
        upcomingPrices = allPrices.slice(0, 7);
    }
    
    // Update each upcoming price slot
    upcomingPrices.forEach((price, index) => {
        const element = document.getElementById(`upcoming-${index + 1}`);
        if (!element) return;

        const priceDate = new Date(price.time_start);
        const priceValue = (price.SEK_per_kWh * 100).toFixed(2);
        const hour = priceDate.getHours();
        const isNextDayPrice = isNextDay(priceDate, priceDate); // Compare with target date
        
        element.querySelector('.price-value').textContent = priceValue;
        element.querySelector('.hour-label').textContent = `${String(hour).padStart(2, '0')}:00${isNextDayPrice ? ' •' : ''}`;
        
        element.classList.remove('price-low', 'price-medium', 'price-high', 'next-day');
        const level = getPriceLevel(price, stats);
        element.classList.add(`price-${level}`);

        if (isNextDayPrice) {
            element.classList.add('next-day');
        }
    });

    // Clear any unused slots
    for (let i = upcomingPrices.length + 1; i <= 7; i++) {
        const element = document.getElementById(`upcoming-${i}`);
        if (element) {
            element.querySelector('.price-value').textContent = '-';
            element.querySelector('.hour-label').textContent = '-';
            element.classList.remove('price-low', 'price-medium', 'price-high', 'next-day');
        }
    }
}

// Function to fetch and update data
async function fetchAndUpdateData() {
    setLoading(true);
    try {
        const region = document.getElementById('region').value;
        console.log('Current region:', region);
        
        const targetDate = new Date('2025-02-01');
        console.log('Target date:', targetDate);
        
        // Always fetch both target date and next day's prices
        console.log('Fetching prices...');
        const [todayPrices, tomorrowPrices] = await Promise.all([
            fetchPricesForDate(targetDate, region),
            fetchPricesForDate(getNextDay(targetDate), region)
        ]);
        
        if (!Array.isArray(todayPrices) || !Array.isArray(tomorrowPrices)) {
            throw new Error('Invalid data format received');
        }

        console.log('Today prices:', todayPrices);
        console.log('Tomorrow prices:', tomorrowPrices);

        // Combine all prices for statistics
        const allPrices = [...todayPrices, ...tomorrowPrices];
        if (allPrices.length === 0) {
            throw new Error('No price data available');
        }

        const stats = calculateStatistics(allPrices);
        console.log('Statistics:', stats);

        // Get current price based on the target date's hour
        const now = new Date();
        const currentHour = now.getHours();
        console.log('Current hour:', currentHour);
        
        const currentPrice = todayPrices.find(price => {
            const priceDate = new Date(price.time_start);
            return priceDate.getHours() === currentHour;
        }) || todayPrices[0]; // Fallback to first price if current hour not found
        
        console.log('Current price:', currentPrice);
        
        updateCurrentPrice(currentPrice, stats);
        await updateUpcomingPrices(todayPrices, tomorrowPrices, stats);
        updateChart(allPrices);
        updateTable(allPrices, stats);
        updateStatistics(allPrices);
        updateLastUpdated();
    } catch (error) {
        console.error('Error fetching or updating data:', error);
        document.getElementById('current-price-value').textContent = 'Fel vid laddning av data';
        document.getElementById('min-price').textContent = '-';
        document.getElementById('max-price').textContent = '-';
        document.getElementById('avg-price').textContent = '-';
        // Clear the chart
        if (priceChart) {
            priceChart.destroy();
            priceChart = null;
        }
        // Clear the tables
        document.getElementById('price-table-body-1').innerHTML = '';
        document.getElementById('price-table-body-2').innerHTML = '';
        // Clear upcoming prices
        for (let i = 1; i <= 7; i++) {
            const element = document.getElementById(`upcoming-${i}`);
            if (element) {
                element.querySelector('.price-value').textContent = '-';
                element.querySelector('.hour-label').textContent = '-';
                element.classList.remove('price-low', 'price-medium', 'price-high', 'next-day');
            }
        }
    } finally {
        setLoading(false);
    }
}

// Event listeners
document.getElementById('region').addEventListener('change', fetchAndUpdateData);

// Initial load
document.addEventListener('DOMContentLoaded', fetchAndUpdateData);

// Refresh data every 5 minutes
setInterval(fetchAndUpdateData, 5 * 60 * 1000); 