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

} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TeacherService } from './teacher.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { SearchTeacherDto } from './dto/search-teacher.dto';
import { CreateAvailabilityDto, UpdateAvailabilityDto } from './dto/availability.dto';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';
import { SetupTeacherProfileDto } from './dto/setup-profile.dto';
import { SubmitVerificationDto, VerificationStatusDto } from './dto/verification.dto';
import { 
  SetupAvailabilityAndRatesDto, 
  GoLiveRequestDto, 
  UpdateRateDto 
} from './dto/availability-rates.dto';
import { 
  BookingDecisionDto, 
  TeacherInterestResponseDto, 
  BookingOptionsResponseDto 
} from './dto/booking-decision.dto';
import {
  TeacherVm,
  TeacherAvailabilityVm,
  TeacherSearchResultVm,
  CourseVm,
  TeacherVerificationVm,
  ProfileSetupStatusVm,
  TeacherRateVm,
  AvailabilityAndRatesVm,
  TeacherOnboardingStatusVm,
} from './vm/teacher.vm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/role.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { TeacherStatus, Course } from '@prisma/client';
import { Role } from '../roles/role.enum';

@ApiTags('Teachers')
@Controller('teachers')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a teacher profile' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Teacher profile created successfully',
    type: TeacherVm,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Teacher profile already exists',
  })
  async create(@Body() createTeacherDto: CreateTeacherDto): Promise<TeacherVm> {
    return this.teacherService.create(createTeacherDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all approved teachers' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all approved teachers',
    type: [TeacherVm],
  })
  async findAll(): Promise<TeacherVm[]> {
    return this.teacherService.findAll();
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search teachers with comprehensive filters including regex-based specialty and certification matching' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results with pagination and enhanced teacher information',
    type: TeacherSearchResultVm,
  })
  async searchTeachers(@Query() searchDto: SearchTeacherDto): Promise<TeacherSearchResultVm> {
    return this.teacherService.search(searchDto);
  }

  @Get('filters/options')
  @Public()
  @ApiOperation({ summary: 'Get available filter options for teacher search' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Available filter options',
  })
  async getFilterOptions(): Promise<any> {
    const [specialties, languages, timezones] = await Promise.all([
      this.teacherService.getAvailableSpecialties(),
      this.teacherService.getAvailableLanguages(),
      this.teacherService.getAvailableTimezones(),
    ]);

    return {
      specialties,
      languages,
      timezones,
      experienceLevels: [
        { value: 1, label: '1+ years' },
        { value: 2, label: '2+ years' },
        { value: 3, label: '3+ years' },
        { value: 5, label: '5+ years' },
        { value: 10, label: '10+ years' },
      ],
      ratingLevels: [
        { value: 3, label: '3+ stars' },
        { value: 4, label: '4+ stars' },
        { value: 4.5, label: '4.5+ stars' },
      ],
      priceRanges: [
        { min: 0, max: 15, label: 'Under $15/hour' },
        { min: 15, max: 25, label: '$15-25/hour' },
        { min: 25, max: 40, label: '$25-40/hour' },
        { min: 40, max: 100, label: '$40+/hour' },
      ],
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current teacher profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current teacher profile',
    type: TeacherVm,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher profile not found',
  })
  async getMyProfile(@CurrentUser() user: any): Promise<TeacherVm> {
    return this.teacherService.findByUserId(user.id);
  }

  @Get('me/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current teacher statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher statistics',
  })
  async getMyStats(@CurrentUser() user: any): Promise<any> {
    const teacher = await this.teacherService.findByUserId(user.id);
    return this.teacherService.getTeacherStats(teacher.id);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ 
    summary: 'Get teacher profile by ID',
    description: 'Get detailed teacher information including basic profile, ratings, and public information'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher profile details',
    type: TeacherVm,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher not found',
  })
  async findOne(@Param('id') id: string): Promise<TeacherVm> {
    return this.teacherService.findOne(id);
  }

  @Get(':id/profile')
  @Public()
  @ApiOperation({ 
    summary: 'Get comprehensive teacher profile for detailed view',
    description: 'Get complete teacher profile with stats, availability overview, courses, and recent reviews'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comprehensive teacher profile with all details',
  })
  async getTeacherProfile(@Param('id') id: string): Promise<any> {
    const [teacher, stats, availability, courses, recentReviews] = await Promise.all([
      this.teacherService.findOne(id),
      this.teacherService.getTeacherStats(id),
      this.teacherService.getAvailabilities(id),
      this.teacherService.getTeacherCourses(id),
      this.teacherService.getTeacherRecentReviews(id, 5), // Get last 5 reviews
    ]);

    return {
      ...teacher,
      stats,
      availability: availability.filter(a => a.isActive),
      courses: courses.filter(c => c.isActive),
      recentReviews,
      totalReviews: stats.totalReviews || 0,
    };
  }

  @Get(':id/detailed')
  @Public()
  @ApiOperation({ 
    summary: 'Get teacher detailed information for booking flow',
    description: 'Get all teacher information needed for the booking process including availability slots, rates, and booking policies'
  })
  @ApiQuery({ 
    name: 'startDate', 
    required: false, 
    description: 'Start date for availability search (YYYY-MM-DD)',
    example: '2024-01-15'
  })
  @ApiQuery({ 
    name: 'endDate', 
    required: false, 
    description: 'End date for availability search (YYYY-MM-DD)', 
    example: '2024-01-22'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Detailed teacher information with booking data',
  })
  async getTeacherDetailedInfo(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const [teacher, stats, availableSlots, rates, courses] = await Promise.all([
      this.teacherService.findOne(id),
      this.teacherService.getTeacherStats(id),
      this.teacherService.getAvailableSlots(id, startDate, endDate),
      this.teacherService.getTeacherRates(id),
      this.teacherService.getTeacherCourses(id),
    ]);

    return {
      ...teacher,
      stats,
      availableSlots,
      rates: rates.filter(r => r.isActive),
      courses: courses.filter(c => c.isActive),
      bookingPolicies: {
        advanceNoticeHours: teacher.advanceNoticeHours,
        maxAdvanceBookingHours: teacher.maxAdvanceBookingHours,
        allowInstantBooking: teacher.allowInstantBooking,
        bookingInstructions: teacher.bookingInstructions,
      },
    };
  }

  @Get(':id/stats')
  @Public()
  @ApiOperation({ summary: 'Get teacher statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher statistics',
  })
  async getTeacherStats(@Param('id') id: string): Promise<any> {
    return this.teacherService.getTeacherStats(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update teacher profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher profile updated successfully',
    type: TeacherVm,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateTeacherDto: UpdateTeacherDto,
    @CurrentUser() user: any,
  ): Promise<TeacherVm> {
    // Check if user is updating their own profile or is admin
    if (user.role !== Role.ADMIN) {
      const teacher = await this.teacherService.findOne(id);
      if (teacher.id !== user.id) {
        throw new Error('You can only update your own profile');
      }
    }

    return this.teacherService.update(id, updateTeacherDto);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current teacher profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher profile updated successfully',
    type: TeacherVm,
  })
  async updateMyProfile(
    @Body() updateTeacherDto: UpdateTeacherDto,
    @CurrentUser() user: any,
  ): Promise<TeacherVm> {
    const teacher = await this.teacherService.findByUserId(user.id);
    return this.teacherService.update(teacher.id, updateTeacherDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update teacher status (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher status updated successfully',
    type: TeacherVm,
  })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: TeacherStatus,
  ): Promise<TeacherVm> {
    return this.teacherService.updateStatus(id, status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete teacher profile (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher profile deleted successfully',
    type: TeacherVm,
  })
  async remove(@Param('id') id: string): Promise<TeacherVm> {
    return this.teacherService.remove(id);
  }

  // Profile Setup and Verification Endpoints

  @Post('me/setup-profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup teacher profile after account creation' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Profile setup completed successfully',
    type: TeacherVm,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid profile data or profile already setup',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher profile not found',
  })
  async setupProfile(
    @Body() setupProfileDto: SetupTeacherProfileDto,
    @CurrentUser() user: any,
  ): Promise<TeacherVm> {
    return this.teacherService.setupProfile(user.id, setupProfileDto);
  }

  @Get('me/setup-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile setup and verification status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile setup status retrieved successfully',
    type: ProfileSetupStatusVm,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher profile not found',
  })
  async getSetupStatus(@CurrentUser() user: any): Promise<ProfileSetupStatusVm> {
    return this.teacherService.getProfileSetupStatus(user.id);
  }

  @Post('me/submit-verification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit verification documents' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Verification documents submitted successfully',
    type: TeacherVerificationVm,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Profile not completed or verification already submitted',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher profile not found',
  })
  async submitVerification(
    @Body() verificationDto: SubmitVerificationDto,
    @CurrentUser() user: any,
  ): Promise<TeacherVerificationVm> {
    return this.teacherService.submitVerification(user.id, verificationDto);
  }

  @Get('me/verification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get submitted verification documents' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification documents retrieved successfully',
    type: TeacherVerificationVm,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Verification documents not found',
  })
  async getVerification(@CurrentUser() user: any): Promise<TeacherVerificationVm> {
    return this.teacherService.getVerification(user.id);
  }

  @Post('me/resubmit-verification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resubmit verification documents after rejection' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Verification documents resubmitted successfully',
    type: TeacherVerificationVm,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Can only resubmit for rejected applications',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher profile not found',
  })
  async resubmitVerification(
    @Body() verificationDto: SubmitVerificationDto,
    @CurrentUser() user: any,
  ): Promise<TeacherVerificationVm> {
    return this.teacherService.resubmitVerification(user.id, verificationDto);
  }

  // Admin Verification Management

  @Get('pending-verifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all pending teacher verifications (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pending verifications retrieved successfully',
    type: [TeacherVerificationVm],
  })
  async getPendingVerifications(): Promise<TeacherVerificationVm[]> {
    return this.teacherService.getAllPendingVerifications();
  }

  @Patch(':id/review-verification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Review and approve/reject teacher verification (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification reviewed successfully',
    type: TeacherVm,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid status or no verification documents found',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher not found',
  })
  async reviewVerification(
    @Param('id') teacherId: string,
    @Body('status') status: TeacherStatus,
    @Body() reviewDto: VerificationStatusDto,
  ): Promise<TeacherVm> {
    return this.teacherService.reviewVerification(teacherId, status, reviewDto);
  }

  @Get(':id/verification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get teacher verification documents (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification documents retrieved successfully',
    type: TeacherVerificationVm,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher or verification documents not found',
  })
  async getTeacherVerification(@Param('id') teacherId: string): Promise<TeacherVerificationVm> {
    // Find teacher by ID to get userId
    const teacher = await this.teacherService.findOne(teacherId);
    return this.teacherService.getVerification(teacher.id);
  }

  // Availability and Rates Setup Endpoints

  @Post('me/setup-availability-rates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup availability schedule and lesson rates' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Availability and rates setup completed successfully',
    type: AvailabilityAndRatesVm,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid availability or rates data, or teacher not approved',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher profile not found',
  })
  async setupAvailabilityAndRates(
    @Body() setupDto: SetupAvailabilityAndRatesDto,
    @CurrentUser() user: any,
  ): Promise<AvailabilityAndRatesVm> {
    return this.teacherService.setupAvailabilityAndRates(user.id, setupDto);
  }

  @Get('me/availability-rates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current availability and rates setup' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Availability and rates retrieved successfully',
    type: AvailabilityAndRatesVm,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher profile not found',
  })
  async getAvailabilityAndRates(@CurrentUser() user: any): Promise<AvailabilityAndRatesVm> {
    return this.teacherService.getAvailabilityAndRates(user.id);
  }

  @Patch('me/rates/:rateId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a specific lesson rate' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rate updated successfully',
    type: TeacherRateVm,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Rate not found',
  })
  async updateRate(
    @Param('rateId') rateId: string,
    @Body() updateRateDto: UpdateRateDto,
    @CurrentUser() user: any,
  ): Promise<TeacherRateVm> {
    return this.teacherService.updateRate(user.id, rateId, updateRateDto);
  }

  @Get('me/onboarding-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get complete onboarding status with progress tracking' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Onboarding status retrieved successfully',
    type: TeacherOnboardingStatusVm,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher profile not found',
  })
  async getOnboardingStatus(@CurrentUser() user: any): Promise<TeacherOnboardingStatusVm> {
    return this.teacherService.getOnboardingStatus(user.id);
  }

  @Post('me/go-live')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Make teacher profile live and start accepting bookings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher profile is now live and accepting bookings',
    type: TeacherVm,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Teacher not ready to go live or missing requirements',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher profile not found',
  })
  async goLive(
    @Body() goLiveDto: GoLiveRequestDto,
    @CurrentUser() user: any,
  ): Promise<TeacherVm> {
    return this.teacherService.goLive(user.id, goLiveDto);
  }

  @Post('me/pause')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pause teacher profile and stop accepting new bookings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher profile paused successfully',
    type: TeacherVm,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Teacher is not currently live',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher profile not found',
  })
  async pauseProfile(@CurrentUser() user: any): Promise<TeacherVm> {
    return this.teacherService.pauseTeacher(user.id);
  }

  // Public endpoints for students to view live teachers

  @Get('browse')
  @Public()
  @ApiOperation({ 
    summary: 'Browse and search teachers with enhanced filters - Main teacher browsing endpoint',
    description: 'Primary endpoint for students to browse teachers with comprehensive filtering, sorting, and pagination'
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 12, max: 50)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in teacher name, bio, specialties, and certifications' })
  @ApiQuery({ name: 'specialties', required: false, description: 'Comma-separated specialties (supports partial matching)' })
  @ApiQuery({ name: 'certifications', required: false, description: 'Comma-separated certifications (supports partial matching)' })
  @ApiQuery({ name: 'languages', required: false, description: 'Comma-separated languages' })
  @ApiQuery({ name: 'minRating', required: false, description: 'Minimum rating (1-5)' })
  @ApiQuery({ name: 'maxHourlyRate', required: false, description: 'Maximum hourly rate' })
  @ApiQuery({ name: 'minHourlyRate', required: false, description: 'Minimum hourly rate' })
  @ApiQuery({ name: 'minExperience', required: false, description: 'Minimum years of experience' })
  @ApiQuery({ name: 'availability', required: false, description: 'Available on specific day (0-6, Sunday-Saturday)' })
  @ApiQuery({ name: 'timezone', required: false, description: 'Teacher timezone' })
  @ApiQuery({ name: 'hasTrialLesson', required: false, description: 'Offers trial lessons (true/false)' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort by: rating, experience, hourlyRate, totalLessons, responseTime, newest' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order: asc, desc (default: desc)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of teachers with enhanced information for browsing',
    type: TeacherSearchResultVm,
  })
  async browseTeachers(@Query() searchDto: SearchTeacherDto): Promise<TeacherSearchResultVm> {
    // Force only approved and live teachers for public browsing
    const browseDto = {
      ...searchDto,
      status: 'APPROVED' as any,
      onlyLive: true,
    };
    return this.teacherService.search(browseDto);
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Get all live teachers accepting bookings (simplified list)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of live teachers',
    type: [TeacherVm],
  })
  async getLiveTeachers(): Promise<TeacherVm[]> {
    return this.teacherService.findLiveTeachers();
  }

  @Get('featured')
  @Public()
  @ApiOperation({ 
    summary: 'Get featured teachers for homepage/landing page',
    description: 'Returns a curated list of top-rated, experienced teachers for showcasing'
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of featured teachers (default: 8, max: 20)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of featured teachers',
    type: [TeacherVm],
  })
  async getFeaturedTeachers(@Query('limit') limit?: string): Promise<TeacherVm[]> {
    const limitNum = Math.min(parseInt(limit) || 8, 20);
    return this.teacherService.getFeaturedTeachers(limitNum);
  }

  @Get(':id/interest-info')
  @Public()
  @ApiOperation({ 
    summary: 'Get teacher interest information for booking decision',
    description: 'Get comprehensive teacher information to help students decide whether to book a trial lesson or continue browsing'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher interest information with booking options',
    type: TeacherInterestResponseDto,
  })
  async getTeacherInterestInfo(
    @Param('id') teacherId: string,
    @Query('studentUserId') studentUserId?: string,
  ): Promise<TeacherInterestResponseDto> {
    return this.teacherService.getTeacherInterestInfo(teacherId, studentUserId);
  }

  @Get(':id/booking-options')
  @Public()
  @ApiOperation({ 
    summary: 'Get booking decision options for interested students',
    description: 'Provides clear action options for students interested in a teacher: book trial lesson, book regular lesson, or continue browsing'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking decision flow with available actions',
    type: BookingOptionsResponseDto,
  })
  async getBookingOptions(
    @Param('id') teacherId: string,
    @Query('studentUserId') studentUserId?: string,
  ): Promise<BookingOptionsResponseDto> {
    return this.teacherService.generateBookingOptions(teacherId, studentUserId);
  }

  @Post(':id/save')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Save teacher for later consideration',
    description: 'Allow students to save teachers they are interested in for future reference'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher saved successfully',
  })
  async saveTeacher(
    @Param('id') teacherId: string,
    @CurrentUser() user: any,
  ): Promise<{ message: string; teacherId: string }> {
    // For now, we'll just return a success message
    // In a full implementation, this would save to a favorites table
    const teacher = await this.teacherService.findOne(teacherId);
    
    return {
      message: `Teacher ${teacher.fullName} saved for later consideration`,
      teacherId,
    };
  }

  @Get('by-specialty/:specialty')
  @Public()
  @ApiOperation({ 
    summary: 'Get teachers by specialty',
    description: 'Get all teachers specializing in a specific area'
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of teachers to return (default: 20)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of teachers with the specified specialty',
    type: [TeacherVm],
  })
  async getTeachersBySpecialty(
    @Param('specialty') specialty: string,
    @Query('limit') limit?: string,
  ): Promise<TeacherVm[]> {
    const limitNum = parseInt(limit) || 20;
    return this.teacherService.findBySpecialty(specialty, limitNum);
  }

  @Get(':id/available-slots')
  @Public()
  @ApiOperation({ summary: 'Get available booking slots for a specific teacher' })
  @ApiQuery({ 
    name: 'startDate', 
    required: false, 
    description: 'Start date for availability search (YYYY-MM-DD)',
    example: '2024-01-15'
  })
  @ApiQuery({ 
    name: 'endDate', 
    required: false, 
    description: 'End date for availability search (YYYY-MM-DD)',
    example: '2024-01-22'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Available booking slots for the teacher',
  })
  async getAvailableSlots(
    @Param('id') teacherId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    return this.teacherService.getAvailableSlots(teacherId, startDate, endDate);
  }

  // Availability Management
  @Post(':id/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add teacher availability' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Availability added successfully',
    type: TeacherAvailabilityVm,
  })
  async addAvailability(
    @Param('id') teacherId: string,
    @Body() createAvailabilityDto: CreateAvailabilityDto,
    @CurrentUser() user: any,
  ): Promise<TeacherAvailabilityVm> {
    // Check if user is updating their own availability or is admin
    if (user.role !== Role.ADMIN) {
      const teacher = await this.teacherService.findOne(teacherId);
      if (teacher.id !== user.id) {
        throw new Error('You can only manage your own availability');
      }
    }

    return this.teacherService.addAvailability(teacherId, createAvailabilityDto);
  }

  @Post('me/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add current teacher availability' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Availability added successfully',
    type: TeacherAvailabilityVm,
  })
  async addMyAvailability(
    @Body() createAvailabilityDto: CreateAvailabilityDto,
    @CurrentUser() user: any,
  ): Promise<TeacherAvailabilityVm> {
    const teacher = await this.teacherService.findByUserId(user.id);
    return this.teacherService.addAvailability(teacher.id, createAvailabilityDto);
  }

  @Get(':id/availability')
  @Public()
  @ApiOperation({ summary: 'Get teacher availability' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher availability schedule',
    type: [TeacherAvailabilityVm],
  })
  async getAvailability(@Param('id') teacherId: string): Promise<TeacherAvailabilityVm[]> {
    return this.teacherService.getAvailabilities(teacherId);
  }

  @Get('me/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current teacher availability' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current teacher availability schedule',
    type: [TeacherAvailabilityVm],
  })
  async getMyAvailability(@CurrentUser() user: any): Promise<TeacherAvailabilityVm[]> {
    const teacher = await this.teacherService.findByUserId(user.id);
    return this.teacherService.getAvailabilities(teacher.id);
  }

  @Patch(':teacherId/availability/:availabilityId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update teacher availability' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Availability updated successfully',
    type: TeacherAvailabilityVm,
  })
  async updateAvailability(
    @Param('teacherId') teacherId: string,
    @Param('availabilityId') availabilityId: string,
    @Body() updateAvailabilityDto: UpdateAvailabilityDto,
    @CurrentUser() user: any,
  ): Promise<TeacherAvailabilityVm> {
    // Check if user is updating their own availability or is admin
    if (user.role !== Role.ADMIN) {
      const teacher = await this.teacherService.findOne(teacherId);
      if (teacher.id !== user.id) {
        throw new Error('You can only manage your own availability');
      }
    }

    return this.teacherService.updateAvailability(teacherId, availabilityId, updateAvailabilityDto);
  }

  @Delete(':teacherId/availability/:availabilityId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove teacher availability' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Availability removed successfully',
  })
  async removeAvailability(
    @Param('teacherId') teacherId: string,
    @Param('availabilityId') availabilityId: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    // Check if user is updating their own availability or is admin
    if (user.role !== Role.ADMIN) {
      const teacher = await this.teacherService.findOne(teacherId);
      if (teacher.id !== user.id) {
        throw new Error('You can only manage your own availability');
      }
    }

    return this.teacherService.removeAvailability(teacherId, availabilityId);
  }

  // Course Management
  @Post('me/courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Course created successfully',
    type: CourseVm,
  })
  async createCourse(
    @Body() createCourseDto: CreateCourseDto,
    @CurrentUser() user: any,
  ): Promise<Course> {
    const teacher = await this.teacherService.findByUserId(user.id);
    return this.teacherService.createCourse(teacher.id, createCourseDto);
  }

  @Get('me/courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current teacher courses' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of teacher courses',
    type: [CourseVm],
  })
  async getMyCourses(@CurrentUser() user: any): Promise<Course[]> {
    const teacher = await this.teacherService.findByUserId(user.id);
    return this.teacherService.getTeacherCourses(teacher.id);
  }

  @Get(':id/courses')
  @Public()
  @ApiOperation({ summary: 'Get teacher courses' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of teacher courses',
    type: [CourseVm],
  })
  async getTeacherCourses(@Param('id') teacherId: string): Promise<Course[]> {
    return this.teacherService.getTeacherCourses(teacherId);
  }

  @Patch('me/courses/:courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update course' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course updated successfully',
    type: CourseVm,
  })
  async updateCourse(
    @Param('courseId') courseId: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @CurrentUser() user: any,
  ): Promise<Course> {
    const teacher = await this.teacherService.findByUserId(user.id);
    return this.teacherService.updateCourse(teacher.id, courseId, updateCourseDto);
  }

  @Delete('me/courses/:courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete course' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course deleted successfully',
    type: CourseVm,
  })
  async deleteCourse(
    @Param('courseId') courseId: string,
    @CurrentUser() user: any,
  ): Promise<Course> {
    const teacher = await this.teacherService.findByUserId(user.id);
    return this.teacherService.deleteCourse(teacher.id, courseId);
  }
}
