import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { X, Send } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import StarRating from '../ui/StarRating';
import { submitRating } from '../../services/firebase/ratingService';

const FeatureRatingModal = ({ visible, onClose, onSuccess }) => {
  const [ratings, setRatings] = useState({
    dashboard: 0,
    forecast: 0,
    notifications: 0,
    report: 0,
    aiInsights: 0,
  });

  const [comment, setComment] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRatingChange = (feature, rating) => {
    setRatings(prev => ({
      ...prev,
      [feature]: rating,
    }));
  };

  const handleSubmit = async () => {
    // Check if at least one rating is given
    const hasRatings = Object.values(ratings).some(r => r > 0);
    if (!hasRatings) {
      Alert.alert('Required', 'Please rate at least one feature.');
      return;
    }

    setLoading(true);
    try {
      const result = await submitRating(ratings, comment, suggestions);

      if (result.success) {
        Alert.alert(
          'Thank You!',
          'Your feedback has been submitted successfully.',
          [{ text: 'OK', onPress: onClose }]
        );
        onSuccess?.();
        resetForm();
      } else {
        if (result.error === 'User has already submitted feedback') {
          Alert.alert('Already Submitted', 'You have already provided feedback for this app.');
          onClose();
        } else {
          Alert.alert('Error', 'Failed to submit feedback. Please try again.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRatings({
      dashboard: 0,
      forecast: 0,
      notifications: 0,
      report: 0,
      aiInsights: 0,
    });
    setComment('');
    setSuggestions('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };



  const features = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'forecast', label: 'Forecast' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'report', label: 'Report' },
    { key: 'aiInsights', label: 'AI Insights' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Rate App Features</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Features Rating */}
            {features.map((feature) => (
              <View key={feature.key} style={styles.featureContainer}>
                <Text style={styles.featureTitle}>{feature.label}</Text>
                <StarRating
                  rating={ratings[feature.key]}
                  onRatingChange={(rating) => handleRatingChange(feature.key, rating)}
                  disabled={loading}
                />
              </View>
            ))}

            {/* Comment Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>General Comment (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Share your overall experience..."
                value={comment}
                onChangeText={setComment}
                multiline={false}
                maxLength={200}
                editable={!loading}
              />
            </View>

            {/* Suggestions Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Suggestions (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="What would you like to see improved..."
                value={suggestions}
                onChangeText={setSuggestions}
                multiline={true}
                numberOfLines={3}
                maxLength={500}
                editable={!loading}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Send size={18} color={colors.white} style={styles.sendIcon} />
                  <Text style={styles.submitButtonText}>Submit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
    minHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  featureContainer: {
    marginVertical: 16,
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    marginVertical: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  buttonsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginLeft: 8,
  },
  sendIcon: {
    marginRight: 8,
  },
});

export default FeatureRatingModal;
