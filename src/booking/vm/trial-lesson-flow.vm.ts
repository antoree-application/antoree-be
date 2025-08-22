import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrialLessonRequestVm {
  @ApiProperty({
    description: 'Unique booking ID',
    example: 'booking_12345'
  })
  id: string;

  @ApiProperty({
    description: 'Student information'
  })
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    englishLevel: string;
    timezone: string;
  };

  @ApiProperty({
    description: 'Teacher information'
  })
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    timezone: string;
    hourlyRate: string;
  };

  @ApiProperty({
    description: 'Scheduled date and time',
    example: '2024-02-15T10:00:00.000Z'
  })
  scheduledAt: string;

  @ApiProperty({
    description: 'Lesson duration in minutes',
    example: 30
  })
  duration: number;

  @ApiProperty({
    description: 'Current booking status',
    enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Student notes and learning goals'
  })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Learning goals from student'
  })
  learningGoals?: string;

  @ApiProperty({
    description: 'Request timestamp',
    example: '2024-02-10T08:00:00.000Z'
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-02-10T08:30:00.000Z'
  })
  updatedAt: string;
}

export class TrialLessonResponseVm {
  @ApiProperty({
    description: 'Updated booking information'
  })
  booking: TrialLessonRequestVm;

  @ApiProperty({
    description: 'Teacher response action',
    enum: ['ACCEPT', 'DECLINE']
  })
  action: 'ACCEPT' | 'DECLINE';

  @ApiPropertyOptional({
    description: 'Teacher message to student'
  })
  teacherMessage?: string;

  @ApiProperty({
    description: 'Whether student was notified',
    example: true
  })
  studentNotified: boolean;

  @ApiPropertyOptional({
    description: 'Meeting link if lesson was accepted'
  })
  meetingLink?: string;

  @ApiPropertyOptional({
    description: 'Pre-lesson instructions'
  })
  preLessonInstructions?: string;

  @ApiProperty({
    description: 'Next steps for both parties'
  })
  nextSteps: string[];
}

export class VideoCallSessionVm {
  @ApiProperty({
    description: 'Meeting room ID',
    example: 'room_trial_12345'
  })
  roomId: string;

  @ApiProperty({
    description: 'Meeting URL for joining',
    example: 'https://meet.antoree.com/trial/booking_12345'
  })
  meetingUrl: string;

  @ApiProperty({
    description: 'Session token for authentication'
  })
  sessionToken: string;

  @ApiProperty({
    description: 'User role in the meeting',
    enum: ['TEACHER', 'STUDENT']
  })
  userRole: 'TEACHER' | 'STUDENT';

  @ApiProperty({
    description: 'Meeting configuration'
  })
  config: {
    enableVideo: boolean;
    enableAudio: boolean;
    enableChat: boolean;
    enableScreenShare: boolean;
    recordSession: boolean;
    maxDuration: number;
  };

  @ApiProperty({
    description: 'Lesson information'
  })
  lessonInfo: {
    bookingId: string;
    scheduledAt: string;
    duration: number;
    participantName: string;
    participantRole: string;
  };

  @ApiPropertyOptional({
    description: 'Backup meeting links'
  })
  backupLinks?: {
    googleMeet?: string;
    zoom?: string;
  };
}

export class TrialLessonCompletionVm {
  @ApiProperty({
    description: 'Completed booking information'
  })
  booking: TrialLessonRequestVm;

  @ApiProperty({
    description: 'Lesson completion details'
  })
  completion: {
    completedAt: string;
    actualDuration: number;
    teacherFeedback?: string;
    performanceNotes?: string;
    recommendations?: string;
  };

  @ApiProperty({
    description: 'Session recording information'
  })
  recording?: {
    available: boolean;
    url?: string;
    expiresAt?: string;
  };

  @ApiProperty({
    description: 'Follow-up actions available'
  })
  followUpActions: {
    canBookRegularLesson: boolean;
    canLeaveReview: boolean;
    canRequestRecording: boolean;
    suggestedNextSteps: string[];
  };

  @ApiProperty({
    description: 'Teacher availability for future bookings'
  })
  teacherAvailability: {
    nextAvailableSlots: string[];
    bookingUrl: string;
  };
}

export class NotificationVm {
  @ApiProperty({
    description: 'Notification ID',
    example: 'notif_12345'
  })
  id: string;

  @ApiProperty({
    description: 'Notification type',
    enum: ['TRIAL_REQUEST', 'TRIAL_ACCEPTED', 'TRIAL_DECLINED', 'TRIAL_REMINDER', 'TRIAL_COMPLETED']
  })
  type: string;

  @ApiProperty({
    description: 'Notification title',
    example: 'New Trial Lesson Request'
  })
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'You have a new trial lesson request from John Doe'
  })
  message: string;

  @ApiProperty({
    description: 'Related booking ID'
  })
  bookingId: string;

  @ApiProperty({
    description: 'Recipient user ID'
  })
  recipientId: string;

  @ApiProperty({
    description: 'Whether notification has been read',
    example: false
  })
  isRead: boolean;

  @ApiProperty({
    description: 'Notification priority',
    enum: ['low', 'medium', 'high']
  })
  priority: 'low' | 'medium' | 'high';

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-02-10T08:00:00.000Z'
  })
  createdAt: string;

  @ApiPropertyOptional({
    description: 'Available actions for this notification'
  })
  actions?: {
    actionType: string;
    label: string;
    url: string;
  }[];

  @ApiPropertyOptional({
    description: 'Additional notification data'
  })
  metadata?: Record<string, any>;
}
