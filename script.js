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
    hourlyPrices: document.getElementById('hourlyPrices'),
    installButton: document.getElementById('installButton')
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
    const formattedTomorrow = formatDateForApi(tomorrow);

    const todayUrl = `${API_BASE_URL}/${formattedToday}_${region}.json`;
    const tomorrowUrl = `${API_BASE_URL}/${formattedTomorrow}_${region}.json`;

    try {
        // Fetch today's data
        const todayData = await tryFetchWithProxies(todayUrl);
        if (!Array.isArray(todayData) || todayData.length === 0) {
            throw new Error('Ogiltig dataformat: Förväntade icke-tom array');
        }

        // Always try to fetch tomorrow's data
        let tomorrowData = [];
        try {
            tomorrowData = await tryFetchWithProxies(tomorrowUrl);
            if (!Array.isArray(tomorrowData)) {
                tomorrowData = [];
            }
        } catch (error) {
            console.log('Could not fetch tomorrow\'s data:', error);
        }

        // Combine today's and tomorrow's data
        return [...todayData, ...tomorrowData];
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
    const currentMinutes = now.getMinutes();

    // Filter data to get prices from current hour onwards
    const filteredData = data.filter(item => {
        const itemTime = new Date(item.time_start);
        // Include the price if it's a future hour, or if it's the current hour
        if (itemTime.getHours() > currentHour) {
            return true;
        }
        if (itemTime.getHours() === currentHour && currentMinutes < 59) {
            return true;
        }
        return false;
    });

    // Sort the filtered data by time
    const sortedData = filteredData.sort((a, b) =>
        new Date(a.time_start) - new Date(b.time_start)
    );

    // Take only the next 8 hours
    const nextEightHours = sortedData.slice(0, 8);

    // If we don't have enough hours, try to get more from tomorrow
    if (nextEightHours.length < 8) {
        console.log('Not enough future prices available');
    }

    // Update hourly price boxes with the next 8 hours
    updateHourlyPrices(nextEightHours);

    const prices = nextEightHours.map(item => parseFloat((item.SEK_per_kWh * 100).toFixed(2)));
    const times = nextEightHours.map(item => formatTime(item.time_start));

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

// PWA Installation handling
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show the install button
    elements.installButton.classList.remove('hidden');
});

elements.installButton.addEventListener('click', async () => {
    if (!deferredPrompt) {
        return;
    }
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // Clear the deferredPrompt variable
    deferredPrompt = null;
    // Hide the install button
    elements.installButton.classList.add('hidden');
});

window.addEventListener('appinstalled', () => {
    // Clear the deferredPrompt variable
    deferredPrompt = null;
    // Hide the install button
    elements.installButton.classList.add('hidden');
    // Optionally, show a thank you message or perform other actions
    console.log('PWA was installed');
});

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.error('ServiceWorker registration failed: ', err);
            });
    });
}

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