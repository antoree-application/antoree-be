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
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { LessonService } from './lesson.service';
import {
  CreateLessonDto,
  CreateLessonFromTemplateDto,
  BulkCreateLessonsDto,
  UpdateLessonDto,
  UpdateLessonNotesDto,
  RescheduleLessonDto,
  SearchLessonDto,
  GetTeacherLessonsDto,
  GetCourseLessonsDto,
} from './dto';
import {
  LessonVm,
  LessonDetailVm,
  LessonListVm,
  LessonStatsVm,
  CourseLessonProgressVm,
} from './vm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/role.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Role } from '../roles/role.enum';
import { Public } from '../decorators/public.decorator';
import { ResponseMessage } from '../decorators/response-message.decorator';
import { TAccountRequest } from 'src/decorators/account-request.decorator';

@ApiTags('Lessons')
@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create new lesson',
    description: 'Create a new lesson for a course. Only teachers can create lessons for their own courses.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Lesson created successfully',
    type: LessonVm,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only teachers can create lessons',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found or you do not have permission',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Time slot conflicts with existing lesson',
  })
  @ResponseMessage('Lesson created successfully')
  async create(
    @Body() createLessonDto: CreateLessonDto,
    @CurrentUser() user: TAccountRequest,
  ): Promise<LessonVm> {
    return this.lessonService.create(createLessonDto, user.id);
  }

  @Post('from-template')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create lesson from template',
    description: 'Create a new lesson using an existing lesson as a template.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Lesson created from template successfully',
    type: LessonVm,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template lesson not found',
  })
  @ResponseMessage('Lesson created from template successfully')
  async createFromTemplate(
    @Body() createFromTemplateDto: CreateLessonFromTemplateDto,
    @CurrentUser() user: any,
  ): Promise<LessonVm> {
    return this.lessonService.createFromTemplate(createFromTemplateDto, user.teacher.id);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bulk create lessons',
    description: 'Create multiple lessons at once with different scheduled times.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Lessons created successfully',
    type: [LessonVm],
  })
  @ResponseMessage('Lessons created successfully')
  async bulkCreate(
    @Body() bulkCreateDto: BulkCreateLessonsDto,
    @CurrentUser() user: any,
  ): Promise<LessonVm[]> {
    return this.lessonService.bulkCreate(bulkCreateDto, user.teacher.id);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all lessons',
    description: 'Retrieve lessons with filtering and pagination options.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lessons retrieved successfully',
    type: LessonListVm,
  })
  @ResponseMessage('Lessons retrieved successfully')
  async findAll(@Query() searchDto: SearchLessonDto): Promise<LessonListVm> {
    return this.lessonService.findAll(searchDto);
  }

  @Get('teacher/:teacherId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get lessons by teacher',
    description: 'Retrieve lessons for a specific teacher with optional statistics.',
  })
  @ApiParam({
    name: 'teacherId',
    type: String,
    description: 'Teacher ID',
    example: 'cm3teacher123def456',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher lessons retrieved successfully',
    type: LessonListVm,
  })
  @ResponseMessage('Teacher lessons retrieved successfully')
  async findByTeacher(
    @Param('teacherId') teacherId: string,
    @Query() searchDto: GetTeacherLessonsDto,
  ): Promise<LessonListVm> {
    return this.lessonService.findByTeacher(teacherId, searchDto);
  }

  @Get('teacher/me/lessons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current teacher lessons',
    description: 'Retrieve lessons for the current authenticated teacher.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Your lessons retrieved successfully',
    type: LessonListVm,
  })
  @ResponseMessage('Your lessons retrieved successfully')
  async findMyLessons(
    @CurrentUser() user: any,
    @Query() searchDto: GetTeacherLessonsDto,
  ): Promise<LessonListVm> {
    return this.lessonService.findByTeacher(user.teacher.id, searchDto);
  }

  @Get('teacher/me/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get teacher lesson statistics',
    description: 'Get comprehensive statistics about teacher lessons.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher lesson statistics retrieved successfully',
    type: LessonStatsVm,
  })
  @ResponseMessage('Teacher lesson statistics retrieved successfully')
  async getMyLessonStats(@CurrentUser() user: any): Promise<LessonStatsVm> {
    return this.lessonService.getTeacherLessonStats(user.teacher.id);
  }

  @Get('course/:courseId')
  @Public()
  @ApiOperation({
    summary: 'Get lessons by course',
    description: 'Retrieve all lessons for a specific course.',
  })
  @ApiParam({
    name: 'courseId',
    type: String,
    description: 'Course ID',
    example: 'cm3course123def456',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course lessons retrieved successfully',
    type: LessonListVm,
  })
  @ResponseMessage('Course lessons retrieved successfully')
  async findByCourse(
    @Param('courseId') courseId: string,
    @Query() searchDto: GetCourseLessonsDto,
  ): Promise<LessonListVm> {
    return this.lessonService.findByCourse(courseId, searchDto);
  }

  @Get('course/:courseId/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get course lesson progress',
    description: 'Get lesson progress and statistics for a course.',
  })
  @ApiParam({
    name: 'courseId',
    type: String,
    description: 'Course ID',
    example: 'cm3course123def456',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course lesson progress retrieved successfully',
    type: CourseLessonProgressVm,
  })
  @ResponseMessage('Course lesson progress retrieved successfully')
  async getCourseProgress(
    @Param('courseId') courseId: string,
  ): Promise<CourseLessonProgressVm> {
    return this.lessonService.getCourseProgress(courseId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get lesson by ID',
    description: 'Retrieve detailed information about a specific lesson.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Lesson ID',
    example: 'cm3lesson123def456',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lesson retrieved successfully',
    type: LessonDetailVm,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lesson not found',
  })
  @ResponseMessage('Lesson retrieved successfully')
  async findOne(@Param('id') id: string): Promise<LessonDetailVm> {
    return this.lessonService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update lesson',
    description: 'Update lesson information. Teachers can only update their own lessons.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Lesson ID',
    example: 'cm3lesson123def456',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lesson updated successfully',
    type: LessonVm,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lesson not found or you do not have permission',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot update lesson that is in progress or completed',
  })
  @ResponseMessage('Lesson updated successfully')
  async update(
    @Param('id') id: string,
    @Body() updateLessonDto: UpdateLessonDto,
    @CurrentUser() user: any,
  ): Promise<LessonVm> {
    return this.lessonService.update(id, updateLessonDto, user.teacher.id);
  }

  @Put(':id/notes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update lesson notes',
    description: 'Update lesson notes and teaching observations. Can be done during or after the lesson.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Lesson ID',
    example: 'cm3lesson123def456',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lesson notes updated successfully',
    type: LessonVm,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lesson not found or you do not have permission',
  })
  @ResponseMessage('Lesson notes updated successfully')
  async updateNotes(
    @Param('id') id: string,
    @Body() updateNotesDto: UpdateLessonNotesDto,
    @CurrentUser() user: any,
  ): Promise<LessonVm> {
    return this.lessonService.updateNotes(id, updateNotesDto, user.teacher.id);
  }

  @Put(':id/reschedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reschedule lesson',
    description: 'Change the scheduled time for a lesson.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Lesson ID',
    example: 'cm3lesson123def456',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lesson rescheduled successfully',
    type: LessonVm,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lesson not found or you do not have permission',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot reschedule completed or cancelled lesson',
  })
  @ResponseMessage('Lesson rescheduled successfully')
  async reschedule(
    @Param('id') id: string,
    @Body() rescheduleDto: RescheduleLessonDto,
    @CurrentUser() user: any,
  ): Promise<LessonVm> {
    return this.lessonService.reschedule(id, rescheduleDto, user.teacher.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete lesson',
    description: 'Delete a lesson. Teachers can only delete their own lessons. Lessons with confirmed bookings cannot be deleted.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Lesson ID',
    example: 'cm3lesson123def456',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lesson deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lesson not found or you do not have permission',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete lesson with confirmed bookings',
  })
  @ResponseMessage('Lesson deleted successfully')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    return this.lessonService.remove(id, user.teacher.id);
  }
}
