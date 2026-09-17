/**
 * CORE UTILITIES (Extended)
 * get_weather — Weather by location (wttr.in, no API key)
 * execute_code — Alias routing to run_code
 */

import fetch from 'node-fetch';

/**
 * get_weather — real weather data via wttr.in (free, no key)
 */
async function getWeather(params) {
    const location = params.location || params.city || 'New York';
    const units = params.units || 'metric'; // metric or imperial
    try {
        const fmt = units === 'imperial' ? 'u' : 'm';
        const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1&${fmt}`;
        const res = await fetch(url, { timeout: 10000 });
        if (!res.ok) throw new Error(`Weather API returned ${res.status}`);
        const data = await res.json();

        const current = data.current_condition?.[0] || {};
        const area = data.nearest_area?.[0] || {};
        const forecast = (data.weather || []).slice(0, 3);

        return {
            success: true,
            location: area.areaName?.[0]?.value || location,
            region: area.region?.[0]?.value || '',
            country: area.country?.[0]?.value || '',
            current: {
                temp: units === 'imperial' ? `${current.temp_F}°F` : `${current.temp_C}°C`,
                feelsLike: units === 'imperial' ? `${current.FeelsLikeF}°F` : `${current.FeelsLikeC}°C`,
                humidity: `${current.humidity}%`,
                windSpeed: units === 'imperial' ? `${current.windspeedMiles} mph` : `${current.windspeedKmph} km/h`,
                windDir: current.winddir16Point,
                description: current.weatherDesc?.[0]?.value || '',
                visibility: `${current.visibility} km`,
                uvIndex: current.uvIndex,
                pressure: `${current.pressure} mb`,
                cloudCover: `${current.cloudcover}%`,
                precipitation: `${current.precipMM} mm`,
            },
            forecast: forecast.map(day => ({
                date: day.date,
                maxTemp: units === 'imperial' ? `${day.maxtempF}°F` : `${day.maxtempC}°C`,
                minTemp: units === 'imperial' ? `${day.mintempF}°F` : `${day.mintempC}°C`,
                avgTemp: units === 'imperial' ? `${day.avgtempF}°F` : `${day.avgtempC}°C`,
                description: day.hourly?.[4]?.weatherDesc?.[0]?.value || '',
                chanceOfRain: `${day.hourly?.[4]?.chanceofrain || 0}%`,
                totalSnow: `${day.totalSnow_cm} cm`,
                sunHours: day.sunHour,
            })),
            units,
        };
    } catch (err) {
        return { success: false, error: `Weather lookup failed: ${err.message}` };
    }
}

export default {
    getWeather,
};
