import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { UserService } from '../users/users.service';
import { SecutiryUtils } from '../utils/security.util';
import { AuthDto } from './dto/auth.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { CreateStudentAccountDto } from './dto/create-student-account.dto';
import { CreateTeacherAccountDto } from './dto/create-teacher-account.dto';
import { UserRole, User, EnglishLevel, TeacherStatus } from '@prisma/client';
import { LoginRequest } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly prismaService: PrismaService,
  ) {}

  async emailExist(email: string, id?: string): Promise<boolean> {
    const user = await this.prismaService.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });
    return user !== null && id !== user.id;
  }

  async create(createUserDto: CreateUserDto) {
    if (await this.emailExist(createUserDto.email)) {
      throw new BadRequestException('User email already exists!');
    }

    const hashedPassword = await SecutiryUtils.hashingPassword(
      createUserDto.password,
    );

    const user = await this.prismaService.user.create({
      data: {
        email: createUserDto.email.toLowerCase(),
        password: hashedPassword,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        phone: createUserDto.phone,
        avatar: createUserDto.avatar,
        role: createUserDto.role || UserRole.STUDENT,
        isActive: createUserDto.isActive ?? true,
      },
    });

    return user;
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.prismaService.user.findFirst({
      where: {
        email: email.toLowerCase(),
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await SecutiryUtils.decodePassword(
      password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password is incorrect');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(loginRequest: LoginRequest) {
    const user = await this.validateUser(
      loginRequest.email,
      loginRequest.password,
    );

    // Generate JWT token
    const accessToken = this.jwtService.sign({
      firstName: user.firstName,
      lastName: user.lastName,
      sub: user.id,
      email: user.email,
      id: user.id,
      type: user.role.valueOf(),
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
      },
    };
  }

  /**
   * Simple logout - In a stateless JWT system, the client should discard the token
   * This is a placeholder for any future cleanup that might be needed
   */
  async logout(): Promise<{ message: string }> {
    // In a stateless JWT system, the client should discard the token
    // If you need to invalidate tokens, you would need to implement a token blacklist
    return { message: 'Logout successful' };
  }

  /**
   * Create a student account with user and student profile
   */
  async createStudentAccount(createStudentDto: CreateStudentAccountDto) {
    if (await this.emailExist(createStudentDto.email)) {
      throw new ConflictException('User with this email already exists!');
    }

    // Validate that English is included in languages if it's a teacher account
    const hashedPassword = await SecutiryUtils.hashingPassword(
      createStudentDto.password,
    );

    try {
      const result = await this.prismaService.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email: createStudentDto.email.toLowerCase(),
            password: hashedPassword,
            firstName: createStudentDto.firstName,
            lastName: createStudentDto.lastName,
            phone: createStudentDto.phone,
            avatar: createStudentDto.avatar,
            role: UserRole.STUDENT,
            isActive: true,
          },
        });

        // Create student profile using the same ID as user
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

      return {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        fullName: `${result.user.firstName} ${result.user.lastName}`,
        phone: result.user.phone,
        avatar: result.user.avatar,
        englishLevel: result.student.englishLevel,
        learningGoals: result.student.learningGoals,
        timezone: result.student.timezone,
        role: result.user.role,
        isActive: result.user.isActive,
        createdAt: result.user.createdAt,
        updatedAt: result.user.updatedAt,
      };
    } catch (error) {
      throw new BadRequestException('Failed to create student account');
    }
  }

  /**
   * Create a teacher account with user and teacher profile
   */
  async createTeacherAccount(createTeacherDto: CreateTeacherAccountDto) {
    if (await this.emailExist(createTeacherDto.email)) {
      throw new ConflictException('User with this email already exists!');
    }

    // Validate that English is included in languages
    if (!createTeacherDto.languages.includes('English')) {
      throw new BadRequestException('English must be included in the languages list');
    }

    const hashedPassword = await SecutiryUtils.hashingPassword(
      createTeacherDto.password,
    );

    try {
      const result = await this.prismaService.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email: createTeacherDto.email.toLowerCase(),
            password: hashedPassword,
            firstName: createTeacherDto.firstName,
            lastName: createTeacherDto.lastName,
            phone: createTeacherDto.phone,
            avatar: createTeacherDto.avatar,
            role: UserRole.TEACHER,
            isActive: true,
          },
        });

        // Create teacher profile using the same ID as user
        const teacher = await tx.teacher.create({
          data: {
            id: user.id,
            bio: createTeacherDto.bio,
            experience: createTeacherDto.experience || 0,
            education: createTeacherDto.education,
            certifications: createTeacherDto.certifications || [],
            specialties: createTeacherDto.specialties || [],
            hourlyRate: createTeacherDto.hourlyRate,
            timezone: createTeacherDto.timezone || 'Asia/Ho_Chi_Minh',
            languages: createTeacherDto.languages,
            videoIntroUrl: createTeacherDto.videoIntroUrl,
            status: TeacherStatus.PENDING,
            totalLessons: 0,
            averageRating: null,
            responseTime: createTeacherDto.responseTime,
            profileCompleted: !!(createTeacherDto.bio && createTeacherDto.experience !== undefined),
            verificationSubmitted: false,
            availabilitySetup: false,
            isLive: false,
          },
        });

        return { user, teacher };
      });

      return {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        fullName: `${result.user.firstName} ${result.user.lastName}`,
        phone: result.user.phone,
        avatar: result.user.avatar,
        bio: result.teacher.bio,
        experience: result.teacher.experience,
        education: result.teacher.education,
        certifications: result.teacher.certifications,
        specialties: result.teacher.specialties,
        hourlyRate: result.teacher.hourlyRate.toString(),
        timezone: result.teacher.timezone,
        languages: result.teacher.languages,
        videoIntroUrl: result.teacher.videoIntroUrl,
        status: result.teacher.status,
        totalLessons: result.teacher.totalLessons,
        averageRating: result.teacher.averageRating?.toString(),
        responseTime: result.teacher.responseTime,
        profileCompleted: result.teacher.profileCompleted,
        verificationSubmitted: result.teacher.verificationSubmitted,
        availabilitySetup: result.teacher.availabilitySetup,
        isLive: result.teacher.isLive,
        role: result.user.role,
        isActive: result.user.isActive,
        createdAt: result.user.createdAt,
        updatedAt: result.user.updatedAt,
      };
    } catch (error) {
      throw new BadRequestException('Failed to create teacher account');
    }
  }
}
