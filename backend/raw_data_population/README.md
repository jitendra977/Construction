# Populate Raw Data

This directory contains standalone scripts to populate the Django database with initial/raw data for the Construction project. The scripts are numbered to ensure they run in the correct order, respecting database foreign key constraints (e.g., creating users and projects before creating tasks and expenses).

## Directory Structure

- `00_cleanup.py`: Cleans up existing data to start fresh.
- `01_accounts.py` to `12_permits.py`: Scripts to populate various models (`accounts`, `core`, `resources`, `finance`, `tasks`, etc.).
- `98_verify_funding.py`: Verification script to ensure funding data is correct.

## How to Run the Scripts

### 1. Run All Scripts (Recommended)
To run all scripts in the correct sequential order, use the `run_population.py` script located in this directory.

Make sure your virtual environment is activated, then run:

```bash
cd backend/populate_raw_data
python run_population.py
```
This will execute the scripts in order from `00_cleanup` up to `98_verify_funding`.

### 2. Run a Single Script
Because the script filenames start with numbers (e.g., `10_tasks.py`), standard Python imports do not work easily, and running them directly using `python 10_tasks.py` will fail because the Django environment is not initialized in these files.

To run a specific script individually, you must use the `manage.py shell` and dynamically import the module. For example, to run **only** `10_tasks.py`:

```bash
cd backend
python manage.py shell -c "import importlib; module = importlib.import_module('populate_raw_data.10_tasks'); module.populate()"
```

To run a different script (like `05_resources_suppliers.py`), simply change the module name:

```bash
cd backend
python manage.py shell -c "import importlib; module = importlib.import_module('populate_raw_data.05_resources_suppliers'); module.populate()"
```

> **Note:** If you run a single script without running the preceding ones, ensure that the necessary related data (like Projects, Phases, Users) already exists in your database, otherwise you may encounter `ForeignKey` or `DoesNotExist` errors.
