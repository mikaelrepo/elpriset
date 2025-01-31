// Chart instance
let priceChart = null;

// Function to format date to YYYY/MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}-${day}`;
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
    // Compare year, month, and day
    return priceDate.getFullYear() > referenceDate.getFullYear() ||
           (priceDate.getFullYear() === referenceDate.getFullYear() &&
            (priceDate.getMonth() > referenceDate.getMonth() ||
             (priceDate.getMonth() === referenceDate.getMonth() &&
              priceDate.getDate() > referenceDate.getDate())));
}

// Function to get current hour's price
function getCurrentPrice(todayPrices, tomorrowPrices) {
    const now = new Date();
    const currentHour = now.getHours();
    
    // First try to find price in today's prices
    const todayPrice = todayPrices.find(price => {
        const priceDate = new Date(price.time_start);
        return priceDate.getHours() === currentHour && 
               !isNextDay(priceDate, now);
    });

    if (todayPrice) return todayPrice;

    // If not found in today's prices, check tomorrow's prices
    return tomorrowPrices.find(price => {
        const priceDate = new Date(price.time_start);
        return priceDate.getHours() === currentHour;
    });
}

// Function to sort and filter prices from current hour
function getPricesFromCurrentHour(prices) {
    const now = new Date();
    const currentHour = now.getHours();
    
    const sortedPrices = [...prices].sort((a, b) => new Date(a.time_start) - new Date(b.time_start));
    
    // Find current hour's index with consistent date check
    const currentIndex = sortedPrices.findIndex(price => {
        const priceDate = new Date(price.time_start);
        return priceDate.getHours() === currentHour && 
               !isNextDay(priceDate, now);
    });
    
    if (currentIndex === -1) {
        // If current hour not found in prices, filter for prices after current time
        return sortedPrices.filter(price => {
            const priceDate = new Date(price.time_start);
            return priceDate >= now;
        });
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
    const url = `https://www.elprisetjustnu.se/api/v1/prices/${dateStr}_${region}.json`;
    const response = await fetch(url);
    return await response.json();
}

// Function to update upcoming prices
async function updateUpcomingPrices(todayPrices, tomorrowPrices, stats) {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Combine and sort all prices
    let allPrices = [...todayPrices, ...tomorrowPrices].sort((a, b) => 
        new Date(a.time_start) - new Date(b.time_start)
    );

    // Find the current price's position
    const currentIndex = allPrices.findIndex(price => {
        const priceDate = new Date(price.time_start);
        return priceDate.getHours() === currentHour && 
               !isNextDay(priceDate, now);
    });

    let upcomingPrices;
    if (currentIndex !== -1) {
        // Get next 7 prices after current hour
        upcomingPrices = allPrices.slice(currentIndex + 1, currentIndex + 8);
    } else {
        // If we're past midnight or current hour not found
        // Filter prices that are after current time
        upcomingPrices = allPrices.filter(price => {
            const priceDate = new Date(price.time_start);
            return priceDate > now;
        }).slice(0, 7);
    }
    
    // Update each upcoming price slot
    upcomingPrices.forEach((price, index) => {
        const element = document.getElementById(`upcoming-${index + 1}`);
        if (!element) return;

        const priceDate = new Date(price.time_start);
        const priceValue = (price.SEK_per_kWh * 100).toFixed(2);
        const hour = priceDate.getHours();
        const isNextDayPrice = isNextDay(priceDate, now);
        
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
        const today = new Date();
        
        // Always fetch both today's and tomorrow's prices
        const [todayPrices, tomorrowPrices] = await Promise.all([
            fetchPricesForDate(today, region),
            fetchPricesForDate(getNextDay(today), region)
        ]);

        // Combine all prices for statistics
        const allPrices = [...todayPrices, ...tomorrowPrices];
        const stats = calculateStatistics(allPrices);

        // Get current price with explicit today/tomorrow check
        const currentPrice = getCurrentPrice(todayPrices, tomorrowPrices);
        
        updateCurrentPrice(currentPrice, stats);
        await updateUpcomingPrices(todayPrices, tomorrowPrices, stats);
        updateChart(allPrices);
        updateTable(allPrices, stats);
        updateStatistics(allPrices);
        updateLastUpdated();
    } catch (error) {
        console.error('Fel vid hämtning av data:', error);
        document.getElementById('current-price-value').textContent = 'Fel vid laddning av data';
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