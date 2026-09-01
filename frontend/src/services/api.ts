const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ;

export interface SensorHistoryPoint {
  period: string;
  soil_moisture: number | null;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  altitude: number | null;
  light_intensity: number | null;
}

export interface SensorHistoryResponse {
  device_id: string;
  duration: string;
  aggregation: string;
  points: SensorHistoryPoint[];
}

export async function getSensorHistory(
  duration: string
): Promise<SensorHistoryResponse> {
  const url =
    `${API_BASE_URL}/api/sensors/history` +
    `?duration=${duration}&device_id=ESP32_01`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch sensor history: ${response.status}`
    );
  }

  return response.json();
}