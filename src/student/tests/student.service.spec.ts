import { Test, TestingModule } from '@nestjs/testing';
import { StudentService } from '../student.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from '../dto';
import { EnglishLevel } from '@prisma/client';

describe('StudentService', () => {
  let service: StudentService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    student: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    booking: {
      count: jest.fn(),
    },
    lesson: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    payment: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StudentService>(StudentService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new student successfully', async () => {
      const createStudentDto: CreateStudentDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        englishLevel: EnglishLevel.BEGINNER,
        learningGoals: 'Improve conversation skills',
      };

      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'STUDENT',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockStudent = {
        id: 'student-id',
        userId: 'user-id',
        englishLevel: EnglishLevel.BEGINNER,
        learningGoals: 'Improve conversation skills',
        timezone: 'Asia/Ho_Chi_Minh',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          user: {
            create: jest.fn().mockResolvedValue(mockUser),
          },
          student: {
            create: jest.fn().mockResolvedValue(mockStudent),
          },
        });
      });

      const result = await service.create(createStudentDto);

      expect(result).toBeDefined();
      expect(result.email).toBe(createStudentDto.email);
      expect(result.firstName).toBe(createStudentDto.firstName);
      expect(result.englishLevel).toBe(createStudentDto.englishLevel);
    });

    it('should throw ConflictException when email already exists', async () => {
      const createStudentDto: CreateStudentDto = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(service.create(createStudentDto)).rejects.toThrow('Email already exists');
    });
  });

  describe('findAll', () => {
    it('should return paginated list of students', async () => {
      const searchDto = {
        page: 1,
        limit: 10,
        search: 'john',
        englishLevel: EnglishLevel.BEGINNER,
      };

      const mockUsers = [
        {
          id: 'user-1',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'STUDENT',
          student: {
            id: 'student-1',
            englishLevel: EnglishLevel.BEGINNER,
            timezone: 'Asia/Ho_Chi_Minh',
          },
          _count: { reviews: 0, payments: 0 },
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await service.findAll(searchDto);

      expect(result).toBeDefined();
      expect(result.students).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('findOne', () => {
    it('should return student profile with additional details', async () => {
      const studentId = 'student-id';

      const mockUser = {
        id: studentId,
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'STUDENT',
        student: {
          id: 'student-profile-id',
          englishLevel: EnglishLevel.BEGINNER,
          timezone: 'Asia/Ho_Chi_Minh',
          bookings: [],
          lessons: [],
        },
        _count: { reviews: 0, payments: 0 },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.lesson.findMany.mockResolvedValue([]);
      mockPrismaService.lesson.count.mockResolvedValue(0);

      const result = await service.findOne(studentId);

      expect(result).toBeDefined();
      expect(result.id).toBe(studentId);
      expect(result.recentBookings).toBeDefined();
      expect(result.upcomingLessons).toBeDefined();
      expect(result.completedLessons).toBeDefined();
    });

    it('should throw NotFoundException when student not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow('Student not found');
    });
  });
});
