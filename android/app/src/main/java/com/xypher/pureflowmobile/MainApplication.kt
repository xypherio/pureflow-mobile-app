package com.xypher.pureflowmobile

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.res.Configuration
import android.os.Build

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
        this,
        object : DefaultReactNativeHost(this) {
          override fun getPackages(): List<ReactPackage> {
            val packages = PackageList(this).packages
            // Packages that cannot be autolinked yet can be added manually here, for example:
            // packages.add(MyReactNativePackage())
            return packages
          }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
          override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()

    // Create notification channels for FCM
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      createNotificationChannels()
    }

    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  private fun createNotificationChannels() {
    val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager

    // Alerts channel - High priority for critical notifications
    val alertsChannel = NotificationChannel(
      "alerts",
      "Water Quality Alerts",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "Critical water quality alerts and warnings"
      enableLights(true)
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 500, 200, 500)
    }

    // Updates channel - Normal priority for general updates
    val updatesChannel = NotificationChannel(
      "updates",
      "Water Quality Updates",
      NotificationManager.IMPORTANCE_DEFAULT
    ).apply {
      description = "General water quality updates"
      enableLights(true)
      enableVibration(true)
    }

    // Maintenance channel - Normal priority for maintenance reminders
    val maintenanceChannel = NotificationChannel(
      "maintenance",
      "Maintenance Reminders",
      NotificationManager.IMPORTANCE_DEFAULT
    ).apply {
      description = "System maintenance and calibration reminders"
      enableLights(true)
      enableVibration(true)
    }

    // Forecasts channel - Normal priority for forecast alerts
    val forecastsChannel = NotificationChannel(
      "forecasts",
      "Water Quality Forecasts",
      NotificationManager.IMPORTANCE_DEFAULT
    ).apply {
      description = "Water quality prediction alerts"
      enableLights(true)
      enableVibration(true)
    }

    notificationManager.createNotificationChannels(listOf(alertsChannel, updatesChannel, maintenanceChannel, forecastsChannel))
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
