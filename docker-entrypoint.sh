#!/bin/sh
set -e

echo "⏳ Waiting for database to be ready..."
sleep 3

echo "🔄 Ensuring database schema is up to date..."
npx prisma db push --skip-generate

echo "🌱 Seeding database (if needed)..."
npx prisma db seed 2>&1 | grep -v "Unique constraint failed" || echo "Seed complete or already applied"

echo "Starting application..."
exec "$@"
