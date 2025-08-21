import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { LessonPackageLifecycleService, LessonFeedback } from './lesson-package-lifecycle.service';
import { User, UserRole } from '@prisma/client';

export interface ScheduleLessonDto {
  scheduledAt: string; // ISO string
  duration?: number;
  notes?: string;
}

export interface RecordAttendanceDto {
  attended: boolean;
  feedback?: LessonFeedback;
}

export interface RenewalActionDto {
  action: 'RENEW_SAME_TEACHER' | 'FIND_NEW_TEACHER';
  newPackageDetails?: {
    numberOfLessons: number;
    packageType: string;
  };
  newTeacherId?: string;
}

@ApiTags('Lesson Package Lifecycle')
@Controller('lesson-packages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LessonPackageLifecycleController {
  constructor(
    private readonly lessonPackageService: LessonPackageLifecycleService,
  ) {}

  @Get(':packageId')
  @ApiOperation({ summary: 'Get lesson package details with progress' })
  @ApiResponse({ status: 200, description: 'Package details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getPackageDetails(
    @Param('packageId') packageId: string,
    @CurrentUser() user: User,
  ) {
    return this.lessonPackageService.getPackageDetails(packageId, user.id);
  }

  @Get(':packageId/progress')
  @ApiOperation({ summary: 'Get lesson progress and feedback for a package' })
  @ApiResponse({ status: 200, description: 'Progress retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getLessonProgress(
    @Param('packageId') packageId: string,
    @CurrentUser() user: User,
  ) {
    return this.lessonPackageService.getLessonProgress(packageId, user.id);
  }

  @Post(':packageId/lessons/schedule')
  @ApiOperation({ summary: 'Schedule a lesson from a package' })
  @ApiResponse({ status: 201, description: 'Lesson scheduled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or package not available' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 409, description: 'Scheduling conflict' })
  async scheduleLessonFromPackage(
    @Param('packageId') packageId: string,
    @Body() scheduleDto: ScheduleLessonDto,
    @CurrentUser() user: User,
  ) {
    const scheduledAt = new Date(scheduleDto.scheduledAt);
    return this.lessonPackageService.scheduleLessonFromPackage(
      packageId,
      scheduledAt,
      scheduleDto.duration,
      scheduleDto.notes,
      user.id,
    );
  }

  @Put('lessons/:lessonId/attendance')
  @ApiOperation({ summary: 'Record lesson attendance and feedback' })
  @ApiResponse({ status: 200, description: 'Attendance recorded successfully' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 403, description: 'Only teachers can record attendance' })
  @HttpCode(HttpStatus.OK)
  async recordLessonAttendance(
    @Param('lessonId') lessonId: string,
    @Body() attendanceDto: RecordAttendanceDto,
    @CurrentUser() user: User,
  ) {
    await this.lessonPackageService.recordLessonAttendance(
      lessonId,
      attendanceDto.attended,
      attendanceDto.feedback,
      user.id,
    );

    return {
      success: true,
      message: 'Lesson attendance recorded successfully',
    };
  }

  @Get(':packageId/renewal-options')
  @ApiOperation({ summary: 'Get package renewal options' })
  @ApiResponse({ status: 200, description: 'Renewal options retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getPackageRenewalOptions(
    @Param('packageId') packageId: string,
    @CurrentUser() user: User,
  ) {
    return this.lessonPackageService.getPackageRenewalOptions(packageId, user.id);
  }

  @Post(':packageId/renew')
  @ApiOperation({ summary: 'Renew package or find new teacher' })
  @ApiResponse({ status: 200, description: 'Renewal action processed successfully' })
  @ApiResponse({ status: 400, description: 'Package cannot be renewed at this time' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async renewPackageOrFindNewTeacher(
    @Param('packageId') packageId: string,
    @Body() renewalDto: RenewalActionDto,
    @CurrentUser() user: User,
  ) {
    return this.lessonPackageService.renewPackageOrFindNewTeacher(
      packageId,
      renewalDto.action,
      renewalDto.newPackageDetails,
      renewalDto.newTeacherId,
      user.id,
    );
  }

  @Get('student/:studentId/active')
  @ApiOperation({ summary: 'Get active packages for a student' })
  @ApiResponse({ status: 200, description: 'Active packages retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getStudentActivePackages(
    @Param('studentId') studentId: string,
    @CurrentUser() user: User,
  ) {
    // For now, return empty array as we need to implement this based on payment data
    return {
      activePackages: [],
      message: 'Feature not implemented yet - use payment history to track packages',
    };
  }

  @Get('teacher/:teacherId/packages')
  @ApiOperation({ summary: 'Get packages for a teacher' })
  @ApiResponse({ status: 200, description: 'Teacher packages retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getTeacherPackages(
    @Param('teacherId') teacherId: string,
    @CurrentUser() user: User,
  ) {
    // For now, return empty array as we need to implement this based on payment data
    return {
      packages: [],
      message: 'Feature not implemented yet - use payment history to track packages',
    };
  }

  @Get(':packageId/calendar')
  @ApiOperation({ summary: 'Get package lesson calendar' })
  @ApiResponse({ status: 200, description: 'Package calendar retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getPackageCalendar(
    @Param('packageId') packageId: string,
    @CurrentUser() user: User,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const packageDetails = await this.lessonPackageService.getPackageDetails(packageId, user.id);
    
    // Filter lessons by month/year if provided
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const filteredLessons = packageDetails.lessons.filter(lesson => {
      const lessonDate = new Date(lesson.scheduledAt);
      return lessonDate.getMonth() + 1 === currentMonth && lessonDate.getFullYear() === currentYear;
    });

    return {
      packageId,
      month: currentMonth,
      year: currentYear,
      lessons: filteredLessons,
      summary: {
        totalLessons: filteredLessons.length,
        completedLessons: filteredLessons.filter(l => l.attended).length,
        upcomingLessons: filteredLessons.filter(l => 
          new Date(l.scheduledAt) > new Date() && !l.attended
        ).length,
      },
    };
  }

  @Get(':packageId/stats')
  @ApiOperation({ summary: 'Get package statistics and analytics' })
  @ApiResponse({ status: 200, description: 'Package statistics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getPackageStats(
    @Param('packageId') packageId: string,
    @CurrentUser() user: User,
  ) {
    const [packageDetails, lessonProgress] = await Promise.all([
      this.lessonPackageService.getPackageDetails(packageId, user.id),
      this.lessonPackageService.getLessonProgress(packageId, user.id),
    ]);

    // Calculate additional statistics
    const lessons = packageDetails.lessons;
    const completedLessons = lessons.filter(l => l.attended);
    const missedLessons = lessons.filter(l => !l.attended && new Date(l.scheduledAt) < new Date());
    
    // Calculate average lesson duration
    const avgDuration = lessons.length > 0 
      ? lessons.reduce((sum, l) => sum + l.duration, 0) / lessons.length 
      : 0;

    // Calculate lessons per week
    const packageStart = packageDetails.package.createdAt;
    const packageEnd = new Date();
    const weeksBetween = (packageEnd.getTime() - packageStart.getTime()) / (1000 * 60 * 60 * 24 * 7);
    const lessonsPerWeek = weeksBetween > 0 ? lessons.length / weeksBetween : 0;

    // Time-based statistics
    const timeStats = this.calculateTimeStats(lessons);

    return {
      package: {
        id: packageId,
        type: packageDetails.package.packageType,
        totalLessons: packageDetails.package.totalLessons,
        pricePerLesson: packageDetails.package.pricePerLesson,
      },
      progress: packageDetails.progress,
      lessonStats: {
        total: lessons.length,
        completed: completedLessons.length,
        missed: missedLessons.length,
        upcoming: lessons.filter(l => new Date(l.scheduledAt) > new Date()).length,
        attendanceRate: lessonProgress.attendanceRate,
        averageDuration: Math.round(avgDuration),
        lessonsPerWeek: Math.round(lessonsPerWeek * 10) / 10,
      },
      timeStats,
      performance: lessonProgress.skillProgress,
      recommendations: this.generateRecommendations(packageDetails, lessonProgress),
    };
  }

  @Post(':packageId/lessons/:lessonId/feedback')
  @ApiOperation({ summary: 'Add detailed lesson feedback (teacher only)' })
  @ApiResponse({ status: 201, description: 'Feedback added successfully' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 403, description: 'Only teachers can add feedback' })
  async addLessonFeedback(
    @Param('packageId') packageId: string,
    @Param('lessonId') lessonId: string,
    @Body() feedback: LessonFeedback,
    @CurrentUser() user: User,
  ) {
    // Store the feedback using the lesson lifecycle service
    await this.lessonPackageService.recordLessonAttendance(
      lessonId,
      true, // Assuming if adding feedback, lesson was attended
      feedback,
      user.id,
    );

    return {
      success: true,
      message: 'Lesson feedback added successfully',
      lessonId,
    };
  }

  @Get(':packageId/completion-certificate')
  @ApiOperation({ summary: 'Generate completion certificate for completed package' })
  @ApiResponse({ status: 200, description: 'Certificate generated successfully' })
  @ApiResponse({ status: 400, description: 'Package not completed yet' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async generateCompletionCertificate(
    @Param('packageId') packageId: string,
    @CurrentUser() user: User,
  ) {
    const packageDetails = await this.lessonPackageService.getPackageDetails(packageId, user.id);
    
    if (packageDetails.progress.progressPercentage < 100) {
      throw new Error('Package must be completed to generate certificate');
    }

    // Generate certificate data
    const certificate = {
      certificateId: `CERT-${packageId}-${Date.now()}`,
      studentName: `${packageDetails.package.student.user.firstName} ${packageDetails.package.student.user.lastName}`,
      teacherName: `${packageDetails.package.teacher.user.firstName} ${packageDetails.package.teacher.user.lastName}`,
      packageType: packageDetails.package.packageType,
      totalLessons: packageDetails.package.totalLessons,
      completedLessons: packageDetails.progress.completedLessons,
      completionDate: new Date().toISOString(),
      attendanceRate: packageDetails.progress.attendanceRate,
      skillsAssessed: packageDetails.lessons
        .filter(l => l.feedback)
        .map(l => ({ lessonDate: l.scheduledAt, feedback: l.feedback })),
      certificateUrl: `${process.env.FRONTEND_URL}/certificates/${packageId}`,
    };

    return certificate;
  }

  // Helper methods for statistics calculation
  private calculateTimeStats(lessons: any[]) {
    const now = new Date();
    const hoursOfDay = new Array(24).fill(0);
    const daysOfWeek = new Array(7).fill(0);
    
    lessons.forEach(lesson => {
      const lessonDate = new Date(lesson.scheduledAt);
      hoursOfDay[lessonDate.getHours()]++;
      daysOfWeek[lessonDate.getDay()]++;
    });

    // Find peak hours and days
    const peakHour = hoursOfDay.indexOf(Math.max(...hoursOfDay));
    const peakDay = daysOfWeek.indexOf(Math.max(...daysOfWeek));

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      peakHour: `${peakHour}:00`,
      peakDay: dayNames[peakDay],
      hoursDistribution: hoursOfDay,
      daysDistribution: daysOfWeek,
    };
  }

  private generateRecommendations(packageDetails: any, progress: any): string[] {
    const recommendations = [];

    if (progress.attendanceRate < 80) {
      recommendations.push('Try to maintain consistent attendance for better learning outcomes');
    }

    if (progress.progressPercentage > 80) {
      recommendations.push('Great progress! Consider booking your next package for continued learning');
    }

    if (packageDetails.progress.daysUntilExpiry < 30) {
      recommendations.push('Your package expires soon. Schedule remaining lessons or consider renewal');
    }

    if (progress.skillProgress) {
      const weakestSkill = Object.entries(progress.skillProgress)
        .sort(([,a], [,b]) => (a as number) - (b as number))[0];
      
      if (weakestSkill && (weakestSkill[1] as number) < 70) {
        recommendations.push(`Focus on improving ${weakestSkill[0]} skills in upcoming lessons`);
      }
    }

    return recommendations;
  }
}
