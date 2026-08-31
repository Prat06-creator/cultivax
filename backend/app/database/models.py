from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    device_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    soil_moisture_raw: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    temperature: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    humidity: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    pressure: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    altitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    light_intensity: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )