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
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StudentService } from './student.service';
import { CreateStudentDto, UpdateStudentDto, SearchStudentDto } from './dto';
import { StudentVm, StudentListVm, StudentProfileVm } from './vm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/role.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { Role } from '../roles/role.enum';
import { Public } from '../decorators/public.decorator';
import { ResponseMessage } from '../decorators/response-message.decorator';
import { TeacherService } from '../teacher/teacher.service';
import { SearchTeacherDto } from '../teacher/dto/search-teacher.dto';
import { TeacherVm, TeacherSearchResultVm } from '../teacher/vm/teacher.vm';
import { PaymentService } from '../payment/payment.service';
import { TeacherPackagesVm } from '../payment/vm';

@ApiTags('Students')
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentController {
  constructor(
    private readonly studentService: StudentService,
    private readonly teacherService: TeacherService,
    private readonly paymentService: PaymentService,
  ) {}

  @Post()
  @Public()
  @ResponseMessage('Student created successfully')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createStudentDto: CreateStudentDto): Promise<StudentVm> {
    return this.studentService.create(createStudentDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ResponseMessage('Students retrieved successfully')
  async findAll(@Query() searchDto: SearchStudentDto): Promise<StudentListVm> {
    return this.studentService.findAll(searchDto);
  }

  @Get('profile')
  @Roles(Role.STUDENT)
  @ResponseMessage('Student profile retrieved successfully')
  async getProfile(@CurrentUser('sub') userId: string): Promise<StudentProfileVm> {
    return this.studentService.findOne(userId);
  }

  @Get('browse-teachers')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Browse and search available teachers' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of available teachers with enhanced information',
    type: TeacherSearchResultVm,
  })
  @ResponseMessage('Teachers retrieved successfully')
  async browseTeachers(@Query() searchDto: SearchTeacherDto): Promise<TeacherSearchResultVm> {
    // Force only live teachers for student browsing
    const studentSearchDto = {
      ...searchDto,
      onlyLive: true,
      status: 'APPROVED' as any,
    };
    return this.teacherService.search(studentSearchDto);
  }

  @Get('teachers/recommended')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get recommended teachers based on student profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of recommended teachers',
    type: [TeacherVm],
  })
  @ResponseMessage('Recommended teachers retrieved successfully')
  async getRecommendedTeachers(@CurrentUser('sub') userId: string): Promise<TeacherVm[]> {
    return this.studentService.getRecommendedTeachers(userId);
  }

  @Get('teachers/:teacherId')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get detailed teacher information' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher details with availability and reviews',
    type: TeacherVm,
  })
  @ResponseMessage('Teacher details retrieved successfully')
  async getTeacherDetails(@Param('teacherId') teacherId: string): Promise<any> {
    const teacher = await this.teacherService.findOne(teacherId);
    const availability = await this.teacherService.getAvailabilities(teacherId);
    const stats = await this.teacherService.getTeacherStats(teacherId);
    const courses = await this.teacherService.getTeacherCourses(teacherId);
    
    return {
      ...teacher,
      availability,
      stats,
      courses: courses.filter(course => course.isActive),
    };
  }

  @Get('teachers/:teacherId/available-slots')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get available booking slots for a teacher' })
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
  @ResponseMessage('Available slots retrieved successfully')
  async getTeacherAvailableSlots(
    @Param('teacherId') teacherId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    return this.teacherService.getAvailableSlots(teacherId, startDate, endDate);
  }

  @Get('teachers/specialties')
  @Public()
  @ApiOperation({ summary: 'Get all available teacher specialties' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all teacher specialties',
    type: [String],
  })
  @ResponseMessage('Specialties retrieved successfully')
  async getTeacherSpecialties(): Promise<string[]> {
    return this.studentService.getAvailableSpecialties();
  }

  @Get('teachers/languages')
  @Public()
  @ApiOperation({ summary: 'Get all available teacher languages' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all teacher languages',
    type: [String],
  })
  @ResponseMessage('Languages retrieved successfully')
  async getTeacherLanguages(): Promise<string[]> {
    return this.studentService.getAvailableLanguages();
  }

  @Get('teachers/:teacherId/packages')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get lesson packages for a specific teacher' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher lesson packages retrieved successfully',
    type: TeacherPackagesVm,
  })
  @ResponseMessage('Teacher lesson packages retrieved successfully')
  async getTeacherLessonPackages(
    @Param('teacherId') teacherId: string,
  ): Promise<any> {
    // TODO: Implement teacher packages functionality with MoMo payment
    return {
      teacherId,
      packages: [],
      message: 'Teacher packages functionality will be implemented soon'
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ResponseMessage('Student retrieved successfully')
  async findOne(@Param('id') id: string): Promise<StudentProfileVm> {
    return this.studentService.findOne(id);
  }

  @Get(':id/stats')
  @Roles(Role.ADMIN, Role.STUDENT)
  @ResponseMessage('Student statistics retrieved successfully')
  async getStudentStats(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    // Students can only view their own stats, admins can view any
    if (user.role === UserRole.STUDENT && user.sub !== id) {
      throw new Error('Forbidden: You can only view your own statistics');
    }
    return this.studentService.getStudentStats(id);
  }

  @Patch('profile')
  @Roles(Role.STUDENT)
  @ResponseMessage('Student profile updated successfully')
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() updateStudentDto: UpdateStudentDto,
  ): Promise<StudentVm> {
    return this.studentService.update(userId, updateStudentDto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ResponseMessage('Student updated successfully')
  async update(
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
  ): Promise<StudentVm> {
    return this.studentService.update(id, updateStudentDto);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN)
  @ResponseMessage('Student deactivated successfully')
  async deactivate(@Param('id') id: string): Promise<StudentVm> {
    return this.studentService.deactivate(id);
  }

  @Patch(':id/activate')
  @Roles(Role.ADMIN)
  @ResponseMessage('Student activated successfully')
  async activate(@Param('id') id: string): Promise<StudentVm> {
    return this.studentService.activate(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ResponseMessage('Student deleted successfully')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.studentService.remove(id);
  }
}
