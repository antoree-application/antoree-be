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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { CreateBookingDto, BookTrialLessonDto, BookCourseDto } from './dto/create-booking.dto';
import { UpdateBookingDto, RescheduleBookingDto } from './dto/update-booking.dto';
import { SearchBookingDto, GetAvailableTimesDto } from './dto/search-booking.dto';
import {
  BookingVm,
  BookingSearchResultVm,
  TeacherAvailabilityVm,
  BookingStatsVm,
} from './vm/booking.vm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/role.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { Role } from '../roles/role.enum';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

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
    const student = await this.getStudentByUserId(user.sub);
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
    const student = await this.getStudentByUserId(user.sub);
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
    const student = await this.getStudentByUserId(user.sub);
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
      const student = await this.getStudentByUserId(user.sub);
      return this.bookingService.findByStudent(student.id);
    } else if (user.role === Role.TEACHER) {
      const teacher = await this.getTeacherByUserId(user.sub);
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
    return this.bookingService.getBookingStats(user.sub, user.role);
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
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
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
  async findByStudent(@Param('studentId', ParseUUIDPipe) studentId: string): Promise<BookingVm[]> {
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
  async findByTeacher(@Param('teacherId', ParseUUIDPipe) teacherId: string): Promise<BookingVm[]> {
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
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<BookingVm> {
    return this.bookingService.findOne(id, user.sub, user.role);
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
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @CurrentUser() user: any,
  ): Promise<BookingVm> {
    return this.bookingService.update(id, updateBookingDto, user.sub, user.role);
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
    @Param('id', ParseUUIDPipe) id: string,
    @Body() rescheduleDto: RescheduleBookingDto,
    @CurrentUser() user: any,
  ): Promise<BookingVm> {
    return this.bookingService.reschedule(id, rescheduleDto, user.sub, user.role);
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
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<BookingVm> {
    return this.bookingService.confirm(id, user.sub, user.role);
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
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ): Promise<BookingVm> {
    return this.bookingService.cancel(id, reason, user.sub, user.role);
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
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<BookingVm> {
    return this.bookingService.complete(id, user.sub, user.role);
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
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<BookingVm> {
    return this.bookingService.remove(id, user.sub, user.role);
  }

  // Helper methods
  private async getStudentByUserId(userId: string) {
    // This would typically use a shared service or be injected
    // For now, we'll implement it directly
    const student = await this.bookingService['prisma'].student.findUnique({
      where: { userId },
    });
    
    if (!student) {
      throw new Error('Student profile not found');
    }
    
    return student;
  }

  private async getTeacherByUserId(userId: string) {
    const teacher = await this.bookingService['prisma'].teacher.findUnique({
      where: { userId },
    });
    
    if (!teacher) {
      throw new Error('Teacher profile not found');
    }
    
    return teacher;
  }
}
