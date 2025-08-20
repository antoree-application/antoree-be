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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TeacherService } from './teacher.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { SearchTeacherDto } from './dto/search-teacher.dto';
import { CreateAvailabilityDto, UpdateAvailabilityDto } from './dto/availability.dto';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';
import {
  TeacherVm,
  TeacherAvailabilityVm,
  TeacherSearchResultVm,
  CourseVm,
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
  @ApiOperation({ summary: 'Search teachers with filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results with pagination',
    type: TeacherSearchResultVm,
  })
  async searchTeachers(@Query() searchDto: SearchTeacherDto): Promise<TeacherSearchResultVm> {
    return this.teacherService.search(searchDto);
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
    return this.teacherService.findByUserId(user.sub);
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
    const teacher = await this.teacherService.findByUserId(user.sub);
    return this.teacherService.getTeacherStats(teacher.id);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get teacher by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher details',
    type: TeacherVm,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TeacherVm> {
    return this.teacherService.findOne(id);
  }

  @Get(':id/stats')
  @Public()
  @ApiOperation({ summary: 'Get teacher statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher statistics',
  })
  async getTeacherStats(@Param('id', ParseUUIDPipe) id: string): Promise<any> {
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
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTeacherDto: UpdateTeacherDto,
    @CurrentUser() user: any,
  ): Promise<TeacherVm> {
    // Check if user is updating their own profile or is admin
    if (user.role !== Role.ADMIN) {
      const teacher = await this.teacherService.findOne(id);
      if (teacher.userId !== user.sub) {
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
    const teacher = await this.teacherService.findByUserId(user.sub);
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
    @Param('id', ParseUUIDPipe) id: string,
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
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<TeacherVm> {
    return this.teacherService.remove(id);
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
    @Param('id', ParseUUIDPipe) teacherId: string,
    @Body() createAvailabilityDto: CreateAvailabilityDto,
    @CurrentUser() user: any,
  ): Promise<TeacherAvailabilityVm> {
    // Check if user is updating their own availability or is admin
    if (user.role !== Role.ADMIN) {
      const teacher = await this.teacherService.findOne(teacherId);
      if (teacher.userId !== user.sub) {
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
    const teacher = await this.teacherService.findByUserId(user.sub);
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
  async getAvailability(@Param('id', ParseUUIDPipe) teacherId: string): Promise<TeacherAvailabilityVm[]> {
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
    const teacher = await this.teacherService.findByUserId(user.sub);
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
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
    @Param('availabilityId', ParseUUIDPipe) availabilityId: string,
    @Body() updateAvailabilityDto: UpdateAvailabilityDto,
    @CurrentUser() user: any,
  ): Promise<TeacherAvailabilityVm> {
    // Check if user is updating their own availability or is admin
    if (user.role !== Role.ADMIN) {
      const teacher = await this.teacherService.findOne(teacherId);
      if (teacher.userId !== user.sub) {
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
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
    @Param('availabilityId', ParseUUIDPipe) availabilityId: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    // Check if user is updating their own availability or is admin
    if (user.role !== Role.ADMIN) {
      const teacher = await this.teacherService.findOne(teacherId);
      if (teacher.userId !== user.sub) {
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
    const teacher = await this.teacherService.findByUserId(user.sub);
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
    const teacher = await this.teacherService.findByUserId(user.sub);
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
  async getTeacherCourses(@Param('id', ParseUUIDPipe) teacherId: string): Promise<Course[]> {
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
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @CurrentUser() user: any,
  ): Promise<Course> {
    const teacher = await this.teacherService.findByUserId(user.sub);
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
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() user: any,
  ): Promise<Course> {
    const teacher = await this.teacherService.findByUserId(user.sub);
    return this.teacherService.deleteCourse(teacher.id, courseId);
  }
}
