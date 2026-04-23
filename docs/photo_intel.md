# 📸 Photo Intelligence & Timelapse

Phase 1 of HCMS 2.0 — turns passive `TaskMedia` photos into active progress intelligence.

## What it does

1. **Every photo uploaded to a Task is analysed in the background.**
   The analyzer produces:
   - a canonical construction-phase classification (`FOUNDATION`, `BRICKWORK`, …),
   - a confidence score (0 – 1),
   - a list of visible tags (rebar, shuttering, brick, plaster surface, …),
   - a simple quality score (resolution × lighting heuristic),
   - a `phase_match` verdict — does the photo match the Task's assigned phase?
2. **Mismatches are surfaced** in a homeowner-facing feed (`MismatchFeed`) and
   as an in-page banner (`PhaseMatchWarning`) so someone can correct a photo
   accidentally uploaded to the wrong task.
3. **Timelapses** can be generated on demand for any scope — Room, Floor,
   Construction Phase, or the Whole Project — across any date window.
4. **Weekly digests** are built every Monday (via `build_weekly_digest`
   management command) with counts, spend, material use, AI-flagged alerts,
   and an auto-generated project timelapse.

## Architecture

```
┌──────────────────┐  post_save   ┌──────────────────────────────┐
│ tasks.TaskMedia  ├──────────────►│ photo_intel.signals.schedule │
└──────────────────┘               │  (thread / Celery)          │
                                   └──────────────┬───────────────┘
                                                  │
                                                  ▼
                          ┌───────────────────────────────────────┐
                          │ services.analyzer.analyze_task_media  │
                          │   → PhotoAnalysis row                 │
                          └───────────────────────────────────────┘

┌─────────────────────────┐
│ TimelapseViewSet.generate│──► services.timelapse.generate_timelapse
└─────────────────────────┘      (ffmpeg mp4 → Pillow GIF fallback)
                                       │
                                       ▼
                                  Timelapse row
```

## Swappable analyzer backends

Configured via the `PHOTO_INTEL_ANALYZER` Django setting / env var:

| Value              | Requires                 | Notes                                   |
| ------------------ | ------------------------ | --------------------------------------- |
| `heuristic` (default) | Pillow only            | Keyword + color histogram baseline. Deterministic, test-friendly, no network. |
| `google_vision`    | `GOOGLE_VISION_API_KEY`  | Uses label + object detection endpoints. |
| `openai_vision`    | `OPENAI_API_KEY`         | Single GPT-4o-mini JSON-mode call.      |

If the configured backend fails to initialise, the pipeline falls back to
`heuristic` so photo uploads never block.

## Settings

Add to `config/settings.py`:

```python
PHOTO_INTEL_ENABLED = True          # master switch (default True)
PHOTO_INTEL_SYNC    = False         # run analysis synchronously (tests / debugging)
PHOTO_INTEL_ANALYZER = "heuristic"  # or "google_vision" / "openai_vision"
PHOTO_INTEL_TIMELAPSE_FPS = 4       # frames per second for generated videos
```

Requirements additions (already added to `backend/requirements.txt`):

```
Pillow>=10.2   # already present
# ffmpeg must be available on PATH for mp4 output — otherwise we fall back to GIF
```

## REST API (`/api/v1/photo-intel/`)

### Analyses

```
GET    /analyses/                ?task= &phase_match= &status= &min_confidence=
GET    /analyses/{id}/
POST   /analyses/{id}/reanalyze/
GET    /analyses/mismatches/     # high-confidence MISMATCH rows
GET    /analyses/stats/          # counts + avg quality
```

### Timelapses

```
GET    /timelapses/              ?scope= &room= &floor= &phase= &status=
POST   /timelapses/generate/     {scope, room|floor|phase, period_start, period_end, title?}
POST   /timelapses/{id}/regenerate/
DELETE /timelapses/{id}/
```

### Weekly digests

```
GET    /digests/
POST   /digests/build_current/
```

## Frontend usage

```jsx
import { photoIntelService } from 'services/api';
import PhotoAIBadge from 'components/photo_intel/PhotoAIBadge';
import PhaseMatchWarning from 'components/photo_intel/PhaseMatchWarning';
import TimelapseGallery from 'components/photo_intel/TimelapseGallery';
import MismatchFeed from 'components/photo_intel/MismatchFeed';

// Task-detail page:
<PhaseMatchWarning analysis={analysis} taskPhaseName={task.phase?.name} />
<PhotoAIBadge analysis={analysis} />

// Dedicated page:
<TimelapseGallery />
<MismatchFeed />
```

Route wiring (example `/src/routes/index.jsx`):

```jsx
import TimelapsePage from 'pages/TimelapsePage';
// …
<Route path="/timelapses" element={<TimelapsePage />} />
```

## Operational commands

```bash
# Backfill analyses for existing photos
python manage.py backfill_photo_analysis --limit 200

# Build this week's digest (run every Monday 07:00 via cron)
python manage.py build_weekly_digest
```

## Roadmap

- Swap thread-based async for Celery once a broker exists.
- Train a small YOLOv8 model on Nepali-context construction images for
  better object detection than the Google/OpenAI zero-shot labels.
- Auto-email the `WeeklyDigest` to homeowners (re-use `EmailLog` infra).
- Add per-room progress bar derived from AI completeness signals.
