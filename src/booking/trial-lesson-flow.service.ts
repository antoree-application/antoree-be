import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationService } from './notification.service';
import {
  RequestTrialLessonDto,
  TeacherTrialResponseDto,
  JoinTrialLessonDto,
  CompleteTrialLessonDto,
  GenerateMeetingLinkDto,
} from './dto/trial-lesson-flow.dto';
import {
  TrialLessonRequestVm,
  TrialLessonResponseVm,
  VideoCallSessionVm,
  TrialLessonCompletionVm,
  NotificationVm,
} from './vm/trial-lesson-flow.vm';
import {
  BookingStatus,
  LessonStatus,
  TeacherStatus,
  UserRole,
} from '@prisma/client';

@Injectable()
export class TrialLessonFlowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Step 1: Student requests trial lesson
   */
  async requestTrialLesson(
    requestDto: RequestTrialLessonDto,
    studentId: string,
    userId: string
  ): Promise<TrialLessonRequestVm> {
    // Validate student exists
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Validate teacher exists and is approved
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: requestDto.teacherId },
      include: { user: true },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (teacher.status !== TeacherStatus.APPROVED) {
      throw new BadRequestException('Teacher is not approved for bookings');
    }

    if (!teacher.user.isActive || !teacher.isLive) {
      throw new BadRequestException('Teacher is not available for bookings');
    }

    // Check if student already had a trial with this teacher
    const existingTrial = await this.prisma.booking.findFirst({
      where: {
        studentId,
        teacherId: requestDto.teacherId,
        isTrialLesson: true,
        status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
      },
    });

    if (existingTrial) {
      throw new ConflictException('Student already had a trial lesson with this teacher');
    }

    const scheduledAt = new Date(requestDto.scheduledAt);
    
    // Validate booking time is in the future
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('Trial lesson time must be in the future');
    }

    // Check teacher availability (basic validation)
    await this.validateTeacherAvailability(requestDto.teacherId, scheduledAt, requestDto.duration || 30);

    // Check for conflicts
    await this.checkForBookingConflicts(requestDto.teacherId, studentId, scheduledAt, requestDto.duration || 30);

    // Create trial lesson booking
    const booking = await this.prisma.booking.create({
      data: {
        studentId,
        teacherId: requestDto.teacherId,
        scheduledAt,
        duration: requestDto.duration || 30,
        notes: this.buildTrialLessonNotes(requestDto.notes, requestDto.learningGoals),
        isTrialLesson: true,
        status: BookingStatus.PENDING,
      },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
      },
    });

    // Send notification to teacher
    await this.sendTrialRequestNotificationToTeacher(booking.id, booking.teacherId);

    // Store trial lesson metadata
    await this.storeTrialLessonMetadata(booking.id, {
      learningGoals: requestDto.learningGoals,
      requestedAt: new Date(),
      notificationSent: true,
    });

    return this.toTrialLessonRequestVm(booking);
  }

  /**
   * Step 2: Teacher responds to trial lesson request
   */
  async teacherRespondToTrial(
    bookingId: string,
    responseDto: TeacherTrialResponseDto,
    teacherId: string
  ): Promise<TrialLessonResponseVm> {
    // Get booking with full details
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException('Trial lesson booking not found');
    }

    if (booking.teacherId !== teacherId) {
      throw new ForbiddenException('You can only respond to your own trial lesson requests');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Can only respond to pending trial lesson requests');
    }

    if (!booking.isTrialLesson) {
      throw new BadRequestException('This is not a trial lesson booking');
    }

    let updatedBooking;
    let meetingLink: string | undefined;
    let nextSteps: string[] = [];

    if (responseDto.action === 'ACCEPT') {
      // Accept the trial lesson
      updatedBooking = await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CONFIRMED,
          notes: this.addTeacherResponseToNotes(booking.notes, responseDto.message, 'ACCEPTED'),
        },
        include: {
          student: { include: { user: true } },
          teacher: { include: { user: true } },
        },
      });

      // Generate meeting link
      meetingLink = await this.generateTrialLessonMeetingLink(bookingId);

      // Create lesson record
      await this.createTrialLessonRecord(bookingId, meetingLink);

      nextSteps = [
        'Student will receive confirmation email with meeting link',
        'Meeting link will be activated 15 minutes before lesson time',
        'Lesson will appear in your teaching schedule',
        'You will receive a reminder 1 hour before the lesson',
      ];

      // Send acceptance notification to student
      await this.sendTrialAcceptanceNotificationToStudent(bookingId, meetingLink, responseDto.preLessonInstructions);

    } else if (responseDto.action === 'DECLINE') {
      // Decline the trial lesson
      updatedBooking = await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          notes: this.addTeacherResponseToNotes(booking.notes, responseDto.declineReason, 'DECLINED'),
        },
        include: {
          student: { include: { user: true } },
          teacher: { include: { user: true } },
        },
      });

      nextSteps = [
        'Student will be notified of the decline',
        'Student can book another time slot',
        'Your availability remains open for other bookings',
        'No further action required from you',
      ];

      // Send decline notification to student
      await this.sendTrialDeclineNotificationToStudent(bookingId, responseDto.declineReason);
    }

    // Store teacher response metadata
    await this.storeTeacherResponseMetadata(bookingId, {
      action: responseDto.action,
      message: responseDto.message,
      respondedAt: new Date(),
      preLessonInstructions: responseDto.preLessonInstructions,
    });

    return {
      booking: this.toTrialLessonRequestVm(updatedBooking),
      action: responseDto.action,
      teacherMessage: responseDto.message,
      studentNotified: true,
      meetingLink,
      preLessonInstructions: responseDto.preLessonInstructions,
      nextSteps,
    };
  }

  /**
   * Step 3: Generate or retrieve meeting link for trial lesson
   */
  async generateMeetingLink(
    generateDto: GenerateMeetingLinkDto,
    userId: string,
    userRole: UserRole
  ): Promise<{ meetingUrl: string; roomId: string }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: generateDto.bookingId },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        lesson: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify user has access to this booking
    const hasAccess = booking.student.id === userId || booking.teacher.id === userId;
    if (!hasAccess && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Meeting link can only be generated for confirmed bookings');
    }

    // Check if meeting link already exists
    if (booking.lesson?.meetingUrl) {
      return {
        meetingUrl: booking.lesson.meetingUrl,
        roomId: this.extractRoomIdFromUrl(booking.lesson.meetingUrl),
      };
    }

    // Generate new meeting link
    const meetingUrl = await this.generateTrialLessonMeetingLink(
      generateDto.bookingId,
      generateDto.platform || 'ANTOREE_MEET'
    );

    // Update lesson with meeting URL
    await this.updateLessonMeetingUrl(generateDto.bookingId, meetingUrl);

    return {
      meetingUrl,
      roomId: this.extractRoomIdFromUrl(meetingUrl),
    };
  }

  /**
   * Step 4: Join trial lesson video call
   */
  async joinTrialLesson(
    joinDto: JoinTrialLessonDto,
    userId: string,
    userRole: UserRole
  ): Promise<VideoCallSessionVm> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: joinDto.bookingId },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        lesson: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Trial lesson booking not found');
    }

    // Verify user has access
    const hasAccess = booking.student.id === userId || booking.teacher.id === userId;
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this trial lesson');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Trial lesson must be confirmed to join');
    }

    if (!booking.lesson?.meetingUrl) {
      throw new BadRequestException('Meeting link not yet available');
    }

    // Check if lesson is within joinable time window (15 minutes before to 1 hour after)
    const now = new Date();
    const lessonStart = new Date(booking.scheduledAt);
    const earliestJoinTime = new Date(lessonStart.getTime() - 15 * 60 * 1000); // 15 minutes before
    const latestJoinTime = new Date(lessonStart.getTime() + 60 * 60 * 1000); // 1 hour after

    if (now < earliestJoinTime) {
      throw new BadRequestException('Meeting room is not yet available. You can join 15 minutes before the scheduled time.');
    }

    if (now > latestJoinTime) {
      throw new BadRequestException('Meeting room is no longer available. The lesson time window has passed.');
    }

    // Determine user role in the meeting
    const isTeacher = booking.teacher.id === userId;
    const meetingUserRole = isTeacher ? 'TEACHER' : 'STUDENT';
    const participantName = isTeacher 
      ? `${booking.teacher.user.firstName} ${booking.teacher.user.lastName}`
      : `${booking.student.user.firstName} ${booking.student.user.lastName}`;

    // Generate session token for authentication
    const sessionToken = await this.generateSessionToken(joinDto.bookingId, userId, meetingUserRole);

    // Update lesson start time if this is the first participant joining
    if (!booking.lesson.startedAt && now >= lessonStart) {
      await this.prisma.lesson.update({
        where: { id: booking.lesson.id },
        data: {
          startedAt: now,
          status: LessonStatus.IN_PROGRESS,
        },
      });
    }

    return {
      roomId: this.extractRoomIdFromUrl(booking.lesson.meetingUrl),
      meetingUrl: booking.lesson.meetingUrl,
      sessionToken,
      userRole: meetingUserRole,
      config: {
        enableVideo: true,
        enableAudio: true,
        enableChat: true,
        enableScreenShare: isTeacher, // Only teacher can share screen
        recordSession: true,
        maxDuration: booking.duration + 15, // Allow 15 extra minutes
      },
      lessonInfo: {
        bookingId: booking.id,
        scheduledAt: booking.scheduledAt.toISOString(),
        duration: booking.duration,
        participantName,
        participantRole: meetingUserRole,
      },
      backupLinks: await this.generateBackupMeetingLinks(joinDto.bookingId),
    };
  }

  /**
   * Step 5: Complete trial lesson
   */
  async completeTrialLesson(
    completeDto: CompleteTrialLessonDto,
    userId: string,
    userRole: UserRole
  ): Promise<TrialLessonCompletionVm> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: completeDto.bookingId },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        lesson: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Trial lesson booking not found');
    }

    // Verify user has access (typically only teacher can complete)
    if (userRole !== UserRole.ADMIN && booking.teacher.id !== userId) {
      throw new ForbiddenException('Only the teacher can mark the trial lesson as completed');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Trial lesson must be confirmed to complete');
    }

    if (!booking.lesson) {
      throw new BadRequestException('No lesson record found for this booking');
    }

    // Update booking and lesson status
    const now = new Date();
    const [updatedBooking] = await Promise.all([
      this.prisma.booking.update({
        where: { id: completeDto.bookingId },
        data: {
          status: BookingStatus.COMPLETED,
          notes: this.addCompletionNotesToBooking(
            booking.notes,
            completeDto.teacherFeedback,
            completeDto.performanceNotes,
            completeDto.recommendations
          ),
        },
        include: {
          student: { include: { user: true } },
          teacher: { include: { user: true } },
          lesson: true,
        },
      }),
      
      this.prisma.lesson.update({
        where: { id: booking.lesson.id },
        data: {
          endedAt: now,
          status: LessonStatus.COMPLETED,
          duration: completeDto.duration || booking.duration,
          notes: completeDto.teacherFeedback,
          homework: completeDto.recommendations,
        },
      }),
    ]);

    // Store completion metadata
    await this.storeTrialCompletionMetadata(completeDto.bookingId, {
      completedAt: now,
      teacherFeedback: completeDto.teacherFeedback,
      performanceNotes: completeDto.performanceNotes,
      recommendations: completeDto.recommendations,
      actualDuration: completeDto.duration || booking.duration,
    });

    // Update teacher statistics
    await this.updateTeacherStats(booking.teacherId);

    // Send completion notifications
    await this.sendTrialCompletionNotifications(completeDto.bookingId);

    // Get next available slots for this teacher
    const nextAvailableSlots = await this.getTeacherNextAvailableSlots(booking.teacherId, 5);

    return {
      booking: this.toTrialLessonRequestVm(updatedBooking),
      completion: {
        completedAt: now.toISOString(),
        actualDuration: completeDto.duration || booking.duration,
        teacherFeedback: completeDto.teacherFeedback,
        performanceNotes: completeDto.performanceNotes,
        recommendations: completeDto.recommendations,
      },
      recording: await this.getSessionRecordingInfo(completeDto.bookingId),
      followUpActions: {
        canBookRegularLesson: true,
        canLeaveReview: true,
        canRequestRecording: true,
        suggestedNextSteps: this.generateSuggestedNextSteps(completeDto.recommendations),
      },
      teacherAvailability: {
        nextAvailableSlots,
        bookingUrl: `/teachers/${booking.teacherId}/book`,
      },
    };
  }

  /**
   * Get trial lesson notifications for user
   */
  async getTrialLessonNotifications(
    userId: string,
    userRole: UserRole,
    limit: number = 20
  ): Promise<NotificationVm[]> {
    // In a real implementation, this would fetch from a notifications table
    // For now, we'll get relevant bookings and convert them to notifications
    
    let whereClause: any = { isTrialLesson: true };
    
    if (userRole === UserRole.STUDENT) {
      const student = await this.prisma.student.findUnique({ where: { id: userId } });
      if (student) whereClause.studentId = student.id;
    } else if (userRole === UserRole.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({ where: { id: userId } });
      if (teacher) whereClause.teacherId = teacher.id;
    }

    const bookings = await this.prisma.booking.findMany({
      where: whereClause,
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return bookings.map(booking => this.bookingToNotificationVm(booking, userRole));
  }

  // Helper methods
  private async validateTeacherAvailability(
    teacherId: string,
    scheduledAt: Date,
    duration: number
  ): Promise<void> {
    const dayOfWeek = scheduledAt.getDay();
    const timeInMinutes = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();
    
    const availability = await this.prisma.teacherAvailability.findFirst({
      where: {
        teacherId,
        dayOfWeek,
        isActive: true,
      },
    });

    if (!availability) {
      throw new BadRequestException('Teacher is not available on this day');
    }

    const startTime = this.parseTime(availability.startTime);
    const endTime = this.parseTime(availability.endTime);

    if (timeInMinutes < startTime || timeInMinutes + duration > endTime) {
      throw new BadRequestException('Requested time is outside teacher availability hours');
    }
  }

  private async checkForBookingConflicts(
    teacherId: string,
    studentId: string,
    scheduledAt: Date,
    duration: number
  ): Promise<void> {
    const bookingStart = new Date(scheduledAt);
    const bookingEnd = new Date(scheduledAt);
    bookingEnd.setMinutes(bookingEnd.getMinutes() + duration);

    const conflictingBookings = await this.prisma.booking.findMany({
      where: {
        OR: [
          { teacherId },
          { studentId },
        ],
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
        scheduledAt: {
          gte: bookingStart,
          lt: bookingEnd,
        },
      },
    });

    if (conflictingBookings.length > 0) {
      const hasTeacherConflict = conflictingBookings.some(b => b.teacherId === teacherId);
      const hasStudentConflict = conflictingBookings.some(b => b.studentId === studentId);
      
      if (hasTeacherConflict) {
        throw new ConflictException('Teacher already has a booking at this time');
      }
      if (hasStudentConflict) {
        throw new ConflictException('Student already has a booking at this time');
      }
    }
  }

  private buildTrialLessonNotes(notes?: string, learningGoals?: string): string {
    const parts = [];
    if (notes) parts.push(`Notes: ${notes}`);
    if (learningGoals) parts.push(`Learning Goals: ${learningGoals}`);
    return parts.join('\n');
  }

  private addTeacherResponseToNotes(existingNotes: string | null, message?: string, action?: string): string {
    const base = existingNotes || '';
    const responseText = `\nTeacher Response (${action}): ${message || 'No message provided'}`;
    return base + responseText;
  }

  private addCompletionNotesToBooking(
    existingNotes: string | null,
    feedback?: string,
    performance?: string,
    recommendations?: string
  ): string {
    const base = existingNotes || '';
    const parts = [];
    
    if (feedback) parts.push(`Teacher Feedback: ${feedback}`);
    if (performance) parts.push(`Performance Notes: ${performance}`);
    if (recommendations) parts.push(`Recommendations: ${recommendations}`);
    
    return base + '\n--- LESSON COMPLETED ---\n' + parts.join('\n');
  }

  private async generateTrialLessonMeetingLink(
    bookingId: string,
    platform: string = 'ANTOREE_MEET'
  ): Promise<string> {
    // In a real implementation, this would integrate with actual video platforms
    switch (platform) {
      case 'ZOOM':
        return `https://zoom.us/j/trial_${bookingId}`;
      case 'GOOGLE_MEET':
        return `https://meet.google.com/trial-${bookingId}`;
      case 'ANTOREE_MEET':
      default:
        return `https://meet.antoree.com/trial/${bookingId}`;
    }
  }

  private async createTrialLessonRecord(bookingId: string, meetingUrl: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (booking) {
      await this.prisma.lesson.create({
        data: {
          bookingId,
          studentId: booking.studentId,
          teacherId: booking.teacherId,
          scheduledAt: booking.scheduledAt,
          duration: booking.duration,
          meetingUrl,
          status: LessonStatus.SCHEDULED,
          notes: 'Trial lesson - auto-generated',
        },
      });
    }
  }

  private async updateLessonMeetingUrl(bookingId: string, meetingUrl: string): Promise<void> {
    await this.prisma.lesson.updateMany({
      where: { bookingId },
      data: { meetingUrl },
    });
  }

  private extractRoomIdFromUrl(meetingUrl: string): string {
    // Extract room ID from meeting URL
    const match = meetingUrl.match(/\/([^\/]+)$/);
    return match ? match[1] : `room_${Date.now()}`;
  }

  private async generateSessionToken(
    bookingId: string,
    userId: string,
    userRole: string
  ): Promise<string> {
    // In a real implementation, this would generate a JWT or similar token
    const tokenData = {
      bookingId,
      userId,
      userRole,
      timestamp: Date.now(),
    };
    return Buffer.from(JSON.stringify(tokenData)).toString('base64');
  }

  private async generateBackupMeetingLinks(bookingId: string): Promise<{ googleMeet?: string; zoom?: string }> {
    return {
      googleMeet: `https://meet.google.com/backup-${bookingId}`,
      zoom: `https://zoom.us/j/backup_${bookingId}`,
    };
  }

  private async getSessionRecordingInfo(bookingId: string): Promise<any> {
    // In a real implementation, this would check if recording is available
    return {
      available: true,
      url: `https://recordings.antoree.com/trial/${bookingId}`,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };
  }

  private generateSuggestedNextSteps(recommendations?: string): string[] {
    const defaultSteps = [
      'Book regular lessons to continue improving',
      'Practice the topics discussed in your trial lesson',
      'Set specific learning goals for your next lessons',
    ];

    if (recommendations) {
      return [recommendations, ...defaultSteps];
    }

    return defaultSteps;
  }

  private async getTeacherNextAvailableSlots(teacherId: string, count: number): Promise<string[]> {
    // Simplified implementation - in real app this would check actual availability
    const slots = [];
    const now = new Date();
    
    for (let i = 1; i <= count; i++) {
      const slotDate = new Date(now);
      slotDate.setDate(now.getDate() + i);
      slotDate.setHours(10, 0, 0, 0); // 10 AM slots
      slots.push(slotDate.toISOString());
    }
    
    return slots;
  }

  private async updateTeacherStats(teacherId: string): Promise<void> {
    // Update teacher's total lessons count
    const lessonCount = await this.prisma.lesson.count({
      where: { teacherId, status: LessonStatus.COMPLETED },
    });

    await this.prisma.teacher.update({
      where: { id: teacherId },
      data: { totalLessons: lessonCount },
    });
  }

  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private toTrialLessonRequestVm(booking: any): TrialLessonRequestVm {
    // Parse learning goals from notes if exists
    let learningGoals: string | undefined;
    try {
      const goalsMatch = booking.notes?.match(/Learning Goals: ([^\n]+)/);
      if (goalsMatch) {
        learningGoals = goalsMatch[1];
      }
    } catch (e) {
      // Ignore parsing errors
    }

    return {
      id: booking.id,
      student: {
        id: booking.student.id,
        firstName: booking.student.user.firstName,
        lastName: booking.student.user.lastName,
        email: booking.student.user.email,
        englishLevel: booking.student.englishLevel,
        timezone: booking.student.timezone,
      },
      teacher: {
        id: booking.teacher.id,
        firstName: booking.teacher.user.firstName,
        lastName: booking.teacher.user.lastName,
        timezone: booking.teacher.timezone,
        hourlyRate: booking.teacher.hourlyRate.toString(),
      },
      scheduledAt: booking.scheduledAt.toISOString(),
      duration: booking.duration,
      status: booking.status,
      notes: booking.notes,
      learningGoals,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };
  }

  private bookingToNotificationVm(booking: any, userRole: UserRole): NotificationVm {
    const isForTeacher = userRole === UserRole.TEACHER;
    const otherParty = isForTeacher ? booking.student : booking.teacher;
    
    let notificationType: string;
    let title: string;
    let message: string;
    
    switch (booking.status) {
      case BookingStatus.PENDING:
        if (isForTeacher) {
          notificationType = 'TRIAL_REQUEST';
          title = 'New Trial Lesson Request';
          message = `${otherParty.user.firstName} ${otherParty.user.lastName} has requested a trial lesson`;
        } else {
          notificationType = 'TRIAL_REQUEST';
          title = 'Trial Lesson Request Sent';
          message = `Your trial lesson request has been sent to ${otherParty.user.firstName} ${otherParty.user.lastName}`;
        }
        break;
      case BookingStatus.CONFIRMED:
        notificationType = 'TRIAL_ACCEPTED';
        title = 'Trial Lesson Confirmed';
        message = isForTeacher 
          ? `Trial lesson confirmed with ${otherParty.user.firstName} ${otherParty.user.lastName}`
          : `${otherParty.user.firstName} ${otherParty.user.lastName} accepted your trial lesson request`;
        break;
      case BookingStatus.CANCELLED:
        notificationType = 'TRIAL_DECLINED';
        title = 'Trial Lesson Cancelled';
        message = isForTeacher
          ? `Trial lesson with ${otherParty.user.firstName} ${otherParty.user.lastName} was cancelled`
          : `Your trial lesson request was declined by ${otherParty.user.firstName} ${otherParty.user.lastName}`;
        break;
      case BookingStatus.COMPLETED:
        notificationType = 'TRIAL_COMPLETED';
        title = 'Trial Lesson Completed';
        message = `Trial lesson with ${otherParty.user.firstName} ${otherParty.user.lastName} has been completed`;
        break;
      default:
        notificationType = 'TRIAL_UPDATE';
        title = 'Trial Lesson Update';
        message = `Trial lesson status updated`;
    }

    return {
      id: `notif_trial_${booking.id}`,
      type: notificationType,
      title,
      message,
      bookingId: booking.id,
      recipientId: isForTeacher ? booking.teacher.id : booking.student.id,
      isRead: false,
      priority: booking.status === BookingStatus.PENDING ? 'high' : 'medium',
      createdAt: booking.updatedAt.toISOString(),
      actions: this.getNotificationActions(booking, isForTeacher),
      metadata: {
        scheduledAt: booking.scheduledAt,
        duration: booking.duration,
        otherPartyName: `${otherParty.user.firstName} ${otherParty.user.lastName}`,
      },
    };
  }

  private getNotificationActions(booking: any, isForTeacher: boolean): any[] {
    const actions = [];
    
    if (booking.status === BookingStatus.PENDING) {
      if (isForTeacher) {
        actions.push(
          {
            actionType: 'ACCEPT',
            label: 'Accept',
            url: `/api/bookings/trial/respond/${booking.id}`,
          },
          {
            actionType: 'DECLINE',
            label: 'Decline',
            url: `/api/bookings/trial/respond/${booking.id}`,
          }
        );
      }
    } else if (booking.status === BookingStatus.CONFIRMED) {
      actions.push({
        actionType: 'VIEW_DETAILS',
        label: 'View Details',
        url: `/bookings/${booking.id}`,
      });
      
      // Check if lesson is starting soon (within 15 minutes)
      const now = new Date();
      const lessonStart = new Date(booking.scheduledAt);
      const timeDiff = lessonStart.getTime() - now.getTime();
      
      if (timeDiff <= 15 * 60 * 1000 && timeDiff > -60 * 60 * 1000) { // 15 min before to 1 hour after
        actions.push({
          actionType: 'JOIN_LESSON',
          label: 'Join Lesson',
          url: `/api/bookings/trial/join`,
        });
      }
    }

    return actions;
  }

  // Notification helper methods
  private async sendTrialRequestNotificationToTeacher(bookingId: string, teacherId: string): Promise<void> {
    // Get teacher and student details for notification
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
      },
    });

    if (booking) {
      const studentName = `${booking.student.user.firstName} ${booking.student.user.lastName}`;
      const learningGoals = this.extractLearningGoalsFromNotes(booking.notes);

      await this.notificationService.sendTrialRequestToTeacher(
        teacherId,
        booking.teacher.user.email,
        studentName,
        bookingId,
        booking.scheduledAt,
        learningGoals
      );

      // Schedule lesson reminders if confirmed
      await this.notificationService.scheduleTrialLessonReminders(bookingId, booking.scheduledAt);
    }
  }

  private async sendTrialAcceptanceNotificationToStudent(
    bookingId: string,
    meetingLink: string,
    instructions?: string
  ): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
      },
    });

    if (booking) {
      const teacherName = `${booking.teacher.user.firstName} ${booking.teacher.user.lastName}`;

      await this.notificationService.sendTrialAcceptanceToStudent(
        booking.student.id,
        booking.student.user.email,
        teacherName,
        bookingId,
        booking.scheduledAt,
        meetingLink,
        instructions
      );
    }
  }

  private async sendTrialDeclineNotificationToStudent(
    bookingId: string,
    reason?: string
  ): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
      },
    });

    if (booking) {
      const teacherName = `${booking.teacher.user.firstName} ${booking.teacher.user.lastName}`;

      await this.notificationService.sendTrialDeclineToStudent(
        booking.student.id,
        booking.student.user.email,
        teacherName,
        bookingId,
        reason
      );
    }
  }

  private async sendTrialCompletionNotifications(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        lesson: true,
      },
    });

    if (booking && booking.lesson) {
      const studentName = `${booking.student.user.firstName} ${booking.student.user.lastName}`;
      const teacherName = `${booking.teacher.user.firstName} ${booking.teacher.user.lastName}`;

      await this.notificationService.sendTrialCompletionNotification(
        bookingId,
        booking.student.id,
        booking.teacher.id,
        booking.student.user.email,
        booking.teacher.user.email,
        studentName,
        teacherName,
        booking.lesson.notes || undefined,
        booking.lesson.homework || undefined
      );
    }
  }

  private extractLearningGoalsFromNotes(notes?: string | null): string | undefined {
    if (!notes) return undefined;
    
    const goalsMatch = notes.match(/Learning Goals: ([^\n]+)/);
    return goalsMatch ? goalsMatch[1] : undefined;
  }

  private async storeTrialLessonMetadata(bookingId: string, metadata: any): Promise<void> {
    // In a real implementation, this would store in a metadata table
    console.log(`Storing trial lesson metadata for booking: ${bookingId}`, metadata);
  }

  private async storeTeacherResponseMetadata(bookingId: string, metadata: any): Promise<void> {
    console.log(`Storing teacher response metadata for booking: ${bookingId}`, metadata);
  }

  private async storeTrialCompletionMetadata(bookingId: string, metadata: any): Promise<void> {
    console.log(`Storing trial completion metadata for booking: ${bookingId}`, metadata);
  }
}
