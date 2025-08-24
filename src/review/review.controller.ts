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
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ReviewService } from './review.service';
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/role.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Role } from '../roles/role.enum';

@ApiTags('Reviews & Feedback')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a review for a teacher',
    description: 'Students can create reviews for teachers after completing lessons with them'
  })
  @ApiResponse({
    status: 201,
    description: 'Review created successfully',
    type: ReviewVm,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed or business rule violation',
  })
  @ApiResponse({
    status: 404,
    description: 'Teacher not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Student has already reviewed this teacher',
  })
  @Roles(Role.STUDENT)
  @UseGuards(RolesGuard)
  async create(
    @Body() createReviewDto: CreateReviewDto,
    @CurrentUser() user: any
  ): Promise<ReviewVm> {
    return this.reviewService.createReview(createReviewDto, user.id);
  }

  @Post('trial-lesson-feedback')
  @ApiOperation({ 
    summary: 'Submit detailed feedback for a trial lesson',
    description: 'Students can provide comprehensive feedback after completing a trial lesson'
  })
  @ApiResponse({
    status: 201,
    description: 'Trial lesson feedback submitted successfully',
    type: TrialLessonFeedbackVm,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid booking or lesson not completed',
  })
  @ApiResponse({
    status: 409,
    description: 'Feedback already submitted for this trial lesson',
  })
  @Roles(Role.STUDENT)
  @UseGuards(RolesGuard)
  async createTrialLessonFeedback(
    @Body() feedbackDto: CreateTrialLessonFeedbackDto,
    @CurrentUser() user: any
  ): Promise<TrialLessonFeedbackVm> {
    return this.reviewService.createTrialLessonFeedback(feedbackDto, user.id);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Search and filter reviews',
    description: 'Get reviews with optional filtering and pagination'
  })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully',
    type: ReviewSearchResultVm,
  })
  async findAll(@Query() searchDto: SearchReviewDto): Promise<ReviewSearchResultVm> {
    return this.reviewService.findAll(searchDto);
  }

  @Get('eligible-bookings')
  @ApiOperation({ 
    summary: 'Get bookings eligible for review',
    description: 'Get completed bookings that the student can review'
  })
  @ApiResponse({
    status: 200,
    description: 'Eligible bookings retrieved successfully',
  })
  @Roles(Role.STUDENT)
  @UseGuards(RolesGuard)
  async getEligibleBookings(@CurrentUser() user: any) {
    return this.reviewService.getEligibleBookingsForReview(user.id);
  }

  @Get('my-reviews')
  @ApiOperation({ 
    summary: 'Get current user\'s reviews',
    description: 'Students get their own reviews, teachers get reviews about them'
  })
  @ApiResponse({
    status: 200,
    description: 'User reviews retrieved successfully',
    type: [ReviewVm],
  })
  async getMyReviews(@CurrentUser() user: any, @Request() req: any): Promise<ReviewVm[]> {
    const userRole = req.user.role;
    
    if (userRole === Role.STUDENT) {
      return this.reviewService.findByStudent(user.id);
    } else if (userRole === Role.TEACHER) {
      // For teachers, get their teacher profile ID first
      // This would require a service call to get teacher ID from user ID
      // For now, assuming teacherId is available
      return this.reviewService.findByTeacher(user.teacherId);
    }
    
    return [];
  }

  @Get('teacher/:teacherId/stats')
  @ApiOperation({ 
    summary: 'Get teacher review statistics',
    description: 'Get comprehensive review stats for a teacher'
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher review stats retrieved successfully',
    type: TeacherReviewStatsVm,
  })
  @ApiResponse({
    status: 404,
    description: 'Teacher not found',
  })
  async getTeacherStats(@Param('teacherId') teacherId: string): Promise<TeacherReviewStatsVm> {
    return this.reviewService.getTeacherReviewStats(teacherId);
  }

  @Get('teacher/:teacherId')
  @ApiOperation({ 
    summary: 'Get reviews for a specific teacher',
    description: 'Get all reviews for a teacher with optional limit'
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of reviews to return' })
  @ApiResponse({
    status: 200,
    description: 'Teacher reviews retrieved successfully',
    type: [ReviewVm],
  })
  async getTeacherReviews(
    @Param('teacherId') teacherId: string,
    @Query('limit') limit?: number
  ): Promise<ReviewVm[]> {
    return this.reviewService.findByTeacher(teacherId, limit || 10);
  }

  @Get('can-review/:teacherId')
  @ApiOperation({ 
    summary: 'Check if student can review a teacher',
    description: 'Check if the current student is eligible to review a specific teacher'
  })
  @ApiResponse({
    status: 200,
    description: 'Review eligibility checked',
  })
  @Roles(Role.STUDENT)
  @UseGuards(RolesGuard)
  async canReviewTeacher(
    @Param('teacherId') teacherId: string,
    @CurrentUser() user: any
  ) {
    return this.reviewService.canStudentReviewTeacher(user.id, teacherId);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get a specific review',
    description: 'Get review details by ID'
  })
  @ApiResponse({
    status: 200,
    description: 'Review retrieved successfully',
    type: ReviewVm,
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Request() req: any
  ): Promise<ReviewVm> {
    return this.reviewService.findOne(id, user.id, req.user.role);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update a review',
    description: 'Students can update their own reviews'
  })
  @ApiResponse({
    status: 200,
    description: 'Review updated successfully',
    type: ReviewVm,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only update own reviews',
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  @Roles(Role.STUDENT, Role.ADMIN)
  @UseGuards(RolesGuard)
  async update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @CurrentUser() user: any,
    @Request() req: any
  ): Promise<ReviewVm> {
    return this.reviewService.update(id, updateReviewDto, user.id, req.user.role);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete a review',
    description: 'Students can delete their own reviews'
  })
  @ApiResponse({
    status: 200,
    description: 'Review deleted successfully',
    type: ReviewVm,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only delete own reviews',
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  @Roles(Role.STUDENT, Role.ADMIN)
  @UseGuards(RolesGuard)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Request() req: any
  ): Promise<ReviewVm> {
    return this.reviewService.remove(id, user.id, req.user.role);
  }

  @Post(':id/helpful')
  @ApiOperation({ 
    summary: 'Mark review as helpful',
    description: 'Mark a review as helpful (for future recommendation algorithms)'
  })
  @ApiResponse({
    status: 204,
    description: 'Review marked as helpful',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsHelpful(
    @Param('id') reviewId: string,
    @CurrentUser() user: any
  ): Promise<void> {
    return this.reviewService.markReviewAsHelpful(reviewId, user.id);
  }
}
