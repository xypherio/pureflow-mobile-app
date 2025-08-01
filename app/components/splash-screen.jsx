import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import dataPreloader from '../../backend/services/dataPreloader';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onDataLoaded }) {
  const [loadingText, setLoadingText] = useState('Initializing...');
  const [progress, setProgress] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Start data preloading
    preloadAppData();
  }, []);

  const preloadAppData = async () => {
    try {
      // Step 1: Initialize Firebase
      setLoadingText('Connecting to Firebase...');
      setProgress(20);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Load sensor data
      setLoadingText('Loading sensor data...');
      setProgress(50);
      
      const data = await dataPreloader.preloadData();
      
      // Step 3: Process alerts
      setLoadingText('Processing alerts...');
      setProgress(80);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 4: Finalizing
      setLoadingText('Almost ready...');
      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Notify parent component that data is loaded
      onDataLoaded(data);

    } catch (error) {
      console.error('Error during data preloading:', error);
      setLoadingText('Error loading data. Retrying...');
      
      // Retry after a delay
      setTimeout(() => {
        preloadAppData();
      }, 2000);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#1a2d51', '#2c5aa0', '#4a90e2']}
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            alignItems: 'center',
          }}
        >
          {/* Logo/App Name */}
          <View style={{
            marginBottom: 60,
            alignItems: 'center',
          }}>
            <Text style={{
              fontSize: 36,
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: 8,
              textAlign: 'center',
            }}>
              PureFlow
            </Text>
            <Text style={{
              fontSize: 16,
              color: '#b8d4f0',
              textAlign: 'center',
            }}>
              Water Quality Monitoring
            </Text>
          </View>

          {/* Loading Indicator */}
          <View style={{
            alignItems: 'center',
            marginBottom: 40,
          }}>
            <ActivityIndicator 
              size="large" 
              color="#ffffff" 
              style={{ marginBottom: 20 }}
            />
            
            {/* Progress Bar */}
            <View style={{
              width: 200,
              height: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: 2,
              marginBottom: 16,
            }}>
              <Animated.View
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: '#ffffff',
                  borderRadius: 2,
                }}
              />
            </View>

            <Text style={{
              fontSize: 14,
              color: '#e8f2ff',
              textAlign: 'center',
            }}>
              {loadingText}
            </Text>
          </View>

          {/* Version Info */}
          <Text style={{
            position: 'absolute',
            bottom: -100,
            fontSize: 12,
            color: 'rgba(255, 255, 255, 0.6)',
            textAlign: 'center',
          }}>
            Version 1.0.0
          </Text>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}
