// Constants and configurations
const UPDATE_INTERVAL = 10 * 60 * 1000; // 10 minutes
const API_BASE_URL = 'https://elprisetjustnu.se/api/v1/prices';
const FALLBACK_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?'
];
const CACHE_DURATION = 3600000; // 1 hour in milliseconds
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

// Add constant for when to start preparing for midnight transition
const MIDNIGHT_PREP_HOUR = 22; // Start preparing for midnight transition at 22:00

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

// Enhanced cache system
const dataCache = {
    timestamps: new Map(),
    prices: new Map(),
    lastUpdate: null,
    region: null,
    clear() {
        this.timestamps.clear();
        this.prices.clear();
        this.lastUpdate = null;
        cacheStats.lastCleared = new Date();
    }
};

// Cache monitoring
const cacheStats = {
    hits: 0,
    misses: 0,
    lastCleared: null,
    log() {
        const hitRate = this.hits + this.misses === 0 ? 0 :
            (this.hits / (this.hits + this.misses) * 100).toFixed(2);
        console.info('Cache stats:', {
            hitRate: hitRate + '%',
            hits: this.hits,
            misses: this.misses,
            totalRequests: this.hits + this.misses,
            timeSinceCleared: this.lastCleared ? 
                `${Math.round((new Date() - this.lastCleared) / 1000)}s` : 
                'never'
        });
    }
};

// Utility functions for cache management
function getCachedValue(map, key, generator) {
    let value = map.get(key);
    if (value !== undefined) {
        cacheStats.hits++;
        return value;
    }
    cacheStats.misses++;
    value = generator();
    map.set(key, value);
    return value;
}

function shouldInvalidateCache(currentRegion) {
    const now = new Date().getTime();
    return (
        !dataCache.lastUpdate ||
        (now - dataCache.lastUpdate > CACHE_DURATION) ||
        dataCache.region !== currentRegion
    );
}

// Memoized price category function
const memoizedGetPriceCategory = (() => {
    const cache = new Map();
    return (price, minPrice, maxPrice) => {
        const key = `${price}-${minPrice}-${maxPrice}`;
        return getCachedValue(cache, key, () => getPriceCategory(price, minPrice, maxPrice));
    };
})();

// Data validation
function validatePriceData(data) {
    if (!Array.isArray(data) || data.length === 0) {
        return false;
    }
    return data.every(item => (
        item.time_start && 
        typeof item.SEK_per_kWh === 'number' &&
        !isNaN(item.SEK_per_kWh)
    ));
}

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
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const formattedToday = formatDateForApi(today);
    const formattedTomorrow = formatDateForApi(tomorrow);

    const todayUrl = `${API_BASE_URL}/${formattedToday}_${region}.json`;
    const tomorrowUrl = `${API_BASE_URL}/${formattedTomorrow}_${region}.json`;

    try {
        // Always fetch both today's and tomorrow's data
        const [todayData, tomorrowData] = await Promise.allSettled([
            tryFetchWithProxies(todayUrl),
            tryFetchWithProxies(tomorrowUrl)
        ]);

        let combinedData = [];

        if (todayData.status === 'fulfilled' && Array.isArray(todayData.value)) {
            combinedData = [...todayData.value];
        } else {
            console.error('Could not fetch today\'s data:', todayData.reason);
        }

        if (tomorrowData.status === 'fulfilled' && Array.isArray(tomorrowData.value)) {
            combinedData = [...combinedData, ...tomorrowData.value];
        } else {
            console.warn('Could not fetch tomorrow\'s data:', tomorrowData.reason);
        }

        if (combinedData.length === 0) {
            throw new Error('Kunde inte hämta prisdata för varken idag eller imorgon');
        }

        return combinedData;
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

function updateHourlyPrices(data) {
    const hourlyPricesContainer = elements.hourlyPrices;
    hourlyPricesContainer.innerHTML = ''; // Clear existing boxes

    if (!Array.isArray(data) || data.length === 0) {
        const emptyBox = document.createElement('div');
        emptyBox.className = 'price-box no-data';
        emptyBox.innerHTML = '<div class="message">No price data available</div>';
        hourlyPricesContainer.appendChild(emptyBox);
        return;
    }

    // Use cached prices
    const prices = data.map(item => item.parsedPrice || parseFloat((item.SEK_per_kWh * 100).toFixed(2)));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Get the next 8 hours of prices
    const nextHours = data.slice(0, 8);

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

function processData(data) {
    if (!validatePriceData(data)) {
        console.error('Invalid or empty price data received');
        return processHourlyData([], []);
    }

    const now = new Date();
    const currentHourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const currentTimestamp = currentHourStart.getTime();
    const nextHourTimestamp = new Date(currentHourStart).setHours(currentHourStart.getHours() + 1);

    const region = elements.regionSelect.value;
    if (shouldInvalidateCache(region)) {
        console.info('Invalidating cache due to:', {
            region: dataCache.region !== region,
            time: dataCache.lastUpdate ? 'cache expired' : 'no previous cache'
        });
        dataCache.clear();
        dataCache.region = region;
    }

    // Pre-process and cache data
    const processedData = data.map(item => {
        const timeKey = item.time_start;
        const timestamp = getCachedValue(
            dataCache.timestamps,
            timeKey,
            () => new Date(timeKey).getTime()
        );
        const price = getCachedValue(
            dataCache.prices,
            timeKey,
            () => {
                const p = parseFloat((item.SEK_per_kWh * 100).toFixed(2));
                return isNaN(p) ? 0 : p;
            }
        );

        return {
            ...item,
            timestamp,
            parsedPrice: price
        };
    });

    dataCache.lastUpdate = now.getTime();

    // Sort using cached timestamps
    const sortedData = processedData.sort((a, b) => a.timestamp - b.timestamp);

    // Enhanced midnight transition handling
    const currentHour = now.getHours();
    const isNearMidnight = currentHour >= MIDNIGHT_PREP_HOUR;
    const currentDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const tomorrowStart = currentDayStart + 86400000; // Add 24 hours

    // Validate tomorrow's data availability when near midnight
    if (isNearMidnight) {
        const tomorrowHours = sortedData.filter(item => item.timestamp >= tomorrowStart);
        if (tomorrowHours.length === 0) {
            console.warn('No tomorrow\'s data available near midnight');
        } else {
            console.info(`Found ${tomorrowHours.length} hours of tomorrow's data`);
        }
    }

    // Find current hour using cached timestamp
    const currentIndex = sortedData.findIndex(item => item.timestamp === currentTimestamp);

    if (currentIndex >= 0) {
        console.info('Using current hour prices');
        let nextEightHours = sortedData.slice(currentIndex, currentIndex + 8);
        let nextSixteenHours = sortedData.slice(currentIndex, currentIndex + 16);
        
        // Enhanced midnight transition handling
        if (isNearMidnight) {
            // Calculate how many hours we need from tomorrow
            const hoursUntilMidnight = 24 - currentHour;
            const neededTomorrowHours = 8 - hoursUntilMidnight;
            const neededTomorrowHoursChart = 16 - hoursUntilMidnight;
            
            if (neededTomorrowHours > 0) {
                const tomorrowHours = sortedData.filter(item => item.timestamp >= tomorrowStart);
                if (tomorrowHours.length > 0) {
                    // Handle 8-hour view for price boxes
                    if (nextEightHours.length < 8) {
                        const remainingHours = 8 - nextEightHours.length;
                        nextEightHours.push(...tomorrowHours.slice(0, remainingHours));
                    } else {
                        nextEightHours = [
                            ...nextEightHours.slice(0, hoursUntilMidnight),
                            ...tomorrowHours.slice(0, neededTomorrowHours)
                        ];
                    }
                    
                    // Handle 16-hour view for chart
                    if (nextSixteenHours.length < 16) {
                        const remainingHours = 16 - nextSixteenHours.length;
                        nextSixteenHours.push(...tomorrowHours.slice(0, remainingHours));
                    } else {
                        nextSixteenHours = [
                            ...nextSixteenHours.slice(0, hoursUntilMidnight),
                            ...tomorrowHours.slice(0, neededTomorrowHoursChart)
                        ];
                    }
                }
            }
        }
        
        if (nextEightHours.length < 8) {
            console.warn(`Could only get ${nextEightHours.length} hours of price data for boxes`);
        }
        if (nextSixteenHours.length < 16) {
            console.warn(`Could only get ${nextSixteenHours.length} hours of price data for chart`);
        }
        
        preloadNextHourData(currentHourStart);
        return processHourlyData(nextEightHours, nextSixteenHours);
    }

    // Look for next available hour, including tomorrow's hours
    const nextIndex = sortedData.findIndex(item => 
        item.timestamp >= nextHourTimestamp
    );

    if (nextIndex >= 0) {
        console.info('Using next available future hour prices');
        const nextEightHours = sortedData.slice(nextIndex, nextIndex + 8);
        const nextSixteenHours = sortedData.slice(nextIndex, nextIndex + 16);
        return processHourlyData(nextEightHours, nextSixteenHours);
    }

    // If no future hours, find the most recent past hour
    const lastIndex = sortedData.findIndex(item => 
        item.timestamp < currentTimestamp
    );

    if (lastIndex >= 0) {
        console.info('Using most recent past hour due to no future data available');
        const nextEightHours = sortedData.slice(lastIndex, lastIndex + 8);
        const nextSixteenHours = sortedData.slice(lastIndex, lastIndex + 16);
        return processHourlyData(nextEightHours, nextSixteenHours);
    }

    console.warn('No valid price data found for any time period');
    return processHourlyData([], []);
}

function processHourlyData(hours, chartHours = hours) {
    // Validate cache integrity
    const hasValidCache = hours.every(item => 
        typeof item.parsedPrice === 'number' && 
        typeof item.timestamp === 'number'
    );

    if (!hasValidCache) {
        console.error('Cache integrity check failed');
        dataCache.clear();
        return {
            prices: [],
            times: [],
            stats: { lowest: 0, highest: 0, average: '0.00' },
            colors: []
        };
    }

    if (hours.length < 8) {
        console.warn(`Limited price data: only ${hours.length} hours available for boxes`);
    }
    if (chartHours.length < 16) {
        console.warn(`Limited price data: only ${chartHours.length} hours available for chart`);
    }

    // Use chart hours for statistics to include all visible prices
    const prices = chartHours.map(item => item.parsedPrice);
    
    const stats = {
        lowest: Math.min(...prices),
        highest: Math.max(...prices),
        average: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)
    };

    const colors = chartHours.map(price => 
        memoizedGetPriceCategory(price, stats.lowest, stats.highest)
    );

    const times = chartHours.map(item => formatTime(item.time_start));

    updateHourlyPrices(hours);
    cacheStats.log();

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
elements.regionSelect.addEventListener('change', (e) => {
    const newRegion = e.target.value;
    saveRegionPreference(newRegion);
    updatePrices();
});

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
    // Restore the selected region
    const savedRegion = await getRegionPreference();
    elements.regionSelect.value = savedRegion;

    const isApiAccessible = await checkApiAccessibility();
    if (!isApiAccessible) {
        elements.errorMessage.textContent = 'Kunde inte ansluta till API:et. Kontrollera din internetanslutning.';
        showError();
        return;
    }

    updatePrices();
    setInterval(updatePrices, UPDATE_INTERVAL);
}

// Preload next hour's data
function preloadNextHourData(currentHour) {
    const nextHour = new Date(currentHour);
    nextHour.setHours(currentHour.getHours() + 1);
    // Log preloading attempt
    console.info('Preloading data for next hour:', formatTime(nextHour));
}

// Add these utility functions near the top
function setCookie(name, value, days = 365) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

async function saveRegionPreference(region) {
    // Primary storage: localStorage
    try {
        localStorage.setItem('selectedRegion', region);
    } catch (e) {
        console.warn('Could not save to localStorage:', e);
    }
    
    // Backup storage: cookie
    try {
        setCookie('selectedRegion', region);
    } catch (e) {
        console.warn('Could not save to cookie:', e);
    }

    // PWA Service Worker storage
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
            // Create a message channel
            const messageChannel = new MessageChannel();
            
            // Return a promise that resolves when the SW responds
            const swResponse = new Promise((resolve) => {
                messageChannel.port1.onmessage = (event) => {
                    resolve(event.data.success);
                };
            });
            
            // Send the message to the SW
            navigator.serviceWorker.controller.postMessage(
                {
                    type: 'SET_REGION',
                    region: region
                },
                [messageChannel.port2]
            );
            
            await swResponse;
        } catch (e) {
            console.warn('Could not save to Service Worker cache:', e);
        }
    }
}

async function getRegionPreference() {
    // Try localStorage first
    const regionFromLocal = localStorage.getItem('selectedRegion');
    if (regionFromLocal && ['SE1', 'SE2', 'SE3', 'SE4'].includes(regionFromLocal)) {
        return regionFromLocal;
    }
    
    // Try cookie as backup
    const regionFromCookie = getCookie('selectedRegion');
    if (regionFromCookie && ['SE1', 'SE2', 'SE3', 'SE4'].includes(regionFromCookie)) {
        return regionFromCookie;
    }

    // Try PWA Service Worker cache as final backup
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
            const cache = await caches.open('elpris-preferences-v1');
            const response = await cache.match('preferences');
            if (response) {
                const preferences = await response.json();
                if (preferences.region && ['SE1', 'SE2', 'SE3', 'SE4'].includes(preferences.region)) {
                    return preferences.region;
                }
            }
        } catch (e) {
            console.warn('Could not read from Service Worker cache:', e);
        }
    }
    
    // Default to SE3 if no stored preference
    return 'SE3';
}

initialize(); 