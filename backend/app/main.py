from fastapi import FastAPI

from app.database.connection import Base, engine
from app.database import models
from app.api.routes.sensor import router as sensor_router

app = FastAPI(title="CultivaX API")


Base.metadata.create_all(bind=engine)


app.include_router(sensor_router)


@app.get("/")
def root():
    return {
        "message": "CultivaX API is running"
    }