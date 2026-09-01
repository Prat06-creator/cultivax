#include <Wire.h>
#include <Adafruit_BME280.h>
#include <BH1750.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// =============================
// ESP32 PIN CONFIGURATION
// =============================

#define SOIL_PIN 34
#define SDA_PIN 21
#define SCL_PIN 22

// Sea-level pressure
#define SEALEVELPRESSURE_HPA 1013.25

// =============================
// WIFI CONFIGURATION
// =============================

const char* WIFI_SSID = "wifi name";
const char* WIFI_PASSWORD = "wifi password";

const char* API_URL =
    "https://cultivax.onrender.com/api/sensors/readings";

// =============================
// SENSOR OBJECTS
// =============================

Adafruit_BME280 bme;
BH1750 lightMeter;

// =============================
// SENSOR STATUS
// =============================

bool bmeOK = false;
bool bh1750OK = false;

// =============================
// SETUP
// =============================

void setup() {

  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("================================");
  Serial.println("       ESP32 SENSOR SYSTEM");
  Serial.println("================================");

  // ============================
  // WIFI
  // ============================

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {

    delay(500);
    Serial.print(".");

  }

  Serial.println();
  Serial.println("WiFi connected!");

  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  // ============================
  // I2C
  // ============================

  Wire.begin(SDA_PIN, SCL_PIN);

  // ============================
  // BME280
  // ============================

  if (bme.begin(0x76, &Wire)) {

    Serial.println("BME280 found at 0x76");
    bmeOK = true;

  }
  else if (bme.begin(0x77, &Wire)) {

    Serial.println("BME280 found at 0x77");
    bmeOK = true;

  }
  else {

    Serial.println("BME280 NOT FOUND!");

  }

  // ============================
  // BH1750
  // ============================

  if (lightMeter.begin(
        BH1750::CONTINUOUS_HIGH_RES_MODE,
        0x23,
        &Wire
      )) {

    Serial.println("BH1750 found at 0x23");
    bh1750OK = true;

  }
  else {

    Serial.println("BH1750 NOT FOUND!");

  }

  Serial.println();
  Serial.println("Starting sensor readings...");
  Serial.println();
}

// =============================
// SEND DATA TO FASTAPI
// =============================

void sendSensorData(
    int soilValue,
    float temperature,
    float humidity,
    float pressure,
    float altitude,
    float light
) {

  if (WiFi.status() != WL_CONNECTED) {

    Serial.println("WiFi disconnected!");
    return;

  }

  HTTPClient http;

  http.begin(API_URL);

  http.addHeader(
      "Content-Type",
      "application/json"
  );

  // ============================
  // CREATE JSON
  // ============================

  String json = "{";

  json += "\"device_id\":\"ESP32_01\",";

  json += "\"soil_moisture_raw\":";
  json += String(soilValue);
  json += ",";

  json += "\"temperature\":";
  json += String(temperature, 2);
  json += ",";

  json += "\"humidity\":";
  json += String(humidity, 2);
  json += ",";

  json += "\"pressure\":";
  json += String(pressure, 2);
  json += ",";

  json += "\"altitude\":";
  json += String(altitude, 2);
  json += ",";

  json += "\"light_intensity\":";
  json += String(light, 2);

  json += "}";

  Serial.println();
  Serial.println("Sending data:");
  Serial.println(json);

  // ============================
  // POST
  // ============================

  int responseCode = http.POST(json);

  Serial.print("HTTP Response: ");
  Serial.println(responseCode);

  String response = http.getString();

  Serial.println("Server response:");
  Serial.println(response);

  http.end();
}

// =============================
// LOOP
// =============================

void loop() {

  // ============================
  // SOIL MOISTURE
  // ============================

  int soilValue = analogRead(SOIL_PIN);

  // ============================
  // DEFAULT VALUES
  // ============================

  float temperature = 0;
  float humidity = 0;
  float pressure = 0;
  float altitude = 0;

  float light = 0;

  // ============================
  // BME280
  // ============================

  if (bmeOK) {

    temperature = bme.readTemperature();

    humidity = bme.readHumidity();

    pressure =
        bme.readPressure() / 100.0F;

    altitude =
        bme.readAltitude(
            SEALEVELPRESSURE_HPA
        );

  }

  // ============================
  // BH1750
  // ============================

  if (bh1750OK) {

    light =
        lightMeter.readLightLevel();

  }

  // ============================
  // SERIAL OUTPUT
  // ============================

  Serial.println("--------------------------------");

  Serial.print("Soil Moisture Raw : ");
  Serial.println(soilValue);

  Serial.print("Temperature       : ");
  Serial.print(temperature);
  Serial.println(" °C");

  Serial.print("Humidity          : ");
  Serial.print(humidity);
  Serial.println(" %");

  Serial.print("Pressure          : ");
  Serial.print(pressure);
  Serial.println(" hPa");

  Serial.print("Altitude          : ");
  Serial.print(altitude);
  Serial.println(" m");

  Serial.print("Light Intensity   : ");
  Serial.print(light);
  Serial.println(" lux");

  Serial.println("--------------------------------");

  // ============================
  // SEND TO BACKEND
  // ============================

  sendSensorData(
      soilValue,
      temperature,
      humidity,
      pressure,
      altitude,
      light
  );

  // ============================
  // WAIT 5 SECONDS
  // ============================

  delay(10000);
}