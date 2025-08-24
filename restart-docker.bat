@echo off
echo Restarting Docker containers...
docker compose down
timeout /t 5
docker compose up -d
echo Waiting for database to be ready...
timeout /t 15
echo Testing database connection...
docker exec realtime-postgres psql -U admin -d main_db -c "SELECT 1;"
echo Database is ready. You can now run: npx prisma migrate dev --name init
