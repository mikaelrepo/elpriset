// Constants and configurations
const UPDATE_INTERVAL = 10 * 60 * 1000; // 10 minutes
const API_BASE_URL = 'https://elprisetjustnu.se/api/v1/prices';
const FALLBACK_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?'
];
const CHART_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false
        }
    },
    scales: {
        x: {
            grid: {
                display: false
            }
        },
        y: {
            beginAtZero: true,
            ticks: {
                callback: value => `${value} öre`
            }
        }
    }
};

// DOM Elements
const elements = {
    regionSelect: document.getElementById('regionSelect'),
    lastUpdated: document.getElementById('lastUpdated'),
    loadingMessage: document.getElementById('loadingMessage'),
    errorMessage: document.getElementById('errorMessage'),
    priceChart: document.getElementById('priceChart'),
    lowestPrice: document.getElementById('lowestPrice'),
    averagePrice: document.getElementById('averagePrice'),
    highestPrice: document.getElementById('highestPrice'),
    hourlyPrices: document.getElementById('hourlyPrices')
};

let chart = null;

// Helper Functions
function formatTime(isoString) {
    return new Date(isoString).toLocaleTimeString('sv-SE', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function updateLastUpdated() {
    elements.lastUpdated.textContent = new Date().toLocaleTimeString('sv-SE', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showLoading() {
    elements.loadingMessage.classList.remove('hidden');
    elements.errorMessage.classList.add('hidden');
    if (chart) {
        chart.canvas.style.opacity = '0.5';
    }
}

function hideLoading() {
    elements.loadingMessage.classList.add('hidden');
    if (chart) {
        chart.canvas.style.opacity = '1';
    }
}

function showError() {
    elements.errorMessage.classList.remove('hidden');
    elements.loadingMessage.classList.add('hidden');
    if (chart) {
        chart.canvas.style.opacity = '0.3';
    }
}

function getColorForPrice(price, minPrice, maxPrice) {
    const range = maxPrice - minPrice;
    const threshold1 = minPrice + range * 0.33;
    const threshold2 = minPrice + range * 0.66;

    if (price <= threshold1) return '#2ecc71';  // Low price - Green
    if (price <= threshold2) return '#f1c40f';  // Medium price - Yellow
    return '#e74c3c';  // High price - Red
}

function formatDateForApi(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}-${day}`;
}

async function checkApiAccessibility() {
    const today = new Date();
    const formattedDate = formatDateForApi(today);
    const url = `${API_BASE_URL}/${formattedDate}_SE3.json`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors', // Try with regular CORS first
            headers: {
                'Accept': 'application/json'
            }
        });
        return response.ok;
    } catch (error) {
        console.error('API accessibility check failed:', error);
        return false;
    }
}

async function tryFetchWithProxies(url) {
    // Try direct fetch first
    try {
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.log('Direct fetch failed, trying proxies...');
    }

    // Try each proxy in sequence
    for (const proxy of FALLBACK_PROXIES) {
        try {
            const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.log(`Proxy ${proxy} failed, trying next...`);
        }
    }

    throw new Error('Kunde inte hämta data från någon källa');
}

// Data Fetching and Processing
async function fetchPrices(region = 'SE3') {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const formattedToday = formatDateForApi(today);
    const url = `${API_BASE_URL}/${formattedToday}_${region}.json`;
    
    try {
        const data = await tryFetchWithProxies(url);
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Ogiltig dataformat: Förväntade icke-tom array');
        }

        // Check if we need tomorrow's data
        const currentHour = today.getHours();
        if (currentHour >= 23) {
            // Try to fetch tomorrow's data
            const formattedTomorrow = formatDateForApi(tomorrow);
            const tomorrowUrl = `${API_BASE_URL}/${formattedTomorrow}_${region}.json`;
            try {
                const tomorrowData = await tryFetchWithProxies(tomorrowUrl);
                if (Array.isArray(tomorrowData) && tomorrowData.length > 0) {
                    // Combine today's and tomorrow's data
                    return [...data, ...tomorrowData];
                }
            } catch (error) {
                console.log('Could not fetch tomorrow\'s data:', error);
            }
        }

        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

function getPriceCategory(price, minPrice, maxPrice) {
    const range = maxPrice - minPrice;
    const threshold1 = minPrice + range * 0.33;
    const threshold2 = minPrice + range * 0.66;

    if (price <= threshold1) return 'low';
    if (price <= threshold2) return 'medium';
    return 'high';
}

function updateHourlyPrices(data, currentHour) {
    const hourlyPricesContainer = elements.hourlyPrices;
    hourlyPricesContainer.innerHTML = ''; // Clear existing boxes

    // Get the next 8 hours of prices
    const nextHours = data.slice(0, 8);
    const minPrice = Math.min(...data.map(item => parseFloat((item.SEK_per_kWh * 100).toFixed(2))));
    const maxPrice = Math.max(...data.map(item => parseFloat((item.SEK_per_kWh * 100).toFixed(2))));

    nextHours.forEach(hourData => {
        const price = parseFloat((hourData.SEK_per_kWh * 100).toFixed(2));
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

function processData(data) {
    // Get current time
    const now = new Date();
    const currentHour = now.getHours();

    // Filter and sort data to start from current hour
    const filteredData = data.filter(item => {
        const itemTime = new Date(item.time_start);
        return itemTime.getHours() >= currentHour;
    });

    // If we filtered out all today's remaining hours, we need tomorrow's data
    if (filteredData.length === 0) {
        console.log('No more prices for today, should fetch tomorrow\'s data');
        return processAllData(data);
    }

    // Update hourly price boxes
    updateHourlyPrices(filteredData, currentHour);

    const prices = filteredData.map(item => parseFloat((item.SEK_per_kWh * 100).toFixed(2)));
    const times = filteredData.map(item => formatTime(item.time_start));
    
    const stats = {
        lowest: Math.min(...prices),
        highest: Math.max(...prices),
        average: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)
    };

    const colors = prices.map(price => getColorForPrice(price, stats.lowest, stats.highest));

    return { prices, times, stats, colors };
}

// Helper function to process all data when needed
function processAllData(data) {
    const prices = data.map(item => parseFloat((item.SEK_per_kWh * 100).toFixed(2)));
    const times = data.map(item => formatTime(item.time_start));
    
    const stats = {
        lowest: Math.min(...prices),
        highest: Math.max(...prices),
        average: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)
    };

    const colors = prices.map(price => getColorForPrice(price, stats.lowest, stats.highest));

    return { prices, times, stats, colors };
}

function updateChart(times, prices, colors) {
    if (chart) {
        chart.destroy();
    }

    const ctx = elements.priceChart.getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: times,
            datasets: [{
                data: prices,
                borderColor: '#2c3e50',
                backgroundColor: 'rgba(44, 62, 80, 0.1)',
                pointBackgroundColor: colors,
                pointRadius: 6,
                pointHoverRadius: 8,
                tension: 0.3
            }]
        },
        options: CHART_OPTIONS
    });
}

function updateStatistics(stats) {
    elements.lowestPrice.textContent = `${stats.lowest} öre`;
    elements.averagePrice.textContent = `${stats.average} öre`;
    elements.highestPrice.textContent = `${stats.highest} öre`;
}

// Main update function
async function updatePrices() {
    showLoading();
    try {
        const region = elements.regionSelect.value;
        const data = await fetchPrices(region);
        
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Ogiltig dataformat: Förväntade icke-tom array');
        }
        
        const { prices, times, stats, colors } = processData(data);
        
        updateChart(times, prices, colors);
        updateStatistics(stats);
        updateLastUpdated();
        hideLoading();
    } catch (error) {
        console.error('Error updating prices:', error);
        let errorMessage = 'Fel vid laddning av data: ';
        
        if (error.message.includes('Failed to fetch')) {
            errorMessage += 'Kunde inte ansluta till servern. Kontrollera din internetanslutning.';
        } else if (error.message.includes('Invalid JSON')) {
            errorMessage += 'Ogiltig data mottagen från servern.';
        } else if (error.message.includes('HTTP error')) {
            errorMessage += 'Servern svarade med ett fel. Försök igen senare.';
        } else {
            errorMessage += error.message;
        }
        
        elements.errorMessage.textContent = errorMessage;
        showError();
    }
}

// Event Listeners
elements.regionSelect.addEventListener('change', updatePrices);

// Initial load and periodic updates
async function initialize() {
    const isApiAccessible = await checkApiAccessibility();
    if (!isApiAccessible) {
        elements.errorMessage.textContent = 'Kunde inte ansluta till API:et. Kontrollera din internetanslutning.';
        showError();
        return;
    }
    
    updatePrices();
    setInterval(updatePrices, UPDATE_INTERVAL);
}

initialize(); 