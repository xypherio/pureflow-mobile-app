// src/contexts/SuggestionContext.js
import { useData } from '@contexts/DataContext';
import { generateSuggestions } from '@services/suggestionEngine';
import React, { createContext, useCallback, useContext, useState } from 'react';

// Create the context
const SuggestionContext = createContext();

// Create a provider component
export const SuggestionProvider = ({ children }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { sensorData } = useData(); // Access sensorData from DataContext

  const fetchSuggestions = useCallback(() => {
    if (!sensorData || sensorData.pH === null) { // Check if sensorData is available and valid
      setSuggestions([]); // Clear suggestions if no data
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Generate a single suggestion object from the engine
      const newSuggestion = generateSuggestions(sensorData);
      
      // The UI expects an array, so we wrap it in an array
      setSuggestions(newSuggestion ? [newSuggestion] : []);
      
    } catch (err) {
      setError(err);
      console.error('Error generating suggestions:', err);
    } finally {
      setLoading(false);
    }
  }, [sensorData]);

  const value = {
    suggestions,
    loading,
    error,
    fetchSuggestions,
  };

  return (
    <SuggestionContext.Provider value={value}>
      {children}
    </SuggestionContext.Provider>
  );
};

// Create a custom hook for using the context
export const useSuggestions = () => {
  const context = useContext(SuggestionContext);
  if (context === undefined) {
    throw new Error('useSuggestions must be used within a SuggestionProvider');
  }
  return context;
};
