@echo off
echo Starting development database setup...
echo.
echo 1. Starting Docker containers...
docker compose up -d

echo.
echo 2. Waiting for database to be ready...
timeout /t 20

echo.
echo 3. Generating Prisma client...
npx prisma generate

echo.
echo 4. Pushing schema to database (bypassing migrations)...
npx prisma db push

echo.
echo 5. Seeding database (if seed file exists)...
npx prisma db seed 2>nul || echo No seed file found, skipping...

echo.
echo Database setup complete!
echo You can now run your application with: npm run start:dev
