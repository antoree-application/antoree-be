# Course Module - API Documentation

## Overview

The Course Module provides comprehensive course management functionality for the Antoree platform. It allows teachers to create, manage, and track their English courses, while students and visitors can discover and browse available courses.

## Features

### Teacher Features
- ✅ Create new courses with detailed specifications
- ✅ Update existing course information
- ✅ Soft delete courses (deactivation)
- ✅ View personal course analytics
- ✅ Manage course availability status

### Student/Public Features
- ✅ Browse all available courses with pagination
- ✅ Search courses by name, description, or teacher specialties
- ✅ Filter courses by multiple criteria (level, price, duration, etc.)
- ✅ View detailed course information
- ✅ Discover popular courses
- ✅ Browse courses by specific teachers

### Analytics & Insights
- ✅ Course booking statistics
- ✅ Revenue tracking
- ✅ Monthly trend analysis
- ✅ Completion rates
- ✅ Rating and review integration

## API Endpoints

### Course Management (Teacher Only)

#### Create Course
```http
POST /api/courses
Authorization: Bearer {teacherToken}
Content-Type: application/json

{
  "name": "Business English Mastery",
  "description": "A comprehensive course designed to improve your business English skills",
  "duration": 60,
  "totalLessons": 10,
  "price": 1500000,
  "level": "INTERMEDIATE",
  "isActive": true
}
```

#### Get My Courses
```http
GET /api/courses/my-courses?page=1&limit=10&sortBy=createdAt&sortOrder=desc
Authorization: Bearer {teacherToken}
```

#### Update Course
```http
PATCH /api/courses/{courseId}
Authorization: Bearer {teacherToken}
Content-Type: application/json

{
  "name": "Advanced Business English",
  "price": 1800000
}
```

#### Delete Course
```http
DELETE /api/courses/{courseId}
Authorization: Bearer {teacherToken}
```

#### Get Course Analytics
```http
GET /api/courses/{courseId}/analytics
Authorization: Bearer {teacherToken}
```

### Course Discovery (Public)

#### Get All Courses
```http
GET /api/courses?page=1&limit=10&sortBy=createdAt&sortOrder=desc&isActive=true
```

#### Search Courses with Filters
```http
GET /api/courses?search=business&level=INTERMEDIATE&minPrice=500000&maxPrice=2000000&minDuration=45&maxDuration=90
```

#### Get Course Details
```http
GET /api/courses/{courseId}
```

#### Get Popular Courses
```http
GET /api/courses/popular?limit=10
```

#### Search Courses by Text
```http
GET /api/courses/search?q=business english&limit=10
```

#### Get Courses by Teacher
```http
GET /api/courses/teacher/{teacherId}?page=1&limit=10
```

## Data Models

### Course
```typescript
{
  id: string;
  teacherId: string;
  name: string;
  description?: string;
  duration: number;        // Minutes per lesson
  totalLessons: number;    // Total lessons in course
  price: string;           // Price in VND
  level: EnglishLevel;     // BEGINNER, ELEMENTARY, INTERMEDIATE, etc.
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  teacher?: TeacherInfo;
  stats?: CourseStats;
}
```

### English Levels
- `BEGINNER`
- `ELEMENTARY`
- `INTERMEDIATE`
- `UPPER_INTERMEDIATE`
- `ADVANCED`
- `PROFICIENCY`

## Search & Filter Options

### Search Parameters
- `search`: Text search in name and description
- `level`: Filter by English level
- `minPrice` / `maxPrice`: Price range in VND
- `minDuration` / `maxDuration`: Lesson duration in minutes
- `minLessons` / `maxLessons`: Total lessons count
- `isActive`: Filter active/inactive courses
- `teacherId`: Filter by specific teacher
- `page` / `limit`: Pagination
- `sortBy`: Sort field (name, price, duration, totalLessons, level, createdAt)
- `sortOrder`: Sort direction (asc, desc)

### Example Queries

**Find beginner courses under 1M VND:**
```
GET /api/courses?level=BEGINNER&maxPrice=1000000
```

**Find intensive courses (90+ minutes):**
```
GET /api/courses?minDuration=90
```

**Find short courses (5 lessons or fewer):**
```
GET /api/courses?maxLessons=5
```

**Find business English courses:**
```
GET /api/courses/search?q=business
```

## Business Rules

### Course Creation
1. Only approved teachers can create courses
2. Course names must be unique per teacher
3. Duration must be between 30-180 minutes
4. Total lessons must be between 1-100
5. Price must be non-negative

### Course Updates
- Teachers can only update their own courses
- Name changes must not conflict with existing courses
- Price changes apply to new bookings only

### Course Deletion
- Soft delete (sets isActive to false)
- Cannot delete courses with active bookings
- Historical data is preserved for analytics

### Course Analytics
- Only course owners can view analytics
- Includes booking statistics, revenue, and trends
- Monthly data for last 12 months

## Integration Points

### With Booking System
- Courses can be booked through the booking module
- Course pricing integrates with payment system
- Lesson scheduling uses course duration settings

### With Teacher Management
- Course creation requires approved teacher status
- Teacher ratings affect course visibility
- Teacher specialties influence search results

### With Student Experience
- Course levels match student English levels
- Search results personalized based on student history
- Course recommendations based on student preferences

## Error Handling

### Common Errors
- `403 FORBIDDEN`: Only approved teachers can create courses
- `404 NOT_FOUND`: Course not found
- `409 CONFLICT`: Course name already exists
- `400 BAD_REQUEST`: Invalid course parameters or active bookings prevent deletion

### Validation Errors
- Invalid English level values
- Duration outside allowed range (30-180 minutes)
- Total lessons outside allowed range (1-100)
- Negative prices

## Performance Considerations

### Caching Strategy
- Popular courses cached for 1 hour
- Course search results cached for 30 minutes
- Course details cached for 15 minutes

### Database Optimization
- Indexed fields: teacherId, level, price, isActive, createdAt
- Composite indexes for common filter combinations
- Pagination limits prevent large result sets

### Analytics Performance
- Monthly trend data pre-aggregated
- Statistics calculated asynchronously
- Heavy analytics queries run during off-peak hours

## Testing Examples

### Postman Collection
The complete Postman collection includes:
- Course management scenarios for teachers
- Public course discovery flows
- Search and filter examples
- Common course creation scenarios (IELTS, Conversation, Grammar)

### Sample Course Data
```json
{
  "name": "IELTS Preparation Intensive",
  "description": "Comprehensive IELTS preparation covering all four skills",
  "duration": 90,
  "totalLessons": 20,
  "price": 2500000,
  "level": "UPPER_INTERMEDIATE"
}
```

## Future Enhancements

### Planned Features
- [ ] Course categories and tags
- [ ] Course prerequisites and learning paths
- [ ] Bulk course operations for teachers
- [ ] Course templates and cloning
- [ ] Advanced analytics with ML insights
- [ ] Course recommendations engine
- [ ] Multi-language course descriptions
- [ ] Course difficulty progression tracking

### API Versioning
- Current version: v1
- Backward compatibility maintained
- Deprecation notices for breaking changes
