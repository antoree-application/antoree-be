// Example usage of the Student feature

// 1. Student Registration (Public endpoint)
const registerStudent = async () => {
  const newStudent = {
    email: "student@example.com",
    password: "securePassword123",
    firstName: "John",
    lastName: "Doe",
    englishLevel: "BEGINNER",
    learningGoals: "Improve conversational English for business",
    timezone: "Asia/Ho_Chi_Minh"
  };

  // POST /students
  const response = await fetch('/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newStudent)
  });
  
  return response.json();
};

// 2. Student Profile Management (Authenticated)
const getMyProfile = async (token: string) => {
  // GET /students/profile
  const response = await fetch('/students/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  return response.json();
};

const updateMyProfile = async (token: string, updates: any) => {
  // PATCH /students/profile
  const response = await fetch('/students/profile', {
    method: 'PATCH',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  return response.json();
};

// 3. Admin/Teacher Operations
const getAllStudents = async (adminToken: string, filters?: any) => {
  const queryParams = new URLSearchParams(filters).toString();
  
  // GET /students?search=john&englishLevel=BEGINNER&page=1&limit=10
  const response = await fetch(`/students?${queryParams}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  return response.json();
};

const getStudentById = async (adminToken: string, studentId: string) => {
  // GET /students/:id
  const response = await fetch(`/students/${studentId}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  return response.json();
};

const getStudentStats = async (token: string, studentId: string) => {
  // GET /students/:id/stats
  const response = await fetch(`/students/${studentId}/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  return response.json();
};

// 4. Admin Management Operations
const deactivateStudent = async (adminToken: string, studentId: string) => {
  // PATCH /students/:id/deactivate
  const response = await fetch(`/students/${studentId}/deactivate`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  return response.json();
};

const activateStudent = async (adminToken: string, studentId: string) => {
  // PATCH /students/:id/activate
  const response = await fetch(`/students/${studentId}/activate`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  return response.json();
};

const deleteStudent = async (adminToken: string, studentId: string) => {
  // DELETE /students/:id
  const response = await fetch(`/students/${studentId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  return response.ok;
};

// Example Usage Scenarios
export const studentExamples = {
  // New student registration
  registration: registerStudent,
  
  // Student self-service
  profile: {
    get: getMyProfile,
    update: updateMyProfile,
    stats: getStudentStats
  },
  
  // Admin operations
  admin: {
    list: getAllStudents,
    get: getStudentById,
    deactivate: deactivateStudent,
    activate: activateStudent,
    delete: deleteStudent
  },
  
  // Common search examples
  searchExamples: {
    // Search by name
    byName: { search: "john" },
    
    // Filter by English level
    byLevel: { englishLevel: "BEGINNER" },
    
    // Pagination
    paginated: { page: 1, limit: 10 },
    
    // Combined filters
    advanced: { 
      search: "john", 
      englishLevel: "INTERMEDIATE", 
      timezone: "Asia/Ho_Chi_Minh",
      page: 1, 
      limit: 20,
      sortBy: "createdAt",
      sortOrder: "desc"
    }
  }
};

/* 
Example Response Formats:

Student Profile:
{
  "id": "clxxx...",
  "email": "student@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+84123456789",
  "avatar": "https://...",
  "role": "STUDENT",
  "isActive": true,
  "lastLogin": "2025-08-20T10:30:00Z",
  "createdAt": "2025-08-01T09:00:00Z",
  "updatedAt": "2025-08-20T10:30:00Z",
  "studentId": "clyyy...",
  "englishLevel": "BEGINNER",
  "learningGoals": "Improve conversational English",
  "timezone": "Asia/Ho_Chi_Minh",
  "fullName": "John Doe",
  "totalBookings": 5,
  "totalLessons": 3
}

Student List:
{
  "students": [...],
  "total": 150,
  "page": 1,
  "limit": 10,
  "totalPages": 15
}

Student Statistics:
{
  "totalBookings": 10,
  "totalLessons": 8,
  "completedLessons": 6,
  "upcomingLessons": 2,
  "totalPayments": 3
}
*/
