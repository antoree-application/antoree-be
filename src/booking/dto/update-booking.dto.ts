import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsDateString,
  IsInt,
  IsString,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class UpdateBookingDto {
  @ApiPropertyOptional({
    description: 'Rescheduled date and time (ISO 8601 format)',
    example: '2024-02-16T14:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: 'Updated lesson duration in minutes',
    example: 60,
    minimum: 15,
    maximum: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(180)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Updated notes',
    example: 'Changed focus to IELTS speaking preparation',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Booking status',
    enum: BookingStatus,
    example: BookingStatus.CONFIRMED,
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}

export class RescheduleBookingDto {
  @ApiPropertyOptional({
    description: 'New scheduled date and time (ISO 8601 format)',
    example: '2024-02-20T15:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  newScheduledAt: string;

  @ApiPropertyOptional({
    description: 'Reason for rescheduling',
    example: 'Student has a conflict with original time',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
