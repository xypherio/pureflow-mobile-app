import { buildForecastDetailsFromPredictions } from "@services/alertThresholdMonitor";

// Simple deterministic pseudo-random helper for repeatable variations
function seedRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    return (s = (s * 16807) % 2147483647) / 2147483647;
  };
}

export async function getMockForecast(timeframe = "6h") {
  const rand = seedRandom(42);

  // Simulated current readings
  const current = {
    pH: 12,
    Temperature: 29.5,
    Turbidity: 80,
    Salinity: 35,
  };

  // Simulated predicted deltas based on timeframe
  const tfMultiplier = timeframe === "24h" ? 1.8 : timeframe === "12h" ? 1.2 : 1.0;
  const predicted = {
    pH: Number((current.pH + (rand() * 1.2 - 0.2) * tfMultiplier).toFixed(2)),
    Temperature: Number((current.Temperature + (rand() * -1.2) * tfMultiplier).toFixed(1)),
    Turbidity: Number((current.Turbidity + (rand() * 4.0) * tfMultiplier).toFixed(0)),
    Salinity: Number((current.Salinity + (rand() * 0.8) * tfMultiplier).toFixed(0)),
  };

  const details = buildForecastDetailsFromPredictions(current, predicted, timeframe);

  return { current, predicted, details };
} 