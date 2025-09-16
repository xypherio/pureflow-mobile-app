#include <ArduinoJson.h>
#include <ESP32Servo.h>

#define RX_PIN 16
#define TX_PIN 17
#define BUZZER_PIN 25

// Solar Tracker with bare LDRs
#define LDR_Left 34   // Left LDR voltage divider
#define LDR_Right 35  // Right LDR voltage divider
#define SERVO_PIN 18  // Servo PWM pin

Servo trackerServo;
int servoPos = 90;          // Servo starts at middle position
int tolerance = 100;        // Sensitivity threshold (avoid jitter)
int sunlightThreshold = 2000; // Adjust this after testing (0-4095 scale)

// Safe ranges
struct Threshold {
  float min;
  float max;
};

Threshold thresholds[] = {
  { 6.5, 8.5 },  // pH
  { 26, 30 },    // Temperature °C
  { 0, 50 },     // Turbidity
  { 0, 5 }       // Salinity ppt
};

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, RX_PIN, TX_PIN);

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  trackerServo.attach(SERVO_PIN, 500, 2400);
  trackerServo.write(servoPos);

  Serial.println("ESP32 Receiver + Solar Tracker ready...");
}

void buzzAlert() {
  tone(BUZZER_PIN, 1000, 500);
}

void batteryLevelChecker(){
  
  return batteryLevel;
}

void solarTracker() {
  int leftValue = analogRead(LDR_Left);
  int rightValue = analogRead(LDR_Right);
  int difference = leftValue - rightValue;

  Serial.print("LDR Left: "); Serial.print(leftValue);
  Serial.print(" | LDR Right: "); Serial.println(rightValue);

  if (leftValue > sunlightThreshold || rightValue > sunlightThreshold) {
    Serial.println("☀️ Sunlight detected!");
  } else {
    Serial.println("🌑 No direct sunlight detected.");
  }

  if (abs(difference) > tolerance) {
    if (difference > 0 && servoPos < 180) {
      servoPos++;
      Serial.println("➡️ Moving right");
    } else if (difference < 0 && servoPos > 0) {
      servoPos--;
      Serial.println("⬅️ Moving left");
    }
    trackerServo.write(servoPos);
    delay(15);
  }
}

void loop() {
  solarTracker();

  if (Serial2.available()) {
    String input = Serial2.readStringUntil('\n');
    StaticJsonDocument<200> doc;

    DeserializationError error = deserializeJson(doc, input);
    if (error) {
      Serial.print("❌ JSON parse failed: ");
      Serial.println(error.c_str());
      return;
    }

    float pH = doc["pH"];
    float temperature = doc["temperature"];
    int turbidity = doc["turbidity"];
    float salinity = doc["salinity"];

    Serial.println("📥 Data received:");
    Serial.print("pH: "); Serial.println(pH);
    Serial.print("Temp: "); Serial.println(temperature);
    Serial.print("Turbidity: "); Serial.println(turbidity);
    Serial.print("Salinity: "); Serial.println(salinity);

    if (pH < thresholds[0].min + 0.3 || pH > thresholds[0].max - 0.3) buzzAlert();
    if (temperature < thresholds[1].min + 0.5 || temperature > thresholds[1].max - 0.5) buzzAlert();
    if (turbidity > thresholds[2].max - 5) buzzAlert();
    if (salinity > thresholds[3].max - 0.5) buzzAlert();
  }
}
