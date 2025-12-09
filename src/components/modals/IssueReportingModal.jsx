
/** IssueReportingModal - Modal for submitting bug reports, feedback, or feature requests to the development team */
import { Send, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../constants/colors';
import { submitRating } from '../../services/firebase/ratingService';

const IssueReportingModal = ({ visible, onClose }) => {
  const [issueText, setIssueText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!issueText.trim()) {
      Alert.alert('Required', 'Please describe the issue or provide feedback.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit to Firebase as issue report
      const result = await submitRating(
        {}, // No rating
        `ISSUE REPORT: ${issueText.trim()}`,
        ''
      );

      if (result.success) {
        Alert.alert(
          'Issue Reported',
          'Thank you for your feedback. We\'ll review it shortly.',
          [{ text: 'OK', onPress: onClose }]
        );
        setIssueText('');
      } else {
        Alert.alert('Error', 'Failed to submit issue report. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting issue:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIssueText('');
    onClose();
  };

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
            <Text style={styles.title}>Report an Issue</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.description}>
                Help us improve PureFlow by reporting bugs, suggesting features, or sharing any issues you've encountered.
              </Text>
            </View>

            {/* Issue Description Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Issue Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe the problem or share your suggestions..."
                value={issueText}
                onChangeText={setIssueText}
                multiline={true}
                numberOfLines={6}
                maxLength={1000}
                textAlignVertical="top"
                editable={!isSubmitting}
              />
              <Text style={styles.characterCount}>
                {issueText.length}/1000 characters
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={isSubmitting || !issueText.trim()}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Send size={18} color={colors.white} style={styles.sendIcon} />
                  <Text style={styles.submitButtonText}>Submit Report</Text>
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
    maxHeight: "70%",
    minHeight: "53%",
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
  section: {
    marginVertical: 16,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
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
    minHeight: 120,
    textAlignVertical: 'top',
  },
  textArea: {
    minHeight: 120,
  },
  characterCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
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

export default IssueReportingModal;
