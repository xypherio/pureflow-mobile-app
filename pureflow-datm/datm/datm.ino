#include <WiFi.h>
#include <time.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#define WIFI_SSID "YOUR-WIFI-CREDENTIALS"
#define WIFI_PASSWORD "YOUR-WIFI-PASSWORD"

// Replace with your Firebase project details
#define FIREBASE_PROJECT_ID "FIREBASE-PROJECT-ID"
#define FIREBASE_API_KEY "FIREBASE-API-KEY"
#define FIREBASE_COLLECTION "FIREBASE-COLLECTION-NAME"

#define PH_SENSOR_PIN 32
#define ONE_WIRE_BUS 13
#define TURBIDITY_SENSOR_PIN 34
#define EC_SENSOR_PIN 35
#define RAIN_SENSOR_PIN 33
#define TX_PIN 17
#define RX_PIN 16

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

float phCalibrationSlope = 1.0;
float phCalibrationOffset = 0.0;

bool lastRainState = false;
bool currentRainState = false;
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay = 50;

const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 8 * 3600;
const int daylightOffset_sec = 0;

unsigned long previousMillis = 0;
const unsigned long interval = 15000;
bool isRaining = false;

unsigned long sendDelay = 15000;
bool waitingToSend = false;
unsigned long sendStart = 0;

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, RX_PIN, TX_PIN);
  sensors.begin();

  pinMode(PH_SENSOR_PIN, INPUT);
  pinMode(TURBIDITY_SENSOR_PIN, INPUT);
  pinMode(EC_SENSOR_PIN, INPUT);
  pinMode(RAIN_SENSOR_PIN, INPUT);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 10000) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected.");
  } else {
    Serial.println("\n⚠️ WiFi connection failed, continuing with UART only.");
  }


  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("Failed to obtain time");
    return;
  }
  Serial.println("Time initialized!");
}

String getFormattedTimestamp() {
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    char timeStr[50];
    strftime(timeStr, sizeof(timeStr), "%B %d, %Y at %I:%M:%S %p", &timeinfo);

    long gmtOffset_sec;
    long daylightOffset_sec;
    getLocalTime(&timeinfo);
    gmtOffset_sec = 8 * 3600;
    daylightOffset_sec = 0;

    String formatted = String(timeStr) + " UTC+8";
    formatted += " (" + String(time(nullptr)) + ")";
    return formatted;
  } else {
    return String("fallback-") + String(millis());
  }
}

float readPH(float temperature) {
  int analogValue = analogRead(PH_SENSOR_PIN);
  float voltage = analogValue * (3.3 / 4095.0);

  float pHValue = 7.0 - ((voltage - 1.5) * 3.5);
  pHValue = (pHValue * phCalibrationSlope) + phCalibrationOffset;

  // Temperature compensation
  pHValue += (25.0 - temperature) * 0.03;
  pHValue = constrain(pHValue, 0.0, 14.0);

  Serial.print("pH Value: ");
  Serial.print(pHValue);
  Serial.print(" | Voltage: ");
  Serial.println(voltage);

  return pHValue;
}

double measureTemperature() {
  sensors.requestTemperatures();
  double temperatureC = sensors.getTempCByIndex(0);
  Serial.print("Temperature: ");
  Serial.println(temperatureC);
  return temperatureC;
}

int measureTurbidity() {
  int rawValue = analogRead(TURBIDITY_SENSOR_PIN);
  int turbidity = map(rawValue, 0, 4095, 0, 100);
  turbidity = constrain(turbidity, 0, 100);
  Serial.print("Turbidity (Normalized): ");
  Serial.println(turbidity);
  return turbidity;
}

float calculateSalinity() {
  int ecRaw = analogRead(EC_SENSOR_PIN);
  float voltage = (ecRaw / 4095.0) * 3.3;
  float ecValue = voltage * 1000;

  float salinity = ecValue * 0.001 / 1.56;
  Serial.print("Salinity (ppt): ");
  Serial.println(salinity);

  return salinity;
}

bool checkForRain() {
  return (digitalRead(RAIN_SENSOR_PIN) == HIGH);
}

// Function to write to Firestore
void createDocument(double pH, double temperature, int turbidity, float salinity, bool isRaining) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = "https://firestore.googleapis.com/v1/projects/"
                 + String(FIREBASE_PROJECT_ID)
                 + "/databases/(default)/documents/"
                 + String(FIREBASE_COLLECTION)
                 + "?key=" + String(FIREBASE_API_KEY);
    http.begin(url);
    http.addHeader("Content-Type", "application/json");

    // Larger buffer to avoid memory issues
    DynamicJsonDocument doc(1024);

    JsonObject fields = doc.createNestedObject("fields");
    fields["datetime"]["stringValue"] = getFormattedTimestamp();
    fields["pH"]["doubleValue"] = pH;
    fields["temperature"]["doubleValue"] = temperature;
    fields["turbidity"]["integerValue"] = turbidity;
    fields["salinity"]["doubleValue"] = salinity;
    fields["isRaining"]["booleanValue"] = isRaining;

    String requestBody;
    serializeJson(doc, requestBody);

    int httpResponseCode = http.POST(requestBody);
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("✅ Data sent successfully. Response: ");
      Serial.println(response);
    } else {
      Serial.print("❌ Error sending data. HTTP response code: ");
      Serial.println(httpResponseCode);
    }

    http.end();
  } else {
    Serial.println("⚠️ WiFi not connected.");
  }
}


void loop() {
  unsigned long currentMillis = millis();

  if (!waitingToSend && (currentMillis - previousMillis >= interval)) {
    previousMillis = currentMillis;
    waitingToSend = true;
    sendStart = currentMillis;
    Serial.println("Preparing data, waiting before send...");
  }

  if (waitingToSend && (currentMillis - sendStart >= sendDelay)) {
    waitingToSend = false;

    double temperature = measureTemperature();
    double pH = readPH(temperature);
    int turbidity = measureTurbidity();
    float salinity = calculateSalinity();
    bool isRaining = checkForRain();

    createDocument(pH, temperature, turbidity, salinity, isRaining);

    StaticJsonDocument<200> doc;
    doc["pH"] = pH;
    doc["temperature"] = temperature;
    doc["turbidity"] = turbidity;
    doc["salinity"] = salinity;
    doc["isRaining"] = isRaining;

    String out;
    serializeJson(doc, Serial2);
    Serial2.println();
    serializeJsonPretty(doc, Serial);
  }
}
