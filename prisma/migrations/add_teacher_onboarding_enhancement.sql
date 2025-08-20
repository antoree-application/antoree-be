-- Migration: Add teacher availability, rates, and live status fields
-- This migration adds the necessary fields and tables for the complete teacher onboarding workflow

-- Add new enums
DO $$ BEGIN
    CREATE TYPE "AvailabilityType" AS ENUM ('REGULAR', 'ONE_TIME', 'BLACKOUT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RateType" AS ENUM ('TRIAL_LESSON', 'REGULAR_LESSON', 'GROUP_LESSON', 'INTENSIVE_COURSE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new fields to teachers table
ALTER TABLE "teachers" 
ADD COLUMN IF NOT EXISTS "availabilitySetup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "isLive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "advanceNoticeHours" INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS "maxAdvanceBookingHours" INTEGER DEFAULT 720,
ADD COLUMN IF NOT EXISTS "allowInstantBooking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "bookingInstructions" TEXT;

-- Add type field to teacher_availabilities table
ALTER TABLE "teacher_availabilities" 
ADD COLUMN IF NOT EXISTS "type" "AvailabilityType" NOT NULL DEFAULT 'REGULAR';

-- Create teacher_rates table
CREATE TABLE IF NOT EXISTS "teacher_rates" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "type" "RateType" NOT NULL,
    "rate" DECIMAL(10,2) NOT NULL,
    "duration" INTEGER DEFAULT 60,
    "maxStudents" INTEGER DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_rates_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on teacherId and type
CREATE UNIQUE INDEX IF NOT EXISTS "teacher_rates_teacherId_type_key" ON "teacher_rates"("teacherId", "type");

-- Add foreign key constraint
ALTER TABLE "teacher_rates" 
ADD CONSTRAINT "teacher_rates_teacherId_fkey" 
FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "teachers_isLive_status_idx" ON "teachers"("isLive", "status");
CREATE INDEX IF NOT EXISTS "teachers_availabilitySetup_idx" ON "teachers"("availabilitySetup");
CREATE INDEX IF NOT EXISTS "teacher_rates_teacherId_isActive_idx" ON "teacher_rates"("teacherId", "isActive");
CREATE INDEX IF NOT EXISTS "teacher_availabilities_type_idx" ON "teacher_availabilities"("type");

-- Update existing data (optional)
-- Set profileCompleted = true for teachers who have bio, education, certifications, and specialties
UPDATE "teachers" 
SET "profileCompleted" = true 
WHERE "bio" IS NOT NULL 
  AND "education" IS NOT NULL 
  AND array_length("certifications", 1) > 0 
  AND array_length("specialties", 1) > 0;

-- Set verificationSubmitted = true for teachers who have verification records
UPDATE "teachers" 
SET "verificationSubmitted" = true
WHERE "id" IN (
    SELECT DISTINCT "teacherId" 
    FROM "teacher_verifications"
);

-- Comments for documentation
COMMENT ON COLUMN "teachers"."availabilitySetup" IS 'Whether teacher has completed availability and rates setup';
COMMENT ON COLUMN "teachers"."isLive" IS 'Whether teacher profile is live and accepting bookings';
COMMENT ON COLUMN "teachers"."advanceNoticeHours" IS 'Minimum hours advance notice required for bookings';
COMMENT ON COLUMN "teachers"."maxAdvanceBookingHours" IS 'Maximum hours in advance bookings can be made';
COMMENT ON COLUMN "teachers"."allowInstantBooking" IS 'Whether teacher allows instant booking without approval';
COMMENT ON COLUMN "teachers"."bookingInstructions" IS 'Special instructions for students when booking';

COMMENT ON TABLE "teacher_rates" IS 'Different lesson rates for teachers (trial, regular, group, etc.)';
COMMENT ON COLUMN "teacher_rates"."type" IS 'Type of lesson rate';
COMMENT ON COLUMN "teacher_rates"."rate" IS 'Rate per hour in USD';
COMMENT ON COLUMN "teacher_rates"."duration" IS 'Default lesson duration in minutes';
COMMENT ON COLUMN "teacher_rates"."maxStudents" IS 'Maximum number of students (for group lessons)';

COMMENT ON COLUMN "teacher_availabilities"."type" IS 'Type of availability slot (regular, one-time, blackout)';

-- Sample data for testing (uncomment if needed)
/*
-- Insert sample rates for existing teachers
INSERT INTO "teacher_rates" ("id", "teacherId", "type", "rate", "duration", "maxStudents")
SELECT 
    gen_random_uuid()::text,
    "id",
    'TRIAL_LESSON',
    GREATEST("hourlyRate" * 0.5, 5.00),
    30,
    1
FROM "teachers" 
WHERE "status" = 'APPROVED'
ON CONFLICT ("teacherId", "type") DO NOTHING;

INSERT INTO "teacher_rates" ("id", "teacherId", "type", "rate", "duration", "maxStudents")
SELECT 
    gen_random_uuid()::text,
    "id",
    'REGULAR_LESSON',
    "hourlyRate",
    60,
    1
FROM "teachers" 
WHERE "status" = 'APPROVED'
ON CONFLICT ("teacherId", "type") DO NOTHING;
*/
