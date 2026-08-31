

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import SensorReading
from app.schemas.sensors import (
    SensorReadingCreate,
    SensorReadingResponse,
)

router = APIRouter(
    prefix="/api/sensors",
    tags=["Sensors"],
)


@router.post(
    "/readings",
    response_model=SensorReadingResponse,
)
def create_sensor_reading(
    reading: SensorReadingCreate,
    db: Session = Depends(get_db),
):
    sensor_reading = SensorReading(
        device_id=reading.device_id,
        recorded_at=datetime.now(timezone.utc),
        soil_moisture_raw=reading.soil_moisture_raw,
        temperature=reading.temperature,
        humidity=reading.humidity,
        pressure=reading.pressure,
        altitude=reading.altitude,
        light_intensity=reading.light_intensity,
    )

    db.add(sensor_reading)
    db.commit()
    db.refresh(sensor_reading)

    return sensor_reading

@router.get("/hourly-average")
def get_previous_hour_average(
    device_id: str = "ESP32_01",
    db: Session = Depends(get_db),
):
    # Your dashboard operates in Indian Standard Time
    ist = ZoneInfo("Asia/Kolkata")

    now_ist = datetime.now(ist)

    # Current hour starts here.
    # Example:
    # 1:45 PM -> 1:00 PM
    current_hour_start = now_ist.replace(
        minute=0,
        second=0,
        microsecond=0,
    )

    # Previous completed hour
    previous_hour_start = current_hour_start - timedelta(hours=1)
    previous_hour_end = current_hour_start

    # Convert IST boundaries to UTC because recorded_at is stored as UTC
    previous_hour_start_utc = previous_hour_start.astimezone(timezone.utc)
    previous_hour_end_utc = previous_hour_end.astimezone(timezone.utc)

    result = (
        db.query(
            func.avg(SensorReading.soil_moisture_raw).label(
                "soil_moisture"
            ),
            func.avg(SensorReading.temperature).label(
                "temperature"
            ),
            func.avg(SensorReading.humidity).label(
                "humidity"
            ),
            func.avg(SensorReading.pressure).label(
                "pressure"
            ),
            func.avg(SensorReading.altitude).label(
                "altitude"
            ),
            func.avg(SensorReading.light_intensity).label(
                "light_intensity"
            ),
        )
        .filter(
            SensorReading.device_id == device_id,
            SensorReading.recorded_at >= previous_hour_start_utc,
            SensorReading.recorded_at < previous_hour_end_utc,
        )
        .first()
    )

    if result.soil_moisture is None:
        raise HTTPException(
            status_code=404,
            detail="No sensor data available for the previous hour",
        )

    return {
        "device_id": device_id,
        "period_start": previous_hour_start.isoformat(),
        "period_end": previous_hour_end.isoformat(),

        "soil_moisture": round(float(result.soil_moisture), 2),
        "temperature": round(float(result.temperature), 2),
        "humidity": round(float(result.humidity), 2),
        "pressure": round(float(result.pressure), 2),
        "altitude": round(float(result.altitude), 2),
        "light_intensity": round(float(result.light_intensity), 2),
    }