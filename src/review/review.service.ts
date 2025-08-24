import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  CreateReviewDto,
  CreateTrialLessonFeedbackDto,
  UpdateReviewDto,
  SearchReviewDto,
} from './dto';
import {
  ReviewVm,
  TrialLessonFeedbackVm,
  ReviewSearchResultVm,
  TeacherReviewStatsVm,
} from './vm';
import {
  Review,
  User,
  Student,
  Teacher,
  Booking,
  BookingStatus,
  UserRole,
} from '@prisma/client';

type ReviewWithRelations = Review & {
  student: User;
  teacher: Teacher & { user: User };
};

type TrialLessonFeedbackData = {
  id: string;
  overallRating: number;
  teachingQuality?: number;
  communication?: number;
  punctuality?: number;
  preparation?: number;
  whatYouLiked: string;
  areasForImprovement?: string;
  wouldBookAgain: boolean;
  additionalComments?: string;
  topicsCovered?: string;
  futureGoals?: string;
  createdAt: Date;
  updatedAt: Date;
  student: User & { student: Student };
  teacher: Teacher & { user: User };
  booking: Booking;
};

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  private toReviewVm(review: ReviewWithRelations, booking?: Booking): ReviewVm {
    return {
      id: review.id,
      student: {
        id: review.studentId,
        firstName: review.student.firstName,
        lastName: review.student.lastName,
        avatar: review.student.avatar,
        englishLevel: 'Intermediate', // This would come from student profile
      },
      teacher: {
        id: review.teacher.id,
        firstName: review.teacher.user.firstName,
        lastName: review.teacher.user.lastName,
        avatar: review.teacher.user.avatar,
      },
      rating: review.rating,
      comment: review.comment,
      booking: booking ? {
        id: booking.id,
        isTrialLesson: booking.isTrialLesson,
        scheduledAt: booking.scheduledAt.toISOString(),
        duration: booking.duration,
      } : undefined,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    };
  }

  async createReview(
    createReviewDto: CreateReviewDto,
    studentUserId: string
  ): Promise<ReviewVm> {
    // Get student from user ID
    const student = await this.prisma.student.findUnique({
      where: { id: studentUserId },
      include: { user: true },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    // Validate teacher exists
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: createReviewDto.teacherId },
      include: { user: true },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Check if student already reviewed this teacher
    const existingReview = await this.prisma.review.findUnique({
      where: {
        studentId_teacherId: {
          studentId: studentUserId,
          teacherId: createReviewDto.teacherId,
        },
      },
    });

    if (existingReview) {
      throw new ConflictException('You have already reviewed this teacher');
    }

    // If booking ID is provided, validate it
    let booking: Booking | null = null;
    if (createReviewDto.bookingId) {
      booking = await this.prisma.booking.findUnique({
        where: { id: createReviewDto.bookingId },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.studentId !== student.id) {
        throw new ForbiddenException('You can only review your own bookings');
      }

      if (booking.teacherId !== createReviewDto.teacherId) {
        throw new BadRequestException('Booking does not match the teacher being reviewed');
      }

      if (booking.status !== BookingStatus.COMPLETED) {
        throw new BadRequestException('You can only review completed lessons');
      }
    } else {
      // Verify student had at least one completed lesson with this teacher
      const completedBooking = await this.prisma.booking.findFirst({
        where: {
          studentId: student.id,
          teacherId: createReviewDto.teacherId,
          status: BookingStatus.COMPLETED,
        },
      });

      if (!completedBooking) {
        throw new BadRequestException('You can only review teachers after completing a lesson with them');
      }
    }

    // Create the review
    const review = await this.prisma.review.create({
      data: {
        studentId: studentUserId,
        teacherId: createReviewDto.teacherId,
        rating: createReviewDto.rating,
        comment: createReviewDto.comment,
      },
      include: {
        student: true,
        teacher: { include: { user: true } },
      },
    });

    // Update teacher's average rating
    await this.updateTeacherAverageRating(createReviewDto.teacherId);

    return this.toReviewVm(review, booking);
  }

  async createTrialLessonFeedback(
    feedbackDto: CreateTrialLessonFeedbackDto,
    studentUserId: string
  ): Promise<TrialLessonFeedbackVm> {
    // Get student from user ID
    const student = await this.prisma.student.findUnique({
      where: { id: studentUserId },
      include: { user: true },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    // Validate booking exists and is a completed trial lesson
    const booking = await this.prisma.booking.findUnique({
      where: { id: feedbackDto.bookingId },
      include: {
        teacher: { include: { user: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.studentId !== student.id) {
      throw new ForbiddenException('You can only provide feedback for your own bookings');
    }

    if (!booking.isTrialLesson) {
      throw new BadRequestException('This booking is not a trial lesson');
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('You can only provide feedback for completed trial lessons');
    }

    if (booking.teacherId !== feedbackDto.teacherId) {
      throw new BadRequestException('Booking does not match the specified teacher');
    }

    // Check if feedback already exists for this trial lesson
    const existingFeedback = await this.prisma.$queryRaw`
      SELECT * FROM trial_lesson_feedback 
      WHERE booking_id = ${feedbackDto.bookingId} AND student_user_id = ${studentUserId}
    ` as any[];

    if (existingFeedback.length > 0) {
      throw new ConflictException('Feedback already provided for this trial lesson');
    }

    // Store trial lesson feedback in a JSON field in the review table
    // or create a separate table for detailed trial feedback
    const feedbackData = {
      bookingId: feedbackDto.bookingId,
      overallRating: feedbackDto.overallRating,
      detailedRatings: {
        teachingQuality: feedbackDto.teachingQuality,
        communication: feedbackDto.communication,
        punctuality: feedbackDto.punctuality,
        preparation: feedbackDto.preparation,
      },
      whatYouLiked: feedbackDto.whatYouLiked,
      areasForImprovement: feedbackDto.areasForImprovement,
      wouldBookAgain: feedbackDto.wouldBookAgain,
      additionalComments: feedbackDto.additionalComments,
      topicsCovered: feedbackDto.topicsCovered,
      futureGoals: feedbackDto.futureGoals,
    };

    // Create a review record with the overall rating
    const review = await this.prisma.review.create({
      data: {
        studentId: studentUserId,
        teacherId: feedbackDto.teacherId,
        rating: feedbackDto.overallRating,
        comment: `Trial Lesson Feedback: ${feedbackDto.whatYouLiked}${feedbackDto.additionalComments ? ` | ${feedbackDto.additionalComments}` : ''}`,
      },
    });

    // Store detailed feedback metadata (in a real implementation, you might want a separate table)
    await this.storeTrialLessonFeedbackMetadata(review.id, feedbackData);

    // Update teacher's average rating
    await this.updateTeacherAverageRating(feedbackDto.teacherId);

    return {
      id: review.id,
      student: {
        id: student.id,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        avatar: student.user.avatar,
        englishLevel: student.englishLevel,
      },
      teacher: {
        id: booking.teacher.id,
        firstName: booking.teacher.user.firstName,
        lastName: booking.teacher.user.lastName,
        avatar: booking.teacher.user.avatar,
      },
      booking: {
        id: booking.id,
        scheduledAt: booking.scheduledAt.toISOString(),
        duration: booking.duration,
        status: booking.status,
      },
      overallRating: feedbackDto.overallRating,
      detailedRatings: {
        teachingQuality: feedbackDto.teachingQuality,
        communication: feedbackDto.communication,
        punctuality: feedbackDto.punctuality,
        preparation: feedbackDto.preparation,
      },
      whatYouLiked: feedbackDto.whatYouLiked,
      areasForImprovement: feedbackDto.areasForImprovement,
      wouldBookAgain: feedbackDto.wouldBookAgain,
      additionalComments: feedbackDto.additionalComments,
      topicsCovered: feedbackDto.topicsCovered,
      futureGoals: feedbackDto.futureGoals,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    };
  }

  async findAll(searchDto: SearchReviewDto = {}): Promise<ReviewSearchResultVm> {
    const {
      teacherId,
      studentId,
      minRating,
      maxRating,
      searchComment,
      trialLessonOnly,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = searchDto;

    const where: any = {};

    if (teacherId) where.teacherId = teacherId;
    if (studentId) where.studentId = studentId;

    if (minRating !== undefined || maxRating !== undefined) {
      where.rating = {};
      if (minRating !== undefined) where.rating.gte = minRating;
      if (maxRating !== undefined) where.rating.lte = maxRating;
    }

    if (searchComment) {
      where.comment = { contains: searchComment, mode: 'insensitive' };
    }

    // If filtering for trial lesson reviews only
    if (trialLessonOnly) {
      where.comment = { contains: 'Trial Lesson Feedback', mode: 'insensitive' };
    }

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          student: true,
          teacher: { include: { user: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    // Calculate average rating for this result set
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;

    // Calculate rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
    });

    return {
      reviews: reviews.map(review => this.toReviewVm(review)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      averageRating: parseFloat(averageRating.toFixed(2)),
      ratingDistribution,
    };
  }

  async findOne(id: string, userId?: string, userRole?: UserRole): Promise<ReviewVm> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        student: true,
        teacher: { include: { user: true } },
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    // Check authorization - students can only see their own reviews, teachers can see reviews about them
    if (userId && userRole !== UserRole.ADMIN) {
      const hasAccess = review.studentId === userId || review.teacher.id === userId;
      if (!hasAccess) {
        throw new ForbiddenException('You can only access authorized reviews');
      }
    }

    return this.toReviewVm(review);
  }

  async findByTeacher(teacherId: string, limit: number = 10): Promise<ReviewVm[]> {
    const reviews = await this.prisma.review.findMany({
      where: { teacherId },
      include: {
        student: true,
        teacher: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return reviews.map(review => this.toReviewVm(review));
  }

  async findByStudent(studentUserId: string): Promise<ReviewVm[]> {
    const reviews = await this.prisma.review.findMany({
      where: { studentId: studentUserId },
      include: {
        student: true,
        teacher: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map(review => this.toReviewVm(review));
  }

  async update(
    id: string,
    updateReviewDto: UpdateReviewDto,
    userId: string,
    userRole: UserRole
  ): Promise<ReviewVm> {
    const existingReview = await this.prisma.review.findUnique({
      where: { id },
      include: {
        student: true,
        teacher: { include: { user: true } },
      },
    });

    if (!existingReview) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    // Only the student who created the review can update it (or admin)
    if (userRole !== UserRole.ADMIN && existingReview.studentId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: {
        rating: updateReviewDto.rating,
        comment: updateReviewDto.comment,
      },
      include: {
        student: true,
        teacher: { include: { user: true } },
      },
    });

    // Update teacher's average rating if rating changed
    if (updateReviewDto.rating && updateReviewDto.rating !== existingReview.rating) {
      await this.updateTeacherAverageRating(existingReview.teacherId);
    }

    return this.toReviewVm(updatedReview);
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<ReviewVm> {
    const review = await this.findOne(id, userId, userRole);

    // Only the student who created the review can delete it (or admin)
    if (userRole !== UserRole.ADMIN && review.student.id !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    const deletedReview = await this.prisma.review.delete({
      where: { id },
      include: {
        student: true,
        teacher: { include: { user: true } },
      },
    });

    // Update teacher's average rating
    await this.updateTeacherAverageRating(review.teacher.id);

    return this.toReviewVm(deletedReview);
  }

  async getTeacherReviewStats(teacherId: string): Promise<TeacherReviewStatsVm> {
    // Validate teacher exists
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const [
      reviews,
      totalReviews,
      averageRating,
      ratingCounts,
      recentReviews,
      trialLessonStats,
    ] = await Promise.all([
      this.prisma.review.findMany({
        where: { teacherId },
        include: {
          student: true,
          teacher: { include: { user: true } },
        },
      }),
      this.prisma.review.count({ where: { teacherId } }),
      this.getTeacherAverageRating(teacherId),
      this.getTeacherRatingDistribution(teacherId),
      this.findByTeacher(teacherId, 5),
      this.getTrialLessonStats(teacherId),
    ]);

    const lastReview = reviews.length > 0 
      ? reviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      : null;

    return {
      teacherId,
      totalReviews,
      averageRating,
      ratingDistribution: ratingCounts,
      recentReviews,
      trialLessonStats,
      responseRate: 85, // This would be calculated from teacher responses to feedback
      lastReviewDate: lastReview ? lastReview.createdAt.toISOString() : '',
    };
  }

  async getEligibleBookingsForReview(studentUserId: string): Promise<any[]> {
    // Get student
    const student = await this.prisma.student.findUnique({
      where: { id: studentUserId },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    // Find completed bookings that haven't been reviewed yet
    const eligibleBookings = await this.prisma.booking.findMany({
      where: {
        studentId: student.id,
        status: BookingStatus.COMPLETED,
        teacher: {
          // Exclude teachers already reviewed by this student
          NOT: {
            reviews: {
              some: {
                studentId: studentUserId,
              },
            },
          },
        },
      },
      include: {
        teacher: { include: { user: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });

    return eligibleBookings.map(booking => ({
      bookingId: booking.id,
      teacherId: booking.teacherId,
      teacherName: `${booking.teacher.user.firstName} ${booking.teacher.user.lastName}`,
      scheduledAt: booking.scheduledAt.toISOString(),
      duration: booking.duration,
      isTrialLesson: booking.isTrialLesson,
      canReview: true,
    }));
  }

  async markReviewAsHelpful(reviewId: string, userId: string): Promise<void> {
    // In a real implementation, you might have a separate table for review helpfulness
    // For now, we'll just validate the review exists
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Implementation would store helpfulness data
    console.log(`User ${userId} marked review ${reviewId} as helpful`);
  }

  // Private helper methods
  private async updateTeacherAverageRating(teacherId: string): Promise<void> {
    const result = await this.prisma.review.aggregate({
      where: { teacherId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const averageRating = result._avg.rating || 0;
    const totalLessons = result._count.rating || 0;

    await this.prisma.teacher.update({
      where: { id: teacherId },
      data: {
        averageRating: parseFloat(averageRating.toFixed(2)),
        totalLessons,
      },
    });
  }

  private async getTeacherAverageRating(teacherId: string): Promise<number> {
    const result = await this.prisma.review.aggregate({
      where: { teacherId },
      _avg: { rating: true },
    });

    return parseFloat((result._avg.rating || 0).toFixed(2));
  }

  private async getTeacherRatingDistribution(teacherId: string): Promise<{ 1: number; 2: number; 3: number; 4: number; 5: number }> {
    const ratings = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { teacherId },
      _count: { rating: true },
    });

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(({ rating, _count }) => {
      distribution[rating as keyof typeof distribution] = _count.rating;
    });

    return distribution;
  }

  private async getTrialLessonStats(teacherId: string): Promise<{
    totalTrialReviews: number;
    averageTrialRating: number;
    wouldBookAgainPercentage: number;
  }> {
    // Get trial lesson reviews (those with "Trial Lesson Feedback" in comment)
    const trialReviews = await this.prisma.review.findMany({
      where: {
        teacherId,
        comment: { contains: 'Trial Lesson Feedback', mode: 'insensitive' },
      },
    });

    const totalTrialReviews = trialReviews.length;
    const averageTrialRating = totalTrialReviews > 0
      ? trialReviews.reduce((sum, review) => sum + review.rating, 0) / totalTrialReviews
      : 0;

    // In a real implementation, you'd track "would book again" data separately
    // For now, assume high ratings (4-5) indicate they would book again
    const wouldBookAgainCount = trialReviews.filter(review => review.rating >= 4).length;
    const wouldBookAgainPercentage = totalTrialReviews > 0
      ? (wouldBookAgainCount / totalTrialReviews) * 100
      : 0;

    return {
      totalTrialReviews,
      averageTrialRating: parseFloat(averageTrialRating.toFixed(2)),
      wouldBookAgainPercentage: parseFloat(wouldBookAgainPercentage.toFixed(2)),
    };
  }

  private async storeTrialLessonFeedbackMetadata(reviewId: string, metadata: any): Promise<void> {
    // In a real implementation, this would store in a separate trial_lesson_feedback table
    // For now, we'll just log it (you could also store in a JSON field)
    console.log(`Storing trial lesson feedback metadata for review ${reviewId}:`, metadata);
  }

  // Public method to check if student can review a teacher
  async canStudentReviewTeacher(studentUserId: string, teacherId: string): Promise<{
    canReview: boolean;
    reason?: string;
    completedLessons: number;
    hasExistingReview: boolean;
  }> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentUserId },
    });

    if (!student) {
      return {
        canReview: false,
        reason: 'Student profile not found',
        completedLessons: 0,
        hasExistingReview: false,
      };
    }

    // Check if student already reviewed this teacher
    const existingReview = await this.prisma.review.findUnique({
      where: {
        studentId_teacherId: {
          studentId: studentUserId,
          teacherId,
        },
      },
    });

    if (existingReview) {
      return {
        canReview: false,
        reason: 'Already reviewed this teacher',
        completedLessons: 0,
        hasExistingReview: true,
      };
    }

    // Check completed lessons
    const completedLessons = await this.prisma.booking.count({
      where: {
        studentId: student.id,
        teacherId,
        status: BookingStatus.COMPLETED,
      },
    });

    if (completedLessons === 0) {
      return {
        canReview: false,
        reason: 'No completed lessons with this teacher',
        completedLessons,
        hasExistingReview: false,
      };
    }

    return {
      canReview: true,
      completedLessons,
      hasExistingReview: false,
    };
  }
}
