import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    icon: currentWeather.icon, // Use current weather icon for consistency
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
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState(false);

  const fetchWeather = async (isRefetch = false) => {
    if (!isRefetch) setIsLoadingWeather(true);
    if (!isRefetch) setError(false);

    try {
      // Get custom city from settings, fallback to default
      let city = 'Bogo City';
      try {
        const settings = await AsyncStorage.getItem('pureflowSettings');
        if (settings) {
          const parsedSettings = JSON.parse(settings);
          if (parsedSettings.customCity?.trim()) {
            city = parsedSettings.customCity.trim();
          }
        }
      } catch (settingsError) {
        console.warn('Could not load custom city setting:', settingsError);
      }

      // Get current weather for the configured city
      const currentWeather = await weatherService.getCurrentWeatherByCity(city);

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
        setCurrentWeather(currentWeather);
        setForecastData(null);
        return;
      }

      // Store the raw data for components like WeatherBanner
      setCurrentWeather(currentWeather);
      setForecastData(forecastData);

      // Use current weather for consistent header display
      // Forecast data is stored separately for WeatherBanner use
      setWeather(currentWeather);
    } catch (err) {
      console.error('Weather fetch error:', err);
      if (!isRefetch) {
        setError(true);
        setWeather({
          label: "Weather unavailable",
          temp: "--°C",
          icon: "partly"
        });
      } // For refetch, fail silently without breaking UI
    } finally {
      if (!isRefetch) setIsLoadingWeather(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    // Weather will be refreshed manually via refetchWeather() when needed
  }, []);

  const refetchWeather = () => {
    fetchWeather(true).catch(() => {
      // Retry failed refetch after 2 seconds
      setTimeout(() => fetchWeather(true), 2000);
    });
  };

  const value = {
    weather,
    currentWeather,
    forecastData,
    isLoadingWeather,
    isRefetching,
    error,
    refetchWeather,
  };

  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
};
