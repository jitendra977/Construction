# Construction Project Scripts

This folder contains utility scripts for managing the local development environment, deploying the application, and syncing data between environments.

## Local Development

### \`dev.sh\`
Starts the local development environment using Docker Compose (\`docker-compose.local.yml\`).
*   **Usage**: \`./scripts/dev.sh\`
*   **Nuclear Mode**: If you are experiencing package cache issues or "Invalid Hook Call" errors in React, run \`./scripts/dev.sh --nuclear\`. This forcefully clears all Node modules, build folders, and recreates the local Docker volumes from scratch.

## Cloud Deployment & Sync

### \`deploy.sh\`
Automates the process of pushing current local changes to GitHub, SSH-ing into the VPS, pulling those changes, and rebuilding the production Docker containers safely.
*   **Usage**: \`./scripts/deploy.sh\` (Ensure \`VPS_USER\` and \`VPS_HOST\` are configured).

### \`fix-deployment.sh\`
A utility script used to repair slow deployments on the live server, specifically by forcefully rebuilding the images and pruning unused Docker cache directly on the VPS.
*   **Usage**: \`./scripts/fix-deployment.sh\`

### \`sync_to_cloud.sh\`
A critical script for migrating all data (projects, users, finances, tasks, etc.) from the local SQLite development database to the live Cloud MySQL database. 
It creates a local JSON fixture dump, uploads it to the remote server via \`scp\`, and executes Django's \`loaddata\` command inside the cloud backend container.
*   **Usage**: \`./scripts/sync_to_cloud.sh\`
*   *Note: This script requires SSH access and will prompt for your SSH passphrase.*

## Diagnostics

### \`test_production_login.sh\`
A diagnostic script to test API connectivity and authentication directly against the live backend API. It checks HTTP status, CORS headers, and attempts dummy logins to verify routing and security setup.
*   **Usage**: \`API_URL="..." FRONTEND_URL="..." TEST_EMAIL="..." TEST_PASSWORD="..." ./scripts/test_production_login.sh\`
