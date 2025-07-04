#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include <time.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27,20,4);

// Wi-Fi credentials
const char* ssid = "Hotspot";
const char* password = "12345678";

// Firebase configuration
const String FIREBASE_API_KEY = "AIzaSyAApSG-1CLrtogs5fvWpLJ2cW6uvJHmiQk";
const String FIREBASE_PROJECT_ID = "pureflow-363f0";
const String FIREBASE_COLLECTION = "water_parameters";
String FIREBASE_URL = "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID + "/databases/(default)/documents/";

// Sensor pins
#define TURBIDITY_PIN 34
#define TRIGGER_PIN 5
#define ECHO_PIN 18
#define ONE_WIRE_BUS 12

//led pins
#define GREEN_LED_PIN 25
#define YELLOW_LED_PIN 26
#define RED_LED_PIN 27

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// Variables for sensors
long duration;
float depthMeters = 0.0;
double accumulatedTemperature = 0.0;
int accumulatedTurbidity = 0;
float accumulatedDepth = 0.0;
int readingsCount = 0;

unsigned long previousMillis = 0;
const unsigned long interval = 10000;
const unsigned long readInterval = 5000;

void connectToWiFi() {

  lcd.clear();
  lcd.setCursor(0,0);
  lcd.println("Connecting...");

  Serial.println("Connecting to Wi-Fi...");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  lcd.clear();
  lcd.setCursor(0,0);
  lcd.println("\nConnected!");

  Serial.println("\nConnected to Wi-Fi!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void syncTime() {

  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  lcd.clear();
  lcd.setCursor(0,0);
  lcd.println("Synchronizing Time...");

  Serial.println("Synchronizing time...");

  struct tm timeinfo;
  while (!getLocalTime(&timeinfo)) {
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.println("Waiting for NTP Time Sync...");

    Serial.println("Waiting for NTP time sync...");
    delay(1000);
  }
  lcd.clear();
  lcd.setCursor(0,0);
  lcd.println("Time Synchronized");
  Serial.println("Time synchronized!");
}

void setup() {

  // initialize the lcd 
  lcd.init();                      
  lcd.backlight();
  Serial.begin(115200);
  connectToWiFi();
  syncTime();

  //setup ultrasonic sensor pins
  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(TURBIDITY_PIN, INPUT);

  //led set up
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(YELLOW_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);

  sensors.begin();
  sensors.setResolution(12); 

  lcd.clear();
  lcd.setCursor(0,0);
  lcd.println("PUREFLOW Starting...");
  
  Serial.println("Water Monitoring System Starting...");
  delay(2000);
}

void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - previousMillis < readInterval) {
    double temp = measureTemperature();
    if (temp != DEVICE_DISCONNECTED_C) {
      accumulatedTemperature += temp;
      readingsCount++;
    }
    accumulatedTurbidity += measureTurbidity();
    accumulatedDepth += measureWaterDepth();
  }

  if (currentMillis - previousMillis >= interval) {
    if (readingsCount > 0) {
      double averageTemperature = accumulatedTemperature / readingsCount;
      int averageTurbidity = accumulatedTurbidity / readingsCount;
      float averageDepth = accumulatedDepth / readingsCount;

      setLEDStatus(averageTemperature, averageTurbidity, averageDepth);
      displayScannedValues(averageTemperature, averageTurbidity, averageDepth);
      createDocument(averageTemperature, averageTurbidity, averageDepth);

      accumulatedTemperature = 0.0;
      accumulatedTurbidity = 0;
      accumulatedDepth = 0.0;
      readingsCount = 0;
    } else {
      Serial.println("No Valid Readings. Skipping Firebase UPDATE.");
    }
    previousMillis = currentMillis;
  }
}

float measureWaterDepth() {
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);

  duration = pulseIn(ECHO_PIN, HIGH);
  depthMeters = (duration * 0.0344 / 2) / 100;

  Serial.print("WD: ");
  Serial.print(depthMeters, 2);
  Serial.println(" meters");

  return depthMeters;
}

double measureTemperature() {
  sensors.requestTemperatures();
  double temperatureC = sensors.getTempCByIndex(0);
  if (temperatureC != DEVICE_DISCONNECTED_C) {
    Serial.print("Temp: ");
    Serial.print(temperatureC, 2);
    Serial.println(" °C");
  } else {
    Serial.println("Error: Could not read temperature.");
  }
  return temperatureC;
}

int measureTurbidity() {
    // Read the raw analog value from the turbidity sensor
    int rawTurbidityValue = analogRead(TURBIDITY_PIN);

    // Map the raw value (0-4095) to a percentage (0-100)
    int turbidityPercentage = map(rawTurbidityValue, 0, 4095, 0, 100);

    // Map the raw value (0-4095) to NTU range (0-3000 NTU)
    int turbidityNTU = map(rawTurbidityValue, 0, 4095, 0, 3000);

    // Print the raw value, percentage, and NTU for debugging
    Serial.print("Raw Turbidity Value: ");
    Serial.println(rawTurbidityValue);
    Serial.print("Turbidity Percentage: ");
    Serial.println(turbidityPercentage);

    return turbidityPercentage;
}


void setLEDStatus(float temperature, float turbidity, float waterDepth) {

  const float TEMP_NORMAL_MAX = 23.33;
  const float TEMP_MILD_MAX = 30.22; 
  const float DEPTH_NORMAL_MAX = 3.00; 
  const float DEPTH_MILD_MAX = 1.5; 
  const float TURBIDITY_NORMAL_MAX = 70;
  const float TURBIDITY_MILD_MAX = 20;

  // Determine the status based on parameters
  bool isNormal = (temperature <= TEMP_NORMAL_MAX && 
                   waterDepth <= DEPTH_NORMAL_MAX && 
                   turbidity <= TURBIDITY_NORMAL_MAX);
  bool isMild = (!isNormal && 
                 temperature <= TEMP_MILD_MAX && 
                 waterDepth <= DEPTH_MILD_MAX && 
                 turbidity <= TURBIDITY_MILD_MAX);
  bool isExtreme = !isNormal && !isMild;

  // Control LEDs
if (isNormal) {
  digitalWrite(YELLOW_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, LOW);
  
  // Blink GREEN_LED_PIN
  for (int i = 0; i < 5; i++) { // Adjust the loop count as needed
    digitalWrite(GREEN_LED_PIN, HIGH);
    delay(500); // Delay for 500 milliseconds (adjust as needed)
    digitalWrite(GREEN_LED_PIN, LOW);
    delay(500);
  }
} else if (isMild) {
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, LOW);
  
  // Blink YELLOW_LED_PIN
  for (int i = 0; i < 5; i++) {
    digitalWrite(YELLOW_LED_PIN, HIGH);
    delay(500);
    digitalWrite(YELLOW_LED_PIN, LOW);
    delay(500);
  }
} else if (isExtreme) {
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(YELLOW_LED_PIN, LOW);
  
  // Blink RED_LED_PIN
  for (int i = 0; i < 5; i++) {
    digitalWrite(RED_LED_PIN, HIGH);
    delay(500);
    digitalWrite(RED_LED_PIN, LOW);
    delay(500);
  }
}
}

void displayScannedValues(double temperature, int turbidity, float depth) {

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Temp: ");
  lcd.print(temperature, 2);
  lcd.print("C");

  lcd.setCursor(0, 1);
  lcd.print("TP: ");
  lcd.print(turbidity);
  lcd.print("%");

  lcd.setCursor(0, 2);
  lcd.print("Depth: ");
  lcd.print(depth, 2);
  lcd.print("m");
}

String getISO8601Timestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.println("Failed to obtain valid timestamp. Using default.");
    Serial.println("Failed to obtain valid timestamp. Using default.");
    return "1970-01-01T00:00:00Z";
  }
  char isoTimestamp[25];
  strftime(isoTimestamp, sizeof(isoTimestamp), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(isoTimestamp);
}

void createDocument(double temperature, int turbidity, float depth) {
  HTTPClient http;
  String url = FIREBASE_URL + FIREBASE_COLLECTION + "?key=" + FIREBASE_API_KEY;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<500> jsonDoc;
  jsonDoc["fields"]["temperature"]["doubleValue"] = temperature;
  jsonDoc["fields"]["turbidity"]["doubleValue"] = turbidity;
  jsonDoc["fields"]["waterDepth"]["doubleValue"] = depth;
  jsonDoc["fields"]["timestamp"]["timestampValue"] = getISO8601Timestamp();

  String payload;
  serializeJson(jsonDoc, payload);

  int httpResponseCode = http.POST(payload);
  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    Serial.println(http.getString());
  } else {
    Serial.print("Error sending data: ");
    Serial.println(httpResponseCode);
  }

  http.end();
}
