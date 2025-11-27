import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './config';
import Constants from 'expo-constants';

const RATINGS_COLLECTION = 'ratings';

const FEATURES = ['dashboard', 'forecast', 'notifications', 'report', 'aiInsights'];

/**
 * Get unique user identifier (device installation ID)
 * @returns {string} Unique user identifier
 */
export const getUserId = () => {
  return Constants.installationId || 'anonymous-' + Date.now();
};

/**
 * Check if user has already submitted ratings
 * @returns {Promise<boolean>} True if user has rated before
 */
export const checkUserRated = async () => {
  try {
    const userId = getUserId();
    const q = query(
      collection(db, RATINGS_COLLECTION),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking user rating status:', error);
    // Return false on error to allow rating (fail gracefully)
    return false;
  }
};

/**
 * Submit feature ratings to Firebase
 * @param {Object} ratings - Rating data
 * @param {number} ratings.dashboard - Dashboard rating 1-5
 * @param {number} ratings.forecast - Forecast rating 1-5
 * @param {number} ratings.notifications - Notifications rating 1-5
 * @param {number} ratings.report - Report rating 1-5
 * @param {number} ratings.aiInsights - AI Insights rating 1-5
 * @param {string} globalComment - General comment (optional)
 * @param {string} globalSuggestions - Suggestions (optional)
 * @returns {Promise<Object>} Success status and data
 */
export const submitRating = async (ratings, globalComment, globalSuggestions) => {
  try {
    // Validate ratings - allow submission if:
    // 1. At least one feature is rated, OR
    // 2. App rating is provided, OR
    // 3. Global comment (issue report) is provided
    const hasFeatureRatings = FEATURES.some(feature => {
      const rating = ratings[feature];
      return rating && rating >= 1 && rating <= 5;
    });

    const hasAppRating = ratings.app && ratings.app >= 1 && ratings.app <= 5;
    const hasIssueReport = globalComment?.trim();

    if (!hasFeatureRatings && !hasAppRating && !hasIssueReport) {
      throw new Error('At least one feature must be rated, or provide an app rating or issue report');
    }

    // Check uniqueness
    const alreadyRated = await checkUserRated();
    if (alreadyRated) {
      throw new Error('User has already submitted feedback');
    }

    const userId = getUserId();

    const ratingData = {
      userId,
      timestamp: Timestamp.now(),
      ratings: {
        dashboard: ratings.dashboard || 0,
        forecast: ratings.forecast || 0,
        notifications: ratings.notifications || 0,
        report: ratings.report || 0,
        aiInsights: ratings.aiInsights || 0,
      },
      globalComment: globalComment?.trim() || '',
      globalSuggestions: globalSuggestions?.trim() || '',
    };

    const docRef = await addDoc(collection(db, RATINGS_COLLECTION), ratingData);

    return {
      success: true,
      docId: docRef.id,
      data: ratingData,
    };
  } catch (error) {
    console.error('Error submitting rating:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  getUserId,
  checkUserRated,
  submitRating,
};
