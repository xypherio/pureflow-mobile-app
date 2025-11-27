import React from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors } from '../../constants/colors';

const StarRating = ({ rating = 0, onRatingChange, size = 24, disabled = false }) => {
  const handlePress = (newRating) => {
    if (!disabled && onRatingChange) {
      onRatingChange(newRating === rating ? 0 : newRating); // Allow unselect
    }
  };

  const renderStar = (starIndex) => {
    const isFilled = starIndex <= rating;
    const scaleValue = new Animated.Value(1);

    const handleStarPress = () => {
      // Add bounce animation
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      handlePress(starIndex);
    };

    return (
      <TouchableOpacity
        key={starIndex}
        onPress={handleStarPress}
        disabled={disabled}
        style={styles.starContainer}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
          <Star
            size={size}
            color={isFilled ? colors.primary : colors.border}
            fill={isFilled ? colors.primary : 'transparent'}
            strokeWidth={2}
          />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map(renderStar)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  starContainer: {
    padding: 4,
    marginHorizontal: 2,
  },
});

export default StarRating;
