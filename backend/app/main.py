from fastapi import FastAPI

from app.database.connection import Base, engine
from app.database import models
from app.api.routes.sensor import router as sensor_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.disease import router as disease_router

app = FastAPI(title="CultivaX API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


app.include_router(sensor_router)
app.include_router(disease_router)


@app.get("/")
def root():
    return {
        "message": "CultivaX API is running"
    }