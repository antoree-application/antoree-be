import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto, UpdateStudentDto, SearchStudentDto } from './dto';
import { StudentVm, StudentListVm, StudentProfileVm } from './vm';
import { EnglishLevel, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createStudentDto: CreateStudentDto): Promise<StudentVm> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createStudentDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createStudentDto.password, 10);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email: createStudentDto.email,
            password: hashedPassword,
            firstName: createStudentDto.firstName,
            lastName: createStudentDto.lastName,
            phone: createStudentDto.phone,
            avatar: createStudentDto.avatar,
            role: UserRole.STUDENT,
          },
        });

        // Create student profile
        const student = await tx.student.create({
          data: {
            id: user.id,
            englishLevel: createStudentDto.englishLevel || EnglishLevel.BEGINNER,
            learningGoals: createStudentDto.learningGoals,
            timezone: createStudentDto.timezone || 'Asia/Ho_Chi_Minh',
          },
        });

        return { user, student };
      });

      return this.mapToStudentVm(result.user, result.student);
    } catch (error) {
      throw new BadRequestException('Failed to create student');
    }
  }

  async findAll(searchDto: SearchStudentDto): Promise<StudentListVm> {
    const { search, englishLevel, timezone, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = searchDto;

    const skip = (page - 1) * limit;
    const orderBy = { [sortBy]: sortOrder };

    const where: any = {
      role: UserRole.STUDENT,
      student: {
        isNot: null,
      },
    };

    // Add search filters
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (englishLevel) {
      where.student.englishLevel = englishLevel;
    }

    if (timezone) {
      where.student.timezone = timezone;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          student: true,
          _count: {
            select: {
              reviews: true,
              payments: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.user.count({ where }),
    ]);

    const students = users.map((user) => this.mapToStudentVm(user, user.student!));

    return {
      students,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<StudentProfileVm> {
    const user = await this.prisma.user.findUnique({
      where: { id, role: UserRole.STUDENT },
      include: {
        student: {
          include: {
            bookings: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              include: {
                teacher: {
                  include: {
                    user: true,
                  },
                },
                course: true,
              },
            },
            lessons: {
              take: 5,
              orderBy: { scheduledAt: 'desc' },
              include: {
                teacher: {
                  include: {
                    user: true,
                  },
                },
                course: true,
              },
            },
          },
        },
        _count: {
          select: {
            reviews: true,
            payments: true,
          },
        },
      },
    });

    if (!user || !user.student) {
      throw new NotFoundException('Student not found');
    }

    // Get upcoming lessons
    const upcomingLessons = await this.prisma.lesson.findMany({
      where: {
        studentId: user.student.id,
        scheduledAt: { gte: new Date() },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
        course: true,
      },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
    });

    // Get completed lessons count
    const completedLessons = await this.prisma.lesson.count({
      where: {
        studentId: user.student.id,
        status: 'COMPLETED',
      },
    });

    const studentVm = this.mapToStudentVm(user, user.student) as StudentProfileVm;
    studentVm.recentBookings = user.student.bookings;
    studentVm.upcomingLessons = upcomingLessons;
    studentVm.completedLessons = completedLessons;

    return studentVm;
  }

  async findByUserId(userId: string): Promise<StudentVm | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, role: UserRole.STUDENT },
      include: {
        student: true,
      },
    });

    if (!user || !user.student) {
      return null;
    }

    return this.mapToStudentVm(user, user.student);
  }

  async update(id: string, updateStudentDto: UpdateStudentDto): Promise<StudentVm> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id, role: UserRole.STUDENT },
      include: { student: true },
    });

    if (!existingUser || !existingUser.student) {
      throw new NotFoundException('Student not found');
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Update user fields
        const userUpdateData: any = {};
        if (updateStudentDto.firstName) userUpdateData.firstName = updateStudentDto.firstName;
        if (updateStudentDto.lastName) userUpdateData.lastName = updateStudentDto.lastName;
        if (updateStudentDto.phone !== undefined) userUpdateData.phone = updateStudentDto.phone;
        if (updateStudentDto.avatar !== undefined) userUpdateData.avatar = updateStudentDto.avatar;

        // Update student fields
        const studentUpdateData: any = {};
        if (updateStudentDto.englishLevel) studentUpdateData.englishLevel = updateStudentDto.englishLevel;
        if (updateStudentDto.learningGoals !== undefined) studentUpdateData.learningGoals = updateStudentDto.learningGoals;
        if (updateStudentDto.timezone) studentUpdateData.timezone = updateStudentDto.timezone;

        // Perform updates
        const updates = await Promise.all([
          Object.keys(userUpdateData).length > 0 
            ? tx.user.update({ where: { id }, data: userUpdateData })
            : Promise.resolve(existingUser),
          Object.keys(studentUpdateData).length > 0
            ? tx.student.update({ where: { id: existingUser.student.id }, data: studentUpdateData })
            : Promise.resolve(existingUser.student),
        ]);

        return { user: updates[0], student: updates[1] };
      });

      return this.mapToStudentVm(result.user, result.student);
    } catch (error) {
      throw new BadRequestException('Failed to update student');
    }
  }

  async remove(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id, role: UserRole.STUDENT },
      include: { student: true },
    });

    if (!user || !user.student) {
      throw new NotFoundException('Student not found');
    }

    try {
      await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      throw new BadRequestException('Failed to delete student');
    }
  }

  async deactivate(id: string): Promise<StudentVm> {
    const user = await this.prisma.user.findUnique({
      where: { id, role: UserRole.STUDENT },
      include: { student: true },
    });

    if (!user || !user.student) {
      throw new NotFoundException('Student not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return this.mapToStudentVm(updatedUser, user.student);
  }

  async activate(id: string): Promise<StudentVm> {
    const user = await this.prisma.user.findUnique({
      where: { id, role: UserRole.STUDENT },
      include: { student: true },
    });

    if (!user || !user.student) {
      throw new NotFoundException('Student not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    return this.mapToStudentVm(updatedUser, user.student);
  }

  async getStudentStats(id: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id, role: UserRole.STUDENT },
      include: { student: true },
    });

    if (!user || !user.student) {
      throw new NotFoundException('Student not found');
    }

    const [totalBookings, totalLessons, completedLessons, upcomingLessons, totalPayments] = await Promise.all([
      this.prisma.booking.count({ where: { studentId: user.student.id } }),
      this.prisma.lesson.count({ where: { studentId: user.student.id } }),
      this.prisma.lesson.count({ where: { studentId: user.student.id, status: 'COMPLETED' } }),
      this.prisma.lesson.count({
        where: {
          studentId: user.student.id,
          scheduledAt: { gte: new Date() },
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.payment.count({ where: { userId: id, status: 'COMPLETED' } }),
    ]);

    return {
      totalBookings,
      totalLessons,
      completedLessons,
      upcomingLessons,
      totalPayments,
    };
  }

  async getRecommendedTeachers(userId: string): Promise<any[]> {
    const student = await this.prisma.student.findUnique({
      where: { id: userId },
      include: { user: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get teachers based on student's English level and learning goals
    const teachers = await this.prisma.teacher.findMany({
      where: {
        status: 'APPROVED',
        isLive: true,
        user: { isActive: true },
        // Recommend teachers with good ratings
        averageRating: { gte: 4.0 },
      },
      include: {
        user: true,
        rates: {
          where: { isActive: true },
        },
        reviews: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: {
            student: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: [
        { averageRating: 'desc' },
        { totalLessons: 'desc' },
      ],
      take: 10,
    });

    return teachers.map(teacher => ({
      id: teacher.id,
      teacherId: teacher.id, // Use teacher.id directly instead of userId
      fullName: `${teacher.user.firstName} ${teacher.user.lastName}`,
      avatar: teacher.user.avatar,
      bio: teacher.bio,
      experience: teacher.experience,
      specialties: teacher.specialties,
      languages: teacher.languages,
      averageRating: teacher.averageRating?.toString(),
      totalLessons: teacher.totalLessons,
      hourlyRate: teacher.hourlyRate.toString(),
      trialLessonRate: teacher.rates.find(r => r.type === 'TRIAL_LESSON')?.rate?.toString(),
      videoIntroUrl: teacher.videoIntroUrl,
      recentReviews: teacher.reviews.map(review => ({

        rating: review.rating,
        comment: review.comment,
        studentName: `${review.student.firstName} ${review.student.lastName}`,
        createdAt: review.createdAt,
      })),
    }));
  }

  async getAvailableSpecialties(): Promise<string[]> {
    const teachers = await this.prisma.teacher.findMany({
      where: {
        status: 'APPROVED',
        isLive: true,
        user: { isActive: true },
      },
      select: { specialties: true },
    });

    // Flatten and deduplicate specialties
    const allSpecialties = teachers.flatMap(teacher => teacher.specialties);
    return [...new Set(allSpecialties)].sort();
  }

  async getAvailableLanguages(): Promise<string[]> {
    const teachers = await this.prisma.teacher.findMany({
      where: {
        status: 'APPROVED',
        isLive: true,
        user: { isActive: true },
      },
      select: { languages: true },
    });

    // Flatten and deduplicate languages
    const allLanguages = teachers.flatMap(teacher => teacher.languages);
    return [...new Set(allLanguages)].sort();
  }

  private mapToStudentVm(user: any, student: any): StudentVm {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      studentId: student.id,
      englishLevel: student.englishLevel,
      learningGoals: student.learningGoals,
      timezone: student.timezone,
      fullName: `${user.firstName} ${user.lastName}`,
      totalBookings: user._count?.reviews || 0,
      totalLessons: user._count?.payments || 0,
    };
  }
}
