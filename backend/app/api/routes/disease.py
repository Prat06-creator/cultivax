from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.disease_detection import predict_disease


router = APIRouter(
    prefix="/disease",
    tags=["Disease Detection"]
)


@router.post("/predict")
async def detect_disease(
    image: UploadFile = File(...)
):

    if not image.content_type:
        raise HTTPException(
            status_code=400,
            detail="Invalid image"
        )

    if not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Only image files are allowed"
        )

    image_bytes = await image.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Image is empty"
        )

    try:

        result = predict_disease(image_bytes)

        return {
            "success": True,
            "filename": image.filename,
            "prediction": result
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Disease prediction failed: {str(e)}"
        )