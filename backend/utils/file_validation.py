from pathlib import Path

from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError


IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
VIDEO_EXTENSIONS = {"mp4", "mov", "webm"}
DOCUMENT_EXTENSIONS = {"pdf", "doc", "docx", "xls", "xlsx"}
MODEL_EXTENSIONS = {"dwg", "dxf", "skp", "glb", "gltf", "obj", "fbx", "rvt"}
DANGEROUS_EXTENSIONS = {
    "asp",
    "aspx",
    "bat",
    "cmd",
    "com",
    "exe",
    "html",
    "htm",
    "jar",
    "js",
    "jsp",
    "php",
    "ps1",
    "sh",
    "svg",
}

TASK_MEDIA_EXTENSIONS = IMAGE_EXTENSIONS | VIDEO_EXTENSIONS | {"pdf", "docx"}
PHASE_DOCUMENT_EXTENSIONS = IMAGE_EXTENSIONS | DOCUMENT_EXTENSIONS | MODEL_EXTENSIONS
MAX_UPLOAD_SIZE = 50 * 1024 * 1024


def _extension(uploaded_file):
    return Path(uploaded_file.name or "").suffix.lower().lstrip(".")


def validate_safe_upload(uploaded_file, *, allowed_extensions, label="file"):
    """
    Validate user uploads with no extra dependency.
    Extension checks block active content; lightweight content checks catch common spoofing.
    """
    ext = _extension(uploaded_file)
    if not ext:
        raise ValidationError(f"{label} must have a file extension.")
    if ext in DANGEROUS_EXTENSIONS or ext not in allowed_extensions:
        allowed = ", ".join(sorted(allowed_extensions))
        raise ValidationError(f"Unsupported {label} type '.{ext}'. Allowed: {allowed}.")
    if getattr(uploaded_file, "size", 0) and uploaded_file.size > MAX_UPLOAD_SIZE:
        raise ValidationError(f"{label} is too large. Maximum size is 50 MB.")

    pos = None
    try:
        pos = uploaded_file.tell()
    except Exception:
        pos = None

    try:
        if ext in IMAGE_EXTENSIONS:
            try:
                img = Image.open(uploaded_file)
                img.verify()
            except (UnidentifiedImageError, OSError) as exc:
                raise ValidationError(f"{label} is not a valid image.") from exc
        elif ext == "pdf":
            header = uploaded_file.read(5)
            if header != b"%PDF-":
                raise ValidationError(f"{label} is not a valid PDF.")
    finally:
        try:
            uploaded_file.seek(pos or 0)
        except Exception:
            pass

    return uploaded_file
