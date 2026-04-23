"""
Timelapse generation.

Two backends, picked automatically:

  1. ffmpeg (preferred) — high-quality H.264 mp4 at configurable fps.
  2. Pillow fallback   — animated GIF from PNG frames (always available).

Scope resolution
----------------
A Timelapse's scope can be a Room, a Floor, a ConstructionPhase, or the whole
project. `collect_media()` returns the chronologically-ordered TaskMedia
queryset that matches the scope and the [period_start, period_end] window.
"""
from __future__ import annotations

import io
import logging
import os
import shutil
import subprocess
import tempfile
from datetime import date, datetime, time
from typing import Iterable, Optional

from django.conf import settings
from django.core.files.base import ContentFile
from django.db.models import QuerySet
from django.utils import timezone

from apps.tasks.models import TaskMedia

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────
#  Scope resolution
# ─────────────────────────────────────────────────────────────────────
def collect_media(timelapse) -> "QuerySet[TaskMedia]":
    """Return chronologically-ordered TaskMedia matching the timelapse scope."""
    qs = TaskMedia.objects.filter(
        media_type="IMAGE",
        created_at__date__gte=timelapse.period_start,
        created_at__date__lte=timelapse.period_end,
    ).select_related("task", "task__room", "task__phase")

    scope = timelapse.scope
    if scope == "ROOM" and timelapse.room_id:
        qs = qs.filter(task__room_id=timelapse.room_id)
    elif scope == "FLOOR" and timelapse.floor_id:
        qs = qs.filter(task__room__floor_id=timelapse.floor_id)
    elif scope == "PHASE" and timelapse.phase_id:
        qs = qs.filter(task__phase_id=timelapse.phase_id)
    # PROJECT: no additional filter
    return qs.order_by("created_at", "id")


# ─────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────
def _ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None


def _copy_frames_to_tempdir(media_qs, tempdir: str, target_size=(1280, 720)):
    from PIL import Image

    count = 0
    for idx, m in enumerate(media_qs):
        try:
            m.file.open("rb")
            img = Image.open(io.BytesIO(m.file.read())).convert("RGB")
        except Exception as e:  # noqa: BLE001
            logger.warning("Skipping frame %s: %s", m.pk, e)
            continue
        finally:
            try:
                m.file.close()
            except Exception:
                pass

        img = _letterbox(img, target_size)
        out = os.path.join(tempdir, f"frame_{idx:05d}.png")
        img.save(out, format="PNG")
        count += 1
    return count


def _letterbox(img, size):
    from PIL import Image, ImageOps

    tw, th = size
    return ImageOps.pad(img, (tw, th), color=(0, 0, 0), centering=(0.5, 0.5))


def _make_thumbnail(first_frame_path: str) -> bytes:
    from PIL import Image

    img = Image.open(first_frame_path).convert("RGB")
    img.thumbnail((400, 225))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────
#  Backends
# ─────────────────────────────────────────────────────────────────────
def _render_mp4(tempdir: str, fps: int, output_path: str) -> bool:
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(fps),
        "-i", os.path.join(tempdir, "frame_%05d.png"),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-r", "30",
        output_path,
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=180)
        return True
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError) as e:
        logger.error("ffmpeg failed: %s", e)
        return False


def _render_gif(tempdir: str, fps: int, output_path: str, count: int) -> bool:
    from PIL import Image

    frames = []
    for idx in range(count):
        path = os.path.join(tempdir, f"frame_{idx:05d}.png")
        if not os.path.exists(path):
            continue
        frames.append(Image.open(path).convert("RGB"))
    if not frames:
        return False

    duration_ms = int(1000 / max(fps, 1))
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=duration_ms,
        loop=0,
        optimize=True,
    )
    return True


# ─────────────────────────────────────────────────────────────────────
#  Public API
# ─────────────────────────────────────────────────────────────────────
def generate_timelapse(timelapse, fps: Optional[int] = None):
    """
    Render a Timelapse row's video/GIF output from its scope's TaskMedia.
    Updates the row in-place and returns it.
    """
    from apps.photo_intel.models import Timelapse

    fps = fps or getattr(settings, "PHOTO_INTEL_TIMELAPSE_FPS", 4)

    timelapse.status = "GENERATING"
    timelapse.error_message = ""
    timelapse.save(update_fields=["status", "error_message"])

    media_qs = collect_media(timelapse)
    media_list = list(media_qs)
    if not media_list:
        timelapse.status = "NO_MEDIA"
        timelapse.media_count = 0
        timelapse.save()
        return timelapse

    with tempfile.TemporaryDirectory() as tempdir:
        frame_count = _copy_frames_to_tempdir(media_list, tempdir)
        if frame_count == 0:
            timelapse.status = "NO_MEDIA"
            timelapse.save()
            return timelapse

        # Try mp4 first, fall back to GIF
        mp4_ok = False
        if _ffmpeg_available():
            mp4_path = os.path.join(tempdir, "out.mp4")
            mp4_ok = _render_mp4(tempdir, fps, mp4_path)
            if mp4_ok:
                with open(mp4_path, "rb") as fh:
                    timelapse.video_file.save(
                        f"timelapse_{timelapse.pk}.mp4", ContentFile(fh.read()), save=False
                    )

        if not mp4_ok:
            gif_path = os.path.join(tempdir, "out.gif")
            ok = _render_gif(tempdir, fps, gif_path, frame_count)
            if ok:
                with open(gif_path, "rb") as fh:
                    timelapse.gif_file.save(
                        f"timelapse_{timelapse.pk}.gif", ContentFile(fh.read()), save=False
                    )
            else:
                timelapse.status = "FAILED"
                timelapse.error_message = "Failed to render gif fallback"
                timelapse.save()
                return timelapse

        # Thumbnail (always from first frame)
        try:
            first = os.path.join(tempdir, "frame_00000.png")
            thumb_bytes = _make_thumbnail(first)
            timelapse.thumbnail.save(
                f"thumb_{timelapse.pk}.jpg", ContentFile(thumb_bytes), save=False
            )
        except Exception as e:  # noqa: BLE001
            logger.warning("Thumb generation failed: %s", e)

    # M2M + stats
    timelapse.media_count = frame_count
    timelapse.duration_seconds = round(frame_count / fps, 2)
    timelapse.status = "READY"
    timelapse.save()
    timelapse.source_media.set(media_list)
    return timelapse


def regenerate_for_scope(scope: str, *, project=None, room=None, floor=None, phase=None,
                         period_start=None, period_end=None, title: str = "",
                         user=None, auto_generated: bool = False):
    """Create a new Timelapse row and immediately render it."""
    from apps.photo_intel.models import Timelapse

    tl = Timelapse.objects.create(
        title=title or _default_title(scope, room, floor, phase, period_start, period_end),
        scope=scope,
        project=project,
        room=room,
        floor=floor,
        phase=phase,
        period_start=period_start or date.today(),
        period_end=period_end or date.today(),
        generated_by=user,
        auto_generated=auto_generated,
    )
    return generate_timelapse(tl)


def _default_title(scope, room, floor, phase, start, end) -> str:
    tag = {
        "ROOM": getattr(room, "name", "Room"),
        "FLOOR": getattr(floor, "name", "Floor"),
        "PHASE": getattr(phase, "name", "Phase"),
        "PROJECT": "Project",
    }.get(scope, "Timelapse")
    s = start or date.today()
    e = end or date.today()
    return f"{tag} — {s} to {e}"
