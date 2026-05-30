#!/usr/bin/env bash
# ============================================================
#  ConstructPro — Beautiful Interactive Push Pipeline
# ============================================================
set -euo pipefail

# ── Colours & Typography ─────────────────────────────────────
RED='\033[0;31m'
GRN='\033[0;32m'
YEL='\033[1;33m'
BLU='\033[0;34m'
MAG='\033[0;35m'
CYN='\033[0;36m'
WHT='\033[1;37m'
BOLD='\033[1m'
RST='\033[0m'

# Icons
T_CHECK="${GRN}✔${RST}"
T_CROSS="${RED}✘${RST}"
T_WARN="${YEL}⚠${RST}"
T_INFO="${CYN}ℹ${RST}"
T_ARROW="${BLU}➜${RST}"

# ── Banner ──────────────────────────────────────────────────
clear
echo -e "${BOLD}${CYN}╔══════════════════════════════════════════════════════════╗${RST}"
echo -e "${BOLD}${CYN}║             🚀 CONSTRUCTPRO AUTO-PUSH ENGINE             ║${RST}"
echo -e "${BOLD}${CYN}╚══════════════════════════════════════════════════════════╝${RST}"
echo ""

# Get active branch
BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "main")
echo -e "  ${BOLD}Active Branch:${RST} ${MAG}${BRANCH}${RST}"
echo -e "  ${BOLD}Working Dir:${RST}   ${BLU}$(pwd)$(RST)"
echo ""

# ════════════════════════════════════════════════════════════
#  STEP 1: Test & Verify Local Frontend Compile
# ════════════════════════════════════════════════════════════
echo -e "${BOLD}${CYN}[1/4] 🏗️  Testing Local Frontend Verification...${RST}"
echo -e "      Running Vite Compilation (${BOLD}npm run build${RST}) inside frontend..."
echo ""

if [ -d "frontend" ]; then
  # Keep tracking directory to go back
  cd frontend
  
  if ! npm run build; then
    echo ""
    echo -e "${T_CROSS} ${BOLD}${RED}Frontend Compilation FAILED!${RST}"
    echo -e "      Please fix the compiler errors before committing and pushing."
    echo ""
    read -r -p "⚠️  Do you want to ignore this and continue anyway? (y/N): " IGNORE_COMP
    if [[ ! "$IGNORE_COMP" =~ ^[Yy]$ ]]; then
      echo -e "\n${T_WARN} Pipeline aborted by user to fix build errors.\n"
      exit 1
    fi
  else
    echo ""
    echo -e "${T_CHECK} ${BOLD}${GRN}Frontend Compilation Succeeded!${RST}"
  fi
  cd ..
else
  echo -e "${T_WARN} frontend directory not found. Skipping compilation check."
fi

echo ""
echo -e "${BOLD}${CYN}════════════════════════════════════════════════════════════${RST}"
echo ""

# ════════════════════════════════════════════════════════════
#  STEP 2: Show Git Changes
# ════════════════════════════════════════════════════════════
echo -e "${BOLD}${CYN}[2/4] 📝 Analyzing Repository Changes...${RST}"
echo ""

DIRTY_FILES=$(git status --porcelain)
if [[ -z "$DIRTY_FILES" ]]; then
  echo -e "${T_CHECK} ${BOLD}${GRN}No modified files detected. Git status is clean!${RST}"
  echo ""
  read -r -p "🚀 Do you still want to proceed with a push? (y/N): " PROCEED_CLEAN
  if [[ ! "$PROCEED_CLEAN" =~ ^[Yy]$ ]]; then
    exit 0
  fi
else
  echo -e "${BOLD}${WHT}Modified & Untracked Files Found:${RST}"
  git status -s
  echo ""
fi

echo -e "${BOLD}${CYN}════════════════════════════════════════════════════════════${RST}"
echo ""

# ════════════════════════════════════════════════════════════
#  STEP 3: Ask, Add, Commit
# ════════════════════════════════════════════════════════════
echo -e "${BOLD}${CYN}[3/4] 💾 Staging & Committing Changes...${RST}"
echo ""

if [[ -n "$DIRTY_FILES" ]]; then
  # Prompt beautifully for commit message
  echo -e "${BOLD}${YEL}✍️  Enter Commit Message:${RST}"
  echo -ne "${BOLD}${CYN}💬 ➜ ${RST}"
  read -r COMMIT_MSG

  # Handle empty commit message
  while [[ -z "$COMMIT_MSG" ]]; do
    echo -e "${RED}⚠️  Commit message cannot be empty!${RST}"
    echo -ne "${BOLD}${CYN}💬 ➜ ${RST}"
    read -r COMMIT_MSG
  done

  echo ""
  echo -e "${T_INFO} Staging all changes (${BOLD}git add .${RST})..."
  git add .
  
  echo -e "${T_INFO} Committing changes..."
  git commit -m "$COMMIT_MSG"
  
  echo -e "${T_CHECK} ${BOLD}${GRN}Committed successfully!${RST}"
else
  echo -e "${T_INFO} Nothing to commit. Skipping commit step."
fi

echo ""
echo -e "${BOLD}${CYN}════════════════════════════════════════════════════════════${RST}"
echo ""

# ════════════════════════════════════════════════════════════
#  STEP 4: Ask & Push
# ════════════════════════════════════════════════════════════
echo -e "${BOLD}${CYN}[4/4] 🚀 Pushing to Cloud Remote...${RST}"
echo ""

echo -e "${T_WARN} You are about to push to: ${BOLD}${MAG}origin/${BRANCH}${RST}"
read -r -p "❓ Confirm push to remote? (y/N): " CONFIRM_PUSH

if [[ "$CONFIRM_PUSH" =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${T_INFO} Deploying to remote branch ${BOLD}${BRANCH}${RST}..."
  if git push origin "$BRANCH"; then
    echo ""
    echo -e "${BOLD}${GRN}╔══════════════════════════════════════════════════════════╗${RST}"
    echo -e "${BOLD}${GRN}║      🎉 EXCELLENT! PIPELINE COMPLETED SUCCESSFULLY!      ║${RST}"
    echo -e "${BOLD}${GRN}╚══════════════════════════════════════════════════════════╝${RST}"
    echo -e "  Code compiled, staged, committed, and pushed safely!"
    echo -e "  To deploy changes to the live VPS server, run: ${BOLD}${CYN}make server-deploy${RST}"
    echo ""
  else
    echo ""
    echo -e "${T_CROSS} ${BOLD}${RED}Push failed!${RST} Please check remote connection or branch permissions."
    echo ""
    exit 1
  fi
else
  echo ""
  echo -e "${T_WARN} Push operation aborted by user. Committed code remains local."
  echo ""
fi
