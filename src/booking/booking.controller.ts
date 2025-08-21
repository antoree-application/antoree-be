import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { TrialLessonFlowService } from './trial-lesson-flow.service';
import { CreateBookingDto, BookTrialLessonDto, BookCourseDto } from './dto/create-booking.dto';
import { UpdateBookingDto, RescheduleBookingDto } from './dto/update-booking.dto';
import { SearchBookingDto, GetAvailableTimesDto } from './dto/search-booking.dto';
import { BookLessonPackageDto, ScheduleLessonFromPackageDto } from './dto/lesson-package.dto';
import {
  CreateBookingWithDetailsDto,
  ConfirmBookingDto,
  GetAvailableSlotsDto,
  BookingNotificationDto,
  TeacherBookingActionDto,
} from './dto/booking-flow.dto';
import {
  RequestTrialLessonDto,
  TeacherTrialResponseDto,
  JoinTrialLessonDto,
  CompleteTrialLessonDto,
  GenerateMeetingLinkDto,
} from './dto/trial-lesson-flow.dto';
import {
  BookingVm,
  BookingSearchResultVm,
  TeacherAvailabilityVm,
  BookingStatsVm,
} from './vm/booking.vm';
import {
  TeacherAvailabilitySlotsVm,
  BookingRequestVm,
  BookingConfirmationVm,
  TeacherNotificationVm,
  BookingActionResponseVm,
  BookingFlowStatusVm,
} from './vm/booking-flow.vm';
import {
  LessonPackageVm,
  StudentLessonPackagesVm,
  LessonPackageBookingVm,
  PackageUsageStatsVm,
} from './vm/lesson-package.vm';
import {
  TrialLessonRequestVm,
  TrialLessonResponseVm,
  VideoCallSessionVm,
  TrialLessonCompletionVm,
  NotificationVm,
} from './vm/trial-lesson-flow.vm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/role.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { Role } from '../roles/role.enum';
import { BookingStatus } from '@prisma/client';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly trialLessonFlowService: TrialLessonFlowService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Booking created successfully',
    type: BookingVm,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid booking data or teacher not available',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Time slot conflict',
  })
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @CurrentUser() user: any,
  ): Promise<BookingVm> {
    // Get student ID from user
    const student = await this.getStudentByUserId(user.id);
    return this.bookingService.create(createBookingDto, student.id);
  }

  @Post('trial')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Book a trial lesson' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Trial lesson booked successfully',
    type: BookingVm,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Student already had a trial with this teacher',
  })
  async bookTrialLesson(
    @Body() bookTrialDto: BookTrialLessonDto,
    @CurrentUser() user: any,
  ): Promise<BookingVm> {
    const student = await this.getStudentByUserId(user.id);
    return this.bookingService.bookTrialLesson(bookTrialDto, student.id);
  }

  @Post('course')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Book a course' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Course booked successfully',
    type: BookingVm,
  })
  async bookCourse(
    @Body() bookCourseDto: BookCourseDto,
    @CurrentUser() user: any,
  ): Promise<BookingVm> {
    const student = await this.getStudentByUserId(user.id);
    return this.bookingService.bookCourse(bookCourseDto, student.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all bookings (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all bookings',
    type: [BookingVm],
  })
  async findAll(): Promise<BookingVm[]> {
    return this.bookingService.findAll();
  }

  @Get('search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search bookings with filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results with pagination',
    type: BookingSearchResultVm,
  })
  async search(@Query() searchDto: SearchBookingDto): Promise<BookingSearchResultVm> {
    return this.bookingService.search(searchDto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user bookings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of user bookings',
    type: [BookingVm],
  })
  async getMyBookings(@CurrentUser() user: any): Promise<BookingVm[]> {
    if (user.role === Role.STUDENT) {
      const student = await this.getStudentByUserId(user.id);
      return this.bookingService.findByStudent(student.id);
    } else if (user.role === Role.TEACHER) {
      const teacher = await this.getTeacherByUserId(user.id);
      return this.bookingService.findByTeacher(teacher.id);
    }
    return [];
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get booking statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking statistics',
    type: BookingStatsVm,
  })
  async getStats(@CurrentUser() user: any): Promise<BookingStatsVm> {
    return this.bookingService.getBookingStats(user.id, user.role);
  }

  @Get('awaiting-feedback')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get trial lessons awaiting feedback',
    description: 'Get completed trial lessons that the student can provide feedback for'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trial lessons awaiting feedback',
  })
  async getTrialLessonsAwaitingFeedback(@CurrentUser() user: any) {
    const student = await this.getStudentByUserId(user.id);
    return this.bookingService.getCompletedTrialLessonsAwaitingFeedback(student.id);
  }

  @Get('availability/:teacherId')
  @Public()
  @ApiOperation({ summary: 'Get teacher availability' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher availability',
    type: TeacherAvailabilityVm,
  })
  async getTeacherAvailability(
    @Param('teacherId') teacherId: string,
    @Query() query: GetAvailableTimesDto,
  ): Promise<TeacherAvailabilityVm> {
    return this.bookingService.getTeacherAvailability(
      teacherId,
      query.daysAhead || 7,
      query.duration || 60
    );
  }

  @Get('student/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get bookings by student ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student bookings',
    type: [BookingVm],
  })
  async findByStudent(@Param('studentId') studentId: string): Promise<BookingVm[]> {
    return this.bookingService.findByStudent(studentId);
  }

  @Get('teacher/:teacherId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get bookings by teacher ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher bookings',
    type: [BookingVm],
  })
  async findByTeacher(@Param('teacherId') teacherId: string): Promise<BookingVm[]> {
    return this.bookingService.findByTeacher(teacherId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking details',
    type: BookingVm,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<BookingVm> {
    return this.bookingService.findOne(id, user.id, user.role);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update booking' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking updated successfully',
    type: BookingVm,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid update data or status transition',
  })
  async update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @CurrentUser() user: any,
  ): Promise<BookingVm> {
    return this.bookingService.update(id, updateBookingDto, user.id, user.role);
  }

  @Patch(':id/reschedule')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reschedule booking' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking rescheduled successfully',
    type: BookingVm,
  })
  async reschedule(
    @Param('id') id: string,
    @Body() rescheduleDto: RescheduleBookingDto,
    @CurrentUser() user: any,
  ): Promise<BookingVm> {
    return this.bookingService.reschedule(id, rescheduleDto, user.id, user.role);
  }

  @Patch(':id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm booking' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking confirmed successfully',
    type: BookingVm,
  })
  async confirm(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<BookingVm> {
    return this.bookingService.confirm(id, user.id, user.role);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel booking' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking cancelled successfully',
    type: BookingVm,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot cancel this booking',
  })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ): Promise<BookingVm> {
    return this.bookingService.cancel(id, reason, user.id, user.role);
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark booking as completed' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking marked as completed',
    type: BookingVm,
  })
  async complete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<BookingVm> {
    return this.bookingService.complete(id, user.id, user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete booking (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking deleted successfully',
    type: BookingVm,
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<BookingVm> {
    return this.bookingService.remove(id, user.id, user.role);
  }

  // Helper methods
  private async getStudentByUserId(userId: string) {
    // This would typically use a shared service or be injected
    // For now, we'll implement it directly
    const student = await this.bookingService['prisma'].student.findUnique({
      where: { id: userId },
    });
    
    if (!student) {
      throw new Error('Student profile not found');
    }
    
    return student;
  }

  private async getTeacherByUserId(userId: string) {
    const teacher = await this.bookingService['prisma'].teacher.findUnique({
      where: { id: userId },
    });
    
    if (!teacher) {
      throw new Error('Teacher profile not found');
    }
    
    return teacher;
  }

  private bookingVmToTrialLessonVm(booking: BookingVm): TrialLessonRequestVm {
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
        hourlyRate: booking.teacher.hourlyRate,
      },
      scheduledAt: booking.scheduledAt.toString(),
      duration: booking.duration,
      status: booking.status,
      notes: booking.notes,
      createdAt: booking.createdAt.toString(),
      updatedAt: booking.updatedAt.toString(),
    };
  }

  // === BOOKING FLOW ENDPOINTS ===

  @Get('flow/available-slots/:teacherId')
  @Public()
  @ApiOperation({ 
    summary: 'Step 1: Get available time slots for a teacher',
    description: 'Get comprehensive available time slots for booking with a specific teacher, including pricing and preferences'
  })
  @ApiQuery({ 
    name: 'startDate', 
    required: false, 
    description: 'Start date for availability search (YYYY-MM-DD)',
    example: '2024-02-15'
  })
  @ApiQuery({ 
    name: 'endDate', 
    required: false, 
    description: 'End date for availability search (YYYY-MM-DD)',
    example: '2024-02-22'
  })
  @ApiQuery({ 
    name: 'duration', 
    required: false, 
    description: 'Lesson duration in minutes',
    example: 30
  })
  @ApiQuery({ 
    name: 'timezone', 
    required: false, 
    description: 'Student timezone for slot display',
    example: 'Asia/Ho_Chi_Minh'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Available time slots with booking policies and pricing',
    type: TeacherAvailabilitySlotsVm,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher not found or not available for booking',
  })
  async getAvailableTimeSlots(
    @Param('teacherId') teacherId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('duration') duration?: string,
    @Query('timezone') timezone?: string,
  ): Promise<TeacherAvailabilitySlotsVm> {
    const durationNum = duration ? parseInt(duration) : 30;
    return this.bookingService.getAvailableTimeSlotsForBooking(
      teacherId, 
      startDate, 
      endDate, 
      durationNum, 
      timezone
    );
  }

  @Post('flow/create-with-details')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Step 2: Create booking with student details and learning goals',
    description: 'Create a comprehensive booking request including contact info, learning goals, and selected time slot'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Booking request created successfully and teacher notified',
    type: BookingRequestVm,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid booking data or time slot no longer available',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Time slot conflict or teacher not available',
  })
  async createBookingWithDetails(
    @Body() createBookingDto: CreateBookingWithDetailsDto,
    @CurrentUser() user: any,
  ): Promise<BookingRequestVm> {
    const student = await this.getStudentByUserId(user.id);
    return this.bookingService.createBookingWithDetails(createBookingDto, student.id, user.id);
  }

  @Post('flow/confirm/:bookingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Step 3: Confirm booking after review',
    description: 'Final confirmation of booking details and acceptance of terms'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking confirmed successfully',
    type: BookingConfirmationVm,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Booking cannot be confirmed in current state',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  async confirmBooking(
    @Param('bookingId') bookingId: string,
    @Body() confirmDto: ConfirmBookingDto,
    @CurrentUser() user: any,
  ): Promise<BookingConfirmationVm> {
    return this.bookingService.confirmBooking(bookingId, confirmDto, user.id);
  }

  @Get('flow/status/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get booking flow status',
    description: 'Get current status and available actions for a booking in progress'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking flow status retrieved successfully',
    type: BookingFlowStatusVm,
  })
  async getBookingFlowStatus(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: any,
  ): Promise<BookingFlowStatusVm> {
    return this.bookingService.getBookingFlowStatus(bookingId, user.id, user.role);
  }

  // === TEACHER NOTIFICATION ENDPOINTS ===

  @Get('teacher/notifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get teacher booking notifications',
    description: 'Get all pending booking requests and notifications for the teacher'
  })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    description: 'Filter by notification status',
    example: 'unread'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    description: 'Number of notifications to return',
    example: 20
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher notifications retrieved successfully',
    type: [TeacherNotificationVm],
  })
  async getTeacherNotifications(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ): Promise<TeacherNotificationVm[]> {
    const teacher = await this.getTeacherByUserId(user.id);
    const limitNum = limit ? parseInt(limit) : 20;
    return this.bookingService.getTeacherNotifications(teacher.id, status, limitNum);
  }

  @Get('teacher/pending-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get pending booking requests for teacher',
    description: 'Get all booking requests waiting for teacher response'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pending booking requests retrieved successfully',
    type: [BookingRequestVm],
  })
  async getPendingBookingRequests(
    @CurrentUser() user: any,
  ): Promise<BookingRequestVm[]> {
    const teacher = await this.getTeacherByUserId(user.id);
    return this.bookingService.getPendingBookingRequests(teacher.id);
  }

  @Post('teacher/respond/:bookingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Teacher responds to booking request',
    description: 'Teacher can accept, decline, or request reschedule for a booking request'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking response processed successfully',
    type: BookingActionResponseVm,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid action or booking cannot be responded to',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  async respondToBookingRequest(
    @Param('bookingId') bookingId: string,
    @Body() actionDto: TeacherBookingActionDto,
    @CurrentUser() user: any,
  ): Promise<BookingActionResponseVm> {
    const teacher = await this.getTeacherByUserId(user.id);
    return this.bookingService.respondToBookingRequest(bookingId, actionDto, teacher.id);
  }

  @Patch('teacher/notifications/:notificationId/read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Mark notification as read',
    description: 'Mark a specific notification as read by the teacher'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification marked as read',
  })
  async markNotificationAsRead(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: any,
  ): Promise<{ success: boolean }> {
    const teacher = await this.getTeacherByUserId(user.id);
    await this.bookingService.markNotificationAsRead(notificationId, teacher.id);
    return { success: true };
  }

  @Get('teacher/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get teacher booking dashboard',
    description: 'Get comprehensive overview of teacher bookings, requests, and schedule'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher dashboard data retrieved successfully',
  })
  async getTeacherBookingDashboard(
    @CurrentUser() user: any,
  ): Promise<any> {
    const teacher = await this.getTeacherByUserId(user.id);
    return this.bookingService.getTeacherBookingDashboard(teacher.id);
  }

  // === STUDENT BOOKING FLOW ENDPOINTS ===

  @Get('student/my-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get student booking requests',
    description: 'Get all booking requests made by the student with current status'
  })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    description: 'Filter by booking status',
    example: 'PENDING'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student booking requests retrieved successfully',
    type: [BookingRequestVm],
  })
  async getStudentBookingRequests(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ): Promise<BookingRequestVm[]> {
    const student = await this.getStudentByUserId(user.id);
    return this.bookingService.getStudentBookingRequests(student.id, status);
  }

  @Get('student/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get student booking dashboard',
    description: 'Get comprehensive overview of student bookings, upcoming lessons, and recommendations'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student dashboard data retrieved successfully',
  })
  async getStudentBookingDashboard(
    @CurrentUser() user: any,
  ): Promise<any> {
    const student = await this.getStudentByUserId(user.id);
    return this.bookingService.getStudentBookingDashboard(student.id);
  }

  // === TRIAL LESSON FLOW ENDPOINTS ===

  @Post('trial/request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Step 1: Student requests trial lesson',
    description: 'Student submits a trial lesson request to a teacher'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Trial lesson request created successfully and teacher notified',
    type: TrialLessonRequestVm,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request data or teacher not available',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Student already had a trial with this teacher or time conflict',
  })
  async requestTrialLesson(
    @Body() requestDto: RequestTrialLessonDto,
    @CurrentUser() user: any,
  ): Promise<TrialLessonRequestVm> {
    const student = await this.getStudentByUserId(user.id);
    return this.trialLessonFlowService.requestTrialLesson(requestDto, student.id, user.id);
  }

  @Post('trial/respond/:bookingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Step 2: Teacher responds to trial lesson request',
    description: 'Teacher accepts or declines the trial lesson request'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trial lesson response processed successfully',
    type: TrialLessonResponseVm,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid response or booking cannot be responded to',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Trial lesson booking not found',
  })
  async teacherRespondToTrial(
    @Param('bookingId') bookingId: string,
    @Body() responseDto: TeacherTrialResponseDto,
    @CurrentUser() user: any,
  ): Promise<TrialLessonResponseVm> {
    const teacher = await this.getTeacherByUserId(user.id);
    return this.trialLessonFlowService.teacherRespondToTrial(bookingId, responseDto, teacher.id);
  }

  @Post('trial/generate-meeting/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Step 3: Generate meeting link for trial lesson',
    description: 'Generate or retrieve video meeting link for confirmed trial lesson'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Meeting link generated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Meeting link can only be generated for confirmed bookings',
  })
  async generateTrialMeetingLink(
    @Param('bookingId') bookingId: string,
    @Body() generateDto: GenerateMeetingLinkDto,
    @CurrentUser() user: any,
  ): Promise<{ meetingUrl: string; roomId: string }> {
    // Set bookingId in DTO
    generateDto.bookingId = bookingId;
    return this.trialLessonFlowService.generateMeetingLink(generateDto, user.id, user.role);
  }

  @Post('trial/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Step 4: Join trial lesson video call',
    description: 'Join the video call for confirmed trial lesson'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Video call session details retrieved successfully',
    type: VideoCallSessionVm,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot join lesson at this time or lesson not confirmed',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Trial lesson booking not found',
  })
  async joinTrialLesson(
    @Body() joinDto: JoinTrialLessonDto,
    @CurrentUser() user: any,
  ): Promise<VideoCallSessionVm> {
    return this.trialLessonFlowService.joinTrialLesson(joinDto, user.id, user.role);
  }

  @Post('trial/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Step 5: Complete trial lesson',
    description: 'Teacher marks trial lesson as completed with feedback'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trial lesson completed successfully',
    type: TrialLessonCompletionVm,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Trial lesson cannot be completed in current state',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only teacher can complete the lesson',
  })
  async completeTrialLesson(
    @Body() completeDto: CompleteTrialLessonDto,
    @CurrentUser() user: any,
  ): Promise<TrialLessonCompletionVm> {
    return this.trialLessonFlowService.completeTrialLesson(completeDto, user.id, user.role);
  }

  @Get('trial/notifications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get trial lesson notifications',
    description: 'Get all trial lesson related notifications for the current user'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    description: 'Number of notifications to return',
    example: 20
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trial lesson notifications retrieved successfully',
    type: [NotificationVm],
  })
  async getTrialLessonNotifications(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ): Promise<NotificationVm[]> {
    const limitNum = limit ? parseInt(limit) : 20;
    return this.trialLessonFlowService.getTrialLessonNotifications(user.id, user.role, limitNum);
  }

  @Get('trial/:bookingId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get trial lesson status',
    description: 'Get current status and details of a trial lesson booking'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trial lesson status retrieved successfully',
    type: TrialLessonRequestVm,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Trial lesson booking not found',
  })
  async getTrialLessonStatus(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: any,
  ): Promise<TrialLessonRequestVm> {
    // Use existing findOne method but ensure it's a trial lesson
    const booking = await this.bookingService.findOne(bookingId, user.id, user.role);
    
    if (!booking.isTrialLesson) {
      throw new BadRequestException('This is not a trial lesson booking');
    }

    // Convert to trial lesson format
    return this.bookingVmToTrialLessonVm(booking);
  }

  @Get('trial/my-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get student trial lesson requests',
    description: 'Get all trial lesson requests made by the student'
  })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    description: 'Filter by booking status',
    example: 'PENDING'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student trial lesson requests retrieved successfully',
    type: [TrialLessonRequestVm],
  })
  async getStudentTrialRequests(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ): Promise<TrialLessonRequestVm[]> {
    const student = await this.getStudentByUserId(user.id);
    const bookings = await this.bookingService.findByStudent(student.id);
    
    // Filter for trial lessons only
    const trialBookings = bookings.filter(booking => booking.isTrialLesson);
    
    // Apply status filter if provided
    const filteredBookings = status 
      ? trialBookings.filter(booking => booking.status === status)
      : trialBookings;

    // Convert to trial lesson format
    return filteredBookings.map(booking => this.bookingVmToTrialLessonVm(booking));
  }

  @Get('trial/teacher/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get pending trial lesson requests for teacher',
    description: 'Get all pending trial lesson requests waiting for teacher response'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pending trial lesson requests retrieved successfully',
    type: [TrialLessonRequestVm],
  })
  async getTeacherPendingTrialRequests(
    @CurrentUser() user: any,
  ): Promise<TrialLessonRequestVm[]> {
    const teacher = await this.getTeacherByUserId(user.id);
    const bookings = await this.bookingService.findByTeacher(teacher.id);
    
    // Filter for pending trial lessons only
    const pendingTrials = bookings.filter(booking => 
      booking.isTrialLesson && booking.status === BookingStatus.PENDING
    );

    // Convert to trial lesson format
    return pendingTrials.map(booking => this.bookingVmToTrialLessonVm(booking));
  }

  // === LESSON PACKAGE ENDPOINTS ===

  @Get('packages/student')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get student lesson packages',
    description: 'Get all lesson packages purchased by the current student'
  })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    description: 'Filter by package status (active, expired)',
    example: 'active'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student lesson packages retrieved successfully',
    type: StudentLessonPackagesVm,
  })
  async getStudentLessonPackages(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ): Promise<StudentLessonPackagesVm> {
    // This method would need to be implemented in the booking service
    // For now, return a placeholder response
    return {
      packages: [],
      summary: {
        totalPackages: 0,
        activePackages: 0,
        totalLessonsRemaining: 0,
        totalValueRemaining: '0',
        expiringPackages: 0,
      },
    };
  }

  @Post('packages/:packageId/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Schedule lesson from package',
    description: 'Schedule a lesson using credits from a purchased lesson package'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Lesson scheduled successfully from package',
    type: LessonPackageBookingVm,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Package has no remaining lessons or is expired',
  })
  async scheduleLessonFromPackage(
    @Param('packageId') packageId: string,
    @Body() scheduleDto: ScheduleLessonFromPackageDto,
    @CurrentUser() user: any,
  ): Promise<LessonPackageBookingVm> {
    // This method would need to be implemented in the booking service
    // For now, return a placeholder response
    throw new BadRequestException('Lesson package scheduling not yet implemented');
  }

  @Get('packages/:packageId/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get package usage statistics',
    description: 'Get detailed usage statistics for a specific lesson package'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Package usage statistics retrieved successfully',
    type: PackageUsageStatsVm,
  })
  async getPackageUsageStats(
    @Param('packageId') packageId: string,
    @CurrentUser() user: any,
  ): Promise<PackageUsageStatsVm> {
    // This method would need to be implemented in the booking service
    // For now, return a placeholder response
    return {
      packageId,
      stats: {
        totalLessons: 0,
        completedLessons: 0,
        scheduledLessons: 0,
        cancelledLessons: 0,
        usagePercentage: 0,
        daysUntilExpiry: 0,
      },
      recentLessons: [],
      upcomingLessons: [],
    };
  }
}
