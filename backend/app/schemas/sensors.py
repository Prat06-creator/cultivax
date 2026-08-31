from datetime import datetime

from pydantic import BaseModel


class SensorReadingCreate(BaseModel):
    device_id: str

    soil_moisture_raw: int | None = None
    temperature: float | None = None
    humidity: float | None = None
    pressure: float | None = None
    altitude: float | None = None
    light_intensity: float | None = None


class SensorReadingResponse(BaseModel):
    id: int
    device_id: str
    recorded_at: datetime

    soil_moisture_raw: int | None
    temperature: float | None
    humidity: float | None
    pressure: float | None
    altitude: float | None
    light_intensity: float | None

    class Config:
        from_attributes = True