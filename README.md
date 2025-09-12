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

## Project Overview

PureFlow Mobile is an Expo-based mobile application designed for comprehensive water quality monitoring and management. It addresses the critical need for accessible and actionable water quality data, empowering fishpond owners to maintain optimal water conditions. By providing real-time data visualization, intelligent alerts, predictive forecasting, and AI-powered insights, PureFlow Mobile helps prevent water-related issues and promotes a healthier environment.

## Features

-   **Real-time Data Monitoring:** Visualize essential water quality parameters through intuitive real-time data cards.
-   **Interactive Charts & Reports:** Generate detailed reports and explore historical water quality data with interactive line charts.
-   **Smart Notifications & Alerts:** Receive timely and customizable alerts based on predefined thresholds and critical water quality events.
-   **AI-Powered Insights & Forecasting:** Leverage Google's Gemini AI to gain insightful suggestions and predictive forecasts regarding water quality trends.
-   **Firebase Integration:** Seamlessly integrates with Firebase for robust cloud-based data storage (Firestore) and efficient push notifications (FCM).
-   **Data Export & Sharing:** Easily export comprehensive reports as PDFs and share critical water quality information with stakeholders.
-   **Cross-Platform Compatibility:** Built with Expo, ensuring a consistent and high-quality user experience across Android, iOS, and web platforms.
-   **Modern UI/UX:** Features a clean, responsive, and visually appealing user interface powered by NativeWind and Tailwind CSS.

## Prerequisites

To utilize the full functionality of the PureFlow Mobile App, the following component is necessary:

-   **DATM Module:** A separate, deployable hardware module/device responsible for data acquisition using various sensors. This module is integrated with Firebase to securely transmit collected water quality data to a Firebase Collection.

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
    -   **Configure for Android:** Within your Firebase project, add an Android app. Follow the on-screen instructions to register your app.
    -   **Download `google-services.json`:** Download the `google-services.json` file provided by Firebase and place it in the `android/app/` directory of your project.
    -   **Update `app.json`:** Open `app.json` and update the `expo.extra.firebase` section with your Firebase configuration details.

4.  **Configure Gemini API Key:**

    PureFlow Mobile utilizes Google's Gemini AI for advanced insights and forecasting.

    -   **Obtain Gemini API Key:** Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/).
    -   **Update `app.json`:** Insert your Gemini API key into the `expo.extra.GEMINI_API_KEY` field within your `app.json` file.

5.  **Environment Variables (Optional but Recommended):**

    For secure handling of credentials, it's recommended to set up a `.env` file at the root of your project.

    -   **Create `.env` file:** Create a new file named `.env` in the root directory of your project.
    -   **Add Credentials:** Populate the `.env` file with your Firebase and Gemini credentials as shown in the example below. Replace `YOUR_FIREBASE_API_KEY`, `YOUR_FIREBASE_AUTH_DOMAIN`, etc., with your actual values.

    ```
    FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
    FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
    FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
    FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
    FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_ID
    FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
    FIREBASE_MEASUREMENT_ID=YOUR_FIREBASE_MEASUREMENT_ID

    GEMINI_API_KEY=YOUR_GEMINI_API_KEY
    GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
    ```

## Usage

Once the application is installed and configured, you can run it in development mode and interact with its features.

1.  **Start the Expo development server:**

    Open your terminal in the project root and execute the following command:

    ```bash
    npx expo start --dev-client
    ```

2.  **Choose your platform:**

    After starting the development server, you can choose how to open the app:

    -   **Android:** Press `a` in the terminal to open in an Android emulator or connected device, or run `expo run:android`.
    -   **iOS:** Press `i` in the terminal to open in an iOS simulator or connected device, or run `expo run:ios`.
    -   **Web:** Press `w` in the terminal to open in your web browser, or run `expo start --web --entry-point ./index.web.js`.

    You can open the app in a development build (using Expo Go), an Android emulator, an iOS simulator, or directly in your web browser.

    **Missing Information:** To significantly enhance this section, consider adding screenshots or GIFs demonstrating key features and the user interface. This will provide developers and users with a clearer understanding of the application's look and feel, and how to navigate it.

## Architecture / How it Works

PureFlow Mobile is built on a robust and scalable architecture, leveraging Expo and React Native for cross-platform development, and Firebase for backend services.

-   **Frontend (Expo & React Native):** The user interface and client-side logic are developed using React Native within the Expo framework, enabling a single codebase for Android, iOS, and web. Components are organized for reusability and maintainability.
-   **Data Acquisition (DATM Module):** A dedicated DATM module (external hardware) collects water quality data from sensors.
-   **Backend (Firebase):**
    -   **Firestore:** Serves as the primary NoSQL cloud database for storing real-time and historical water quality data transmitted by the DATM module, as well as user-specific configurations and alert thresholds.
    -   **Firebase Cloud Messaging (FCM):** Used for sending push notifications to users based on alert triggers or important updates.
-   **AI Integration (Google Gemini):** The application integrates with Google's Gemini AI for advanced data analysis, generating insightful suggestions, and providing predictive forecasts on water quality trends.
-   **Alert Management:** A comprehensive alert management system monitors incoming data against predefined thresholds, triggering notifications when anomalies are detected.

The data flow generally follows this path: DATM Module -> Firebase Firestore -> PureFlow Mobile App (for display, analysis, and AI processing). User interactions within the app (e.g., requesting reports) also interact with Firebase.

## Project Structure

The project follows a standard Expo and React Native structure, promoting modularity and ease of development:

```
.
├── app/                  # Main application code with file-based routing and screens
├── assets/               # Static assets like images, fonts, and icons
├── src/                  # Core source code for components, contexts, hooks, services, and utilities
│   ├── components/       # Reusable UI components, categorized by function (data-display, forms, navigation, ui)
│   ├── constants/        # Application-wide constants, such as color palettes and system thresholds
│   ├── contexts/         # React Context API implementations for efficient global state management
│   ├── hooks/            # Custom React hooks for encapsulating reusable logic
│   ├── services/         # Business logic, API integrations (Firebase, Gemini), and data handling services
│   ├── styles/           # Global stylesheets and theming configurations
│   └── utils/            # Essential utility functions for data processing, formatting, and more
├── android/              # Android-specific native code and build configurations
├── ios/                  # iOS-specific native code and build configurations (generated and managed by Expo)
├── package.json          # Manages project dependencies, scripts, and metadata
├── app.json              # Primary Expo application configuration file
└── README.md             # Project documentation and guide (this file)
```
