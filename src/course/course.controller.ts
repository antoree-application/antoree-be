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
  Req,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CourseService } from './course.service';
import { 
  CreateCourseDto, 
  UpdateCourseDto, 
  SearchCourseDto, 
  BookCourseDto 
} from './dto';
import {
  CourseVm,
  CourseListVm,
  CourseDetailVm,
  PopularCourseVm,
  CourseAnalyticsVm,
} from './vm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/role.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Role } from '../roles/role.enum';
import { Public } from '../decorators/public.decorator';
import { ResponseMessage } from '../decorators/response-message.decorator';

@ApiTags('Courses')
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Create new course',
    description: 'Create a new course. Only approved teachers can create courses.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Course created successfully',
    type: CourseVm,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only approved teachers can create courses',
  })
  @ResponseMessage('Course created successfully')
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @CurrentUser() user: any,
  ): Promise<CourseVm> {
    return this.courseService.create(createCourseDto, user.id);
  }

  @Get()
  @Public()
  @ApiOperation({ 
    summary: 'Get all courses',
    description: 'Retrieve courses with pagination and filtering options',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Courses retrieved successfully',
    type: CourseListVm,
  })
  @ResponseMessage('Courses retrieved successfully')
  async findAll(@Query() searchDto: SearchCourseDto): Promise<CourseListVm> {
    return this.courseService.findAll(searchDto);
  }

  @Get('popular')
  @Public()
  @ApiOperation({ 
    summary: 'Get popular courses',
    description: 'Retrieve the most popular courses based on booking statistics',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of popular courses to return',
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Popular courses retrieved successfully',
    type: [PopularCourseVm],
  })
  @ResponseMessage('Popular courses retrieved successfully')
  async getPopularCourses(
    @Query('limit') limit?: number,
  ): Promise<PopularCourseVm[]> {
    return this.courseService.getPopularCourses(limit);
  }

  @Get('search')
  @Public()
  @ApiOperation({ 
    summary: 'Search courses',
    description: 'Search courses by name, description, or teacher specialties',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search query',
    example: 'business english',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of results to return',
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Courses found successfully',
    type: [CourseVm],
  })
  @ResponseMessage('Courses found successfully')
  async searchCourses(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ): Promise<CourseVm[]> {
    return this.courseService.searchCourses(query, limit);
  }

  @Get('teacher/:teacherId')
  @Public()
  @ApiOperation({ 
    summary: 'Get courses by teacher',
    description: 'Retrieve all courses created by a specific teacher',
  })
  @ApiParam({
    name: 'teacherId',
    type: String,
    description: 'Teacher ID',
    example: 'cm3teacher123def456',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher courses retrieved successfully',
    type: CourseListVm,
  })
  @ResponseMessage('Teacher courses retrieved successfully')
  async findByTeacher(
    @Param('teacherId') teacherId: string,
    @Query() searchDto: SearchCourseDto,
  ): Promise<CourseListVm> {
    return this.courseService.findByTeacher(teacherId, searchDto);
  }

  @Get('my-courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get teacher own courses',
    description: 'Retrieve courses created by the authenticated teacher',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Your courses retrieved successfully',
    type: CourseListVm,
  })
  @ResponseMessage('Your courses retrieved successfully')
  async findMyCourses(
    @CurrentUser() user: any,
    @Query() searchDto: SearchCourseDto,
  ): Promise<CourseListVm> {
    return this.courseService.findByTeacher(user.teacher.id, searchDto);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ 
    summary: 'Get course by ID',
    description: 'Retrieve detailed information about a specific course',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Course ID',
    example: 'cm3course123def456',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course retrieved successfully',
    type: CourseDetailVm,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ResponseMessage('Course retrieved successfully')
  async findOne(@Param('id') id: string): Promise<CourseDetailVm> {
    return this.courseService.findOne(id);
  }

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get course analytics',
    description: 'Retrieve analytics data for a specific course (teacher only)',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Course ID',
    example: 'cm3course123def456',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course analytics retrieved successfully',
    type: CourseAnalyticsVm,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You can only view analytics for your own courses',
  })
  @ResponseMessage('Course analytics retrieved successfully')
  async getCourseAnalytics(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<CourseAnalyticsVm> {
    return this.courseService.getCourseAnalytics(id, user.teacher.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update course',
    description: 'Update course details. Teachers can only update their own courses.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Course ID',
    example: 'cm3course123def456',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course updated successfully',
    type: CourseVm,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You can only update your own courses',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ResponseMessage('Course updated successfully')
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @CurrentUser() user: any,
  ): Promise<CourseVm> {
    return this.courseService.update(id, updateCourseDto, user.teacher.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Delete course',
    description: 'Soft delete a course. Teachers can only delete their own courses.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Course ID',
    example: 'cm3course123def456',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You can only delete your own courses',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete course with active bookings',
  })
  @ResponseMessage('Course deleted successfully')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    return this.courseService.remove(id, user.teacher.id);
  }
}
