#!/usr/bin/env bash
# Render Build Script for HRMS Backend
# This script is executed by Render during the build phase.

set -o errexit  # Exit on error
set -o pipefail # Exit on pipe failure
set -o nounset  # Exit on unset variables

echo "========================================="
echo "  HRMS Backend - Render Build Script"
echo "========================================="

# Step 1: Install dependencies
echo ""
echo "📦 Step 1: Installing dependencies..."
npm ci --production=false

# Step 2: Generate Prisma Client
echo ""
echo "🔧 Step 2: Generating Prisma Client..."
npx prisma generate

# Step 3: Run database migrations
echo ""
echo "🗃️  Step 3: Running database migrations..."
npx prisma migrate deploy

# Step 4: Build TypeScript
echo ""
echo "🏗️  Step 4: Building TypeScript..."
npm run build

# Step 5: Seed database (only if SEED_DB is set to "true")
if [ "${SEED_DB:-false}" = "true" ]; then
  echo ""
  echo "🌱 Step 5: Seeding database..."
  npx tsx src/seeds/seed.ts
  echo "✅ Database seeded successfully."
else
  echo ""
  echo "⏭️  Step 5: Skipping database seed (set SEED_DB=true to seed)."
fi

echo ""
echo "========================================="
echo "  ✅ Build completed successfully!"
echo "========================================="
