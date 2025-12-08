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
- [Technical Implementation](#technical-implementation)
- [AI Integration](#ai-integration)

## Project Overview

PureFlow Mobile is an Expo-based mobile application designed for comprehensive water quality monitoring. It addresses the critical need for accessible and actionable water quality data, empowering fishpond owners to maintain optimal water conditions. By providing real-time data visualization, intelligent alerts, predictive forecasting, and AI-powered insights, PureFlow Mobile helps prevent water-related issues and promotes a healthier environment.

## Features

### Core Monitoring Features
-   **Real-time Data Monitoring:** Visualize essential water quality parameters (pH, Temperature, Salinity, Turbidity) through intuitive real-time data cards with live updates
-   **Water Quality Forecasting:** ML-powered predictions for future water quality parameters with trend analysis and breach detection
-   **Interactive Charts & Reports:** Generate detailed reports and explore historical water quality data with interactive line charts and comprehensive analytics
-   **Smart Notifications & Alerts:** Receive timely and customizable alerts based on predefined thresholds and critical water quality events with local notifications
-   **Data Export & Sharing:** Easily export comprehensive reports as PDFs and CSVs, share critical water quality information with stakeholders

### Environmental Monitoring
-   **Weather Integration:** Real-time weather tracking and forecasting with OpenWeatherMap API for contextual water quality analysis
-   **Weather-Based Alerts:** Intelligent notifications for weather conditions that impact water quality parameters
-   **Weather Context Management:** Centralized weather data handling with WeatherContext for seamless app-wide integration
-   **Visual Weather Indicators:** Weather badges and indicators in forecasts, summaries, and reports for enhanced situational awareness

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
-   **Firebase Integration:** Seamlessly integrates with Firebase for robust cloud-based data storage (Firestore)
-   **Real-time Synchronization:** Advanced real-time data fetching with intelligent retry logic and fallback mechanisms
-   **Data Validation:** Comprehensive data validation and sanitization throughout the application stack

## Prerequisites

To utilize the full functionality of the PureFlow Mobile App, the following components are necessary:

-   **DATM Module:** A separate, deployable hardware module/device responsible for data acquisition using various sensors. This module is integrated with Firebase to securely transmit collected water quality data to a Firebase Collection.
-   **Firebase Project:** Active Firebase project with Firestore enabled for data storage
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

    PureFlow Mobile relies on Firebase for data storage.

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
-   **Notifications Tab:** Alert management and notification history with local notifications
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
-   **Backend:** Firebase (Firestore)
-   **AI Integration:** Google Gemini AI
-   **Charts:** react-native-chart-kit + Victory Native
-   **Navigation:** React Navigation v6
-   **State Management:** React Context API
-   **Data Processing:** Advanced caching and validation layers

## Project Structure

The project follows a modular architecture promoting maintainability and scalability:

```
.
├── app/                      # Main application with file-based routing (Expo)
│   ├── (tabs)/              # Tab navigation screens
│   │   ├── _layout.jsx      # Tab layout configuration
│   │   ├── forecast.jsx     # Forecast tab
│   │   ├── index.jsx        # Home/Dashboard tab
│   │   ├── notifications.jsx # Notifications tab
│   │   └── report.jsx       # Reports tab
│   ├── _layout.jsx          # Root layout configuration
│   └── _splash.jsx          # Custom splash screen
├── src/                     # Core source code
│   ├── AppInitializer.js    # Application initialization
│   ├── PdfGenerator.js      # PDF report generation
│   ├── components/          # Reusable UI components
│   │   ├── data-display/    # Data visualization components
│   │   │   ├── AlertCardItem.jsx
│   │   │   ├── AlertsCard.jsx
│   │   │   ├── ForecastCard.jsx
│   │   │   ├── GaugeCard.jsx
│   │   │   ├── InsightsCard.jsx
│   │   │   ├── LinechartCard.jsx
│   │   │   ├── ParameterCard.jsx
│   │   │   ├── ParameterGridCard.jsx
│   │   │   ├── RealtimeDataCards.jsx
│   │   │   ├── ReportsChart.jsx
│   │   │   └── WaterQualitySummaryCard.jsx
│   │   ├── forms/           # Form components
│   │   ├── modals/          # Modal components
│   │   ├── navigation/      # Navigation components
│   │   ├── sections/        # Section components
│   │   └── ui/              # Base UI components
│   ├── constants/           # Application constants
│   │   ├── alertMessages/   # Alert message templates
│   │   ├── colors.js        # Color palette
│   │   ├── notifications.js # Notification settings
│   │   ├── processing.js    # Data processing constants
│   │   ├── report.js        # Report constants
│   │   ├── services.js      # Service constants
│   │   └── thresholds.js    # Water quality thresholds
│   ├── contexts/            # React Context implementations
│   │   ├── DataContext.js   # Main data management
│   │   ├── InsightsContext.js # AI insights management
│   │   ├── NotificationContext.js # Alert management
│   │   ├── OptimizedDataContext.js # Optimized data management
│   │   ├── SuggestionContext.js # AI suggestions management
│   │   └── WeatherContext.js # Environmental weather data
│   ├── hooks/               # Custom React hooks (20+ hooks)
│   │   └── [Multiple]       # Alert processing, chart data, notifications, etc.
│   ├── services/            # Business logic and API services
│   │   ├── ai/              # AI integration services
│   │   ├── caching/         # Caching services
│   │   ├── core/            # Core business logic services
│   │   ├── data/            # Data processing services
│   │   ├── facades/         # Service facades
│   │   ├── firebase/        # Firebase services
│   │   ├── insights/        # AI insights services
│   │   ├── notifications/   # Notification services
│   │   ├── processing/      # Data processing services
│   │   ├── fcmService.js    # FCM service (fallback)
│   │   └── [Multiple... ]   # Weather, historical data, etc.
│   ├── styles/              # Style definitions
│   ├── utils/               # Utility functions (20+ utils)
│   │   └── [Multiple...]    # Chart config, data utils, export, etc.
├── android/                 # Android platform files
│   ├── app/                 # Android app source
│   └── gradle/              # Gradle build files
├── ios/                     # iOS platform files (if applicable)
├── assets/                  # Static assets and resources
│   ├── images/              # Image assets
│   ├── logo/                # Logo variants
│   └── water-alert.mp3      # Notification sound
├── fcm-server/              # Firebase Cloud Messaging serverless API
│   ├── api/                 # Serverless functions
│   ├── lib/                 # Server utilities
│   ├── package.json         # Server dependencies
│   └── README.md            # Server documentation
├── pureflow-datm/           # IoT hardware code (Arduino)
│   ├── datm/                # Main DATM module
│   ├── datm-ext/           # Extended DATM module
│   └── *.ino                # Arduino source files
├── app.json                 # Expo configuration
├── package.json             # Node.js dependencies
├── eas.json                 # Expo Application Services config
├── tsconfig.json           # TypeScript configuration
├── jsconfig.json            # JavaScript configuration
├── firebase_key.txt         # Firebase credentials (gitignored)
└── [Config files...]       # Linting, git, etc.
```

## Technical Implementation

### Data Flow Architecture

```
1. DATM Hardware → Firebase Firestore (Real-time updates)
2. Firestore → DataContext (State management)
3. DataContext → Components (UI rendering)
4. User Actions → AI Processing (Gemini API)
5. AI Results → InsightsContext (Caching & display)
6. Alerts → Notification System (Local notifications)
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
- **Local Storage:** Automatic synchronization with local storage
- **User Preferences:** Customizable alert thresholds and notification settings

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
