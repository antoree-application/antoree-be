import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus, EnglishLevel } from '@prisma/client';

export class BookingFlowTimeSlotVm {
  @ApiProperty({
    description: 'Date and time of the slot (ISO 8601 format)',
    example: '2024-02-15T10:00:00Z',
  })
  dateTime: string;

  @ApiProperty({
    description: 'Duration in minutes',
    example: 30,
  })
  duration: number;

  @ApiProperty({
    description: 'Whether this is a preferred time for the teacher',
    example: true,
  })
  isPreferred: boolean;

  @ApiProperty({
    description: 'Price for this time slot',
    example: 25.00,
  })
  price: number;

  @ApiPropertyOptional({
    description: 'Special notes for this time slot',
    example: 'Peak hours rate',
  })
  notes?: string;
}

export class TeacherAvailabilitySlotsVm {
  @ApiProperty({
    description: 'Teacher ID',
    example: 'cm3teacher123def456',
  })
  teacherId: string;

  @ApiProperty({
    description: 'Teacher full name',
    example: 'Sarah Johnson',
  })
  teacherName: string;

  @ApiProperty({
    description: 'Teacher timezone',
    example: 'Asia/Ho_Chi_Minh',
  })
  timezone: string;

  @ApiProperty({
    description: 'Available time slots',
    type: [BookingFlowTimeSlotVm],
  })
  availableSlots: BookingFlowTimeSlotVm[];

  @ApiProperty({
    description: 'Booking policies',
  })
  bookingPolicies: {
    advanceNoticeHours: number;
    maxAdvanceBookingHours: number;
    allowInstantBooking: boolean;
    bookingInstructions?: string;
  };

  @ApiProperty({
    description: 'Next available date if no slots in requested range',
    example: '2024-02-20',
  })
  @ApiPropertyOptional()
  nextAvailableDate?: string;
}

export class BookingRequestVm {
  @ApiProperty({
    description: 'Booking ID',
    example: 'cm3booking123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Student information',
  })
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    englishLevel: EnglishLevel;
    timezone: string;
  };

  @ApiProperty({
    description: 'Teacher information',
  })
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    timezone: string;
  };

  @ApiProperty({
    description: 'Scheduled date and time',
    example: '2024-02-15T10:00:00Z',
  })
  scheduledAt: string;

  @ApiProperty({
    description: 'Lesson duration in minutes',
    example: 30,
  })
  duration: number;

  @ApiProperty({
    description: 'Learning goals and objectives',
  })
  learningGoals: {
    currentLevel: EnglishLevel;
    targetLevel?: EnglishLevel;
    learningObjectives: string[];
    focusAreas?: string[];
    previousExperience?: string;
    timeline?: string;
    preferredFrequency?: number;
    additionalNotes?: string;
  };

  @ApiProperty({
    description: 'Booking status',
    enum: BookingStatus,
    example: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @ApiProperty({
    description: 'Whether this is a trial lesson',
    example: true,
  })
  isTrialLesson: boolean;

  @ApiPropertyOptional({
    description: 'Message from student to teacher',
    example: 'Looking forward to improving my speaking skills!',
  })
  messageToTeacher?: string;

  @ApiPropertyOptional({
    description: 'How the student found this teacher',
    example: 'Search results',
  })
  howFoundTeacher?: string;

  @ApiProperty({
    description: 'Booking creation timestamp',
    example: '2024-02-10T09:00:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-02-10T09:00:00Z',
  })
  updatedAt: string;
}

export class BookingConfirmationVm {
  @ApiProperty({
    description: 'Confirmed booking details',
    type: BookingRequestVm,
  })
  booking: BookingRequestVm;

  @ApiProperty({
    description: 'Confirmation details',
  })
  confirmation: {
    confirmedAt: string;
    confirmationCode: string;
    meetingUrl?: string;
    preparationNotes?: string;
  };

  @ApiProperty({
    description: 'Next steps for the student',
    example: [
      'Join the lesson 5 minutes before start time',
      'Prepare questions about your learning goals',
      'Have a stable internet connection'
    ],
  })
  nextSteps: string[];

  @ApiProperty({
    description: 'Contact information for support',
  })
  support: {
    email: string;
    phone?: string;
    helpUrl?: string;
  };
}

export class TeacherNotificationVm {
  @ApiProperty({
    description: 'Notification ID',
    example: 'notif123',
  })
  id: string;

  @ApiProperty({
    description: 'Notification type',
    example: 'NEW_BOOKING_REQUEST',
  })
  type: string;

  @ApiProperty({
    description: 'Notification title',
    example: 'New Trial Lesson Request',
  })
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'John Doe has requested a trial lesson with you',
  })
  message: string;

  @ApiProperty({
    description: 'Related booking information',
    type: BookingRequestVm,
  })
  booking: BookingRequestVm;

  @ApiProperty({
    description: 'Available actions for the teacher',
    example: ['ACCEPT', 'DECLINE', 'REQUEST_RESCHEDULE'],
  })
  availableActions: string[];

  @ApiProperty({
    description: 'Notification timestamp',
    example: '2024-02-10T09:00:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Whether notification has been read',
    example: false,
  })
  isRead: boolean;

  @ApiProperty({
    description: 'Priority level',
    example: 'high',
  })
  priority: 'low' | 'medium' | 'high';

  @ApiProperty({
    description: 'Time remaining to respond (in hours)',
    example: 24,
  })
  responseTimeRemaining?: number;
}

export class BookingActionResponseVm {
  @ApiProperty({
    description: 'Updated booking details',
    type: BookingRequestVm,
  })
  booking: BookingRequestVm;

  @ApiProperty({
    description: 'Action taken',
    example: 'ACCEPT',
  })
  action: string;

  @ApiProperty({
    description: 'Response message sent to student',
    example: 'I look forward to our lesson!',
  })
  responseMessage?: string;

  @ApiProperty({
    description: 'Whether student was notified',
    example: true,
  })
  studentNotified: boolean;

  @ApiProperty({
    description: 'Next steps after the action',
    example: [
      'Student will receive confirmation email',
      'Meeting link will be sent 1 hour before lesson',
      'Lesson will appear in your schedule'
    ],
  })
  nextSteps: string[];
}

export class BookingFlowStatusVm {
  @ApiProperty({
    description: 'Current step in the booking flow',
    example: 'SLOT_SELECTED',
  })
  currentStep: 'BROWSING' | 'SLOT_SELECTED' | 'DETAILS_PROVIDED' | 'CONFIRMED' | 'TEACHER_RESPONDED';

  @ApiProperty({
    description: 'Booking progress percentage',
    example: 75,
  })
  progress: number;

  @ApiProperty({
    description: 'Available next actions',
    example: ['CONFIRM_BOOKING', 'EDIT_DETAILS', 'CANCEL'],
  })
  availableActions: string[];

  @ApiProperty({
    description: 'Status message',
    example: 'Waiting for teacher confirmation',
  })
  statusMessage: string;

  @ApiProperty({
    description: 'Estimated time to completion',
    example: 'Usually confirmed within 2 hours',
  })
  estimatedCompletion?: string;
}
