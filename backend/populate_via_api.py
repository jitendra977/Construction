#!/usr/bin/env python3
"""
populate_via_api.py
===================

Wipes the HCMS database through the REST API and re-seeds it with a
realistic Nepali-construction demo dataset — all via HTTP POSTs, no ORM.

Usage
-----
    # with environment variables
    export HCMS_HOST=http://localhost:8000
    export HCMS_EMAIL=admin@example.com
    export HCMS_PASSWORD='yourpass'
    python populate_via_api.py

    # or with CLI flags
    python populate_via_api.py \\
        --host http://localhost:8000 \\
        --email admin@example.com \\
        --password 'yourpass'

The script is idempotent: it deletes all rows it can reach via the API
first, then inserts a fresh set. Your superuser account is preserved.

Requires: requests  (pip install requests)
"""
from __future__ import annotations

import argparse
import getpass
import os
import random
import sys
import time
from datetime import date, timedelta
from typing import Any

try:
    import requests
except ImportError:
    print("Please `pip install requests` first.", file=sys.stderr)
    sys.exit(1)


# --------------------------------------------------------------------------- #
#  CLI + auth                                                                 #
# --------------------------------------------------------------------------- #

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Seed HCMS through the REST API.")
    p.add_argument("--host", default=os.environ.get("HCMS_HOST", "http://localhost:8000"))
    p.add_argument("--email", default=os.environ.get("HCMS_EMAIL"))
    p.add_argument("--password", default=os.environ.get("HCMS_PASSWORD"))
    p.add_argument("--no-wipe", action="store_true", help="Skip deletion phase.")
    p.add_argument("--verbose", "-v", action="store_true")
    return p.parse_args()


class Client:
    """Tiny wrapper around `requests` with JWT auth baked in."""

    def __init__(self, host: str, verbose: bool = False):
        self.host = host.rstrip("/")
        self.session = requests.Session()
        self.token: str | None = None
        self.verbose = verbose

    # ---- auth ----
    def login(self, email: str, password: str) -> None:
        r = self.session.post(
            f"{self.host}/api/v1/auth/login/",
            json={"email": email, "password": password},
            timeout=20,
        )
        if r.status_code != 200:
            raise SystemExit(f"❌ Login failed ({r.status_code}): {r.text}")
        self.token = r.json()["access"]
        self.session.headers["Authorization"] = f"Bearer {self.token}"
        user = r.json().get("user", {})
        print(f"✅ Logged in as {user.get('email') or email}")

    # ---- raw verbs ----
    def _url(self, path: str) -> str:
        return f"{self.host}{path}" if path.startswith("/") else f"{self.host}/{path}"

    def get(self, path: str, **kwargs) -> requests.Response:
        return self.session.get(self._url(path), timeout=30, **kwargs)

    def post(self, path: str, json: dict) -> requests.Response:
        return self.session.post(self._url(path), json=json, timeout=30)

    def delete(self, path: str) -> requests.Response:
        return self.session.delete(self._url(path), timeout=30)

    # ---- high-level helpers ----
    def list_all(self, path: str) -> list[dict]:
        """Follow pagination if present and return every object."""
        out: list[dict] = []
        url = self._url(path)
        while url:
            r = self.session.get(url, timeout=30)
            if r.status_code != 200:
                if self.verbose:
                    print(f"   ⚠️  list {path} → {r.status_code}")
                return out
            body = r.json()
            if isinstance(body, list):
                out.extend(body)
                url = None
            else:
                out.extend(body.get("results") or [])
                url = body.get("next")
        return out

    def create(self, path: str, payload: dict, *, label: str = "") -> dict | None:
        r = self.post(path, payload)
        if r.status_code in (200, 201):
            data = r.json()
            if self.verbose:
                print(f"   ✅ {label or path} → id {data.get('id')}")
            return data
        if self.verbose:
            print(f"   ❌ {label or path} [{r.status_code}]: {r.text[:160]}")
        return None

    def bulk_delete(self, path: str, *, id_field: str = "id") -> int:
        rows = self.list_all(path)
        killed = 0
        for row in rows:
            rid = row.get(id_field)
            if rid is None:
                continue
            r = self.delete(f"{path}{rid}/")
            if r.status_code in (200, 202, 204):
                killed += 1
        return killed


# --------------------------------------------------------------------------- #
#  Static-ish seed data                                                       #
# --------------------------------------------------------------------------- #

TODAY = date.today()

PROJECT = {
    "name": "Mero Ghar — Budhanilkantha Residence",
    "owner_name": "Ram Bahadur Shrestha",
    "address": "Ward 10, Budhanilkantha, Kathmandu",
    "total_budget": "25000000.00",
    "start_date": (TODAY - timedelta(days=90)).isoformat(),
    "expected_completion_date": (TODAY + timedelta(days=360)).isoformat(),
    "area_sqft": 2800,
}

ROLES = [
    {"code": "SUPER_ADMIN", "name": "Super Admin",
     "can_manage_all_systems": True, "can_manage_finances": True,
     "can_view_finances": True, "can_manage_phases": True,
     "can_view_phases": True, "can_manage_users": True},
    {"code": "HOME_OWNER", "name": "Home Owner",
     "can_view_finances": True, "can_view_phases": True},
    {"code": "LEAD_ENGINEER", "name": "Lead Engineer",
     "can_manage_phases": True, "can_view_phases": True,
     "can_view_finances": True},
    {"code": "CONTRACTOR", "name": "Contractor",
     "can_view_phases": True},
    {"code": "VIEWER", "name": "Viewer",
     "can_view_phases": True},
]

USERS = [
    {"username": "ram.owner",  "email": "ram@example.com",
     "first_name": "Ram", "last_name": "Shrestha",
     "password": "Changeme123!", "role_code": "HOME_OWNER",
     "preferred_language": "ne"},
    {"username": "sita.eng",   "email": "sita@example.com",
     "first_name": "Sita", "last_name": "Adhikari",
     "password": "Changeme123!", "role_code": "LEAD_ENGINEER",
     "preferred_language": "en"},
    {"username": "hari.contr", "email": "hari@example.com",
     "first_name": "Hari", "last_name": "Tamang",
     "password": "Changeme123!", "role_code": "CONTRACTOR",
     "preferred_language": "ne"},
]

PHASES = [
    {"name": "Foundation (जग)",          "order": 1, "status": "COMPLETED",
     "description": "Site prep, excavation, DPC, footing & plinth beam.",
     "estimated_budget": "3200000.00"},
    {"name": "Superstructure (गारो)",    "order": 2, "status": "COMPLETED",
     "description": "Columns, beams and slab up to roof level.",
     "estimated_budget": "6500000.00"},
    {"name": "Roofing (छाना)",            "order": 3, "status": "IN_PROGRESS",
     "description": "Roof slab, water-proofing and parapet walls.",
     "estimated_budget": "1800000.00"},
    {"name": "Masonry & Plaster (प्लास्टर)", "order": 4, "status": "PENDING",
     "description": "Brickwork, internal and external plaster.",
     "estimated_budget": "2600000.00"},
    {"name": "Electrical & Plumbing (बिजुली र पानी)", "order": 5, "status": "PENDING",
     "description": "Conduit, wiring, pipes and fixture rough-in.",
     "estimated_budget": "1900000.00"},
    {"name": "Flooring & Tiling (भुइँ)",  "order": 6, "status": "PENDING",
     "description": "Tile, marble and wooden flooring.",
     "estimated_budget": "2200000.00"},
    {"name": "Finishing (सजावट)",         "order": 7, "status": "PENDING",
     "description": "Painting, doors, windows and hardware.",
     "estimated_budget": "3100000.00"},
    {"name": "Handover (हस्तान्तरण)",     "order": 8, "status": "PENDING",
     "description": "Final clean-up, inspection and handover.",
     "estimated_budget": "700000.00"},
]

FLOORS = [
    {"name": "Ground Floor (भुइँ तल्ला)",  "level": 0},
    {"name": "First Floor (पहिलो तल्ला)",  "level": 1},
    {"name": "Second Floor (दोस्रो तल्ला)", "level": 2},
    {"name": "Terrace (कौसी)",             "level": 3},
]

ROOMS = [
    {"floor_level": 0, "name": "Living Room",    "area_sqft": "320"},
    {"floor_level": 0, "name": "Kitchen",        "area_sqft": "180"},
    {"floor_level": 0, "name": "Dining",         "area_sqft": "200"},
    {"floor_level": 0, "name": "Guest Bath",     "area_sqft":  "45"},
    {"floor_level": 1, "name": "Master Bedroom", "area_sqft": "260"},
    {"floor_level": 1, "name": "Bedroom 2",      "area_sqft": "200"},
    {"floor_level": 1, "name": "Master Bath",    "area_sqft":  "70"},
    {"floor_level": 2, "name": "Bedroom 3",      "area_sqft": "200"},
    {"floor_level": 2, "name": "Study",          "area_sqft": "140"},
    {"floor_level": 2, "name": "Common Bath",    "area_sqft":  "60"},
    {"floor_level": 3, "name": "Terrace Garden", "area_sqft": "400"},
]

BUDGET_CATEGORIES = [
    {"name": "Cement & Concrete",  "allocation": "4500000"},
    {"name": "Steel & Rebar",      "allocation": "3500000"},
    {"name": "Bricks & Masonry",   "allocation": "1800000"},
    {"name": "Labour & Contract",  "allocation": "4200000"},
    {"name": "Electrical",         "allocation": "1200000"},
    {"name": "Plumbing",           "allocation":  "950000"},
    {"name": "Tiles & Flooring",   "allocation": "2100000"},
    {"name": "Doors & Windows",    "allocation": "1800000"},
    {"name": "Paint & Finish",     "allocation":  "950000"},
    {"name": "Permits & Legal",    "allocation":  "450000"},
    {"name": "Transport",          "allocation":  "550000"},
    {"name": "Miscellaneous",      "allocation": "1000000"},
]

FUNDING_SOURCES = [
    {"name": "Family Savings",         "amount": "9000000",
     "source_type": "OWN_MONEY",
     "received_date": (TODAY - timedelta(days=120)).isoformat()},
    {"name": "Nabil Bank Home Loan",   "amount": "12000000",
     "source_type": "LOAN",
     "received_date": (TODAY - timedelta(days=80)).isoformat(),
     "interest_rate": "10.5", "notes": "EMI of Rs 1,25,000 for 15 years."},
    {"name": "Parental Contribution",  "amount": "3000000",
     "source_type": "OWN_MONEY",
     "received_date": (TODAY - timedelta(days=60)).isoformat()},
    {"name": "Brother-in-law Loan",    "amount": "1000000",
     "source_type": "BORROWED",
     "received_date": (TODAY - timedelta(days=30)).isoformat(),
     "notes": "Zero interest, to be repaid in 2 years."},
]

SUPPLIERS = [
    {"name": "Himal Cement Agency",    "phone": "9851012345",
     "contact_person": "Bikash Khatri", "email": "himalcement@example.com",
     "address": "Balaju, Kathmandu", "category": "Cement"},
    {"name": "Everest Steel Traders",  "phone": "9841023456",
     "contact_person": "Suman Rai", "email": "everest@example.com",
     "address": "Teku, Kathmandu", "category": "Steel"},
    {"name": "Maitidevi Bricks",       "phone": "9841034567",
     "contact_person": "Gopal Maharjan", "email": "maitidevi@example.com",
     "address": "Bhaktapur", "category": "Masonry"},
    {"name": "Bagmati Electricals",    "phone": "9841045678",
     "contact_person": "Dipesh Bhandari", "email": "bagmatie@example.com",
     "address": "New Road, Kathmandu", "category": "Electrical"},
    {"name": "Kantipur Plumbing",      "phone": "9841056789",
     "contact_person": "Pramod Thapa", "email": "kantipurp@example.com",
     "address": "Kalanki, Kathmandu", "category": "Plumbing"},
    {"name": "Lalitpur Tiles World",   "phone": "9841067890",
     "contact_person": "Anil Shakya", "email": "lalitiles@example.com",
     "address": "Patan Dhoka, Lalitpur", "category": "Tiles"},
    {"name": "Nepal Door Craft",       "phone": "9841078901",
     "contact_person": "Sanjay Gurung", "email": "doorcraft@example.com",
     "address": "Chabahil, Kathmandu", "category": "Doors"},
    {"name": "Ashirwad Paints",        "phone": "9841089012",
     "contact_person": "Roshan Silwal", "email": "ashirwad@example.com",
     "address": "Satdobato, Lalitpur", "category": "Paint"},
]

CONTRACTORS = [
    {"name": "Krishna Thekedaar", "phone": "9851112233",
     "role": "THEKEDAAR", "skills": "General building, supervision",
     "daily_wage": "3500", "citizenship_number": "12-01-74-00231"},
    {"name": "Bishnu Mistri",     "phone": "9851223344",
     "role": "MISTRI", "skills": "Masonry, plaster",
     "daily_wage": "1800"},
    {"name": "Madhav Electrician", "phone": "9851334455",
     "role": "ELECTRICIAN", "skills": "Wiring, panel boards",
     "daily_wage": "2200"},
    {"name": "Sunil Plumber",     "phone": "9851445566",
     "role": "PLUMBER", "skills": "CPVC, sanitary fittings",
     "daily_wage": "2100"},
    {"name": "Ram Carpenter",     "phone": "9851556677",
     "role": "CARPENTER", "skills": "Doors, windows, furniture",
     "daily_wage": "2500"},
    {"name": "Gita Labour Group", "phone": "9851667788",
     "role": "LABOUR", "skills": "General site labour",
     "daily_wage": "1200"},
    {"name": "Rajesh Tile Mistri", "phone": "9851778899",
     "role": "TILE_MISTRI", "skills": "Marble & ceramic tiling",
     "daily_wage": "2300"},
    {"name": "Harish Painter",    "phone": "9851889900",
     "role": "PAINTER", "skills": "Interior & exterior paint",
     "daily_wage": "1900"},
]

# Materials — (name, unit, category, supplier_idx, budget_cat_name,
#              qty_estimated, qty_purchased, qty_used, current_stock,
#              min_stock, avg_cost)
MATERIALS = [
    ("OPC Cement 50kg (सिमेन्ट)",    "BORA",   "Cement",     0, "Cement & Concrete",   2200, 1800, 1620,  180,  60, "950"),
    ("Fine Sand (महिन बालुवा)",      "TIPPER", "Aggregate",  0, "Cement & Concrete",     40,   30,   28,    2,   2, "28000"),
    ("Coarse Aggregate (गिट्टी)",    "TIPPER", "Aggregate",  0, "Cement & Concrete",     55,   42,   40,    2,   2, "22000"),
    ("Rebar 8mm TMT",                "KG",     "Steel",      1, "Steel & Rebar",      12000, 9500, 8800,  700, 500, "110"),
    ("Rebar 12mm TMT",               "KG",     "Steel",      1, "Steel & Rebar",       8000, 6200, 5900,  300, 400, "108"),
    ("Rebar 16mm TMT",               "KG",     "Steel",      1, "Steel & Rebar",       5000, 3600, 3450,  150, 200, "112"),
    ("Red Clay Bricks",              "PCS",    "Masonry",    2, "Bricks & Masonry",   65000, 48000, 45000, 3000, 2000, "18"),
    ("Hollow Concrete Block 6\"",    "PCS",    "Masonry",    2, "Bricks & Masonry",    3500, 2600, 2400,  200, 200, "95"),
    ("2.5 sq mm Copper Wire",        "BUNDLE", "Electrical", 3, "Electrical",            80,   55,   48,    7,  10, "1400"),
    ("MCB 32A",                      "PCS",    "Electrical", 3, "Electrical",            60,   45,   42,    3,  10, "450"),
    ("LED 9W Bulb",                  "PCS",    "Electrical", 3, "Electrical",           120,  100,   85,   15,  20, "220"),
    ("CPVC Pipe 1\"",                "PCS",    "Plumbing",   4, "Plumbing",              80,   65,   60,    5,  10, "780"),
    ("PVC Pipe 4\"",                 "PCS",    "Plumbing",   4, "Plumbing",              50,   38,   36,    2,   5, "1200"),
    ("Wash Basin — Standard",        "PCS",    "Plumbing",   4, "Plumbing",               7,    5,    4,    1,   1, "4800"),
    ("Vitrified Tile 600x600",       "SQFT",   "Flooring",   5, "Tiles & Flooring",    3200, 2100, 1950,  150, 200, "85"),
    ("Marble Slab 2x4",              "SQFT",   "Flooring",   5, "Tiles & Flooring",    1200,  800,  720,   80, 100, "280"),
    ("Wooden Door 7ft x 3ft",        "PCS",    "Joinery",    6, "Doors & Windows",       14,    8,    6,    2,   2, "14500"),
    ("UPVC Window 4ft x 3ft",        "PCS",    "Joinery",    6, "Doors & Windows",       22,   14,   12,    2,   3, "9800"),
    ("Interior Emulsion Paint 4L",   "PCS",    "Paint",      7, "Paint & Finish",        90,   50,   42,    8,  15, "3200"),
    ("Exterior Weather Paint 4L",    "PCS",    "Paint",      7, "Paint & Finish",        60,   32,   26,    6,  10, "4800"),
    ("Binding Wire",                 "KG",     "Steel",      1, "Steel & Rebar",        400,  300,  280,   20,  30, "170"),
    ("Gravel (रोडा)",                "TIPPER", "Aggregate",  0, "Cement & Concrete",     18,   14,   13,    1,   2, "18500"),
    ("Water-proofing Chemical",      "LITER",  "Chemical",   3, "Miscellaneous",        200,  120,  100,   20,  30, "480"),
    ("Nails & Screws Assortment",    "KG",     "Hardware",   6, "Miscellaneous",         50,   40,   34,    6,  10, "210"),
    ("Tile Adhesive 25kg",           "BORA",   "Chemical",   5, "Tiles & Flooring",     120,   80,   70,   10,  15, "1450"),
]

# Task templates keyed by phase order
TASKS_BY_PHASE = {
    1: [("Site clearing & demolition", "HIGH", "COMPLETED"),
        ("Excavation of foundation", "HIGH", "COMPLETED"),
        ("DPC laying", "MEDIUM", "COMPLETED"),
        ("Plinth beam casting", "HIGH", "COMPLETED")],
    2: [("Column casting — Ground", "HIGH", "COMPLETED"),
        ("Ground floor slab casting", "CRITICAL", "COMPLETED"),
        ("Column casting — First", "HIGH", "COMPLETED"),
        ("First floor slab casting", "CRITICAL", "COMPLETED"),
        ("Second floor slab casting", "HIGH", "COMPLETED")],
    3: [("Terrace slab shuttering", "HIGH", "COMPLETED"),
        ("Terrace slab casting", "CRITICAL", "IN_PROGRESS"),
        ("Water-proofing", "HIGH", "PENDING"),
        ("Parapet wall masonry", "MEDIUM", "PENDING")],
    4: [("External wall masonry", "MEDIUM", "PENDING"),
        ("Internal wall masonry", "MEDIUM", "PENDING"),
        ("External plaster — 1st coat", "MEDIUM", "PENDING"),
        ("Internal plaster", "MEDIUM", "PENDING")],
    5: [("Electrical conduit layout", "HIGH", "PENDING"),
        ("Main wiring run", "HIGH", "PENDING"),
        ("CPVC pipe rough-in", "HIGH", "PENDING"),
        ("Sanitary rough-in", "MEDIUM", "PENDING"),
        ("Panel board install", "HIGH", "PENDING")],
    6: [("Ground floor tiling", "MEDIUM", "PENDING"),
        ("First floor tiling", "MEDIUM", "PENDING"),
        ("Bathroom tiling", "HIGH", "PENDING"),
        ("Kitchen marble fix", "MEDIUM", "PENDING")],
    7: [("Door & frame install", "MEDIUM", "PENDING"),
        ("Window install", "MEDIUM", "PENDING"),
        ("Interior paint — primer", "LOW", "PENDING"),
        ("Interior paint — finish", "MEDIUM", "PENDING"),
        ("Exterior paint", "MEDIUM", "PENDING"),
        ("Hardware & fixtures", "LOW", "PENDING")],
    8: [("Final cleaning", "LOW", "PENDING"),
        ("Municipal inspection", "HIGH", "PENDING"),
        ("Handover walkthrough", "HIGH", "PENDING")],
}

PERMIT_STEPS = [
    ("Land ownership verification (लालपुर्जा प्रमाणीकरण)", "APPROVED"),
    ("Chargeshit preparation (चार्जसीट)", "APPROVED"),
    ("Charkilla / boundary survey", "APPROVED"),
    ("Architectural drawing — Naksha (नक्सा)", "APPROVED"),
    ("Structural design approval", "IN_PROGRESS"),
    ("Ward recommendation", "PENDING"),
    ("Building permit issue", "PENDING"),
    ("Plinth level verification", "PENDING"),
    ("Completion certificate", "PENDING"),
]

ESTIMATOR_RATES = [
    ("CEMENT_BORA",        "OPC Cement 50kg (bora)",           "950",    "bora",   "MATERIAL"),
    ("SAND_TIPPER",        "Fine sand per tipper",             "28000",  "tipper", "MATERIAL"),
    ("AGG_TIPPER",         "Aggregate per tipper",             "22000",  "tipper", "MATERIAL"),
    ("REBAR_KG",           "TMT rebar per kg",                 "110",    "kg",     "MATERIAL"),
    ("BRICK_PCS",          "Red clay brick per piece",         "18",     "pcs",    "MATERIAL"),
    ("LABOUR_DAY",         "Skilled labour per day",           "2000",   "day",    "LABOR"),
    ("MISTRI_DAY",         "Mistri per day",                   "1800",   "day",    "LABOR"),
    ("TILE_SQFT",          "Vitrified tile per sqft",          "85",     "sqft",   "MATERIAL"),
    ("MARBLE_SQFT",        "Marble per sqft",                  "280",    "sqft",   "MATERIAL"),
    ("PAINT_LTR",          "Emulsion paint per litre",         "800",    "ltr",    "MATERIAL"),
    ("DOOR_PCS",           "Wooden door per piece",            "14500",  "pcs",    "MATERIAL"),
    ("WINDOW_PCS",         "UPVC window per piece",            "9800",   "pcs",    "MATERIAL"),
    ("ELECTRICAL_SQFT",    "Electrical rough-in per sqft",     "120",    "sqft",   "LABOR"),
    ("PLUMBING_POINT",     "Plumbing per point",               "3500",   "point",  "LABOR"),
]

PERMIT_DOC_TEMPLATES = [
    ("LALPURJA",   "Land ownership (लालपुर्जा)",         "LAND",
     "Collected from Malpot office."),
    ("CHARKILLA",  "Four-side boundary (चारकिल्ला)",    "LAND",
     "Survey department certified."),
    ("NAGRIKTA",   "Citizenship (नागरिकता)",            "ID",
     "Owner's citizenship copy."),
    ("NAKSHA",     "Architectural drawing (नक्सा)",     "DRAWING",
     "Stamped by licensed engineer."),
    ("STRUCTURAL", "Structural drawing",                "DRAWING",
     "PE-stamped with load calculations."),
    ("TAX_CLEAR",  "Tax clearance (कर चुक्ता)",         "APPROVAL",
     "Municipal tax office."),
]

ASSISTANT_PHRASES = [
    ("कति सिमेन्ट बाँकी छ?", "STOCK_CHECK", "ne", 1.4),
    ("kati cement baki chha", "STOCK_CHECK", "ne", 1.2),
    ("how much cement left", "STOCK_CHECK", "en", 1.3),
    ("बजेट कति भयो", "BUDGET_CHECK", "ne", 1.4),
    ("budget kati", "BUDGET_CHECK", "ne", 1.2),
    ("show budget", "BUDGET_CHECK", "en", 1.3),
    ("अर्को काम के हो", "NEXT_STEP", "ne", 1.5),
    ("what is next task", "NEXT_STEP", "en", 1.3),
    ("नयाँ काम थप्नुहोस्", "TASK_ADD", "ne", 1.2),
    ("add task", "TASK_ADD", "en", 1.2),
    ("काम सकियो", "TASK_COMPLETE", "ne", 1.3),
    ("mark task done", "TASK_COMPLETE", "en", 1.2),
    ("खर्च थप्नुहोस्", "EXPENSE_ADD", "ne", 1.2),
    ("add expense", "EXPENSE_ADD", "en", 1.2),
    ("मद्दत चाहियो", "HELP", "ne", 1.5),
    ("help", "HELP", "en", 1.5),
]

USER_GUIDES = [
    {"key": "getting_started",
     "title_en": "Getting Started", "title_ne": "सुरु गर्ने तरिका",
     "description_en": "A quick tour of Mero Ghar — dashboard, phases, tasks and budget.",
     "description_ne": "ड्यासबोर्ड, चरण, कार्य र बजेटको छोटो परिचय।",
     "type": "modal", "icon": "🏠", "order": 1},
    {"key": "add_expense",
     "title_en": "Add an Expense", "title_ne": "खर्च थप्ने",
     "description_en": "How to log a new expense with proof.",
     "description_ne": "प्रमाण सहित खर्च दर्ता कसरी गर्ने।",
     "type": "modal", "icon": "💸", "order": 2},
    {"key": "stock_flow",
     "title_en": "Stock In / Stock Out", "title_ne": "स्टक आउने र जाने",
     "description_en": "Log material purchase and usage, watch wastage.",
     "description_ne": "सामाग्री किन्दा र प्रयोग गर्दाको हिसाब, खेर जाने सामाग्री।",
     "type": "modal", "icon": "📦", "order": 3},
]


# --------------------------------------------------------------------------- #
#  Wipe phase                                                                 #
# --------------------------------------------------------------------------- #

WIPE_ORDER = [
    # bank / accounting first (many cross-refs)
    "/api/v1/finance/bill-payments/",
    "/api/v1/finance/bills/",
    "/api/v1/finance/bank-transfers/",
    "/api/v1/finance/journal-entries/",
    "/api/v1/finance/purchase-orders/",
    "/api/v1/finance/phase-budget-allocations/",
    "/api/v1/finance/payments/",
    "/api/v1/finance/expenses/",
    "/api/v1/finance/funding-transactions/",
    "/api/v1/finance/funding-sources/",
    # analytics & assistant (depend on phases/materials)
    "/api/v1/analytics/alerts/",
    "/api/v1/analytics/forecasts/",
    "/api/v1/analytics/rate-trends/",
    "/api/v1/assistant/transcripts/",
    "/api/v1/assistant/voice-commands/",
    "/api/v1/assistant/phrases/",
    # photo intel
    "/api/v1/photo-intel/digests/",
    "/api/v1/photo-intel/timelapses/",
    "/api/v1/photo-intel/analyses/",
    # permits
    "/api/v1/permits/reminders/",
    "/api/v1/permits/checklist-items/",
    "/api/v1/permits/checklists/",
    "/api/v1/permits/municipality-templates/",
    "/api/v1/permits/document-templates/",
    "/api/v1/permits/steps/",
    # estimator
    "/api/v1/estimator/boqs/",
    "/api/v1/estimator/boq-templates/",
    "/api/v1/estimator/rates/",
    # resources / inventory
    "/api/v1/material-transactions/",
    "/api/v1/wastage-alerts/",
    "/api/v1/materials/",
    "/api/v1/documents/",
    "/api/v1/task-media/",
    "/api/v1/updates/",
    "/api/v1/tasks/",
    "/api/v1/rooms/",
    "/api/v1/floors/",
    "/api/v1/phases/",
    "/api/v1/finance/budget-categories/",
    "/api/v1/suppliers/",
    "/api/v1/contractors/",
    # user guides
    "/api/v1/user-guide-faqs/",
    "/api/v1/user-guide-steps/",
    "/api/v1/user-guides/",
    # project last
    "/api/v1/projects/",
]


def wipe(c: Client) -> None:
    print("\n🧹 Wiping existing data...")
    for path in WIPE_ORDER:
        killed = c.bulk_delete(path)
        if killed:
            print(f"   deleted {killed:>4}  @ {path}")
    # non-superuser accounts only
    for u in c.list_all("/api/v1/users/"):
        if u.get("is_superuser"):
            continue
        r = c.delete(f"/api/v1/users/{u['id']}/")
        if r.status_code in (200, 204):
            print(f"   deleted user {u.get('email')}")
    # roles last (shouldn't block on FK to users anymore)
    for role in c.list_all("/api/v1/roles/"):
        r = c.delete(f"/api/v1/roles/{role['id']}/")
        if r.status_code in (200, 204):
            if c.verbose:
                print(f"   deleted role {role.get('code')}")
    print("✅ Wipe complete.\n")


# --------------------------------------------------------------------------- #
#  Seed phase                                                                 #
# --------------------------------------------------------------------------- #

def seed(c: Client) -> None:
    print("🌱 Seeding fresh data...\n")

    # ---- roles ----
    print("1/15  Roles")
    roles_by_code: dict[str, int] = {}
    for r in ROLES:
        created = c.create("/api/v1/roles/", r, label=f"role {r['code']}")
        if created:
            roles_by_code[r["code"]] = created["id"]

    # ---- users ----
    print("2/15  Users")
    for u in USERS:
        payload = {k: v for k, v in u.items() if k != "role_code"}
        if u["role_code"] in roles_by_code:
            payload["role_id"] = roles_by_code[u["role_code"]]
        c.create("/api/v1/users/", payload, label=f"user {u['email']}")

    # ---- project ----
    print("3/15  Project")
    project = c.create("/api/v1/projects/", PROJECT, label="project")
    project_id = project["id"] if project else None

    # ---- phases ----
    print("4/15  Phases")
    phases_by_order: dict[int, int] = {}
    for p in PHASES:
        created = c.create("/api/v1/phases/", p, label=f"phase {p['name']}")
        if created:
            phases_by_order[p["order"]] = created["id"]

    # ---- floors & rooms ----
    print("5/15  Floors & rooms")
    floors_by_level: dict[int, int] = {}
    for f in FLOORS:
        created = c.create("/api/v1/floors/", f, label=f"floor {f['name']}")
        if created:
            floors_by_level[f["level"]] = created["id"]

    for room in ROOMS:
        fid = floors_by_level.get(room["floor_level"])
        if not fid:
            continue
        payload = {k: v for k, v in room.items() if k != "floor_level"}
        payload["floor"] = fid
        c.create("/api/v1/rooms/", payload, label=f"room {room['name']}")

    # ---- budget categories ----
    print("6/15  Budget categories")
    cats_by_name: dict[str, int] = {}
    for b in BUDGET_CATEGORIES:
        created = c.create("/api/v1/finance/budget-categories/", b,
                            label=f"cat {b['name']}")
        if created:
            cats_by_name[b["name"]] = created["id"]

    # ---- funding sources ----
    print("7/15  Funding sources")
    funding_ids: list[int] = []
    for f in FUNDING_SOURCES:
        created = c.create("/api/v1/finance/funding-sources/", f,
                            label=f"funding {f['name']}")
        if created:
            funding_ids.append(created["id"])

    # ---- suppliers ----
    print("8/15  Suppliers")
    suppliers_ids: list[int] = []
    for s in SUPPLIERS:
        created = c.create("/api/v1/suppliers/", s,
                            label=f"supplier {s['name']}")
        if created:
            suppliers_ids.append(created["id"])

    # ---- contractors ----
    print("9/15  Contractors")
    contractor_ids: list[int] = []
    for con in CONTRACTORS:
        created = c.create("/api/v1/contractors/", con,
                            label=f"contractor {con['name']}")
        if created:
            contractor_ids.append(created["id"])

    # ---- materials ----
    print("10/15 Materials")
    material_ids: list[int] = []
    for (name, unit, cat, sup_idx, bc_name,
         q_est, q_pur, q_use, q_stock, q_min, avg) in MATERIALS:
        payload = {
            "name": name, "unit": unit, "category": cat,
            "quantity_estimated": str(q_est), "quantity_purchased": str(q_pur),
            "quantity_used": str(q_use), "current_stock": str(q_stock),
            "min_stock_level": str(q_min), "avg_cost_per_unit": avg,
        }
        if sup_idx < len(suppliers_ids):
            payload["supplier"] = suppliers_ids[sup_idx]
        if bc_name in cats_by_name:
            payload["budget_category"] = cats_by_name[bc_name]
        created = c.create("/api/v1/materials/", payload,
                            label=f"material {name}")
        if created:
            material_ids.append(created["id"])

    # ---- tasks ----
    print("11/15 Tasks")
    task_ids: list[int] = []
    for order, tasks in TASKS_BY_PHASE.items():
        phase_id = phases_by_order.get(order)
        if not phase_id:
            continue
        for title, prio, stat in tasks:
            payload = {
                "title": title, "phase": phase_id,
                "priority": prio, "status": stat,
                "estimated_cost": str(random.randint(15000, 120000)),
                "start_date": (TODAY - timedelta(days=random.randint(1, 80))).isoformat(),
                "due_date":  (TODAY + timedelta(days=random.randint(7, 45))).isoformat(),
            }
            if contractor_ids:
                payload["assigned_to"] = random.choice(contractor_ids)
            created = c.create("/api/v1/tasks/", payload, label=f"task {title}")
            if created:
                task_ids.append(created["id"])

    # ---- material transactions (IN + OUT sample) ----
    print("12/15 Material transactions")
    for mid in material_ids[:10]:
        c.create("/api/v1/material-transactions/", {
            "material": mid,
            "transaction_type": "IN",
            "status": "RECEIVED",
            "quantity": str(random.randint(20, 200)),
            "unit_price": str(random.randint(100, 2500)),
            "date": (TODAY - timedelta(days=random.randint(10, 60))).isoformat(),
            "purpose": "Initial stock purchase",
        }, label="stock-in")
        c.create("/api/v1/material-transactions/", {
            "material": mid,
            "transaction_type": "OUT",
            "quantity": str(random.randint(5, 50)),
            "date": (TODAY - timedelta(days=random.randint(1, 20))).isoformat(),
            "purpose": "Site consumption",
        }, label="stock-out")

    # ---- expenses ----
    print("13/15 Expenses")
    exp_titles = [
        ("Cement for Ground Floor Slab", "MATERIAL",   "Cement & Concrete",  450000),
        ("Rebar purchase — main batch",  "MATERIAL",   "Steel & Rebar",      820000),
        ("Brick delivery — 15,000 pcs",  "MATERIAL",   "Bricks & Masonry",   280000),
        ("Mistri labour — week 12",      "LABOR",      "Labour & Contract",   95000),
        ("Mistri labour — week 14",      "LABOR",      "Labour & Contract",   98000),
        ("Panel board + wiring starter", "MATERIAL",   "Electrical",         180000),
        ("Sanitary rough-in supplies",   "MATERIAL",   "Plumbing",           145000),
        ("Permit application fees",      "FEES",       "Permits & Legal",     45000),
        ("Ward recommendation fee",      "FEES",       "Permits & Legal",     12000),
        ("Site water tanker — Aug",      "OTHER",      "Transport",           18000),
        ("Tile stock — floor 1",         "MATERIAL",   "Tiles & Flooring",   420000),
        ("Carpenter — door frames",      "LABOR",      "Labour & Contract",   85000),
        ("Interior paint (primer)",      "MATERIAL",   "Paint & Finish",     135000),
        ("Engineer consultation",        "LABOR",      "Labour & Contract",   25000),
        ("Marble stock",                 "MATERIAL",   "Tiles & Flooring",   320000),
        ("Binding wire + nails",         "MATERIAL",   "Steel & Rebar",       22000),
        ("Diesel for mixer",             "OTHER",      "Transport",           15000),
        ("Water-proofing chemical",      "MATERIAL",   "Miscellaneous",       48000),
        ("Govt inspection fee",          "GOVT",       "Permits & Legal",      8000),
        ("Safety gear (helmets etc.)",   "OTHER",      "Miscellaneous",       18000),
    ]
    for title, etype, cat_name, amt in exp_titles:
        payload = {
            "title": title,
            "expense_type": etype,
            "amount": str(amt),
            "paid_to": random.choice(["Himal Cement Agency", "Everest Steel",
                                      "Krishna Thekedaar", "Cash Counter",
                                      "Kantipur Plumbing"]),
            "date": (TODAY - timedelta(days=random.randint(5, 80))).isoformat(),
            "is_paid": True,
        }
        if cat_name in cats_by_name:
            payload["category"] = cats_by_name[cat_name]
        if funding_ids:
            payload["funding_source"] = random.choice(funding_ids)
        c.create("/api/v1/finance/expenses/", payload, label=f"expense {title}")

    # ---- permits ----
    print("14/15 Permit steps")
    for idx, (title, stat) in enumerate(PERMIT_STEPS, start=1):
        payload = {
            "title": title,
            "status": stat,
            "order": idx,
            "description": f"Step {idx} of Kathmandu Municipality naksha pass workflow.",
        }
        if stat == "APPROVED":
            payload["date_issued"] = (TODAY - timedelta(days=random.randint(15, 90))).isoformat()
        c.create("/api/v1/permits/steps/", payload, label=f"permit {title}")

    for t in PERMIT_DOC_TEMPLATES:
        c.create("/api/v1/permits/document-templates/", {
            "key": t[0], "label": t[1], "category": t[2],
            "description": t[3],
        }, label=f"doc-template {t[0]}")

    # ---- estimator rates + boq template ----
    print("15/15 Estimator + assistant + user guides")
    for key, label, val, unit, cat in ESTIMATOR_RATES:
        c.create("/api/v1/estimator/rates/", {
            "key": key, "label": label, "value": val,
            "unit": unit, "category": cat,
        }, label=f"rate {key}")

    c.create("/api/v1/estimator/boq-templates/", {
        "name": "Standard 2-Storey Residential",
        "description": "A safe-default BoQ for ~1000 sq ft RCC homes in Kathmandu Valley.",
        "quality_tier": "STANDARD",
        "min_sqft": 600, "max_sqft": 2000,
        "storeys_applicable": "1,2",
    }, label="boq-template")

    # ---- assistant phrases ----
    for phrase, intent, lang, weight in ASSISTANT_PHRASES:
        c.create("/api/v1/assistant/phrases/", {
            "phrase": phrase, "intent": intent,
            "language": lang, "weight": weight,
        }, label=f"phrase {phrase[:18]}")

    # ---- user guides ----
    for g in USER_GUIDES:
        c.create("/api/v1/user-guides/", g, label=f"guide {g['key']}")

    # ---- wastage alerts: best-effort, server may auto-create ----
    # (skipped — generated by analytics service when data is imported)

    print("\n🎉 Seed complete.")


# --------------------------------------------------------------------------- #
#  Entrypoint                                                                 #
# --------------------------------------------------------------------------- #

def main() -> None:
    args = parse_args()

    email = args.email or input("Superuser email: ").strip()
    password = args.password or getpass.getpass("Superuser password: ")

    c = Client(args.host, verbose=args.verbose)
    print(f"🔗 Target: {args.host}")
    c.login(email, password)

    t0 = time.time()
    if not args.no_wipe:
        wipe(c)
    seed(c)
    print(f"\n⏱  Took {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
