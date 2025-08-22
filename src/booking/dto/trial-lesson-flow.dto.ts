import { IsString, IsOptional, IsNotEmpty, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestTrialLessonDto {
  @ApiProperty({
    description: 'Teacher ID to book trial lesson with',
    example: 'teacher_12345'
  })
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({
    description: 'Scheduled date and time for the trial lesson',
    example: '2024-02-15T10:00:00.000Z'
  })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({
    description: 'Duration of trial lesson in minutes',
    example: 30,
    default: 30
  })
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({
    description: 'Special notes or requirements for the lesson',
    example: 'I would like to focus on conversation skills'
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Student learning goals',
    example: 'Improve speaking confidence for business meetings'
  })
  @IsOptional()
  @IsString()
  learningGoals?: string;
}

export class TeacherTrialResponseDto {
  @ApiProperty({
    description: 'Teacher response action',
    enum: ['ACCEPT', 'DECLINE'],
    example: 'ACCEPT'
  })
  @IsEnum(['ACCEPT', 'DECLINE'])
  action: 'ACCEPT' | 'DECLINE';

  @ApiPropertyOptional({
    description: 'Message from teacher to student',
    example: 'Looking forward to our trial lesson! Please prepare some topics you\'d like to discuss.'
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description: 'Reason for declining (required if action is DECLINE)',
    example: 'Unfortunately I have a conflict at that time. Please choose another slot.'
  })
  @IsOptional()
  @IsString()
  declineReason?: string;

  @ApiPropertyOptional({
    description: 'Pre-lesson instructions for student',
    example: 'Please test your camera and microphone before the lesson'
  })
  @IsOptional()
  @IsString()
  preLessonInstructions?: string;
}

export class JoinTrialLessonDto {
  @ApiProperty({
    description: 'Booking ID for the trial lesson',
    example: 'booking_12345'
  })
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @ApiPropertyOptional({
    description: 'Whether user is teacher or student',
    enum: ['TEACHER', 'STUDENT'],
    example: 'STUDENT'
  })
  @IsOptional()
  @IsEnum(['TEACHER', 'STUDENT'])
  userType?: 'TEACHER' | 'STUDENT';
}

export class CompleteTrialLessonDto {
  @ApiProperty({
    description: 'Booking ID for the trial lesson',
    example: 'booking_12345'
  })
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @ApiPropertyOptional({
    description: 'Lesson feedback from teacher',
    example: 'Great conversation practice. Student shows good potential for improvement.'
  })
  @IsOptional()
  @IsString()
  teacherFeedback?: string;

  @ApiPropertyOptional({
    description: 'Student performance notes',
    example: 'Strong vocabulary, needs work on pronunciation'
  })
  @IsOptional()
  @IsString()
  performanceNotes?: string;

  @ApiPropertyOptional({
    description: 'Recommended next steps',
    example: 'Consider booking regular conversation lessons'
  })
  @IsOptional()
  @IsString()
  recommendations?: string;

  @ApiPropertyOptional({
    description: 'Actual lesson duration in minutes',
    example: 35
  })
  @IsOptional()
  duration?: number;
}

export class GenerateMeetingLinkDto {
  @ApiProperty({
    description: 'Booking ID for the lesson',
    example: 'booking_12345'
  })
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @ApiPropertyOptional({
    description: 'Meeting platform preference',
    enum: ['ZOOM', 'GOOGLE_MEET', 'ANTOREE_MEET'],
    example: 'ANTOREE_MEET',
    default: 'ANTOREE_MEET'
  })
  @IsOptional()
  @IsEnum(['ZOOM', 'GOOGLE_MEET', 'ANTOREE_MEET'])
  platform?: 'ZOOM' | 'GOOGLE_MEET' | 'ANTOREE_MEET';
}
