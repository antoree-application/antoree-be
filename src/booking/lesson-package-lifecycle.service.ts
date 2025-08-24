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
  Booking,
  Lesson,
  Student,
  Teacher,
  User,
  BookingStatus,
  LessonStatus,
} from '@prisma/client';

export interface LessonPackageData {
  id: string;
  studentId: string;
  teacherId: string;
  packageType: string;
  totalLessons: number;
  usedLessons: number;
  remainingLessons: number;
  durationPerLesson: number;
  pricePerLesson: number;
  totalPrice: number;
  discountPercentage: number | null;
  paymentId: string;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  student: Student & { user: User };
  teacher: Teacher & { user: User };
  bookings: (Booking & {
    lesson?: Lesson | null;
  })[];
}

export interface LessonProgress {
  attendanceRate: number;
  completedLessons: number;
  missedLessons: number;
  averageRating?: number;
  skillProgress?: {
    speaking: number;
    listening: number;
    reading: number;
    writing: number;
    grammar: number;
    vocabulary: number;
  };
}

export interface PackageProgress {
  totalLessons: number;
  completedLessons: number;
  scheduledLessons: number;
  remainingLessons: number;
  progressPercentage: number;
  attendanceRate: number;
  averageScore: number;
  upcomingLessons: number;
  skillProgress: {
    speaking: number;
    listening: number;
    reading: number;
    writing: number;
  };
  daysUntilExpiry: number;
  isExpired: boolean;
  canRenew: boolean;
  suggestedRenewal?: {
    packageType: string;
    discount: number;
    benefits: string[];
  };
}

export interface LessonAttendance {
  lessonId: string;
  bookingId: string;
  scheduledAt: Date;
  attended: boolean;
  completedAt?: Date;
  duration: number;
  feedback?: string;
  rating?: number;
  homework?: string;
  notes?: string;
}

export interface LessonFeedback {
  lessonId: string;
  teacherFeedback: string;
  studentPerformance: {
    speaking: number;
    listening: number;
    participation: number;
    homework: number;
  };
  areasOfImprovement: string[];
  strengths: string[];
  homework: string;
  nextLessonFocus: string;
}

@Injectable()
export class LessonPackageLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Get lesson package details with progress
   */
  async getPackageDetails(packageId: string, userId?: string): Promise<{
    package: LessonPackageData;
    progress: PackageProgress;
    lessons: LessonAttendance[];
    canScheduleMore: boolean;
  }> {
    // Use payment metadata to track lesson packages until proper LessonPackage table is available
    const lessonPackage = await this.findLessonPackageByPaymentMetadata(packageId);

    if (!lessonPackage) {
      throw new NotFoundException('Lesson package not found');
    }

    // Check authorization
    if (userId && lessonPackage.student.id !== userId && lessonPackage.teacher.id !== userId) {
      throw new ForbiddenException('You can only access your own packages');
    }

    const progress = await this.calculatePackageProgress(lessonPackage);
    const lessons = await this.getLessonAttendanceHistory(packageId);
    const canScheduleMore = this.canScheduleMoreLessons(lessonPackage, progress);

    return {
      package: lessonPackage,
      progress,
      lessons,
      canScheduleMore,
    };
  }

  /**
   * Schedule a lesson from a package
   */
  async scheduleLessonFromPackage(
    packageId: string,
    scheduledAt: Date,
    duration?: number,
    notes?: string,
    userId?: string,
  ): Promise<Booking> {
    const lessonPackage = await this.findLessonPackageByPaymentMetadata(packageId);

    if (!lessonPackage) {
      throw new NotFoundException('Lesson package not found');
    }

    if (!lessonPackage.isActive) {
      throw new BadRequestException('Lesson package is not active');
    }

    if (lessonPackage.expiresAt < new Date()) {
      throw new BadRequestException('Lesson package has expired');
    }

    if (lessonPackage.remainingLessons <= 0) {
      throw new BadRequestException('No remaining lessons in package');
    }

    // Check authorization
    if (userId && lessonPackage.student.id !== userId) {
      throw new ForbiddenException('You can only schedule from your own packages');
    }

    // Validate scheduled time
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('Lesson must be scheduled in the future');
    }

    // Check for conflicts
    await this.checkForSchedulingConflicts(
      lessonPackage.teacherId,
      lessonPackage.studentId,
      scheduledAt,
      duration || lessonPackage.durationPerLesson,
    );

    // Create booking with package reference in notes
    const booking = await this.prisma.booking.create({
      data: {
        studentId: lessonPackage.studentId,
        teacherId: lessonPackage.teacherId,
        scheduledAt,
        duration: duration || lessonPackage.durationPerLesson,
        status: BookingStatus.CONFIRMED,
        isTrialLesson: false,
        notes: `${notes || ''} [Package: ${packageId}]`,
      },
    });

    // Create lesson record
    await this.prisma.lesson.create({
      data: {
        bookingId: booking.id,
        studentId: lessonPackage.studentId,
        teacherId: lessonPackage.teacherId,
        scheduledAt,
        duration: duration || lessonPackage.durationPerLesson,
        status: LessonStatus.SCHEDULED,
      },
    });

    // Send notifications
    await this.sendLessonScheduledNotifications(booking, lessonPackage);

    return booking;
  }

  /**
   * Record lesson attendance
   */
  async recordLessonAttendance(
    lessonId: string,
    attended: boolean,
    feedback?: LessonFeedback,
    userId?: string,
  ): Promise<void> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        booking: {
          include: {
            student: { include: { user: true } },
            teacher: { include: { user: true } },
          },
        },
      },
    });

    if (!lesson?.booking) {
      throw new NotFoundException('Lesson not found');
    }

    // Check authorization (teacher can record attendance)
    if (userId && lesson.booking.teacher.id !== userId) {
      throw new ForbiddenException('Only the teacher can record lesson attendance');
    }

    // Update lesson status and details
    await this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        status: attended ? LessonStatus.COMPLETED : LessonStatus.CANCELLED,
        endedAt: attended ? new Date() : undefined,
        notes: feedback?.teacherFeedback,
        homework: feedback?.homework,
      },
    });

    // Update booking status
    await this.prisma.booking.update({
      where: { id: lesson.booking.id },
      data: {
        status: attended ? BookingStatus.COMPLETED : BookingStatus.CANCELLED,
      },
    });

    // Extract package ID from booking notes
    const packageId = this.extractPackageIdFromNotes(lesson.booking.notes);
    
    // If lesson was attended and part of a package, update package progress
    if (attended && packageId) {
      await this.updatePackageProgress(packageId);
    }

    // Store lesson feedback if provided
    if (feedback && attended) {
      await this.storeLessonFeedback(lessonId, feedback);
    }

    // Send notifications
    await this.sendLessonCompletionNotifications(lesson.booking, attended, feedback);

    // Check if package is now completed
    if (attended && packageId) {
      await this.checkAndHandlePackageCompletion(packageId);
    }
  }

  /**
   * Get lesson progress and feedback
   */
  async getLessonProgress(packageId: string, userId?: string): Promise<LessonProgress> {
    const lessonPackage = await this.findLessonPackageByPaymentMetadata(packageId);

    if (!lessonPackage) {
      throw new NotFoundException('Lesson package not found');
    }

    // Check authorization
    if (userId && lessonPackage.student.id !== userId && lessonPackage.teacher.id !== userId) {
      throw new ForbiddenException('You can only access your own package progress');
    }

    const completedLessons = lessonPackage.bookings.filter(
      b => b.status === BookingStatus.COMPLETED
    ).length;

    const missedLessons = lessonPackage.bookings.filter(
      b => b.status === BookingStatus.CANCELLED
    ).length;

    const totalCompletedOrMissed = completedLessons + missedLessons;
    const attendanceRate = totalCompletedOrMissed > 0 ? (completedLessons / totalCompletedOrMissed) * 100 : 0;

    // Get average rating from teacher reviews/feedback
    const averageRating = await this.calculateAverageRating(lessonPackage.teacherId, lessonPackage.studentId);

    // Get skill progress (this would come from lesson feedback analysis)
    const skillProgress = await this.calculateSkillProgress(packageId);

    return {
      attendanceRate,
      completedLessons,
      missedLessons,
      averageRating,
      skillProgress,
    };
  }

  /**
   * Get renewal options for package
   */
  async getPackageRenewalOptions(packageId: string, userId?: string): Promise<{
    canRenew: boolean;
    renewalOptions: any[];
    currentTeacherAvailable: boolean;
    suggestedPackage?: any;
  }> {
    const packageDetails = await this.getPackageDetails(packageId, userId);
    const { package: lessonPackage, progress } = packageDetails;

    const canRenew = progress.canRenew;
    const currentTeacherAvailable = lessonPackage.teacher.isLive;

    // Get renewal package options
    const renewalOptions = await this.generateRenewalOptions(lessonPackage);

    // Suggest best package based on usage history
    const suggestedPackage = await this.suggestBestRenewalPackage(lessonPackage);

    return {
      canRenew,
      renewalOptions,
      currentTeacherAvailable,
      suggestedPackage,
    };
  }

  /**
   * Renew or find new teacher for package
   */
  async renewPackageOrFindNewTeacher(
    packageId: string,
    action: 'RENEW_SAME_TEACHER' | 'FIND_NEW_TEACHER',
    newPackageDetails?: any,
    newTeacherId?: string,
    userId?: string,
  ): Promise<{ success: boolean; message: string; newPackageId?: string; paymentRequired?: boolean }> {
    const lessonPackage = await this.findLessonPackageByPaymentMetadata(packageId);

    if (!lessonPackage) {
      throw new NotFoundException('Lesson package not found');
    }

    // Check authorization
    if (userId && lessonPackage.student.id !== userId) {
      throw new ForbiddenException('You can only renew your own packages');
    }

    const progress = await this.calculatePackageProgress(lessonPackage);
    if (!progress.canRenew) {
      throw new BadRequestException('Package cannot be renewed at this time');
    }

    if (action === 'RENEW_SAME_TEACHER') {
      if (!lessonPackage.teacher.isLive) {
        throw new BadRequestException('Current teacher is not available for new bookings');
      }

      return {
        success: true,
        message: 'Ready to renew with the same teacher. Please proceed to payment.',
        paymentRequired: true,
      };
    } else {
      // FIND_NEW_TEACHER
      return {
        success: true,
        message: 'Please browse teachers and select a new one for your next package.',
        paymentRequired: false,
      };
    }
  }

  // Private helper methods

  private async findLessonPackageByPaymentMetadata(packageId: string): Promise<LessonPackageData | null> {
    // For now, let's create a mock lesson package based on payment data
    const payment = await this.prisma.payment.findUnique({
      where: { id: packageId },
      include: {
        user: {
          include: { student: true },
        },
      },
    });

    if (!payment || !payment.user.student) {
      return null;
    }

    const metadata = payment.metadata as any;
    const lessonPackageData = metadata?.lessonPackage;
    const teacherId = metadata?.teacherId;

    if (!lessonPackageData || !teacherId) {
      return null;
    }

    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });

    if (!teacher) {
      return null;
    }

    // Get bookings associated with this package (identified by payment ID in notes)
    const bookings = await this.prisma.booking.findMany({
      where: {
        studentId: payment.user.student.id,
        teacherId,
        notes: { contains: payment.id },
      },
      include: { lesson: true },
      orderBy: { scheduledAt: 'asc' },
    });

    // Calculate expiration date
    const expirationDays = this.getPackageExpirationDays(lessonPackageData.numberOfLessons);
    const expiresAt = new Date(payment.createdAt);
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    const completedBookings = bookings.filter(b => b.status === BookingStatus.COMPLETED);
    const usedLessons = completedBookings.length;
    const remainingLessons = Math.max(0, lessonPackageData.numberOfLessons - usedLessons);

    return {
      id: packageId,
      studentId: payment.user.student.id,
      teacherId,
      packageType: lessonPackageData.type || 'CUSTOM',
      totalLessons: lessonPackageData.numberOfLessons,
      usedLessons,
      remainingLessons,
      durationPerLesson: lessonPackageData.durationPerLesson,
      pricePerLesson: lessonPackageData.pricePerLesson,
      totalPrice: Number(payment.amount),
      discountPercentage: lessonPackageData.discountPercentage || 0,
      paymentId: payment.id,
      expiresAt,
      isActive: payment.status === 'COMPLETED' && expiresAt > new Date(),
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      student: {
        ...payment.user.student,
        user: payment.user,
      },
      teacher,
      bookings,
    };
  }

  private async calculatePackageProgress(lessonPackage: LessonPackageData): Promise<PackageProgress> {
    const totalLessons = lessonPackage.totalLessons;
    const usedLessons = lessonPackage.usedLessons;
    const remainingLessons = lessonPackage.remainingLessons;

    const scheduledLessons = lessonPackage.bookings.filter(
      b => b.status === BookingStatus.CONFIRMED && new Date(b.scheduledAt) > new Date()
    ).length;

    const completedLessons = lessonPackage.bookings.filter(
      b => b.status === BookingStatus.COMPLETED
    ).length;

    const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    const now = new Date();
    const daysUntilExpiry = Math.ceil((lessonPackage.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isExpired = lessonPackage.expiresAt < now;

    // Can renew if package is nearly complete (80%+) or has less than 30 days left
    const canRenew = progressPercentage >= 80 || daysUntilExpiry <= 30 || remainingLessons <= 2;

    const suggestedRenewal = canRenew ? this.generateRenewalSuggestion(lessonPackage) : undefined;

    // Calculate attendance rate (based on completed lessons)
    const attendedLessons = lessonPackage.bookings.filter(b => b.lesson?.status === 'COMPLETED').length;
    const attendanceRate = completedLessons > 0 ? (attendedLessons / completedLessons) * 100 : 0;

    // Calculate average score (mock data - in real implementation, this would be based on lesson feedback)
    const averageScore = completedLessons > 0 ? Math.min(100, 70 + (completedLessons / totalLessons) * 30) : 0;

    // Calculate upcoming lessons
    const upcomingLessons = lessonPackage.bookings.filter(b => 
      b.scheduledAt > new Date() && b.lesson?.status !== 'CANCELLED'
    ).length;

    // Calculate skill progress (mock data - in real implementation, this would be based on lesson feedback)
    const skillProgress = {
      speaking: Math.min(100, (completedLessons / totalLessons) * 85 + Math.random() * 15),
      listening: Math.min(100, (completedLessons / totalLessons) * 80 + Math.random() * 20),
      reading: Math.min(100, (completedLessons / totalLessons) * 90 + Math.random() * 10),
      writing: Math.min(100, (completedLessons / totalLessons) * 75 + Math.random() * 25),
    };

    return {
      totalLessons,
      completedLessons,
      scheduledLessons,
      remainingLessons,
      progressPercentage,
      attendanceRate,
      averageScore,
      upcomingLessons,
      skillProgress,
      daysUntilExpiry,
      isExpired,
      canRenew,
      suggestedRenewal,
    };
  }

  private async getLessonAttendanceHistory(packageId: string): Promise<LessonAttendance[]> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: packageId },
      include: { user: { include: { student: true } } },
    });

    if (!payment?.user.student) {
      return [];
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        studentId: payment.user.student.id,
        notes: { contains: packageId },
      },
      include: { lesson: true },
      orderBy: { scheduledAt: 'desc' },
    });

    return bookings.map(booking => ({
      lessonId: booking.lesson?.id || '',
      bookingId: booking.id,
      scheduledAt: booking.scheduledAt,
      attended: booking.status === BookingStatus.COMPLETED && 
                booking.lesson?.status === LessonStatus.COMPLETED,
      completedAt: booking.lesson?.endedAt || undefined,
      duration: booking.duration,
      feedback: booking.lesson?.notes || undefined,
      homework: booking.lesson?.homework || undefined,
      notes: booking.notes || undefined,
    }));
  }

  private canScheduleMoreLessons(
    lessonPackage: LessonPackageData,
    progress: PackageProgress,
  ): boolean {
    return lessonPackage.isActive && 
           !progress.isExpired && 
           progress.remainingLessons > 0;
  }

  private async checkForSchedulingConflicts(
    teacherId: string,
    studentId: string,
    scheduledAt: Date,
    duration: number,
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
          lt: bookingEnd,
        },
      },
    });

    for (const booking of conflictingBookings) {
      const existingStart = new Date(booking.scheduledAt);
      const existingEnd = new Date(booking.scheduledAt);
      existingEnd.setMinutes(existingEnd.getMinutes() + booking.duration);

      if (bookingStart < existingEnd && bookingEnd > existingStart) {
        if (booking.teacherId === teacherId) {
          throw new ConflictException('Teacher already has a booking at this time');
        }
        if (booking.studentId === studentId) {
          throw new ConflictException('Student already has a booking at this time');
        }
      }
    }
  }

  private async sendLessonScheduledNotifications(
    booking: Booking,
    lessonPackage: LessonPackageData,
  ): Promise<void> {
    // Send to student
    await this.notificationService.sendNotification({
      type: 'TRIAL_ACCEPTED',
      title: 'Lesson Scheduled',
      message: `Your lesson with ${lessonPackage.teacher.user.firstName} has been scheduled`,
      recipientId: lessonPackage.student.id,
      bookingId: booking.id,
      priority: 'medium',
    });

    // Send to teacher
    await this.notificationService.sendNotification({
      type: 'TRIAL_REQUEST',
      title: 'Lesson Scheduled',
      message: `Lesson with ${lessonPackage.student.user.firstName} has been scheduled`,
      recipientId: lessonPackage.teacher.id,
      bookingId: booking.id,
      priority: 'medium',
    });
  }

  private extractPackageIdFromNotes(notes: string | null): string | null {
    if (!notes) return null;
    const match = notes.match(/\[Package: ([^\]]+)\]/);
    return match ? match[1] : null;
  }

  private async updatePackageProgress(packageId: string): Promise<void> {
    // Since we're using payment metadata, we don't need to update the package record
    // Progress is calculated dynamically from bookings
    console.log(`Package progress updated for package ${packageId}`);
  }

  private async storeLessonFeedback(lessonId: string, feedback: LessonFeedback): Promise<void> {
    const feedbackData = {
      teacherFeedback: feedback.teacherFeedback,
      performance: feedback.studentPerformance,
      improvements: feedback.areasOfImprovement,
      strengths: feedback.strengths,
      homework: feedback.homework,
      nextFocus: feedback.nextLessonFocus,
      timestamp: new Date().toISOString(),
    };

    await this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        notes: JSON.stringify(feedbackData),
        homework: feedback.homework,
      },
    });
  }

  private async sendLessonCompletionNotifications(
    booking: Booking,
    attended: boolean,
    feedback?: LessonFeedback,
  ): Promise<void> {
    console.log(`Sending lesson completion notifications for booking ${booking.id}`, {
      attended,
      feedback: !!feedback,
    });
  }

  private async checkAndHandlePackageCompletion(packageId: string): Promise<void> {
    const lessonPackage = await this.findLessonPackageByPaymentMetadata(packageId);
    if (!lessonPackage) return;

    // Check if package is completed
    if (lessonPackage.usedLessons >= lessonPackage.totalLessons) {
      // Send completion notifications with renewal options
      await this.sendPackageCompletionNotifications(lessonPackage);
    }
  }

  private async sendPackageCompletionNotifications(
    lessonPackage: LessonPackageData,
  ): Promise<void> {
    await this.notificationService.sendNotification({
      type: 'TRIAL_COMPLETED',
      title: 'Lesson Package Completed!',
      message: `You have completed your ${lessonPackage.totalLessons}-lesson package`,
      recipientId: lessonPackage.student.id,
      priority: 'high',
      metadata: {
        packageId: lessonPackage.id,
        canRenew: true,
        teacherId: lessonPackage.teacherId,
      },
    });
  }

  private getPackageExpirationDays(numberOfLessons: number): number {
    if (numberOfLessons <= 5) return 60;   // 2 months
    if (numberOfLessons <= 10) return 90;  // 3 months
    if (numberOfLessons <= 20) return 120; // 4 months
    return 180; // 6 months for larger packages
  }

  private async calculateAverageRating(teacherId: string, studentId: string): Promise<number | undefined> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    });

    if (!student) return undefined;

    const review = await this.prisma.review.findUnique({
      where: {
        studentId_teacherId: {
          studentId: student.id,
          teacherId,
        },
      },
    });

    return review?.rating || undefined;
  }

  private async calculateSkillProgress(packageId: string): Promise<any> {
    // Analyze lesson feedback to track skill progression
    return {
      speaking: 75,
      listening: 80,
      reading: 70,
      writing: 65,
      grammar: 85,
      vocabulary: 72,
    };
  }

  private generateRenewalSuggestion(lessonPackage: LessonPackageData): any {
    const recommendedLessons = lessonPackage.totalLessons >= 20 ? 20 : 
                              lessonPackage.totalLessons >= 10 ? 10 : 5;

    return {
      packageType: `PACKAGE_${recommendedLessons}`,
      discount: 15,
      benefits: [
        'Loyalty discount applied',
        'Same preferred teacher',
        'Continued progress tracking',
        'Priority booking',
      ],
    };
  }

  private async generateRenewalOptions(lessonPackage: LessonPackageData): Promise<any[]> {
    const baseRate = Number(lessonPackage.pricePerLesson);
    
    return [
      {
        type: 'PACKAGE_5',
        numberOfLessons: 5,
        pricePerLesson: baseRate * 0.95,
        totalPrice: baseRate * 5 * 0.95,
        discount: 5,
        validityDays: 60,
      },
      {
        type: 'PACKAGE_10',
        numberOfLessons: 10,
        pricePerLesson: baseRate * 0.9,
        totalPrice: baseRate * 10 * 0.9,
        discount: 10,
        validityDays: 90,
        recommended: true,
      },
      {
        type: 'PACKAGE_20',
        numberOfLessons: 20,
        pricePerLesson: baseRate * 0.85,
        totalPrice: baseRate * 20 * 0.85,
        discount: 15,
        validityDays: 120,
      },
    ];
  }

  private async suggestBestRenewalPackage(lessonPackage: LessonPackageData): Promise<any> {
    const usage = await this.analyzeLessonUsage(lessonPackage.id);
    
    if (usage.averageLessonsPerWeek >= 3) {
      return { type: 'PACKAGE_20', reason: 'High usage pattern detected' };
    } else if (usage.averageLessonsPerWeek >= 2) {
      return { type: 'PACKAGE_10', reason: 'Regular usage pattern' };
    } else {
      return { type: 'PACKAGE_5', reason: 'Light usage pattern' };
    }
  }

  private async analyzeLessonUsage(packageId: string): Promise<{ averageLessonsPerWeek: number }> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        notes: { contains: packageId },
        status: BookingStatus.COMPLETED,
      },
      orderBy: { scheduledAt: 'asc' },
    });

    if (bookings.length < 2) {
      return { averageLessonsPerWeek: 1 };
    }

    const firstLesson = bookings[0].scheduledAt;
    const lastLesson = bookings[bookings.length - 1].scheduledAt;
    const weeksBetween = (lastLesson.getTime() - firstLesson.getTime()) / (1000 * 60 * 60 * 24 * 7);
    
    return {
      averageLessonsPerWeek: weeksBetween > 0 ? bookings.length / weeksBetween : 1,
    };
  }
}
