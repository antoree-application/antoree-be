import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
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
  LessonTemplateVm,
  CourseLessonProgressVm,
} from './vm';
import { 
  Lesson, 
  Course, 
  Teacher, 
  User, 
  LessonStatus,
  BookingStatus 
} from '@prisma/client';

@Injectable()
export class LessonService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new lesson
   */
  async create(
    createLessonDto: CreateLessonDto,
    teacherId: string,
  ): Promise<LessonVm> {
    // Verify course belongs to teacher
    const course = await this.prisma.course.findFirst({
      where: {
        id: createLessonDto.courseId,
        teacherId,
        isActive: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found or you do not have permission to add lessons');
    }

    // Check if scheduled time conflicts with existing lessons
    await this.checkScheduleConflict(
      teacherId,
      new Date(createLessonDto.scheduledAt),
      createLessonDto.duration,
    );

    // Auto-assign sequence number if not provided
    let sequenceNumber = createLessonDto.sequenceNumber;
    if (!sequenceNumber) {
      const lastLesson = await this.prisma.lesson.findFirst({
        where: { courseId: createLessonDto.courseId },
        orderBy: { createdAt: 'desc' },
      });
      sequenceNumber = 1; // Start from 1 if no previous lesson
      if (lastLesson?.notes) {
        const metadata = this.parseLessonMetadata(lastLesson.notes);
        sequenceNumber = (metadata.sequenceNumber || 0) + 1;
      }
    }

    const lesson = await this.prisma.lesson.create({
      data: {
        courseId: createLessonDto.courseId,
        teacherId,
        studentId: null, // Will be set when someone books the lesson
        scheduledAt: new Date(createLessonDto.scheduledAt),
        duration: createLessonDto.duration,
        meetingUrl: createLessonDto.meetingUrl,
        notes: this.buildLessonMetadata({
          title: createLessonDto.title,
          description: createLessonDto.description,
          learningObjectives: createLessonDto.learningObjectives,
          materials: createLessonDto.materials,
          prerequisites: createLessonDto.prerequisites,
          teacherNotes: createLessonDto.notes,
          sequenceNumber: sequenceNumber,
          isAvailableForBooking: createLessonDto.isAvailableForBooking,
          maxStudents: createLessonDto.maxStudents,
        }),
        homework: createLessonDto.homework,
        status: LessonStatus.SCHEDULED,
      },
    });

    return this.toLessonVm(lesson);
  }

  /**
   * Create lesson from template
   */
  async createFromTemplate(
    createFromTemplateDto: CreateLessonFromTemplateDto,
    teacherId: string,
  ): Promise<LessonVm> {
    const templateLesson = await this.prisma.lesson.findFirst({
      where: {
        id: createFromTemplateDto.templateLessonId,
        teacherId,
      },
    });

    if (!templateLesson) {
      throw new NotFoundException('Template lesson not found');
    }

    // Parse template metadata
    const templateMetadata = this.parseLessonMetadata(templateLesson.notes);

    const createDto: CreateLessonDto = {
      courseId: createFromTemplateDto.courseId,
      title: createFromTemplateDto.title || templateMetadata.title || 'Untitled Lesson',
      description: templateMetadata.description,
      scheduledAt: createFromTemplateDto.scheduledAt,
      duration: createFromTemplateDto.duration || templateLesson.duration,
      learningObjectives: templateMetadata.learningObjectives,
      materials: templateMetadata.materials,
      homework: templateLesson.homework,
      notes: `${templateMetadata.teacherNotes || ''}\n${createFromTemplateDto.additionalNotes || ''}`.trim(),
      prerequisites: templateMetadata.prerequisites,
    };

    return this.create(createDto, teacherId);
  }

  /**
   * Bulk create lessons
   */
  async bulkCreate(
    bulkCreateDto: BulkCreateLessonsDto,
    teacherId: string,
  ): Promise<LessonVm[]> {
    const course = await this.prisma.course.findFirst({
      where: {
        id: bulkCreateDto.courseId,
        teacherId,
        isActive: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found or you do not have permission to add lessons');
    }

    const createdLessons: LessonVm[] = [];
    let sequenceNumber = bulkCreateDto.startingSequence || 1;

    for (const scheduledTime of bulkCreateDto.scheduledTimes) {
      const lessonTitle = bulkCreateDto.autoIncrementTitles
        ? `${bulkCreateDto.lessonTemplate.title} - Lesson ${sequenceNumber}`
        : bulkCreateDto.lessonTemplate.title;

      const createDto: CreateLessonDto = {
        ...bulkCreateDto.lessonTemplate,
        courseId: bulkCreateDto.courseId,
        title: lessonTitle,
        scheduledAt: scheduledTime,
        sequenceNumber,
      };

      try {
        const lesson = await this.create(createDto, teacherId);
        createdLessons.push(lesson);
        sequenceNumber++;
      } catch (error) {
        console.warn(`Failed to create lesson for ${scheduledTime}: ${error.message}`);
        // Continue with next lesson instead of failing the entire batch
      }
    }

    return createdLessons;
  }

  /**
   * Update a lesson
   */
  async update(
    id: string,
    updateLessonDto: UpdateLessonDto,
    teacherId: string,
  ): Promise<LessonVm> {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id,
        teacherId,
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found or you do not have permission to update it');
    }

    // Check if lesson can be updated (not if in progress or completed)
    if (lesson.status === LessonStatus.IN_PROGRESS || lesson.status === LessonStatus.COMPLETED) {
      throw new BadRequestException('Cannot update lesson that is in progress or completed');
    }

    // Check schedule conflict if date/time is being changed
    if (updateLessonDto.scheduledAt || updateLessonDto.duration) {
      const newScheduledAt = updateLessonDto.scheduledAt 
        ? new Date(updateLessonDto.scheduledAt) 
        : lesson.scheduledAt;
      const newDuration = updateLessonDto.duration || lesson.duration;

      await this.checkScheduleConflict(teacherId, newScheduledAt, newDuration, id);
    }

    // Parse existing metadata
    const existingMetadata = this.parseLessonMetadata(lesson.notes);

    // Update metadata with new values
    const updatedMetadata = {
      ...existingMetadata,
      ...(updateLessonDto.learningObjectives && { learningObjectives: updateLessonDto.learningObjectives }),
      ...(updateLessonDto.materials && { materials: updateLessonDto.materials }),
      ...(updateLessonDto.prerequisites && { prerequisites: updateLessonDto.prerequisites }),
      ...(updateLessonDto.notes && { teacherNotes: updateLessonDto.notes }),
    };

    const updatedLesson = await this.prisma.lesson.update({
      where: { id },
      data: {
        ...(updateLessonDto.title && { title: updateLessonDto.title }),
        ...(updateLessonDto.description && { description: updateLessonDto.description }),
        ...(updateLessonDto.scheduledAt && { scheduledAt: new Date(updateLessonDto.scheduledAt) }),
        ...(updateLessonDto.duration && { duration: updateLessonDto.duration }),
        ...(updateLessonDto.meetingUrl && { meetingUrl: updateLessonDto.meetingUrl }),
        ...(updateLessonDto.homework && { homework: updateLessonDto.homework }),
        ...(updateLessonDto.status && { status: updateLessonDto.status }),
        notes: this.buildLessonMetadata(updatedMetadata),
      },
    });

    return this.toLessonVm(updatedLesson);
  }

  /**
   * Update lesson notes (during or after lesson)
   */
  async updateNotes(
    id: string,
    updateNotesDto: UpdateLessonNotesDto,
    teacherId: string,
  ): Promise<LessonVm> {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id,
        teacherId,
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found or you do not have permission to update it');
    }

    // Parse existing metadata
    const existingMetadata = this.parseLessonMetadata(lesson.notes);

    // Update lesson progress metadata
    const progressMetadata = {
      ...existingMetadata,
      teacherNotes: updateNotesDto.notes || existingMetadata.teacherNotes,
      studentFeedback: updateNotesDto.studentFeedback,
      topicsCovered: updateNotesDto.topicsCovered,
      strengths: updateNotesDto.strengths,
      improvementAreas: updateNotesDto.improvementAreas,
      nextLessonFocus: updateNotesDto.nextLessonFocus,
      lastUpdated: new Date().toISOString(),
    };

    const updatedLesson = await this.prisma.lesson.update({
      where: { id },
      data: {
        notes: this.buildLessonMetadata(progressMetadata),
        homework: updateNotesDto.homework || lesson.homework,
      },
    });

    return this.toLessonVm(updatedLesson);
  }

  /**
   * Reschedule a lesson
   */
  async reschedule(
    id: string,
    rescheduleDto: RescheduleLessonDto,
    teacherId: string,
  ): Promise<LessonVm> {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id,
        teacherId,
      },
      include: {
        booking: {
          include: {
            student: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found or you do not have permission to reschedule it');
    }

    if (lesson.status === LessonStatus.COMPLETED || lesson.status === LessonStatus.CANCELLED) {
      throw new BadRequestException('Cannot reschedule completed or cancelled lesson');
    }

    const newScheduledAt = new Date(rescheduleDto.newScheduledAt);

    // Check for conflicts
    await this.checkScheduleConflict(teacherId, newScheduledAt, lesson.duration, id);

    // Update lesson
    const updatedLesson = await this.prisma.lesson.update({
      where: { id },
      data: {
        scheduledAt: newScheduledAt,
      },
    });

    // Update booking if exists
    if (lesson.booking) {
      await this.prisma.booking.update({
        where: { id: lesson.booking.id },
        data: {
          scheduledAt: newScheduledAt,
          notes: `${lesson.booking.notes || ''}\n\nRescheduled: ${rescheduleDto.reason || 'No reason provided'}`.trim(),
        },
      });

      // Send notification to student if requested
      if (rescheduleDto.notifyStudent && lesson.booking.student) {
        // TODO: Implement notification service call
        console.log(`Notifying student ${lesson.booking.student.user.email} about lesson reschedule`);
      }
    }

    return this.toLessonVm(updatedLesson);
  }

  /**
   * Find all lessons with filtering and pagination
   */
  async findAll(searchDto: SearchLessonDto): Promise<LessonListVm> {
    const {
      page = 1,
      limit = 20,
      search,
      courseId,
      teacherId,
      status,
      startDate,
      endDate,
      minDuration,
      maxDuration,
      availableForBooking,
      hasAvailableSlots,
      learningObjectives,
      sortBy = 'scheduledAt',
      sortOrder = 'asc',
      fromDate,
      toDate,
      hasHomework,
      hasNotes,
      minSequence,
      maxSequence,
    } = searchDto;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (courseId) where.courseId = courseId;
    if (teacherId) where.teacherId = teacherId;
    if (status) where.status = status;

    // Date filtering
    if (startDate || endDate || fromDate || toDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = new Date(startDate);
      if (endDate) where.scheduledAt.lte = new Date(endDate);
      if (fromDate) where.scheduledAt.gte = new Date(fromDate);
      if (toDate) where.scheduledAt.lte = new Date(toDate);
    }

    // Duration filtering
    if (minDuration || maxDuration) {
      where.duration = {};
      if (minDuration) where.duration.gte = minDuration;
      if (maxDuration) where.duration.lte = maxDuration;
    }

    // Content filtering
    if (hasHomework !== undefined) {
      where.homework = hasHomework ? { not: null } : null;
    }

    if (hasNotes !== undefined) {
      where.notes = hasNotes ? { not: null } : null;
    }

    // Get lessons with related data
    const [lessons, total] = await Promise.all([
      this.prisma.lesson.findMany({
        where,
        include: {
          course: {
            select: {
              id: true,
              name: true,
              level: true,
              totalLessons: true,
            },
          },
          teacher: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
          booking: {
            select: {
              id: true,
              status: true,
              notes: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.lesson.count({ where }),
    ]);

    const lessonVms = lessons.map(lesson => this.toLessonVm(lesson));

    // Calculate summary statistics
    const summary = await this.calculateLessonSummary(where);

    return {
      lessons: lessonVms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
      summary,
    };
  }

  /**
   * Find lessons by teacher
   */
  async findByTeacher(
    teacherId: string,
    searchDto: GetTeacherLessonsDto,
  ): Promise<LessonListVm> {
    const baseSearchDto: SearchLessonDto = {
      ...searchDto,
      teacherId,
    };

    // Add upcoming filter if requested
    if (searchDto.upcomingOnly) {
      baseSearchDto.fromDate = new Date().toISOString();
    }

    const result = await this.findAll(baseSearchDto);

    // Add statistics if requested
    if (searchDto.includeStats) {
      const stats = await this.getTeacherLessonStats(teacherId);
      (result as any).stats = stats;
    }

    return result;
  }

  /**
   * Find lessons by course
   */
  async findByCourse(
    courseId: string,
    searchDto: GetCourseLessonsDto,
  ): Promise<LessonListVm> {
    const baseSearchDto: SearchLessonDto = {
      page: searchDto.page,
      limit: searchDto.limit,
      courseId,
      sortBy: searchDto.sortBy,
      sortOrder: searchDto.sortOrder,
    };

    // Add scheduled filter if requested
    if (searchDto.scheduledOnly) {
      baseSearchDto.status = LessonStatus.SCHEDULED;
    }

    return this.findAll(baseSearchDto);
  }

  /**
   * Find one lesson by ID with detailed information
   */
  async findOne(id: string): Promise<LessonDetailVm> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            level: true,
            totalLessons: true,
          },
        },
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        booking: {
          select: {
            id: true,
            status: true,
            notes: true,
            student: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Get lesson sequence context
    const [nextLesson, previousLesson] = await Promise.all([
      this.getNextLessonInSequence(lesson),
      this.getPreviousLessonInSequence(lesson),
    ]);

    // Parse lesson metadata for progress tracking
    const metadata = this.parseLessonMetadata(lesson.notes);

    // Build detailed view model
    const lessonDetailVm: LessonDetailVm = {
      ...this.toLessonVm(lesson),
      nextLesson,
      previousLesson,
      progress: {
        topicsCovered: metadata.topicsCovered,
        studentStrengths: metadata.strengths,
        improvementAreas: metadata.improvementAreas,
        nextLessonFocus: metadata.nextLessonFocus,
        completionPercentage: this.calculateLessonCompletionPercentage(lesson),
      },
    };

    return lessonDetailVm;
  }

  /**
   * Delete a lesson
   */
  async remove(id: string, teacherId: string): Promise<void> {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id,
        teacherId,
      },
      include: {
        booking: true,
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found or you do not have permission to delete it');
    }

    // Check if lesson has bookings
    if (lesson.booking && lesson.booking.status === BookingStatus.CONFIRMED) {
      throw new BadRequestException('Cannot delete lesson with confirmed bookings');
    }

    // If lesson is in progress or completed, archive instead of delete
    if (lesson.status === LessonStatus.IN_PROGRESS || lesson.status === LessonStatus.COMPLETED) {
      await this.prisma.lesson.update({
        where: { id },
        data: { 
          status: LessonStatus.CANCELLED,
          notes: `${lesson.notes || ''}\n\nArchived by teacher on ${new Date().toISOString()}`.trim(),
        },
      });
    } else {
      // Cancel booking if exists
      if (lesson.booking) {
        await this.prisma.booking.update({
          where: { id: lesson.booking.id },
          data: { status: BookingStatus.CANCELLED },
        });
      }

      // Delete the lesson
      await this.prisma.lesson.delete({
        where: { id },
      });
    }
  }

  /**
   * Get lesson statistics for teacher
   */
  async getTeacherLessonStats(teacherId: string): Promise<LessonStatsVm> {
    const [
      totalLessons,
      lessonsByStatus,
      avgDuration,
      totalHours,
      recentLessons,
    ] = await Promise.all([
      this.prisma.lesson.count({ where: { teacherId } }),
      this.prisma.lesson.groupBy({
        by: ['status'],
        where: { teacherId },
        _count: { status: true },
      }),
      this.prisma.lesson.aggregate({
        where: { teacherId },
        _avg: { duration: true },
      }),
      this.prisma.lesson.aggregate({
        where: { 
          teacherId,
          status: LessonStatus.COMPLETED,
        },
        _sum: { duration: true },
      }),
      this.getLessonsByMonth(teacherId),
    ]);

    const statusCounts = lessonsByStatus.reduce((acc, status) => {
      acc[status.status] = status._count.status;
      return acc;
    }, {} as Record<LessonStatus, number>);

    const completedLessons = statusCounts[LessonStatus.COMPLETED] || 0;
    const completionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    return {
      totalLessons,
      scheduledLessons: statusCounts[LessonStatus.SCHEDULED] || 0,
      inProgressLessons: statusCounts[LessonStatus.IN_PROGRESS] || 0,
      completedLessons,
      cancelledLessons: statusCounts[LessonStatus.CANCELLED] || 0,
      averageDuration: avgDuration._avg.duration || 0,
      totalTeachingHours: (totalHours._sum.duration || 0) / 60,
      completionRate,
      averageRating: 4.5, // TODO: Calculate from reviews
      lessonsByMonth: recentLessons,
      popularTimes: await this.getPopularLessonTimes(teacherId),
    };
  }

  /**
   * Get course lesson progress
   */
  async getCourseProgress(courseId: string): Promise<CourseLessonProgressVm> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        name: true,
        totalLessons: true,
        level: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const [lessons, lessonStats] = await Promise.all([
      this.prisma.lesson.findMany({
        where: { courseId },
        orderBy: { scheduledAt: 'desc' },
        take: 5,
      }),
      this.prisma.lesson.groupBy({
        by: ['status'],
        where: { courseId },
        _count: { status: true },
      }),
    ]);

    const statusCounts = lessonStats.reduce((acc, status) => {
      acc[status.status] = status._count.status;
      return acc;
    }, {} as Record<LessonStatus, number>);

    const totalLessons = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    const completedLessons = statusCounts[LessonStatus.COMPLETED] || 0;
    const scheduledLessons = statusCounts[LessonStatus.SCHEDULED] || 0;

    // Get next lesson
    const nextLesson = await this.prisma.lesson.findFirst({
      where: {
        courseId,
        status: LessonStatus.SCHEDULED,
        scheduledAt: { gte: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Get upcoming lessons
    const upcomingLessons = await this.prisma.lesson.findMany({
      where: {
        courseId,
        status: LessonStatus.SCHEDULED,
        scheduledAt: { gte: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
    });

    return {
      course,
      progress: {
        totalLessons,
        scheduledLessons,
        completedLessons,
        progressPercentage: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
        nextLesson: nextLesson ? {
          id: nextLesson.id,
          title: this.parseLessonMetadata(nextLesson.notes).title || 'Untitled Lesson',
          scheduledAt: nextLesson.scheduledAt,
          sequenceNumber: this.parseLessonMetadata(nextLesson.notes).sequenceNumber || 0,
        } : undefined,
      },
      recentLessons: lessons.map(lesson => ({
        id: lesson.id,
        title: this.parseLessonMetadata(lesson.notes).title || 'Untitled Lesson',
        scheduledAt: lesson.scheduledAt,
        status: lesson.status,
        sequenceNumber: this.parseLessonMetadata(lesson.notes).sequenceNumber || 0,
        duration: lesson.duration,
      })),
      upcomingLessons: upcomingLessons.map(lesson => ({
        id: lesson.id,
        title: this.parseLessonMetadata(lesson.notes).title || 'Untitled Lesson',
        scheduledAt: lesson.scheduledAt,
        sequenceNumber: this.parseLessonMetadata(lesson.notes).sequenceNumber || 0,
        duration: lesson.duration,
        hasAvailableSlots: true, // TODO: Calculate based on bookings
      })),
    };
  }

  // Private helper methods

  private async checkScheduleConflict(
    teacherId: string,
    scheduledAt: Date,
    duration: number,
    excludeLessonId?: string,
  ): Promise<void> {
    const endTime = new Date(scheduledAt);
    endTime.setMinutes(endTime.getMinutes() + duration);

    const whereClause: any = {
      teacherId,
      status: { in: [LessonStatus.SCHEDULED, LessonStatus.IN_PROGRESS] },
      OR: [
        {
          scheduledAt: { lte: scheduledAt },
          // endTime calculation would be: scheduledAt + duration
        },
      ],
    };

    if (excludeLessonId) {
      whereClause.id = { not: excludeLessonId };
    }

    const conflictingLessons = await this.prisma.lesson.findMany({
      where: whereClause,
    });

    for (const lesson of conflictingLessons) {
      const lessonEnd = new Date(lesson.scheduledAt);
      lessonEnd.setMinutes(lessonEnd.getMinutes() + lesson.duration);

      if (scheduledAt < lessonEnd && endTime > lesson.scheduledAt) {
        throw new ConflictException('Time slot conflicts with existing lesson');
      }
    }
  }

  private buildLessonMetadata(metadata: any): string {
    return JSON.stringify({
      ...metadata,
      version: '1.0',
      updatedAt: new Date().toISOString(),
    });
  }

  private parseLessonMetadata(notes: string | null): any {
    if (!notes) return {};
    
    try {
      return JSON.parse(notes);
    } catch {
      // If notes is not JSON, treat as legacy text notes
      return { teacherNotes: notes };
    }
  }

  private toLessonVm(lesson: any): LessonVm {
    const metadata = this.parseLessonMetadata(lesson.notes);

    return {
      id: lesson.id,
      courseId: lesson.courseId,
      teacherId: lesson.teacherId,
      title: metadata.title || 'Untitled Lesson',
      description: metadata.description,
      scheduledAt: lesson.scheduledAt,
      startedAt: lesson.startedAt,
      endedAt: lesson.endedAt,
      duration: lesson.duration,
      meetingUrl: lesson.meetingUrl,
      learningObjectives: metadata.learningObjectives,
      materials: metadata.materials,
      homework: lesson.homework,
      notes: metadata.teacherNotes,
      status: lesson.status,
      sequenceNumber: metadata.sequenceNumber,
      isAvailableForBooking: metadata.isAvailableForBooking !== false,
      maxStudents: metadata.maxStudents || 1,
      currentBookings: 0, // TODO: Calculate from bookings
      hasAvailableSlots: true, // TODO: Calculate from bookings
      prerequisites: metadata.prerequisites,
      createdAt: lesson.createdAt,
      updatedAt: lesson.updatedAt,
      course: lesson.course,
      teacher: lesson.teacher ? {
        id: lesson.teacher.id,
        firstName: lesson.teacher.user.firstName,
        lastName: lesson.teacher.user.lastName,
        avatar: lesson.teacher.user.avatar,
        averageRating: lesson.teacher.averageRating?.toString(),
        specialties: lesson.teacher.specialties,
      } : undefined,
      booking: lesson.booking,
    };
  }

  private async calculateLessonSummary(where: any): Promise<any> {
    const [total, scheduled, completed, available] = await Promise.all([
      this.prisma.lesson.count({ where }),
      this.prisma.lesson.count({ 
        where: { ...where, status: LessonStatus.SCHEDULED } 
      }),
      this.prisma.lesson.count({ 
        where: { ...where, status: LessonStatus.COMPLETED } 
      }),
      this.prisma.lesson.count({ 
        where: { 
          ...where, 
          status: LessonStatus.SCHEDULED,
          scheduledAt: { gte: new Date() } 
        } 
      }),
    ]);

    return {
      totalLessons: total,
      scheduledLessons: scheduled,
      completedLessons: completed,
      availableSlots: available,
      upcomingLessons: available,
    };
  }

  private async getNextLessonInSequence(lesson: any): Promise<any> {
    const metadata = this.parseLessonMetadata(lesson.notes);
    const currentSequence = metadata.sequenceNumber || 0;

    const nextLesson = await this.prisma.lesson.findFirst({
      where: {
        courseId: lesson.courseId,
        id: { not: lesson.id },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    if (!nextLesson) return undefined;

    const nextMetadata = this.parseLessonMetadata(nextLesson.notes);
    return {
      id: nextLesson.id,
      title: nextMetadata.title || 'Untitled Lesson',
      scheduledAt: nextLesson.scheduledAt,
    };
  }

  private async getPreviousLessonInSequence(lesson: any): Promise<any> {
    const metadata = this.parseLessonMetadata(lesson.notes);
    const currentSequence = metadata.sequenceNumber || 0;

    const previousLesson = await this.prisma.lesson.findFirst({
      where: {
        courseId: lesson.courseId,
        id: { not: lesson.id },
        scheduledAt: { lt: lesson.scheduledAt },
      },
      orderBy: { scheduledAt: 'desc' },
    });

    if (!previousLesson) return undefined;

    const previousMetadata = this.parseLessonMetadata(previousLesson.notes);
    return {
      id: previousLesson.id,
      title: previousMetadata.title || 'Untitled Lesson',
      scheduledAt: previousLesson.scheduledAt,
    };
  }

  private calculateLessonCompletionPercentage(lesson: any): number {
    if (lesson.status === LessonStatus.COMPLETED) return 100;
    if (lesson.status === LessonStatus.IN_PROGRESS) return 50;
    if (lesson.status === LessonStatus.SCHEDULED && lesson.scheduledAt < new Date()) return 25;
    return 0;
  }

  private async getLessonsByMonth(teacherId: string): Promise<Array<{ month: string; count: number }>> {
    // This would require raw SQL or complex aggregation
    // For now, return mock data
    return [
      { month: '2024-01', count: 12 },
      { month: '2024-02', count: 15 },
    ];
  }

  private async getPopularLessonTimes(teacherId: string): Promise<Array<{ hour: number; count: number }>> {
    // This would require raw SQL or complex aggregation
    // For now, return mock data
    return [
      { hour: 14, count: 25 },
      { hour: 15, count: 22 },
      { hour: 16, count: 18 },
    ];
  }
}
