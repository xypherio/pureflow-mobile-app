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
      // You can also use coordinates if you have location permissions
      // const weatherData = await weatherService.getCurrentWeather(10.3157, 123.9223); // Mandaue coordinates
      const weatherData = await weatherService.getCurrentWeatherByCity('Bogo City');
      setWeather(weatherData);
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
