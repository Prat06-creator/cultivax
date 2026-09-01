

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

@router.get("/latest")
def get_latest_sensor_reading(
    device_id: str = "ESP32_01",
    db: Session = Depends(get_db),
):
    reading = (
        db.query(SensorReading)
        .filter(
            SensorReading.device_id == device_id
        )
        .order_by(
            SensorReading.recorded_at.desc()
        )
        .first()
    )

    if reading is None:
        raise HTTPException(
            status_code=404,
            detail="No sensor readings found",
        )

    return {
        "id": reading.id,
        "device_id": reading.device_id,
        "recorded_at": reading.recorded_at,
        "soil_moisture_raw": reading.soil_moisture_raw,
        "temperature": reading.temperature,
        "humidity": reading.humidity,
        "pressure": reading.pressure,
        "altitude": reading.altitude,
        "light_intensity": reading.light_intensity,
    }
@router.get("/history")
def get_sensor_history(
    duration: str = "7d",
    device_id: str = "ESP32_01",
    db: Session = Depends(get_db),
):
    ist = ZoneInfo("Asia/Kolkata")
    now_ist = datetime.now(ist)

    # ============================================
    # DETERMINE RANGE
    # ============================================

    if duration == "1d":

        # Today at 00:00 IST
        start_time = now_ist.replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )

        # Start of current hour
        # Example: 7:42 PM -> 7:00 PM
        #
        # Therefore only completed hours are returned.
        end_time = now_ist.replace(
            minute=0,
            second=0,
            microsecond=0,
        )

        bucket = "hour"

    elif duration == "3d":

        start_time = now_ist - timedelta(days=3)
        end_time = now_ist
        bucket = "hour"

    elif duration == "7d":

        start_time = now_ist - timedelta(days=7)
        end_time = now_ist
        bucket = "day"

    elif duration == "1m":

        start_time = now_ist - timedelta(days=30)
        end_time = now_ist
        bucket = "day"

    elif duration == "3m":

        start_time = now_ist - timedelta(days=90)
        end_time = now_ist
        bucket = "week"

    elif duration == "6m":

        start_time = now_ist - timedelta(days=180)
        end_time = now_ist
        bucket = "week"

    elif duration == "1y":

        start_time = now_ist - timedelta(days=365)
        end_time = now_ist
        bucket = "month"

    else:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid duration. "
                "Use 1d, 3d, 7d, 1m, 3m, 6m or 1y"
            ),
        )

    # ============================================
    # IST → UTC FOR DATABASE FILTER
    # ============================================

    start_time_utc = start_time.astimezone(timezone.utc)
    end_time_utc = end_time.astimezone(timezone.utc)

    # ============================================
    # CONVERT DATABASE TIMESTAMP TO IST
    # ============================================

    local_timestamp = func.timezone(
        "Asia/Kolkata",
        SensorReading.recorded_at,
    )

    bucket_start = func.date_trunc(
        bucket,
        local_timestamp,
    )

    # ============================================
    # GET AGGREGATED DATA FROM POSTGRESQL
    # ============================================

    results = (
        db.query(
            bucket_start.label("period"),

            func.avg(
                SensorReading.soil_moisture_raw
            ).label("soil_moisture"),

            func.avg(
                SensorReading.temperature
            ).label("temperature"),

            func.avg(
                SensorReading.humidity
            ).label("humidity"),

            func.avg(
                SensorReading.pressure
            ).label("pressure"),

            func.avg(
                SensorReading.altitude
            ).label("altitude"),

            func.avg(
                SensorReading.light_intensity
            ).label("light_intensity"),
        )
        .filter(
            SensorReading.device_id == device_id,

            SensorReading.recorded_at >= start_time_utc,

            SensorReading.recorded_at < end_time_utc,
        )
        .group_by(bucket_start)
        .order_by(bucket_start)
        .all()
    )

    # ============================================
    # SPECIAL 1D HANDLING
    # ============================================

    if duration == "1d":

        # PostgreSQL returns naive local timestamps
        # from timezone() + date_trunc().
        result_map = {
            row.period: row
            for row in results
        }

        points = []

        current_hour = start_time

        while current_hour < end_time:

            # Convert aware IST datetime to the same
            # naive datetime PostgreSQL gives us.
            lookup_time = current_hour.replace(
                tzinfo=None
            )

            row = result_map.get(lookup_time)

            # ====================================
            # DATA EXISTS
            # ====================================

            if row is not None:

                points.append({
                    "period": current_hour.isoformat(),

                    "soil_moisture": (
                        round(
                            float(row.soil_moisture),
                            2,
                        )
                        if row.soil_moisture is not None
                        else None
                    ),

                    "temperature": (
                        round(
                            float(row.temperature),
                            2,
                        )
                        if row.temperature is not None
                        else None
                    ),

                    "humidity": (
                        round(
                            float(row.humidity),
                            2,
                        )
                        if row.humidity is not None
                        else None
                    ),

                    "pressure": (
                        round(
                            float(row.pressure),
                            2,
                        )
                        if row.pressure is not None
                        else None
                    ),

                    "altitude": (
                        round(
                            float(row.altitude),
                            2,
                        )
                        if row.altitude is not None
                        else None
                    ),

                    "light_intensity": (
                        round(
                            float(row.light_intensity),
                            2,
                        )
                        if row.light_intensity is not None
                        else None
                    ),
                })

            # ====================================
            # NO DATA → NULL
            # ====================================

            else:

                points.append({
                    "period": current_hour.isoformat(),

                    "soil_moisture": None,
                    "temperature": None,
                    "humidity": None,
                    "pressure": None,
                    "altitude": None,
                    "light_intensity": None,
                })

            current_hour += timedelta(hours=1)

        return {
            "device_id": device_id,
            "duration": "1d",
            "aggregation": "hour",
            "points": points,
        }

    # ============================================
    # OTHER DURATIONS
    # ============================================

    points = []

    for row in results:

        points.append({
            "period": row.period.isoformat(),

            "soil_moisture": (
                round(float(row.soil_moisture), 2)
                if row.soil_moisture is not None
                else None
            ),

            "temperature": (
                round(float(row.temperature), 2)
                if row.temperature is not None
                else None
            ),

            "humidity": (
                round(float(row.humidity), 2)
                if row.humidity is not None
                else None
            ),

            "pressure": (
                round(float(row.pressure), 2)
                if row.pressure is not None
                else None
            ),

            "altitude": (
                round(float(row.altitude), 2)
                if row.altitude is not None
                else None
            ),

            "light_intensity": (
                round(float(row.light_intensity), 2)
                if row.light_intensity is not None
                else None
            ),
        })

    return {
        "device_id": device_id,
        "duration": duration,
        "aggregation": bucket,
        "points": points,
    }