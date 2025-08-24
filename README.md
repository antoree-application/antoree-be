# Antoree - Online English Learning Platform

<div align="center">

![Antoree Logo](https://via.placeholder.com/200x80/0066CC/FFFFFF?text=ANTOREE)

**A comprehensive NestJS-powered platform connecting English students with qualified teachers worldwide**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)

</div>

## 🌟 Overview

Antoree is a modern, scalable online English learning platform built with NestJS that connects students with qualified English teachers. The platform offers real-time communication, flexible scheduling, comprehensive payment processing, and an intuitive learning experience.

### ✨ Key Features

- 🎯 **Smart Teacher Matching** - Advanced filtering and recommendation system
- 💳 **Multi-Payment Gateway** - Support for MoMo, VNPay, ATM cards, and credit cards
- 🔄 **Real-time Notifications** - WebSocket-powered instant messaging and updates
- 📅 **Flexible Scheduling** - Smart booking system with availability management
- 🎥 **Integrated Video Calls** - Seamless lesson delivery via video conferencing
- 📊 **Analytics Dashboard** - Comprehensive learning progress tracking
- 🚀 **Scalable Architecture** - Redis caching and background job processing
- 🔐 **Enterprise Security** - JWT authentication with role-based access control

## 🏗️ Architecture

### Technology Stack

- **Backend Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis with Bull Queue for background jobs
- **Real-time**: Socket.IO for WebSocket connections
- **Payments**: MoMo & VNPay integration
- **Authentication**: JWT with Passport.js
- **API Documentation**: Swagger/OpenAPI
- **Message Queue**: RabbitMQ for async processing

### System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App]
        MOBILE[Mobile App]
        ADMIN[Admin Dashboard]
    end
    
    subgraph "API Gateway"
        NGINX[Nginx Load Balancer]
    end
    
    subgraph "Application Layer"
        NEST[NestJS Application]
        WS[WebSocket Gateway]
        AUTH[Authentication Service]
    end
    
    subgraph "Business Logic"
        USER[User Management]
        BOOKING[Booking System]
        PAYMENT[Payment Processing]
        NOTIFICATION[Notification Service]
        SCHEDULING[Scheduling Engine]
    end
    
    subgraph "Data Layer"
        POSTGRES[(PostgreSQL)]
        REDIS[(Redis Cache)]
        RABBITMQ[(RabbitMQ)]
    end
    
    subgraph "External Services"
        MOMO[MoMo Payment]
        VNPAY[VNPay Gateway]
        EMAIL[Email Service]
        SMS[SMS Provider]
        VIDEO[Video Call API]
    end
    
    WEB --> NGINX
    MOBILE --> NGINX
    ADMIN --> NGINX
    
    NGINX --> NEST
    NEST --> WS
    NEST --> AUTH
    
    NEST --> USER
    NEST --> BOOKING
    NEST --> PAYMENT
    NEST --> NOTIFICATION
    NEST --> SCHEDULING
    
    USER --> POSTGRES
    BOOKING --> POSTGRES
    PAYMENT --> POSTGRES
    NOTIFICATION --> POSTGRES
    SCHEDULING --> POSTGRES
    
    NEST --> REDIS
    NOTIFICATION --> RABBITMQ
    SCHEDULING --> RABBITMQ
    
    PAYMENT --> MOMO
    PAYMENT --> VNPAY
    NOTIFICATION --> EMAIL
    NOTIFICATION --> SMS
    BOOKING --> VIDEO
```

## 📋 Student Learning Journey

```mermaid
flowchart TD
    A[Student visits platform] --> B[Browse/Search Teachers]
    B --> C{Filter Teachers?}
    C -->|Yes| D[Apply Filters<br/>- Subject level<br/>- Price range<br/>- Availability<br/>- Rating<br/>- Native speaker]
    C -->|No| E[View Teacher List]
    D --> E
    
    E --> F[View Teacher Profile]
    F --> G[Check Teacher Details<br/>- Bio & Experience<br/>- Teaching style<br/>- Reviews<br/>- Schedule<br/>- Hourly rate]
    
    G --> H{Interested in Teacher?}
    H -->|No| B
    H -->|Yes| I[Book Trial Lesson]
    
    I --> J[Select Available Time Slot]
    J --> K[Provide Contact Info<br/>& Learning Goals]
    K --> L[Confirm Trial Booking]
    
    L --> M[Teacher Receives Notification]
    M --> N{Teacher Accepts?}
    N -->|No| O[Student notified<br/>Suggest other teachers] --> B
    N -->|Yes| P[Trial Lesson Confirmed]
    
    P --> Q[Attend Trial Lesson<br/>Via integrated video call]
    Q --> R[Trial Lesson Completed]
    
    R --> S{Student Satisfied?}
    S -->|No| T[Leave Feedback] --> U[Search Other Teachers] --> B
    S -->|Yes| V[View Lesson Packages]
    
    V --> W[Select Package<br/>- 5 lessons<br/>- 10 lessons<br/>- 20 lessons<br/>- Custom package]
    W --> X[Schedule Regular Lessons]
    X --> Y[Proceed to Payment]
    
    Y --> Z[Choose Payment Method<br/>- MoMo E-Wallet<br/>- ATM Card<br/>- QR Code Scan<br/>- VNPay]
    Z --> AA[Process Payment]
    
    AA --> BB{Payment Successful?}
    BB -->|No| CC[Payment Failed<br/>Try again] --> Y
    BB -->|Yes| DD[Package Purchased]
    
    DD --> EE[Lessons Scheduled in Calendar]
    EE --> FF[Both parties receive confirmation]
    FF --> GG[Start Regular Lessons]
    
    GG --> HH[Attend Scheduled Lessons]
    HH --> II[Track Progress & Feedback]
    II --> JJ{Package Completed?}
    JJ -->|No| HH
    JJ -->|Yes| KK[Renew Package or Find New Teacher]
    KK --> V
    
    %% Admin/Teacher flows
    LL[Teacher Registration] --> MM[Profile Setup & Verification]
    MM --> NN[Set Availability & Rates]
    NN --> OO[Teacher Profile Live]
    OO --> PP[Receive Booking Requests]
    
    %% Styling
    classDef studentAction fill:#e1f5fe
    classDef teacherAction fill:#f3e5f5
    classDef systemAction fill:#e8f5e8
    classDef decision fill:#fff3e0
    classDef payment fill:#fce4ec
    
    class A,B,D,E,F,G,I,J,K,Q,R,T,U,V,W,X,HH,II studentAction
    class LL,MM,NN,OO,PP,M teacherAction
    class L,P,EE,FF systemAction
    class C,H,N,S,BB,JJ decision
    class Y,Z,AA,CC,DD payment
```

## 💳 Payment Processing System

### Supported Payment Methods

#### 🟢 MoMo Integration
- **E-Wallet** (`captureWallet`): Direct payment using MoMo app
- **ATM Card** (`payWithATM`): Bank card payment via MoMo gateway
- **QR Code** (`payWithCC`): Universal QR code scanning

#### 🟡 VNPay Integration
- **Bank Transfer**: Direct bank account transfers
- **Credit/Debit Cards**: International and domestic cards
- **E-Banking**: Online banking integration

### Payment Flow Architecture

```mermaid
sequenceDiagram
    participant Student
    participant API as Antoree API
    participant Cache as Redis Cache
    participant MoMo as MoMo Gateway
    participant VNPay as VNPay Gateway
    participant Queue as Bull Queue
    participant DB as PostgreSQL
    
    Student->>API: Create Course Payment
    API->>Cache: Store payment state
    API->>DB: Create payment record
    
    alt MoMo Payment
        API->>MoMo: Generate payment URL
        MoMo-->>API: Payment URL + QR
        API-->>Student: Redirect to MoMo
        Student->>MoMo: Complete payment
        MoMo->>API: Webhook notification
    else VNPay Payment
        API->>VNPay: Generate payment URL
        VNPay-->>API: Payment URL
        API-->>Student: Redirect to VNPay
        Student->>VNPay: Complete payment
        VNPay->>API: Return callback
    end
    
    API->>Cache: Update payment state
    API->>DB: Update payment status
    API->>Queue: Queue success notifications
    Queue->>Student: Email confirmation
    Queue->>Teacher: New enrollment alert
```

### Payment State Caching

The system implements intelligent payment state caching using Redis:

```typescript
interface PaymentCacheData {
  paymentId: string;
  userId: string;
  courseId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  paymentMethod: 'momo_wallet' | 'momo_atm' | 'momo_qr' | 'vnpay';
  gatewayResponse?: any;
  createdAt: Date;
  expiresAt: Date;
  metadata: {
    studentInfo: StudentInfo;
    courseDetails: CourseDetails;
    scheduledLessons?: Date[];
    specialRequests?: string;
  };
}
```

**Key Features:**
- ⚡ **Fast State Retrieval**: Sub-millisecond payment status checks
- 🔄 **Automatic Expiration**: Expired payments cleaned up automatically
- 📊 **Analytics Support**: Payment pattern analysis and monitoring
- 🛡️ **Security**: Encrypted sensitive data in cache
- 🚀 **Background Processing**: Queue-based notification delivery

## 📡 Real-time Notification System

### WebSocket Architecture

The platform uses Socket.IO for real-time communication:

```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
  namespace: '/notifications'
})
export class NotificationGateway {
  @SubscribeMessage('join_user_room')
  handleJoinUserRoom(client: Socket, payload: { userId: string }) {
    // Real-time user-specific notifications
  }

  @SubscribeMessage('join_booking_room')
  handleJoinBookingRoom(client: Socket, payload: { bookingId: string }) {
    // Real-time booking updates
  }
}
```

### Notification Types

#### 🔔 Student Notifications
- **Booking Confirmations**: Instant teacher acceptance/decline
- **Lesson Reminders**: 24h, 1h, and 15-minute alerts
- **Payment Updates**: Real-time payment status changes
- **New Messages**: Teacher communications
- **Schedule Changes**: Lesson reschedule notifications

#### 👩‍🏫 Teacher Notifications
- **New Bookings**: Instant booking request alerts
- **Payment Confirmations**: Student payment success notifications
- **Student Messages**: Real-time chat notifications
- **Schedule Updates**: Availability conflicts and updates
- **Performance Metrics**: Weekly teaching statistics

### Notification Delivery Channels

```mermaid
graph LR
    subgraph "Notification Engine"
        TRIGGER[Event Trigger]
        QUEUE[Bull Queue]
        PROCESSOR[Notification Processor]
    end
    
    subgraph "Delivery Channels"
        WS[WebSocket]
        EMAIL[Email]
        SMS[SMS]
        PUSH[Push Notification]
        INAPP[In-App]
    end
    
    subgraph "User Devices"
        BROWSER[Web Browser]
        MOBILE[Mobile App]
        DESKTOP[Desktop App]
    end
    
    TRIGGER --> QUEUE
    QUEUE --> PROCESSOR
    
    PROCESSOR --> WS
    PROCESSOR --> EMAIL
    PROCESSOR --> SMS
    PROCESSOR --> PUSH
    PROCESSOR --> INAPP
    
    WS --> BROWSER
    PUSH --> MOBILE
    EMAIL --> DESKTOP
    INAPP --> BROWSER
    INAPP --> MOBILE
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/antoree-be.git
cd antoree-be
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
cp .env.example .env
# Configure your environment variables
```

4. **Database setup**
```bash
# Run PostgreSQL and Redis
docker-compose up -d postgres redis

# Run database migrations
npx prisma migrate dev
npx prisma db seed
```

5. **Start the application**
```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/antoree"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=mypassword

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# MoMo Payment Gateway
MOMO_PARTNER_CODE=MOMO
MOMO_ACCESS_KEY=F8BBA842ECF85
MOMO_SECRET_KEY=K951B6PE1waDMi640xX08PD3vg6EkVlz
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_RETURN_URL=http://localhost:8080/api/payments/webhook/momo/return
MOMO_NOTIFY_URL=http://localhost:8080/payments/webhook/momo

# VNPay Payment Gateway
VNPAY_TMN_CODE=your_terminal_code
VNPAY_SECRET_KEY=your_secret_key
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3000/payment/vnpay/return

# Frontend
FRONTEND_URL=http://localhost:3001

# External Services
EMAIL_SERVICE_API_KEY=your_email_service_key
SMS_SERVICE_API_KEY=your_sms_service_key
VIDEO_CALL_API_KEY=your_video_call_service_key
```

## 📚 API Documentation

### Core Endpoints

#### Authentication
```http
POST /auth/register          # User registration
POST /auth/login             # User login
POST /auth/refresh           # Token refresh
POST /auth/logout            # User logout
```

#### User Management
```http
GET    /users/profile        # Get user profile
PUT    /users/profile        # Update profile
GET    /users/teachers       # Browse teachers
GET    /users/students       # List students (admin)
```

#### Booking System
```http
POST   /bookings/trial       # Book trial lesson
GET    /bookings             # List user bookings
PUT    /bookings/:id/confirm # Confirm booking
DELETE /bookings/:id         # Cancel booking
```

#### Payment Processing
```http
POST   /payments/simple/course         # Create course payment
GET    /payments/methods               # Available payment methods
POST   /payments/:id/momo             # Generate MoMo payment URL
POST   /payments/:id/vnpay            # Generate VNPay payment URL
GET    /payments/result/:id           # Payment result
```

#### Real-time Notifications
```http
GET    /notifications                 # Get user notifications
PUT    /notifications/:id/read        # Mark as read
DELETE /notifications/:id             # Delete notification
```

### Swagger Documentation

Access the interactive API documentation at: `http://localhost:8080/api/docs`

## 🧪 Testing

### Test Suites

```bash
# Unit tests
npm run test

# Integration tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Postman Collections

The project includes comprehensive Postman collections:

- **Authentication API** - User authentication flows
- **Booking API** - Complete booking system testing
- **Payment API** - MoMo and VNPay payment flows
- **Notification API** - Real-time notification testing

Import collections from `/postman/` directory.

### Test Data

```bash
# Seed test data
npm run db:seed

# Reset database
npm run db:reset
```

## 🔧 Development

### Project Structure

```
src/
├── auth/                 # Authentication & authorization
├── users/                # User management
├── teachers/             # Teacher-specific features
├── students/             # Student-specific features
├── booking/              # Booking system
├── payment/              # Payment processing
├── notifications/        # Real-time notifications
├── scheduling/           # Lesson scheduling
├── courses/              # Course management
├── reviews/              # Rating & review system
├── common/               # Shared utilities
└── config/               # Configuration files

prisma/
├── schema.prisma         # Database schema
└── migrations/           # Database migrations

postman/                  # API testing collections
docker/                   # Docker configurations
```

### Code Quality

```bash
# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format

# Type checking
npm run type-check
```

### Database Management

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name your_migration_name

# View database
npx prisma studio
```

## 🚢 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Production build
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

1. **Build the application**
```bash
npm run build
```

2. **Set production environment variables**

3. **Run database migrations**
```bash
npx prisma migrate deploy
```

4. **Start the application**
```bash
npm run start:prod
```

### Environment-specific Configurations

- **Development**: Full debugging, hot reload
- **Staging**: Production-like with test data
- **Production**: Optimized, monitoring enabled

## 📊 Monitoring & Analytics

### Health Checks

```http
GET /health              # Application health
GET /health/db           # Database connectivity  
GET /health/redis        # Redis connectivity
GET /health/queue        # Background job status
```

### Metrics

The application exposes the following metrics:

- **API Performance**: Response times, error rates
- **Payment Processing**: Success rates, gateway performance
- **Real-time Connections**: WebSocket connection counts
- **Background Jobs**: Queue processing metrics
- **Database**: Query performance, connection pools

### Logging

Structured logging with correlation IDs:

```typescript
this.logger.log('Payment processed successfully', {
  paymentId: payment.id,
  userId: user.id,
  amount: payment.amount,
  gateway: 'momo',
  correlationId: request.correlationId
});
```

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (Student, Teacher, Admin)
- Rate limiting and request throttling
- CORS protection

### Payment Security
- Cryptographic signature verification
- PCI DSS compliance measures
- Encrypted payment state storage
- Fraud detection algorithms

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- HTTPS enforcement

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- Follow TypeScript best practices
- Maintain test coverage above 80%
- Use conventional commit messages
- Document new features and APIs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Backend Development**: NestJS, TypeScript, PostgreSQL
- **Payment Integration**: MoMo, VNPay gateway specialists
- **Real-time Systems**: WebSocket and notification experts
- **DevOps**: Docker, Redis, background job processing

## 📞 Support

- **Documentation**: [docs.antoree.com](https://docs.antoree.com)
- **Issues**: [GitHub Issues](https://github.com/your-org/antoree-be/issues)
- **Email**: support@antoree.com
- **Discord**: [Antoree Community](https://discord.gg/antoree)

---

<div align="center">

**Built with ❤️ by the Antoree Team**

[Website](https://antoree.com) • [Documentation](https://docs.antoree.com) • [API Reference](https://api.antoree.com/docs)

</div>
