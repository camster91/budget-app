#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="/data/backups/budget-db"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_HOST="${DB_HOST:-budget-db}"
DB_NAME="${DB_NAME:-budget}"
DB_USER="${DB_USER:-postgres}"
ARCHIVE="${BACKUP_DIR}/budget_${TIMESTAMP}.sql.gz"

echo "🗄️  Starting backup at ${TIMESTAMP}"
mkdir -p "${BACKUP_DIR}"

if ! pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" --no-owner --no-privileges | gzip > "${ARCHIVE}"; then
    echo "❌ pg_dump failed"
    exit 1
fi

BACKUP_SIZE=$(du -h "${ARCHIVE}" | cut -f1)
echo "✅ Backup complete: ${ARCHIVE} (${BACKUP_SIZE})"

# Cleanup old backups
DELETED=$(find "${BACKUP_DIR}" -maxdepth 1 -name "budget_*.sql.gz" -mtime +${RETENTION_DAYS} -print -delete | wc -l)
if [ "${DELETED}" -gt 0 ]; then
    echo "🧹 Cleaned up ${DELETED} old backups (> ${RETENTION_DAYS} days)"
fi
