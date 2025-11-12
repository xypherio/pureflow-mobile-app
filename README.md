# PUREFLOW: IOT-DRIVEN REAL-TIME SYSTEM FOR REMOTE FISHPOND WATER QUALITY MONITORING

"Ensuring a Healthier Water Future with Intelligent Monitoring"

## Table of Contents
- [Project Overview](#project-overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Recent Updates](#recent-updates)
- [Technical Implementation](#technical-implementation)
- [Performance Features](#performance-features)
- [Error Handling](#error-handling)
- [AI Integration](#ai-integration)
- [Development](#development)

## Project Overview

PureFlow Mobile is an advanced Expo-based mobile application designed for comprehensive water quality monitoring and management. It addresses the critical need for accessible and actionable water quality data, empowering fishpond owners to maintain optimal water conditions. By providing real-time data visualization, intelligent alerts, predictive forecasting, and AI-powered insights, PureFlow Mobile helps prevent water-related issues and promotes a healthier environment.

Built with modern React Native and Expo technologies, PureFlow Mobile delivers a production-ready solution with enterprise-level error handling, performance optimization, and user experience design.

## Features

### Core Monitoring Features
-   **Real-time Data Monitoring:** Visualize essential water quality parameters (pH, Temperature, Salinity, Turbidity) through intuitive real-time data cards with live updates
-   **Water Quality Forecasting:** ML-powered predictions for future water quality parameters with trend analysis and breach detection
-   **Interactive Charts & Reports:** Generate detailed reports and explore historical water quality data with interactive line charts and comprehensive analytics
-   **Smart Notifications & Alerts:** Receive timely and customizable alerts based on predefined thresholds and critical water quality events with native push notifications
-   **Data Export & Sharing:** Easily export comprehensive reports as PDFs and CSVs, share critical water quality information with stakeholders

### Advanced AI Features
-   **AI-Powered Insights & Forecasting:** Leverage Google's Gemini AI to gain insightful suggestions and predictive forecasts regarding water quality trends
-   **Interval-Based AI Processing:** Smart 10-minute intervals for AI requests to prevent quota exhaustion while maintaining data freshness
-   **Intelligent Caching:** Advanced caching system with automatic expiry and fallback mechanisms

### Technical Excellence
-   **Production-Ready Error Handling:** Silent error handling with user-friendly messages and comprehensive logging (development-only)
-   **Cross-Platform Compatibility:** Built with Expo, ensuring a consistent and high-quality user experience across Android, iOS, and web platforms
-   **Modern UI/UX:** Features a clean, responsive, and visually appealing user interface powered by NativeWind and Tailwind CSS
-   **Performance Optimized:** Advanced data processing, caching, and memory management for optimal app performance

### Data Management
-   **Firebase Integration:** Seamlessly integrates with Firebase for robust cloud-based data storage (Firestore) and efficient push notifications (FCM)
-   **Real-time Synchronization:** Advanced real-time data fetching with intelligent retry logic and fallback mechanisms
-   **Data Validation:** Comprehensive data validation and sanitization throughout the application stack

## Prerequisites

To utilize the full functionality of the PureFlow Mobile App, the following components are necessary:

-   **DATM Module:** A separate, deployable hardware module/device responsible for data acquisition using various sensors. This module is integrated with Firebase to securely transmit collected water quality data to a Firebase Collection.
-   **Firebase Project:** Active Firebase project with Firestore and FCM enabled
-   **Google Gemini API Key:** Valid API key for AI-powered insights and forecasting
-   **Custom AI Model:** Custom AI model for AI-powered insights and forecasting

## Installation

To get the PureFlow Mobile App up and running on your local development environment, follow these detailed steps:

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/xypherio/pureflow-mobile-app.git
    cd pureflow-mobile-app
    ```

2.  **Install dependencies:**

    Install the necessary project dependencies using npm:

    ```bash
    npm install
    ```

3.  **Set up Firebase:**

    PureFlow Mobile relies on Firebase for data storage and notifications.

    -   **Create a Firebase Project:** Navigate to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
    -   **Configure for Android/iOS:** Within your Firebase project, add Android and/or iOS apps. Follow the on-screen instructions to register your apps.
    -   **Download Configuration Files:** Download the appropriate configuration files (`google-services.json` for Android, `GoogleService-Info.plist` for iOS) and place them in the respective platform directories.
    -   **Update `app.json`:** Open `app.json` and update the `expo.extra.firebase` section with your Firebase configuration details.

4.  **Configure Gemini API Key:**

    PureFlow Mobile utilizes Google's Gemini AI for advanced insights and forecasting.

    -   **Obtain Gemini API Key:** Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/).
    -   **Update Configuration:** Insert your Gemini API key into the `src/services/ai/geminiAPI.js` file (API_KEY constant).

5.  **Environment Variables (Recommended):**

    For secure handling of credentials, it's recommended to set up environment variables.

    -   **Create `.env` file:** Create a new file named `.env` in the root directory of your project.
    -   **Add Credentials:** Populate the `.env` file with your Firebase and Gemini credentials.

## Usage

Once the application is installed and configured, you can run it in development mode and interact with its features.

1.  **Start the Expo development server:**

    Open your terminal in the project root and execute the following command:

    ```bash
    npx expo start
    ```

2.  **Choose your platform:**

    After starting the development server, you can choose how to open the app:

    -   **Android:** Press `a` in the terminal to open in an Android emulator or connected device, or run `expo run:android`.
    -   **iOS:** Press `i` in the terminal to open in an iOS simulator or connected device, or run `expo run:ios`.
    -   **Web:** Press `w` in the terminal to open in your web browser.

### Key App Sections

-   **Home Tab:** Real-time water quality monitoring with live data cards and status indicators
-   **Forecast Tab:** ML-powered water quality predictions with trend analysis and AI insights
-   **Reports Tab:** Comprehensive reporting with historical data analysis and AI insights
-   **Notifications Tab:** Alert management and notification history with native push notifications
-   **Settings:** Configuration options and system preferences

## Architecture

PureFlow Mobile is built on a robust and scalable architecture, leveraging Expo and React Native for cross-platform development, and Firebase for backend services.

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   DATM Module   │───▶│  Firebase       │───▶│  PureFlow       │
│   (Hardware)    │    │  (Firestore)    │    │  Mobile App     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Gemini AI      │
                       │  (Insights)     │
                       └─────────────────┘
```

### Technical Stack

-   **Frontend:** React Native + Expo (Cross-platform mobile/web)
-   **Styling:** CSS
-   **Backend:** Firebase (Firestore + FCM)
-   **AI Integration:** Google Gemini AI
-   **Charts:** react-native-chart-kit + Victory Native
-   **Navigation:** React Navigation v6
-   **State Management:** React Context API
-   **Data Processing:** Advanced caching and validation layers

## Project Structure

The project follows a modular architecture promoting maintainability and scalability:

```
.
├── app/                      # Main application with file-based routing
│   ├── (tabs)/              # Tab navigation screens
│   ├── _layout.jsx          # Root layout configuration
│   └── _splash.jsx          # Custom splash screen
├── src/                     # Core source code
│   ├── components/          # Reusable UI components
│   │   ├── data-display/    # Data visualization components
│   │   ├── forms/           # Form components
│   │   ├── navigation/      # Navigation components
│   │   └── ui/              # Base UI components
│   ├── constants/           # Application constants
│   │   ├── colors.js        # Color palette
│   │   └── thresholds.js    # Water quality thresholds
│   ├── contexts/            # React Context implementations
│   │   ├── DataContext.js   # Main data management
│   │   ├── InsightsContext.js # AI insights management
│   │   └── NotificationContext.js # Alert management
│   ├── hooks/               # Custom React hooks
│   │   ├── useChartData.js  # Data fetching logic
│   │   ├── useForecastService.js # Forecast data management
│   │   ├── useNotifications.js # Notification handling
│   │   └── useOptimizedChartData.js # Optimized chart data processing
│   ├── services/            # Business logic and API services
│   │   ├── ai/              # AI integration services
│   │   ├── firebase/        # Firebase services
│   │   ├── data/            # Data processing services
│   │   ├── caching/         # Caching services
│   │   ├── notifications/   # Notification management services
│   │   ├── processing/      # Data processing services
│   │   └── core/            # Core business logic services
│   └── utils/               # Utility functions
│       ├── exportUtils.js   # Data export utilities
│       ├── reportUtils.js   # Report generation utilities
│       ├── WaterQualityDataTransformer.js # ML data transformation
│       └── chart-config.js  # Chart configuration utilities
├── android/                 # Android platform files
├── ios/                     # iOS platform files
└── assets/                  # Static assets and resources
```

## Recent Updates

### Version 2.1 - Advanced Forecasting & ML Integration

#### 🔮 **Water Quality Forecasting System**
- **ML-Powered Predictions:** Advanced machine learning models for water quality parameter forecasting
- **Data Transformation Engine:** New WaterQualityDataTransformer utility for ML model input preparation
- **Lag Features & Rolling Statistics:** Historical data analysis with 6-period lag features and 24-hour rolling statistics
- **Time-Based Features:** Hour, day-of-week, month, weekend/night indicators for enhanced prediction accuracy

#### 📱 **Enhanced User Interface**
- **Forecast Tab:** Dedicated forecasting screen with real-time predictions and trend analysis
- **Animated UI Elements:** Enhanced AlertsCard with animated indicator dots for better user experience
- **Improved PDF Generation:** Better layout and pagination handling for comprehensive reports
- **Style Consistency:** Refactored component styles for improved visual consistency across the app

#### 🔔 **Advanced Notification System**
- **Expo Notifications Integration:** Native push notification support with expo-notifications
- **Notification Processing Services:** Dedicated services for alert processing and notification management
- **Enhanced Notification Handling:** Improved logging and error management for received notifications
- **Scheduled Notifications:** Advanced notification scheduling and management system

#### 🏗️ **Architecture Improvements**
- **Optimized Data Management:** OptimizedDataProvider integration for better data flow management
- **Service Refactoring:** Improved architecture and maintainability across all service layers
- **Component Optimization:** Enhanced rendering performance for LinechartCard and RealtimeDataCards
- **Data Validation:** Comprehensive validation and sanitization throughout the application stack

#### 📄 **Enhanced Export Features**
- **PDF Export Functionality:** Complete PDF generation and export capabilities
- **Report Formatting:** Improved report layouts with better pagination and content organization
- **Data Export Options:** Enhanced CSV and PDF export with comprehensive water quality data

### Version 2.0 - Production-Ready Enhancements

#### 🚀 **Performance Optimizations**
- **Smart Caching System:** 5-minute TTL for Firebase data with intelligent cache invalidation
- **Interval-Based AI Processing:** 10-minute intervals for AI requests to prevent quota exhaustion
- **Optimized Data Fetching:** Advanced retry logic with exponential backoff
- **Memory Management:** Automatic cleanup and resource optimization

#### 🛡️ **Enhanced Error Handling**
- **Silent Error Handling:** Production-ready error handling without console logs in UI
- **User-Friendly Messages:** Technical errors converted to actionable user messages
- **Comprehensive Fallbacks:** Multiple fallback mechanisms for all critical operations
- **Development Logging:** Full debugging information available in development mode

#### 🤖 **Advanced AI Integration**
- **Intelligent Caching:** AI responses cached with 10-minute expiry
- **Quota Management:** Smart quota tracking with fallback mechanisms
- **Error Recovery:** Automatic fallback to cached responses when API unavailable
- **Production Logging:** Silent operation in production with full logging in development

#### 📊 **Data Processing Improvements**
- **Real-time Validation:** Comprehensive data validation throughout the application
- **Null-Safe Operations:** Safe property access with optional chaining
- **Type Safety:** Enhanced type checking and data sanitization
- **Performance Monitoring:** Built-in performance tracking and optimization

## Technical Implementation

### Data Flow Architecture

```
1. DATM Hardware → Firebase Firestore (Real-time updates)
2. Firestore → DataContext (State management)
3. DataContext → Components (UI rendering)
4. User Actions → AI Processing (Gemini API)
5. AI Results → InsightsContext (Caching & display)
6. Alerts → Notification System (FCM integration)
```

### Key Technical Features

#### Real-Time Data System
- **Dual Polling:** 15-second intervals for real-time data, 30-second for general data
- **Intelligent Caching:** 30-second TTL for real-time data with smart invalidation
- **Data Age Tracking:** Real-time indicators showing data freshness
- **Fallback Mechanisms:** Graceful degradation when real-time data unavailable

#### AI Integration System
- **Interval Management:** 10-minute intervals prevent API quota exhaustion
- **Smart Caching:** AI responses cached with automatic expiry
- **Error Recovery:** Multiple fallback strategies for AI service failures
- **Quota Management:** Built-in quota tracking and management

#### Alert Management System
- **Real-time Processing:** Instant alert generation based on sensor data
- **Deduplication:** Prevents duplicate alerts for same conditions
- **Firebase Sync:** Automatic synchronization with Firebase backend
- **User Preferences:** Customizable alert thresholds and notification settings

## Performance Features

### Caching Strategy
- **Multi-Level Caching:** Memory cache + AsyncStorage persistence
- **Smart Expiry:** Component-specific cache expiry management
- **Cache Invalidation:** Automatic cleanup of expired data
- **Fallback Chain:** Cached → Fresh → Fallback data hierarchy

### Memory Management
- **Automatic Cleanup:** Interval-based memory cleanup
- **Resource Optimization:** Efficient data structures and algorithms
- **Background Processing:** Non-blocking data operations
- **Memory Leak Prevention:** Proper component lifecycle management

### Network Optimization
- **Retry Logic:** Exponential backoff for failed requests
- **Timeout Protection:** 30-second timeouts prevent hanging requests
- **Connection Management:** Intelligent connection pooling
- **Offline Support:** Graceful degradation when offline

## Error Handling

### Production-Ready Error Management
- **Silent Operation:** No technical errors visible to end users
- **User-Friendly Messages:** Clear, actionable error messages
- **Error Categorization:** Different handling for network, API, and data errors
- **Fallback Systems:** Multiple fallback mechanisms for all critical operations

### Development Support
- **Comprehensive Logging:** Full error logging in development mode
- **Debug Information:** Detailed error context and stack traces
- **Performance Monitoring:** Built-in performance tracking
- **Error Boundaries:** React error boundaries for component-level error handling

## AI Integration

### Gemini AI Features
- **Smart Analysis:** Advanced water quality trend analysis
- **Predictive Insights:** Future water quality forecasting
- **Recommendation Engine:** Actionable suggestions for water management
- **Natural Language Processing:** Human-readable insights and suggestions

### AI System Architecture
- **Interval-Based Processing:** Prevents API quota exhaustion
- **Intelligent Caching:** Reduces API calls while maintaining data freshness
- **Error Recovery:** Automatic fallback when AI service unavailable
- **Quota Management:** Built-in quota tracking and management

## Development

### Development Guidelines
- **Code Organization:** Modular architecture with clear separation of concerns
- **Error Handling:** Comprehensive error handling throughout the application
- **Performance Optimization:** Built-in performance monitoring and optimization
- **Testing:** Unit tests and integration tests recommended

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes with proper error handling and documentation
4. Test thoroughly in both development and production modes
5. Submit a pull request with detailed description

### Build & Deployment
- **Android:** `expo run:android` or `npx expo start --dev-client`
- **iOS:** `expo run:ios` or `npx expo start --dev-client`
- **Web:** `npx expo start --web`
- **Production Build:** `expo build:android` / `expo build:ios`

---

**PureFlow Mobile** - Advanced water quality monitoring with AI-powered insights and production-ready architecture.
