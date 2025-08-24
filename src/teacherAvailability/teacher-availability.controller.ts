import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { TeacherAvailabilityService } from './teacher-availability.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/role.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../roles/role.enum';
import { CurrentUser } from '../decorators/current-user.decorator';
import {
  CreateAvailabilityDto,
  UpdateAvailabilityDto,
  BulkCreateAvailabilityDto,
  GetAvailabilityQueryDto,
  AvailabilityConflictCheckDto,
  CopyAvailabilityDto,
} from './dto/availability.dto';
import {
  GetAvailableTimeSlotsDto,
  CheckTeacherAvailableDto,
  BulkAvailabilityCheckDto,
  WeeklyScheduleQueryDto,
} from './dto/schedule.dto';
import {
  TeacherAvailabilityVm,
  AvailabilityTimeSlotVm,
  WeeklyAvailabilityVm,
  AvailabilityStatsVm,
  AvailabilityConflictVm,
  BulkAvailabilityResultVm,
  AvailabilitySummaryVm,
} from './vm/availability.vm';
import { TAccountRequest } from 'src/decorators/account-request.decorator';

@ApiTags('Teacher Availability')
@Controller('teacher-availability')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TeacherAvailabilityController {
  constructor(
    private readonly teacherAvailabilityService: TeacherAvailabilityService
  ) {}

  @Post(':teacherId/availability')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ 
    summary: 'Create teacher availability',
    description: 'Create a new availability slot for a teacher. Teachers can only create for themselves unless admin.'
  })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiBody({ type: CreateAvailabilityDto })
  @ApiResponse({
    status: 201,
    description: 'Availability created successfully',
    type: TeacherAvailabilityVm,
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 409, description: 'Time slot conflict' })
  async   (
    @Param('teacherId') teacherId: string,
    @Body() createDto: CreateAvailabilityDto,
    @CurrentUser() user: TAccountRequest,
  ): Promise<TeacherAvailabilityVm> {
    // Ensure teachers can only modify their own availability
    // if (user.role === Role.TEACHER && user.teacher?.id !== teacherId) {
    //   throw new Error('Teachers can only manage their own availability');
    // }

    return this.teacherAvailabilityService.createAvailability(teacherId, createDto);
  }

  @Get(':teacherId/availability')
  @ApiOperation({ 
    summary: 'Get teacher availability',
    description: 'Retrieve teacher\'s availability schedule with optional filtering'
  })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiQuery({ name: 'dayOfWeek', required: false, description: 'Filter by day of week (0=Sunday, 1=Monday, etc.)' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by availability type' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiQuery({ name: 'includeWeeklySummary', required: false, description: 'Include weekly schedule summary' })
  @ApiResponse({
    status: 200,
    description: 'Teacher availability retrieved successfully',
    type: [TeacherAvailabilityVm],
  })
  async getTeacherAvailability(
    @Param('teacherId') teacherId: string,
    @Query() queryDto: GetAvailabilityQueryDto,
  ): Promise<TeacherAvailabilityVm[]> {
    return this.teacherAvailabilityService.getTeacherAvailability(teacherId, queryDto);
  }

  @Put(':teacherId/availability/:availabilityId')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ 
    summary: 'Update teacher availability',
    description: 'Update an existing availability slot'
  })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiParam({ name: 'availabilityId', description: 'Availability ID' })
  @ApiBody({ type: UpdateAvailabilityDto })
  @ApiResponse({
    status: 200,
    description: 'Availability updated successfully',
    type: TeacherAvailabilityVm,
  })
  async updateAvailability(
    @Param('teacherId') teacherId: string,
    @Param('availabilityId') availabilityId: string,
    @Body() updateDto: UpdateAvailabilityDto,
    @CurrentUser() user: any,
  ): Promise<TeacherAvailabilityVm> {
    if (user.role === Role.TEACHER && user.teacher?.id !== teacherId) {
      throw new Error('Teachers can only manage their own availability');
    }

    return this.teacherAvailabilityService.updateAvailability(
      teacherId,
      availabilityId,
      updateDto
    );
  }

  @Delete(':teacherId/availability/:availabilityId')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Delete teacher availability',
    description: 'Remove an availability slot'
  })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiParam({ name: 'availabilityId', description: 'Availability ID' })
  @ApiResponse({ status: 204, description: 'Availability deleted successfully' })
  async deleteAvailability(
    @Param('teacherId') teacherId: string,
    @Param('availabilityId') availabilityId: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    if (user.role === Role.TEACHER && user.teacher?.id !== teacherId) {
      throw new Error('Teachers can only manage their own availability');
    }

    return this.teacherAvailabilityService.deleteAvailability(teacherId, availabilityId);
  }

  @Post(':teacherId/availability/bulk')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ 
    summary: 'Bulk create availabilities',
    description: 'Create multiple availability slots at once'
  })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiBody({ type: BulkCreateAvailabilityDto })
  @ApiResponse({
    status: 201,
    description: 'Bulk availability creation completed',
    type: BulkAvailabilityResultVm,
  })
  async bulkCreateAvailability(
    @Param('teacherId') teacherId: string,
    @Body() bulkDto: BulkCreateAvailabilityDto,
    @CurrentUser() user: any,
  ): Promise<BulkAvailabilityResultVm> {
    if (user.role === Role.TEACHER && user.teacher?.id !== teacherId) {
      throw new Error('Teachers can only manage their own availability');
    }

    return this.teacherAvailabilityService.bulkCreateAvailability(teacherId, bulkDto);
  }

  @Post(':teacherId/availability/check-conflict')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Check availability conflict',
    description: 'Check if a time slot conflicts with existing availability'
  })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiBody({ type: AvailabilityConflictCheckDto })
  @ApiResponse({
    status: 200,
    description: 'Conflict check completed',
    type: AvailabilityConflictVm,
  })
  async checkAvailabilityConflict(
    @Param('teacherId') teacherId: string,
    @Body() conflictDto: AvailabilityConflictCheckDto,
    @CurrentUser() user: any,
  ): Promise<AvailabilityConflictVm> {
    if (user.role === Role.TEACHER && user.teacher?.id !== teacherId) {
      throw new Error('Teachers can only manage their own availability');
    }

    return this.teacherAvailabilityService.checkAvailabilityConflict(teacherId, conflictDto);
  }

  @Post(':teacherId/availability/copy')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ 
    summary: 'Copy availability between days',
    description: 'Copy availability schedule from one day to other days'
  })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiBody({ type: CopyAvailabilityDto })
  @ApiResponse({
    status: 201,
    description: 'Availability copied successfully',
    type: BulkAvailabilityResultVm,
  })
  async copyAvailability(
    @Param('teacherId') teacherId: string,
    @Body() copyDto: CopyAvailabilityDto,
    @CurrentUser() user: any,
  ): Promise<BulkAvailabilityResultVm> {
    if (user.role === Role.TEACHER && user.teacher?.id !== teacherId) {
      throw new Error('Teachers can only manage their own availability');
    }

    return this.teacherAvailabilityService.copyAvailability(teacherId, copyDto);
  }

  @Get(':teacherId/time-slots')
  @ApiOperation({ 
    summary: 'Get available time slots',
    description: 'Get available booking time slots for a date range'
  })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiQuery({ name: 'startDate', description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'duration', required: false, description: 'Slot duration in minutes (default: 60)' })
  @ApiQuery({ name: 'breakTime', required: false, description: 'Break time between slots in minutes (default: 15)' })
  @ApiQuery({ name: 'includeShortNotice', required: false, description: 'Include slots with short notice (default: false)' })
  @ApiResponse({
    status: 200,
    description: 'Available time slots retrieved successfully',
    type: [AvailabilityTimeSlotVm],
  })
  async getAvailableTimeSlots(
    @Param('teacherId') teacherId: string,
    @Query() slotsDto: GetAvailableTimeSlotsDto,
  ): Promise<AvailabilityTimeSlotVm[]> {
    return this.teacherAvailabilityService.getAvailableTimeSlots(teacherId, slotsDto);
  }

  @Post(':teacherId/check-available')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Check teacher availability at specific time',
    description: 'Check if teacher is available for a specific date and time'
  })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiBody({ type: CheckTeacherAvailableDto })
  @ApiResponse({
    status: 200,
    description: 'Availability check completed',
    schema: {
      type: 'object',
      properties: {
        isAvailable: { type: 'boolean' },
        reason: { type: 'string', description: 'Reason if not available' }
      }
    }
  })
  async checkTeacherAvailable(
    @Param('teacherId') teacherId: string,
    @Body() checkDto: CheckTeacherAvailableDto,
  ): Promise<{ isAvailable: boolean; reason?: string }> {
    return this.teacherAvailabilityService.checkTeacherAvailable(teacherId, checkDto);
  }

  @Get(':teacherId/weekly-schedule')
  @ApiOperation({ 
    summary: 'Get weekly schedule',
    description: 'Get teacher\'s weekly schedule with availability and bookings'
  })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiQuery({ name: 'weekStartDate', required: false, description: 'Week start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'weeksCount', required: false, description: 'Number of weeks to include (default: 1)' })
  @ApiQuery({ name: 'includeBookings', required: false, description: 'Include existing bookings (default: true)' })
  @ApiQuery({ name: 'slotDuration', required: false, description: 'Time slot duration in minutes (default: 60)' })
  @ApiResponse({
    status: 200,
    description: 'Weekly schedule retrieved successfully',
    type: [WeeklyAvailabilityVm],
  })
  async getWeeklySchedule(
    @Param('teacherId') teacherId: string,
    @Query() queryDto: WeeklyScheduleQueryDto,
  ): Promise<WeeklyAvailabilityVm[]> {
    return this.teacherAvailabilityService.getWeeklySchedule(teacherId, queryDto);
  }

  @Get(':teacherId/stats')
  @ApiOperation({ 
    summary: 'Get availability statistics',
    description: 'Get teacher\'s availability statistics and summary'
  })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiResponse({
    status: 200,
    description: 'Availability statistics retrieved successfully',
    type: AvailabilityStatsVm,
  })
  async getAvailabilityStats(
    @Param('teacherId') teacherId: string,
  ): Promise<AvailabilityStatsVm> {
    return this.teacherAvailabilityService.getAvailabilityStats(teacherId);
  }

  @Get(':teacherId/summary')
  @ApiOperation({ 
    summary: 'Get availability summary',
    description: 'Get comprehensive availability summary with schedule, stats, and upcoming weeks'
  })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiResponse({
    status: 200,
    description: 'Availability summary retrieved successfully',
    type: AvailabilitySummaryVm,
  })
  async getAvailabilitySummary(
    @Param('teacherId') teacherId: string,
  ): Promise<AvailabilitySummaryVm> {
    return this.teacherAvailabilityService.getAvailabilitySummary(teacherId);
  }

  // Public endpoints for students to view teacher availability

  @Get('public/:teacherId/time-slots')
  @ApiOperation({ 
    summary: 'Get available time slots (Public)',
    description: 'Public endpoint for students to view teacher\'s available booking slots'
  })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiQuery({ name: 'startDate', description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'duration', required: false, description: 'Slot duration in minutes (default: 60)' })
  @ApiResponse({
    status: 200,
    description: 'Available time slots retrieved successfully',
    type: [AvailabilityTimeSlotVm],
  })
  async getPublicAvailableTimeSlots(
    @Param('teacherId') teacherId: string,
    @Query() slotsDto: GetAvailableTimeSlotsDto,
  ): Promise<AvailabilityTimeSlotVm[]> {
    return this.teacherAvailabilityService.getAvailableTimeSlots(teacherId, slotsDto);
  }

  @Get('public/:teacherId/weekly-schedule')
  @ApiOperation({ 
    summary: 'Get weekly schedule (Public)',
    description: 'Public endpoint for students to view teacher\'s weekly availability'
  })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiQuery({ name: 'weekStartDate', required: false, description: 'Week start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'weeksCount', required: false, description: 'Number of weeks to include (default: 2)' })
  @ApiQuery({ name: 'slotDuration', required: false, description: 'Time slot duration in minutes (default: 60)' })
  @ApiResponse({
    status: 200,
    description: 'Public weekly schedule retrieved successfully',
    type: [WeeklyAvailabilityVm],
  })
  async getPublicWeeklySchedule(
    @Param('teacherId') teacherId: string,
    @Query() queryDto: WeeklyScheduleQueryDto,
  ): Promise<WeeklyAvailabilityVm[]> {
    // For public access, limit to 4 weeks max and always include bookings
    const limitedQuery = {
      ...queryDto,
      weeksCount: Math.min(queryDto.weeksCount || 2, 4),
      includeBookings: true,
    };
    
    return this.teacherAvailabilityService.getWeeklySchedule(teacherId, limitedQuery);
  }

  @Post('public/:teacherId/check-available')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Check teacher availability (Public)',
    description: 'Public endpoint for students to check if teacher is available at specific time'
  })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiBody({ type: CheckTeacherAvailableDto })
  @ApiResponse({
    status: 200,
    description: 'Availability check completed',
    schema: {
      type: 'object',
      properties: {
        isAvailable: { type: 'boolean' },
        reason: { type: 'string', description: 'Reason if not available' }
      }
    }
  })
  async checkPublicTeacherAvailable(
    @Param('teacherId') teacherId: string,
    @Body() checkDto: CheckTeacherAvailableDto,
  ): Promise<{ isAvailable: boolean; reason?: string }> {
    return this.teacherAvailabilityService.checkTeacherAvailable(teacherId, checkDto);
  }
}
