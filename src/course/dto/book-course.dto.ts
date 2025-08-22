import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class BookCourseDto {
  @ApiProperty({
    description: 'Course ID to book',
    example: 'cm3course123def456',
  })
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({
    description: 'Preferred start date for the course',
    example: '2024-03-01T09:00:00Z',
  })
  @IsDateString()
  preferredStartDate: string;

  @ApiPropertyOptional({
    description: 'Additional notes or requirements',
    example: 'I would like to focus on presentation skills and business vocabulary.',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Preferred time slots (if flexible)',
    example: 'Weekdays 9AM-5PM',
  })
  @IsOptional()
  @IsString()
  preferredTimeSlots?: string;

  @ApiPropertyOptional({
    description: 'Student timezone',
    example: 'Asia/Ho_Chi_Minh',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}
