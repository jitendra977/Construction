"""
Shared constants for Photo Intelligence.

PHASE_KEYS — normalized internal keys for the construction phases we can detect.
             Mapping to a user-facing `ConstructionPhase.name` (Nepali / custom)
             is done by `phase_mapper.resolve_task_phase_key()`.
"""

# Internal canonical phase keys
PHASE_FOUNDATION = "FOUNDATION"  # Jag Khanne, DPC
PHASE_COLUMN = "COLUMN"  # Piller Thadaune
PHASE_SLAB = "SLAB"  # Slab Dhalaan
PHASE_BRICKWORK = "BRICKWORK"  # Gaaro Lagaune (walls)
PHASE_PLASTERING = "PLASTERING"  # Plaster, finishing surfaces
PHASE_ELECTRICAL = "ELECTRICAL"
PHASE_PLUMBING = "PLUMBING"
PHASE_TILING = "TILING"
PHASE_PAINTING = "PAINTING"
PHASE_ROOFING = "ROOFING"
PHASE_FINISHING = "FINISHING"
PHASE_UNKNOWN = "UNKNOWN"

PHASE_KEYS = [
    PHASE_FOUNDATION,
    PHASE_COLUMN,
    PHASE_SLAB,
    PHASE_BRICKWORK,
    PHASE_PLASTERING,
    PHASE_ELECTRICAL,
    PHASE_PLUMBING,
    PHASE_TILING,
    PHASE_PAINTING,
    PHASE_ROOFING,
    PHASE_FINISHING,
    PHASE_UNKNOWN,
]

PHASE_LABEL = {
    PHASE_FOUNDATION: "Foundation / Jag",
    PHASE_COLUMN: "Column / Piller",
    PHASE_SLAB: "Slab / Chhat Dhalaan",
    PHASE_BRICKWORK: "Brickwork / Gaaro",
    PHASE_PLASTERING: "Plastering",
    PHASE_ELECTRICAL: "Electrical",
    PHASE_PLUMBING: "Plumbing",
    PHASE_TILING: "Tiling / Marble",
    PHASE_PAINTING: "Painting",
    PHASE_ROOFING: "Roofing",
    PHASE_FINISHING: "Finishing",
    PHASE_UNKNOWN: "Unknown",
}

# Keyword-to-phase mapping used for both:
#   (a) resolving a ConstructionPhase.name → internal key
#   (b) lightweight keyword scoring inside the heuristic analyzer
PHASE_KEYWORDS = {
    PHASE_FOUNDATION: [
        "foundation", "jag", "khanne", "dpc", "footing", "excavation",
        "rebar cage", "dig", "trench",
    ],
    PHASE_COLUMN: [
        "column", "piller", "pillar", "thadaune", "vertical bar",
    ],
    PHASE_SLAB: [
        "slab", "chhat", "dhalaan", "casting", "concrete pour",
        "shuttering", "centring",
    ],
    PHASE_BRICKWORK: [
        "brick", "gaaro", "wall", "masonry", "block work", "ijyanta",
    ],
    PHASE_PLASTERING: [
        "plaster", "render", "skim", "finishing coat", "putty",
    ],
    PHASE_ELECTRICAL: [
        "wiring", "conduit", "electrical", "wire", "switch", "mcb",
    ],
    PHASE_PLUMBING: [
        "plumbing", "pipe", "cpvc", "upvc", "water line", "drain",
    ],
    PHASE_TILING: [
        "tile", "marble", "granite", "flooring", "tiling",
    ],
    PHASE_PAINTING: [
        "paint", "emulsion", "primer", "colour",
    ],
    PHASE_ROOFING: [
        "roof", "truss", "sheeting", "parapet",
    ],
    PHASE_FINISHING: [
        "finishing", "cornice", "moulding", "polish",
    ],
}

# Common construction objects the heuristic analyzer may surface
OBJECT_VOCABULARY = [
    "rebar", "shuttering", "concrete", "brick", "cement bag",
    "sand heap", "wooden form", "scaffolding", "tile", "pipe",
    "wire", "electrical conduit", "window frame", "door frame",
    "plaster surface", "paint roller", "worker",
]
