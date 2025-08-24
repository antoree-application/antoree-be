import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EnrollmentService } from './enrollment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/role.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ResponseMessage } from '../decorators/response-message.decorator';
import { Role } from '../roles/role.enum';
import { EnrollmentStatus } from '@prisma/client';

@ApiTags('Enrollments')
@Controller('enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get('student/:studentId')
  @Roles(Role.STUDENT, Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get student enrollments' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student enrollments retrieved successfully',
  })
  @ResponseMessage('Student enrollments retrieved successfully')
  async getStudentEnrollments(
    @Param('studentId') studentId: string,
    @Query('status') status?: EnrollmentStatus,
    @CurrentUser() user?: any,
  ) {
    // Students can only see their own enrollments, unless admin/teacher
    if (user.role === Role.STUDENT && user.student?.id !== studentId) {
      throw new Error('Access denied');
    }

    return this.enrollmentService.getStudentEnrollments(studentId, status);
  }

  @Get('teacher/:teacherId')
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Get teacher course enrollments' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher course enrollments retrieved successfully',
  })
  @ResponseMessage('Teacher course enrollments retrieved successfully')
  async getTeacherEnrollments(
    @Param('teacherId') teacherId: string,
    @Query('courseId') courseId?: string,
    @Query('status') status?: EnrollmentStatus,
    @CurrentUser() user?: any,
  ) {
    // Teachers can only see their own course enrollments, unless admin
    if (user.role === Role.TEACHER && user.teacher?.id !== teacherId) {
      throw new Error('Access denied');
    }

    return this.enrollmentService.getCourseEnrollmentsForTeacher(teacherId, courseId, status);
  }

  @Get('stats')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get enrollment statistics (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Enrollment statistics retrieved successfully',
  })
  @ResponseMessage('Enrollment statistics retrieved successfully')
  async getEnrollmentStats(
    @Query('courseId') courseId?: string,
    @Query('teacherId') teacherId?: string,
  ) {
    return this.enrollmentService.getEnrollmentStats(courseId, teacherId);
  }

  @Get(':id')
  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Get enrollment by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Enrollment retrieved successfully',
  })
  @ResponseMessage('Enrollment retrieved successfully')
  async getEnrollmentById(@Param('id') id: string) {
    return this.enrollmentService.getEnrollmentById(id);
  }

  @Get('payment/:paymentId')
  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Get enrollment by payment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Enrollment found successfully',
  })
  @ResponseMessage('Enrollment found successfully')
  async getEnrollmentByPayment(
    @Param('paymentId') paymentId: string,
  ) {
    const enrollment = await this.enrollmentService.getEnrollmentByPaymentId(paymentId);
    
    if (!enrollment) {
      throw new Error('Enrollment not found for this payment');
    }
    
    return enrollment;
  }

  @Get('analytics/overview')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get enrollment analytics overview (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics retrieved successfully',
  })
  @ResponseMessage('Analytics retrieved successfully')
  async getAnalyticsOverview() {
    return this.enrollmentService.getEnrollmentAnalytics();
  }
}
