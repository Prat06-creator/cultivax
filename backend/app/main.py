import time
from fastapi import FastAPI, Request

from app.database.connection import Base, engine
from app.database import models
from app.api.routes.sensor import router as sensor_router
# from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.disease import router as disease_router

app = FastAPI(title="CultivaX API")
# ==========================================
# REQUEST LOGGING
# ==========================================

@app.middleware("http")
async def log_requests(request: Request, call_next):

    start_time = time.time()

    response = await call_next(request)

    duration = time.time() - start_time

    print(
        f" {request.method} "
        f"{request.url.path} "
        f"→ {response.status_code} "
        f"({duration:.3f}s)"
    )

    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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