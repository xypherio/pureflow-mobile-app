// src/services/weatherService.js
import React from 'react';

const OPENWEATHER_API_KEY = 'cfc684f3ee51ebfad72c9b7f5c063484';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

export const weatherService = {
  // Get current weather by coordinates
  async getCurrentWeather(lat, lon) {
    try {
      const response = await fetch(
        `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      const data = await response.json();
      return this.formatWeatherData(data);
    } catch (error) {
      console.error('Error fetching current weather:', error);
      return this.getFallbackWeather();
    }
  },

  // Get current weather by city name
  async getCurrentWeatherByCity(cityName) {
    try {
      const response = await fetch(
        `${BASE_URL}/weather?q=${cityName}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      const data = await response.json();
      return this.formatWeatherData(data);
    } catch (error) {
      console.error('Error fetching weather by city:', error);
      return this.getFallbackWeather();
    }
  },

  // Get 5-day forecast
  async getForecast(lat, lon) {
    try {
      const response = await fetch(
        `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );
      
      if (!response.ok) {
        throw new Error(`Forecast API error: ${response.status}`);
      }
      
      const data = await response.json();
      return this.formatForecastData(data);
    } catch (error) {
      console.error('Error fetching forecast:', error);
      return null;
    }
  },

  // Format weather data for our components
  formatWeatherData(data) {
    const weatherCode = data.weather[0].id;
    const weatherMain = data.weather[0].main.toLowerCase();
    
    return {
      label: data.weather[0].description,
      temp: `${Math.round(data.main.temp)}°C`,
      icon: this.getWeatherIcon(weatherCode, weatherMain),
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      city: data.name,
      country: data.sys.country,
      raw: data
    };
  },

  // Format forecast data
  formatForecastData(data) {
    // Get today's forecast (next 12 hours)
    const today = data.list.slice(0, 4); // Next 4 time periods (12 hours)
    const todayWeather = today[0];
    
    const forecast = `Today: ${todayWeather.weather[0].description}, High ${Math.round(todayWeather.main.temp_max)}°C`;
    
    return {
      forecast,
      detailed: data.list.map(item => ({
        time: new Date(item.dt * 1000),
        temp: Math.round(item.main.temp),
        description: item.weather[0].description,
        icon: this.getWeatherIcon(item.weather[0].id, item.weather[0].main.toLowerCase())
      }))
    };
  },

  // Map OpenWeather codes to our icon types
  getWeatherIcon(code, main) {
    // Rain
    if (code >= 200 && code < 600) return 'rain';
    
    // Clear sky
    if (code === 800) return 'sunny';
    
    // Clouds
    if (code > 800 && code < 900) return 'partly';
    
    // Default based on main weather
    switch (main) {
      case 'rain':
      case 'drizzle':
      case 'thunderstorm':
        return 'rain';
      case 'clear':
        return 'sunny';
      case 'clouds':
        return 'partly';
      default:
        return 'partly';
    }
  },

  // Fallback weather data when API fails
  getFallbackWeather() {
    return {
      label: 'Weather unavailable',
      temp: '--°C',
      icon: 'partly',
      humidity: null,
      windSpeed: null,
      city: '',
      country: ''
    };
  }
};

// Hook for getting user's location and weather
export const useWeatherData = () => {
  const [weatherData, setWeatherData] = React.useState(null);
  const [forecastData, setForecastData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const fetchWeatherData = async (lat = null, lon = null, city = null) => {
    setLoading(true);
    setError(null);

    try {
      let weather;
      let forecast = null;

      if (lat && lon) {
        weather = await weatherService.getCurrentWeather(lat, lon);
        forecast = await weatherService.getForecast(lat, lon);
      } else if (city) {
        weather = await weatherService.getCurrentWeatherByCity(city);
      } else {
        // Default to Mandaue City, Philippines (user's location)
        weather = await weatherService.getCurrentWeatherByCity('Cebu City');
      }

      setWeatherData(weather);
      setForecastData(forecast);
    } catch (err) {
      setError(err.message);
      setWeatherData(weatherService.getFallbackWeather());
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchWeatherData();
  }, []);

  return {
    weatherData,
    forecastData,
    loading,
    error,
    refetch: fetchWeatherData
  };
};
