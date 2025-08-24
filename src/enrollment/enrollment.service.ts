import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { 
  CourseEnrollment, 
  EnrollmentStatus, 
  Payment, 
  PaymentStatus 
} from '@prisma/client';

@Injectable()
export class EnrollmentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create course enrollment after successful payment
   */
  async createCourseEnrollment(
    paymentId: string,
    studentId: string,
    courseId: string,
  ): Promise<CourseEnrollment> {
    // Verify payment exists and is completed
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(`Payment ${paymentId} is not completed`);
    }

    if (payment.userId !== studentId) {
      throw new BadRequestException(`Payment ${paymentId} does not belong to student ${studentId}`);
    }

    // Verify course exists and is active
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    if (!course.isActive) {
      throw new BadRequestException(`Course ${courseId} is not active`);
    }

    // Check if student is already enrolled in this course
    const existingEnrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      throw new ConflictException(`Student ${studentId} is already enrolled in course ${courseId}`);
    }

    // Create course enrollment
    const enrollment = await this.prisma.courseEnrollment.create({
      data: {
        studentId,
        courseId,
        paymentId,
        status: EnrollmentStatus.ACTIVE,
        enrolledAt: new Date(),
        completedLessons: 0,
        progress: 0.0,
        enrollmentNotes: `Enrolled through payment ${paymentId}`,
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        course: {
          include: {
            teacher: {
              include: {
                user: true,
              },
            },
          },
        },
        payment: true,
      },
    });

    console.log(`✅ Created enrollment ${enrollment.id} for student ${studentId} in course ${courseId}`);

    return enrollment;
  }

  /**
   * Get student's enrollments
   */
  async getStudentEnrollments(
    studentId: string,
    status?: EnrollmentStatus,
  ): Promise<CourseEnrollment[]> {
    const whereClause: any = { studentId };
    
    if (status) {
      whereClause.status = status;
    }

    return this.prisma.courseEnrollment.findMany({
      where: whereClause,
      include: {
        course: {
          include: {
            teacher: {
              include: {
                user: true,
              },
            },
          },
        },
        payment: true,
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    });
  }

  /**
   * Get enrollment by ID
   */
  async getEnrollmentById(enrollmentId: string): Promise<CourseEnrollment | null> {
    return this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        course: {
          include: {
            teacher: {
              include: {
                user: true,
              },
            },
          },
        },
        payment: true,
      },
    });
  }

  /**
   * Update enrollment progress
   */
  async updateEnrollmentProgress(
    enrollmentId: string,
    completedLessons: number,
  ): Promise<CourseEnrollment> {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: true },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${enrollmentId} not found`);
    }

    const progress = (completedLessons / enrollment.course.totalLessons) * 100;
    const isCompleted = completedLessons >= enrollment.course.totalLessons;

    const updateData: any = {
      completedLessons,
      progress,
      lastAccessedAt: new Date(),
    };

    if (isCompleted && enrollment.status === EnrollmentStatus.ACTIVE) {
      updateData.status = EnrollmentStatus.COMPLETED;
      updateData.completedAt = new Date();
    }

    return this.prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: updateData,
      include: {
        student: {
          include: {
            user: true,
          },
        },
        course: {
          include: {
            teacher: {
              include: {
                user: true,
              },
            },
          },
        },
        payment: true,
      },
    });
  }

  /**
   * Cancel enrollment
   */
  async cancelEnrollment(enrollmentId: string, reason?: string): Promise<CourseEnrollment> {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${enrollmentId} not found`);
    }

    if (enrollment.status === EnrollmentStatus.CANCELLED) {
      throw new BadRequestException(`Enrollment ${enrollmentId} is already cancelled`);
    }

    return this.prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: EnrollmentStatus.CANCELLED,
        enrollmentNotes: reason ? `Cancelled: ${reason}` : 'Cancelled by user',
        updatedAt: new Date(),
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        course: {
          include: {
            teacher: {
              include: {
                user: true,
              },
            },
          },
        },
        payment: true,
      },
    });
  }

  /**
   * Get course enrollments for teacher (their courses)
   */
  async getCourseEnrollmentsForTeacher(
    teacherId: string,
    courseId?: string,
    status?: EnrollmentStatus,
  ): Promise<CourseEnrollment[]> {
    const whereClause: any = {
      course: {
        teacherId,
      },
    };

    if (courseId) {
      whereClause.courseId = courseId;
    }

    if (status) {
      whereClause.status = status;
    }

    return this.prisma.courseEnrollment.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            user: true,
          },
        },
        course: true,
        payment: true,
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    });
  }

  /**
   * Get enrollment statistics
   */
  async getEnrollmentStats(courseId?: string, teacherId?: string) {
    const whereClause: any = {};

    if (courseId) {
      whereClause.courseId = courseId;
    }

    if (teacherId) {
      whereClause.course = {
        teacherId,
      };
    }

    const [
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      cancelledEnrollments,
    ] = await Promise.all([
      this.prisma.courseEnrollment.count({
        where: whereClause,
      }),
      this.prisma.courseEnrollment.count({
        where: {
          ...whereClause,
          status: EnrollmentStatus.ACTIVE,
        },
      }),
      this.prisma.courseEnrollment.count({
        where: {
          ...whereClause,
          status: EnrollmentStatus.COMPLETED,
        },
      }),
      this.prisma.courseEnrollment.count({
        where: {
          ...whereClause,
          status: EnrollmentStatus.CANCELLED,
        },
      }),
    ]);

    return {
      total: totalEnrollments,
      active: activeEnrollments,
      completed: completedEnrollments,
      cancelled: cancelledEnrollments,
    };
  }

  /**
   * Get enrollment by payment ID
   */
  async getEnrollmentByPaymentId(paymentId: string): Promise<CourseEnrollment | null> {
    return this.prisma.courseEnrollment.findUnique({
      where: { paymentId },
      include: {
        student: {
          include: { user: true },
        },
        course: {
          include: {
            teacher: {
              include: { user: true },
            },
          },
        },
        payment: true,
      },
    });
  }

  /**
   * Get enrollment analytics for dashboard
   */
  async getEnrollmentAnalytics(): Promise<{
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    monthlyEnrollments: number;
    revenue: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      monthlyEnrollments,
      revenueResult,
    ] = await Promise.all([
      this.prisma.courseEnrollment.count(),
      this.prisma.courseEnrollment.count({
        where: { status: EnrollmentStatus.ACTIVE },
      }),
      this.prisma.courseEnrollment.count({
        where: { status: EnrollmentStatus.COMPLETED },
      }),
      this.prisma.courseEnrollment.count({
        where: {
          enrolledAt: {
            gte: startOfMonth,
          },
        },
      }),
      this.prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: 'COMPLETED',
          courseEnrollment: {
            isNot: null,
          },
        },
      }),
    ]);

    return {
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      monthlyEnrollments,
      revenue: Number(revenueResult._sum.amount) || 0,
    };
  }
}
