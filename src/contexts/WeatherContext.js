import React, { createContext, useContext, useEffect, useState } from 'react';
import { weatherService } from '../services/weatherService';

const WeatherContext = createContext();

export const useWeather = () => {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
};

const formatForecastWeather = (forecastData, currentWeather) => {
  // Get the first forecast entry (current/next few hours)
  const currentForecast = forecastData.detailed[0];

  if (!currentForecast) {
    // Fallback to current weather
    return currentWeather;
  }

  return {
    label: currentForecast.description,
    temp: `${Math.round(currentForecast.temp)}°C`,
    icon: currentForecast.icon,
    city: currentWeather.city,
    country: currentWeather.country,
    raw: forecastData
  };
};

export const WeatherProvider = ({ children }) => {
  const [weather, setWeather] = useState({
    label: "Loading...",
    temp: "--°C",
    icon: "partly"
  });
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);
  const [error, setError] = useState(false);

  const fetchWeather = async () => {
    setIsLoadingWeather(true);
    setError(false);

    try {
      // First get current weather to obtain coordinates
      const currentWeather = await weatherService.getCurrentWeatherByCity('Bogo City');

      if (!currentWeather.raw?.coord) {
        throw new Error('Unable to get coordinates for forecast');
      }

      // Get forecast data using coordinates
      const forecastData = await weatherService.getForecast(
        currentWeather.raw.coord.lat,
        currentWeather.raw.coord.lon
      );

      if (!forecastData) {
        // Fallback to current weather if forecast unavailable
        setWeather(currentWeather);
        return;
      }

      // Format forecast data for display
      const formattedForecast = formatForecastWeather(forecastData, currentWeather);

      setWeather(formattedForecast);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError(true);
      setWeather({
        label: "Weather unavailable",
        temp: "--°C",
        icon: "partly"
      });
    } finally {
      setIsLoadingWeather(false);
    }
  };

  useEffect(() => {
    fetchWeather();

    // Auto-refresh every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const refetchWeather = () => {
    fetchWeather();
  };

  const value = {
    weather,
    isLoadingWeather,
    error,
    refetchWeather,
  };

  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
};
