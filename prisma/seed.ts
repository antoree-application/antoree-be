import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed process...');

  // Clear existing data in reverse dependency order
  await prisma.review.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.courseEnrollment.deleteMany();
  await prisma.lessonPackage.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.teacherVerificationDocument.deleteMany();
  await prisma.teacherVerification.deleteMany();
  await prisma.teacherRate.deleteMany();
  await prisma.teacherAvailability.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemConfig.deleteMany();

  console.log('🗑️ Cleared existing data');

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Admin Users
  const adminUser = await prisma.user.create({
    data: {
      id: 'admin_001',
      email: 'admin@antoree.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'System',
      phone: '+84901234567',
      role: 'ADMIN',
      isActive: true,
      lastLogin: new Date(),
    },
  });

  console.log('👨‍💼 Created admin user');

  // Create Student Users
  const students = await Promise.all([
    prisma.user.create({
      data: {
        id: 'student_001',
        email: 'john.doe@gmail.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        phone: '+84901234568',
        role: 'STUDENT',
        avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
        lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        student: {
          create: {
            englishLevel: 'BEGINNER',
            learningGoals: 'Improve conversational English for business meetings',
            timezone: 'Asia/Ho_Chi_Minh',
          },
        },
      },
      include: { student: true },
    }),
    prisma.user.create({
      data: {
        id: 'student_002',
        email: 'jane.smith@gmail.com',
        password: hashedPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+84901234569',
        role: 'STUDENT',
        avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
        lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        student: {
          create: {
            englishLevel: 'INTERMEDIATE',
            learningGoals: 'Prepare for IELTS exam',
            timezone: 'Asia/Ho_Chi_Minh',
          },
        },
      },
      include: { student: true },
    }),
    prisma.user.create({
      data: {
        id: 'student_003',
        email: 'mike.wilson@gmail.com',
        password: hashedPassword,
        firstName: 'Mike',
        lastName: 'Wilson',
        phone: '+84901234570',
        role: 'STUDENT',
        avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
        lastLogin: new Date(),
        student: {
          create: {
            englishLevel: 'UPPER_INTERMEDIATE',
            learningGoals: 'Enhance academic English for university studies',
            timezone: 'Asia/Ho_Chi_Minh',
          },
        },
      },
      include: { student: true },
    }),
    prisma.user.create({
      data: {
        id: 'student_004',
        email: 'sarah.brown@gmail.com',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Brown',
        phone: '+84901234571',
        role: 'STUDENT',
        avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
        lastLogin: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        student: {
          create: {
            englishLevel: 'ELEMENTARY',
            learningGoals: 'Basic English for travel and daily communication',
            timezone: 'Asia/Ho_Chi_Minh',
          },
        },
      },
      include: { student: true },
    }),
    prisma.user.create({
      data: {
        id: 'student_005',
        email: 'david.lee@gmail.com',
        password: hashedPassword,
        firstName: 'David',
        lastName: 'Lee',
        phone: '+84901234572',
        role: 'STUDENT',
        avatar: 'https://randomuser.me/api/portraits/men/5.jpg',
        lastLogin: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        student: {
          create: {
            englishLevel: 'ADVANCED',
            learningGoals: 'Perfect pronunciation and advanced grammar',
            timezone: 'Asia/Ho_Chi_Minh',
          },
        },
      },
      include: { student: true },
    }),
  ]);

  console.log('👨‍🎓 Created student users');

  // Create Teacher Users
  const teachers = await Promise.all([
    prisma.user.create({
      data: {
        id: 'teacher_001',
        email: 'emily.johnson@antoree.com',
        password: hashedPassword,
        firstName: 'Emily',
        lastName: 'Johnson',
        phone: '+84901234573',
        role: 'TEACHER',
        avatar: 'https://randomuser.me/api/portraits/women/10.jpg',
        lastLogin: new Date(),
        teacher: {
          create: {
            bio: 'Experienced English teacher with 8 years of teaching experience. Specialized in business English and IELTS preparation.',
            experience: 8,
            education: 'Master of Arts in TESOL, University of Cambridge',
            certifications: ['TEFL Certificate', 'IELTS Teaching Certificate', 'Cambridge CELTA'],
            specialties: ['Business English', 'IELTS Preparation', 'Conversational English'],
            hourlyRate: 25.00,
            timezone: 'Asia/Ho_Chi_Minh',
            languages: ['English (Native)', 'Vietnamese (Intermediate)'],
            videoIntroUrl: 'https://example.com/intro/emily.mp4',
            status: 'APPROVED',
            totalLessons: 150,
            averageRating: 4.8,
            responseTime: 30,
            profileCompleted: true,
            verificationSubmitted: true,
            availabilitySetup: true,
            isLive: true,
            advanceNoticeHours: 24,
            maxAdvanceBookingHours: 720,
            allowInstantBooking: true,
            bookingInstructions: 'Please let me know your current English level and learning goals before our first lesson.',
          },
        },
      },
      include: { teacher: true },
    }),
    prisma.user.create({
      data: {
        id: 'teacher_002',
        email: 'robert.davis@antoree.com',
        password: hashedPassword,
        firstName: 'Robert',
        lastName: 'Davis',
        phone: '+84901234574',
        role: 'TEACHER',
        avatar: 'https://randomuser.me/api/portraits/men/10.jpg',
        lastLogin: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        teacher: {
          create: {
            bio: 'Native English speaker from the UK with expertise in academic English and pronunciation training.',
            experience: 12,
            education: 'Bachelor of Education, Oxford University',
            certifications: ['PGCE', 'Trinity College London Certificate'],
            specialties: ['Academic English', 'Pronunciation', 'Grammar'],
            hourlyRate: 30.00,
            timezone: 'Asia/Ho_Chi_Minh',
            languages: ['English (Native)', 'French (Fluent)'],
            videoIntroUrl: 'https://example.com/intro/robert.mp4',
            status: 'APPROVED',
            totalLessons: 200,
            averageRating: 4.9,
            responseTime: 15,
            profileCompleted: true,
            verificationSubmitted: true,
            availabilitySetup: true,
            isLive: true,
            advanceNoticeHours: 12,
            maxAdvanceBookingHours: 1440,
            allowInstantBooking: false,
            bookingInstructions: 'I focus on systematic improvement. Please be prepared with specific questions or topics you want to work on.',
          },
        },
      },
      include: { teacher: true },
    }),
    prisma.user.create({
      data: {
        id: 'teacher_003',
        email: 'maria.garcia@antoree.com',
        password: hashedPassword,
        firstName: 'Maria',
        lastName: 'Garcia',
        phone: '+84901234575',
        role: 'TEACHER',
        avatar: 'https://randomuser.me/api/portraits/women/11.jpg',
        lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        teacher: {
          create: {
            bio: 'Bilingual teacher specializing in conversational English and cultural exchange. Fun and interactive teaching style.',
            experience: 5,
            education: 'Bachelor of Arts in English Literature, University of California',
            certifications: ['TESOL Certificate', 'Cultural Communication Certificate'],
            specialties: ['Conversational English', 'Cultural Communication', 'Teen/Young Adult Teaching'],
            hourlyRate: 20.00,
            timezone: 'Asia/Ho_Chi_Minh',
            languages: ['English (Native)', 'Spanish (Native)', 'Vietnamese (Basic)'],
            videoIntroUrl: 'https://example.com/intro/maria.mp4',
            status: 'APPROVED',
            totalLessons: 75,
            averageRating: 4.7,
            responseTime: 45,
            profileCompleted: true,
            verificationSubmitted: true,
            availabilitySetup: true,
            isLive: true,
            advanceNoticeHours: 48,
            maxAdvanceBookingHours: 672,
            allowInstantBooking: true,
            bookingInstructions: 'I love making learning fun! Let me know what topics interest you most.',
          },
        },
      },
      include: { teacher: true },
    }),
    prisma.user.create({
      data: {
        id: 'teacher_004',
        email: 'james.taylor@antoree.com',
        password: hashedPassword,
        firstName: 'James',
        lastName: 'Taylor',
        phone: '+84901234576',
        role: 'TEACHER',
        avatar: 'https://randomuser.me/api/portraits/men/11.jpg',
        lastLogin: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        teacher: {
          create: {
            bio: 'Professional English coach with corporate training background. Expert in business communication and presentation skills.',
            experience: 10,
            education: 'MBA in International Business, Harvard Business School',
            certifications: ['Business English Certificate', 'Corporate Training Certificate'],
            specialties: ['Business English', 'Presentation Skills', 'Interview Preparation'],
            hourlyRate: 35.00,
            timezone: 'Asia/Ho_Chi_Minh',
            languages: ['English (Native)', 'Mandarin (Intermediate)'],
            videoIntroUrl: 'https://example.com/intro/james.mp4',
            status: 'APPROVED',
            totalLessons: 180,
            averageRating: 4.85,
            responseTime: 20,
            profileCompleted: true,
            verificationSubmitted: true,
            availabilitySetup: true,
            isLive: true,
            advanceNoticeHours: 24,
            maxAdvanceBookingHours: 1008,
            allowInstantBooking: false,
            bookingInstructions: 'Perfect for professionals looking to advance their career. Please share your industry and specific goals.',
          },
        },
      },
      include: { teacher: true },
    }),
    prisma.user.create({
      data: {
        id: 'teacher_005',
        email: 'lisa.anderson@antoree.com',
        password: hashedPassword,
        firstName: 'Lisa',
        lastName: 'Anderson',
        phone: '+84901234577',
        role: 'TEACHER',
        avatar: 'https://randomuser.me/api/portraits/women/12.jpg',
        lastLogin: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        teacher: {
          create: {
            bio: 'Enthusiastic teacher focusing on beginner and elementary levels. Patient and encouraging teaching approach.',
            experience: 3,
            education: 'Bachelor of Education in English, University of Sydney',
            certifications: ['TEFL Certificate', 'Children Teaching Certificate'],
            specialties: ['Beginner English', 'Elementary Education', 'Basic Grammar'],
            hourlyRate: 18.00,
            timezone: 'Asia/Ho_Chi_Minh',
            languages: ['English (Native)', 'Japanese (Basic)'],
            videoIntroUrl: 'https://example.com/intro/lisa.mp4',
            status: 'PENDING',
            totalLessons: 25,
            averageRating: 4.6,
            responseTime: 60,
            profileCompleted: true,
            verificationSubmitted: false,
            availabilitySetup: true,
            isLive: false,
            advanceNoticeHours: 48,
            maxAdvanceBookingHours: 504,
            allowInstantBooking: true,
            bookingInstructions: 'Great for beginners! I will help you build confidence in speaking English.',
          },
        },
      },
      include: { teacher: true },
    }),
  ]);

  console.log('👨‍🏫 Created teacher users');

  // Create Teacher Verification for approved teachers
  const approvedTeachers = teachers.filter(t => t.teacher?.status === 'APPROVED');
  for (const teacher of approvedTeachers) {
    const verification = await prisma.teacherVerification.create({
      data: {
        teacherId: teacher.id,
        additionalNotes: 'Professional background verified through LinkedIn and portfolio review.',
        linkedinUrl: `https://linkedin.com/in/${teacher.firstName.toLowerCase()}-${teacher.lastName.toLowerCase()}`,
        portfolioUrl: `https://portfolio.antoree.com/${teacher.firstName.toLowerCase()}-${teacher.lastName.toLowerCase()}`,
        reviewNotes: 'Excellent credentials and teaching experience. Approved for immediate teaching.',
        submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        reviewedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
    });

    // Add verification documents
    await Promise.all([
      prisma.teacherVerificationDocument.create({
        data: {
          teacherVerificationId: verification.id,
          type: 'TEACHING_CERTIFICATE',
          title: 'TEFL Teaching Certificate',
          documentUrl: `https://documents.antoree.com/certificates/${teacher.id}_tefl.pdf`,
          description: 'TEFL certification from accredited institution',
        },
      }),
      prisma.teacherVerificationDocument.create({
        data: {
          teacherVerificationId: verification.id,
          type: 'EDUCATION_DIPLOMA',
          title: 'University Degree',
          documentUrl: `https://documents.antoree.com/degrees/${teacher.id}_degree.pdf`,
          description: 'University degree in relevant field',
        },
      }),
      prisma.teacherVerificationDocument.create({
        data: {
          teacherVerificationId: verification.id,
          type: 'IDENTITY_DOCUMENT',
          title: 'Passport/ID',
          documentUrl: `https://documents.antoree.com/ids/${teacher.id}_id.pdf`,
          description: 'Government issued identification',
        },
      }),
    ]);
  }

  console.log('📋 Created teacher verifications');

  // Create Teacher Availabilities
  for (const teacher of teachers) {
    if (teacher.teacher?.status === 'APPROVED') {
      // Monday to Friday morning slots
      for (let day = 1; day <= 5; day++) {
        await prisma.teacherAvailability.create({
          data: {
            teacherId: teacher.id,
            dayOfWeek: day,
            startTime: '09:00',
            endTime: '12:00',
            type: 'REGULAR',
            isActive: true,
          },
        });

        await prisma.teacherAvailability.create({
          data: {
            teacherId: teacher.id,
            dayOfWeek: day,
            startTime: '14:00',
            endTime: '18:00',
            type: 'REGULAR',
            isActive: true,
          },
        });
      }

      // Weekend availability for some teachers
      if (teacher.id === 'teacher_001' || teacher.id === 'teacher_003') {
        await prisma.teacherAvailability.create({
          data: {
            teacherId: teacher.id,
            dayOfWeek: 6, // Saturday
            startTime: '10:00',
            endTime: '16:00',
            type: 'REGULAR',
            isActive: true,
          },
        });
      }
    }
  }

  console.log('📅 Created teacher availabilities');

  // Create Teacher Rates
  for (const teacher of teachers) {
    if (teacher.teacher) {
      const baseRate = teacher.teacher.hourlyRate;

      await Promise.all([
        prisma.teacherRate.create({
          data: {
            teacherId: teacher.id,
            type: 'TRIAL_LESSON',
            rate: Number(baseRate) * 0.5, // 50% off for trial
            duration: 30,
            maxStudents: 1,
          },
        }),
        prisma.teacherRate.create({
          data: {
            teacherId: teacher.id,
            type: 'REGULAR_LESSON',
            rate: Number(baseRate),
            duration: 60,
            maxStudents: 1,
          },
        }),
        prisma.teacherRate.create({
          data: {
            teacherId: teacher.id,
            type: 'GROUP_LESSON',
            rate: Number(baseRate) * 0.7, // 30% discount for group
            duration: 60,
            maxStudents: 4,
          },
        }),
        prisma.teacherRate.create({
          data: {
            teacherId: teacher.id,
            type: 'INTENSIVE_COURSE',
            rate: Number(baseRate) * 1.2, // 20% premium for intensive
            duration: 90,
            maxStudents: 1,
          },
        }),
      ]);
    }
  }

  console.log('💰 Created teacher rates');

  // Create Courses
  const courses = await Promise.all([
    prisma.course.create({
      data: {
        teacherId: 'teacher_001',
        name: 'Business English Mastery',
        description: 'Comprehensive business English course covering emails, presentations, meetings, and negotiations.',
        duration: 90,
        totalLessons: 20,
        price: 450.00,
        level: 'INTERMEDIATE',
        isActive: true,
      },
    }),
    prisma.course.create({
      data: {
        teacherId: 'teacher_002',
        name: 'IELTS Preparation Intensive',
        description: 'Complete IELTS preparation course with focus on all four skills: listening, reading, writing, and speaking.',
        duration: 120,
        totalLessons: 24,
        price: 720.00,
        level: 'UPPER_INTERMEDIATE',
        isActive: true,
      },
    }),
    prisma.course.create({
      data: {
        teacherId: 'teacher_003',
        name: 'Conversational English for Beginners',
        description: 'Fun and interactive conversational English course for absolute beginners.',
        duration: 60,
        totalLessons: 15,
        price: 300.00,
        level: 'BEGINNER',
        isActive: true,
      },
    }),
    prisma.course.create({
      data: {
        teacherId: 'teacher_004',
        name: 'Professional Communication Skills',
        description: 'Advanced course for professionals focusing on presentation skills and leadership communication.',
        duration: 75,
        totalLessons: 16,
        price: 560.00,
        level: 'ADVANCED',
        isActive: true,
      },
    }),
    prisma.course.create({
      data: {
        teacherId: 'teacher_001',
        name: 'English Grammar Foundation',
        description: 'Solid foundation in English grammar with practical exercises and real-world applications.',
        duration: 60,
        totalLessons: 12,
        price: 240.00,
        level: 'ELEMENTARY',
        isActive: true,
      },
    }),
  ]);

  console.log('📚 Created courses');

  // Create Payments
  const payments = await Promise.all([
    prisma.payment.create({
      data: {
        userId: 'student_001',
        amount: 450.00,
        currency: 'USD',
        paymentMethod: 'VNPAY',
        transactionId: 'TXN_001_20250815001',
        status: 'COMPLETED',
        description: 'Payment for Business English Mastery course',
        metadata: {
          courseId: courses[0].id,
          paymentGateway: 'vnpay',
          gatewayTransactionId: 'VNP_20250815001'
        },
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      },
    }),
    prisma.payment.create({
      data: {
        userId: 'student_002',
        amount: 720.00,
        currency: 'USD',
        paymentMethod: 'MOMO',
        transactionId: 'TXN_002_20250816001',
        status: 'COMPLETED',
        description: 'Payment for IELTS Preparation Intensive course',
        metadata: {
          courseId: courses[1].id,
          paymentGateway: 'momo',
          gatewayTransactionId: 'MOMO_20250816001'
        },
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      },
    }),
    prisma.payment.create({
      data: {
        userId: 'student_003',
        amount: 350.00,
        currency: 'USD',
        paymentMethod: 'BANK_TRANSFER',
        transactionId: 'TXN_003_20250817001',
        status: 'COMPLETED',
        description: 'Payment for 10-lesson package with Emily Johnson',
        metadata: {
          teacherId: 'teacher_001',
          packageType: 'PACKAGE_10',
          lessonsCount: 10
        },
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      },
    }),
    prisma.payment.create({
      data: {
        userId: 'student_004',
        amount: 300.00,
        currency: 'USD',
        paymentMethod: 'VNPAY',
        transactionId: 'TXN_004_20250818001',
        status: 'COMPLETED',
        description: 'Payment for Conversational English for Beginners course',
        metadata: {
          courseId: courses[2].id,
          paymentGateway: 'vnpay',
          gatewayTransactionId: 'VNP_20250818001'
        },
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      },
    }),
    prisma.payment.create({
      data: {
        userId: 'student_005',
        amount: 175.00,
        currency: 'USD',
        paymentMethod: 'MOMO',
        transactionId: 'TXN_005_20250819001',
        status: 'COMPLETED',
        description: 'Payment for 5-lesson package with Robert Davis',
        metadata: {
          teacherId: 'teacher_002',
          packageType: 'PACKAGE_5',
          lessonsCount: 5
        },
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
    }),
    prisma.payment.create({
      data: {
        userId: 'student_001',
        amount: 12.50,
        currency: 'USD',
        paymentMethod: 'VNPAY',
        transactionId: 'TXN_006_20250820001',
        status: 'COMPLETED',
        description: 'Payment for trial lesson with Maria Garcia',
        metadata: {
          teacherId: 'teacher_003',
          lessonType: 'trial',
          duration: 30
        },
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    }),
  ]);

  console.log('💳 Created payments');

  // Create Course Enrollments
  await Promise.all([
    prisma.courseEnrollment.create({
      data: {
        studentId: 'student_001',
        courseId: courses[0].id,
        paymentId: payments[0].id,
        status: 'ACTIVE',
        enrolledAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        completedLessons: 5,
        progress: 25.0,
        lastAccessedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        enrollmentNotes: 'Student is very engaged and making excellent progress.',
      },
    }),
    prisma.courseEnrollment.create({
      data: {
        studentId: 'student_002',
        courseId: courses[1].id,
        paymentId: payments[1].id,
        status: 'ACTIVE',
        enrolledAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
        completedLessons: 8,
        progress: 33.33,
        lastAccessedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        enrollmentNotes: 'Strong motivation for IELTS preparation. Target score 7.5.',
      },
    }),
    prisma.courseEnrollment.create({
      data: {
        studentId: 'student_004',
        courseId: courses[2].id,
        paymentId: payments[3].id,
        status: 'ACTIVE',
        enrolledAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        completedLessons: 3,
        progress: 20.0,
        lastAccessedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        enrollmentNotes: 'Beginner level student, needs encouragement and patience.',
      },
    }),
  ]);

  console.log('🎓 Created course enrollments');

  // Create Lesson Packages
  await Promise.all([
    prisma.lessonPackage.create({
      data: {
        studentId: 'student_003',
        teacherId: 'teacher_001',
        packageType: 'PACKAGE_10',
        totalLessons: 10,
        usedLessons: 3,
        remainingLessons: 7,
        durationPerLesson: 60,
        pricePerLesson: 25.00,
        totalPrice: 350.00,
        discountPercentage: 10,
        paymentId: payments[2].id,
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days from now
        isActive: true,
      },
    }),
    prisma.lessonPackage.create({
      data: {
        studentId: 'student_005',
        teacherId: 'teacher_002',
        packageType: 'PACKAGE_5',
        totalLessons: 5,
        usedLessons: 1,
        remainingLessons: 4,
        durationPerLesson: 60,
        pricePerLesson: 30.00,
        totalPrice: 175.00,
        discountPercentage: 5,
        paymentId: payments[4].id,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        isActive: true,
      },
    }),
  ]);

  console.log('📦 Created lesson packages');

  // Fetch lesson packages for booking references
  const lessonPackageStudent3 = await prisma.lessonPackage.findFirst({ 
    where: { studentId: 'student_003' } 
  });
  const lessonPackageStudent5 = await prisma.lessonPackage.findFirst({ 
    where: { studentId: 'student_005' } 
  });

  // Create Bookings
  const bookings = await Promise.all([
    // Trial lesson booking
    prisma.booking.create({
      data: {
        studentId: 'student_001',
        teacherId: 'teacher_003',
        scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), // 2 days ago, 10 AM
        duration: 30,
        notes: 'First trial lesson - assess current level and learning goals',
        status: 'COMPLETED',
        isTrialLesson: true,
      },
    }),
    // Course lesson bookings
    prisma.booking.create({
      data: {
        studentId: 'student_001',
        teacherId: 'teacher_001',
        courseId: courses[0].id,
        scheduledAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000), // Tomorrow, 2 PM
        duration: 90,
        notes: 'Business English - Focus on email communication',
        status: 'CONFIRMED',
        isTrialLesson: false,
      },
    }),
    prisma.booking.create({
      data: {
        studentId: 'student_002',
        teacherId: 'teacher_002',
        courseId: courses[1].id,
        scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000), // Day after tomorrow, 4 PM
        duration: 120,
        notes: 'IELTS Speaking practice - Mock test session',
        status: 'CONFIRMED',
        isTrialLesson: false,
      },
    }),
    // Package lesson bookings
    prisma.booking.create({
      data: {
        studentId: 'student_003',
        teacherId: 'teacher_001',
        lessonPackageId: lessonPackageStudent3?.id,
        scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000), // 3 days from now, 3 PM
        duration: 60,
        notes: 'Package lesson 4 - Advanced conversation practice',
        status: 'PENDING',
        isTrialLesson: false,
      },
    }),
    prisma.booking.create({
      data: {
        studentId: 'student_005',
        teacherId: 'teacher_002',
        lessonPackageId: lessonPackageStudent5?.id,
        scheduledAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000), // 4 days from now, 11 AM
        duration: 60,
        notes: 'Package lesson 2 - Grammar review and pronunciation',
        status: 'CONFIRMED',
        isTrialLesson: false,
      },
    }),
    // Past completed lessons
    prisma.booking.create({
      data: {
        studentId: 'student_002',
        teacherId: 'teacher_002',
        courseId: courses[1].id,
        scheduledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000), // 5 days ago, 2 PM
        duration: 120,
        notes: 'IELTS Reading comprehension strategies',
        status: 'COMPLETED',
        isTrialLesson: false,
      },
    }),
    prisma.booking.create({
      data: {
        studentId: 'student_003',
        teacherId: 'teacher_001',
        lessonPackageId: lessonPackageStudent3?.id,
        scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000), // 3 days ago, 4 PM
        duration: 60,
        notes: 'Package lesson 3 - Business vocabulary expansion',
        status: 'COMPLETED',
        isTrialLesson: false,
      },
    }),
  ]);

  console.log('📅 Created bookings');

  // Create Lessons based on bookings
  const lessons = [];
  for (const booking of bookings) {
    if (booking.status === 'COMPLETED') {
      const lesson = await prisma.lesson.create({
        data: {
          bookingId: booking.id,
          studentId: booking.studentId,
          teacherId: booking.teacherId,
          courseId: booking.courseId,
          scheduledAt: booking.scheduledAt,
          startedAt: booking.scheduledAt,
          endedAt: new Date(booking.scheduledAt.getTime() + booking.duration * 60 * 1000),
          duration: booking.duration,
          meetingUrl: `https://meet.antoree.com/room/${booking.id}`,
          notes: 'Excellent progress! Student demonstrated good understanding of the topic.',
          homework: 'Practice the vocabulary we covered today. Complete exercises 1-5 in the workbook.',
          status: 'COMPLETED',
        },
      });
      lessons.push(lesson);
    } else if (booking.status === 'CONFIRMED') {
      const lesson = await prisma.lesson.create({
        data: {
          bookingId: booking.id,
          studentId: booking.studentId,
          teacherId: booking.teacherId,
          courseId: booking.courseId,
          scheduledAt: booking.scheduledAt,
          duration: booking.duration,
          meetingUrl: `https://meet.antoree.com/room/${booking.id}`,
          status: 'SCHEDULED',
        },
      });
      lessons.push(lesson);
    }
  }

  console.log('📖 Created lessons');

  // Create Reviews
  await Promise.all([
    prisma.review.create({
      data: {
        studentId: 'student_001',
        teacherId: 'teacher_003',
        rating: 5,
        comment: 'Maria is an amazing teacher! Very patient and encouraging. Her trial lesson was exactly what I needed to get started.',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
    }),
    prisma.review.create({
      data: {
        studentId: 'student_002',
        teacherId: 'teacher_002',
        rating: 5,
        comment: 'Robert\'s IELTS preparation is top-notch. Very systematic approach and excellent feedback on my weak areas.',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
    }),
    prisma.review.create({
      data: {
        studentId: 'student_003',
        teacherId: 'teacher_001',
        rating: 5,
        comment: 'Emily\'s business English course is exactly what I needed. Professional, well-structured, and very practical.',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    }),
    prisma.review.create({
      data: {
        studentId: 'student_004',
        teacherId: 'teacher_003',
        rating: 4,
        comment: 'Great teacher for beginners. Makes learning fun and not intimidating at all.',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      },
    }),
    prisma.review.create({
      data: {
        studentId: 'student_005',
        teacherId: 'teacher_002',
        rating: 5,
        comment: 'Excellent pronunciation training. Robert really helped me improve my accent and clarity.',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      },
    }),
  ]);

  console.log('⭐ Created reviews');

  // Create System Configurations
  await Promise.all([
    prisma.systemConfig.create({
      data: {
        key: 'TRIAL_LESSON_DURATION',
        value: '30',
        type: 'number',
      },
    }),
    prisma.systemConfig.create({
      data: {
        key: 'REGULAR_LESSON_DURATION',
        value: '60',
        type: 'number',
      },
    }),
    prisma.systemConfig.create({
      data: {
        key: 'MAX_ADVANCE_BOOKING_DAYS',
        value: '30',
        type: 'number',
      },
    }),
    prisma.systemConfig.create({
      data: {
        key: 'MIN_ADVANCE_BOOKING_HOURS',
        value: '2',
        type: 'number',
      },
    }),
    prisma.systemConfig.create({
      data: {
        key: 'PLATFORM_COMMISSION_RATE',
        value: '0.15',
        type: 'number',
      },
    }),
    prisma.systemConfig.create({
      data: {
        key: 'PAYMENT_GATEWAY_CONFIG',
        value: JSON.stringify({
          vnpay: {
            enabled: true,
            merchantId: 'ANTOREE_VNPAY',
            apiUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
          },
          momo: {
            enabled: true,
            partnerCode: 'ANTOREE_MOMO',
            apiUrl: 'https://test-payment.momo.vn/v2/gateway/api/create'
          }
        }),
        type: 'json',
      },
    }),
    prisma.systemConfig.create({
      data: {
        key: 'EMAIL_TEMPLATES_ENABLED',
        value: 'true',
        type: 'boolean',
      },
    }),
    prisma.systemConfig.create({
      data: {
        key: 'AUTOMATIC_LESSON_REMINDERS',
        value: 'true',
        type: 'boolean',
      },
    }),
    prisma.systemConfig.create({
      data: {
        key: 'TEACHER_VERIFICATION_REQUIRED',
        value: 'true',
        type: 'boolean',
      },
    }),
    prisma.systemConfig.create({
      data: {
        key: 'REFUND_POLICY_HOURS',
        value: '24',
        type: 'number',
      },
    }),
  ]);

  console.log('⚙️ Created system configurations');

  console.log('🎉 Seed process completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- ${students.length} students created`);
  console.log(`- ${teachers.length} teachers created`);
  console.log(`- ${courses.length} courses created`);
  console.log(`- ${payments.length} payments created`);
  console.log(`- ${bookings.length} bookings created`);
  console.log(`- ${lessons.length} lessons created`);
  console.log('- 5 reviews created');
  console.log('- 10 system configurations created');
  console.log('\n✅ Database is ready for development and testing!');
}

main()
  .catch((e) => {
    console.error('❌ Seed process failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
