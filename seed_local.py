#!/usr/bin/env python3
import subprocess
import os
import sys

def run():
    # Check if backend directory exists
    if not os.path.exists('backend'):
        print("Error: Could not find 'backend' directory.")
        return

    # Check if venv exists
    venv_python = os.path.join('backend', 'venv', 'bin', 'python3')
    if not os.path.exists(venv_python):
        print("Error: Could not find 'backend/venv'. Please run 'make local-setup' first.")
        return

    # Run the backend seed_local.py using the venv python
    print("🚀 Starting local seeding process...")
    cmd = [venv_python, 'seed_local.py']
    
    # We change directory to backend so relative imports work inside seed_local.py
    try:
        subprocess.run(cmd, cwd='backend', check=True)
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Seeding failed with exit code {e.returncode}")
        sys.exit(e.returncode)
    except KeyboardInterrupt:
        print("\n🛑 Seeding interrupted.")
        sys.exit(1)

if __name__ == '__main__':
    run()
