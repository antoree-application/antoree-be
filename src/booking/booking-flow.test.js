/**
 * Test Script for Teacher Booking Flow API
 * 
 * This script demonstrates the complete booking flow:
 * 1. Get available time slots
 * 2. Create booking with details
 * 3. Confirm booking
 * 4. Teacher responds to booking
 */

const API_BASE = 'http://localhost:3000/api';

// Test data
const TEACHER_ID = 'cm3teacher123def456';
const STUDENT_TOKEN = 'your-student-jwt-token';
const TEACHER_TOKEN = 'your-teacher-jwt-token';

async function testBookingFlow() {
  console.log('🚀 Starting Teacher Booking Flow Test...\n');

  try {
    // Step 1: Get Available Time Slots
    console.log('📅 Step 1: Getting available time slots...');
    const slotsResponse = await fetch(
      `${API_BASE}/bookings/flow/available-slots/${TEACHER_ID}?startDate=2024-02-15&duration=30`
    );
    const slots = await slotsResponse.json();
    console.log('✅ Available slots:', slots.availableSlots.length);
    
    if (slots.availableSlots.length === 0) {
      console.log('❌ No available slots found. Test cannot continue.');
      return;
    }

    // Step 2: Create Booking with Details
    console.log('\n📝 Step 2: Creating booking with student details...');
    const createBookingResponse = await fetch(
      `${API_BASE}/bookings/flow/create-with-details`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${STUDENT_TOKEN}`,
        },
        body: JSON.stringify({
          timeSlot: {
            teacherId: TEACHER_ID,
            scheduledAt: slots.availableSlots[0].dateTime,
            duration: 30,
            lessonType: 'trial'
          },
          contactInfo: {
            firstName: 'John',
            lastName: 'Doe',
            phone: '+84901234567',
            timezone: 'Asia/Ho_Chi_Minh'
          },
          learningGoals: {
            currentLevel: 'INTERMEDIATE',
            targetLevel: 'UPPER_INTERMEDIATE',
            learningObjectives: ['Improve speaking fluency', 'Business English'],
            focusAreas: ['Pronunciation', 'Grammar'],
            previousExperience: 'Self-taught for 2 years',
            timeline: '3-6 months',
            preferredFrequency: 2,
            additionalNotes: 'Need to prepare for job interview'
          },
          isTrialLesson: true,
          messageToTeacher: 'Looking forward to improving my speaking skills!',
          howFoundTeacher: 'API Test'
        })
      }
    );

    const booking = await createBookingResponse.json();
    console.log('✅ Booking created:', booking.id);
    console.log('   Status:', booking.status);
    console.log('   Scheduled:', booking.scheduledAt);

    // Step 3: Confirm Booking
    console.log('\n✅ Step 3: Confirming booking...');
    const confirmResponse = await fetch(
      `${API_BASE}/bookings/flow/confirm/${booking.id}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${STUDENT_TOKEN}`,
        },
        body: JSON.stringify({
          bookingId: booking.id,
          confirmationNotes: 'Ready for the lesson!',
          acceptTerms: true
        })
      }
    );

    const confirmation = await confirmResponse.json();
    console.log('✅ Booking confirmed!');
    console.log('   Confirmation Code:', confirmation.confirmation.confirmationCode);
    console.log('   Meeting URL:', confirmation.confirmation.meetingUrl);

    // Step 4: Teacher Gets Notifications
    console.log('\n🔔 Step 4: Getting teacher notifications...');
    const notificationsResponse = await fetch(
      `${API_BASE}/bookings/teacher/notifications`,
      {
        headers: {
          'Authorization': `Bearer ${TEACHER_TOKEN}`,
        }
      }
    );

    const notifications = await notificationsResponse.json();
    console.log('✅ Teacher notifications:', notifications.length);
    
    if (notifications.length > 0) { 
      console.log('   Latest notification:', notifications[0].title);
    }

    // Step 5: Teacher Responds to Booking
    console.log('\n👨‍🏫 Step 5: Teacher responding to booking...');
    const respondResponse = await fetch(
      `${API_BASE}/bookings/teacher/respond/${booking.id}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEACHER_TOKEN}`,
        },
        body: JSON.stringify({  
          action: 'ACCEPT',
          responseMessage: 'I look forward to our lesson! Please prepare some topics you would like to discuss.',
        })
      }
    );

    const response = await respondResponse.json();
    console.log('✅ Teacher response:', response.action);
    console.log('   Updated status:', response.booking.status);
    console.log('   Student notified:', response.studentNotified);

    // Step 6: Check Final Status
    console.log('\n📊 Step 6: Checking final booking status...');
    const statusResponse = await fetch(
      `${API_BASE}/bookings/flow/status/${booking.id}`,
      {
        headers: {
          'Authorization': `Bearer ${STUDENT_TOKEN}`,
        }
      }
    );

    const status = await statusResponse.json();
    console.log('✅ Final status:', status.currentStep);
    console.log('   Progress:', `${status.progress}%`);
    console.log('   Available actions:', status.availableActions.join(', '));

    console.log('\n🎉 Booking flow test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Booking ID: ${booking.id}`);
    console.log(`   - Teacher: ${slots.teacherName}`);
    console.log(`   - Student: John Doe`);
    console.log(`   - Scheduled: ${booking.scheduledAt}`);
    console.log(`   - Status: ${response.booking.status}`);
    console.log(`   - Confirmation Code: ${confirmation.confirmation.confirmationCode}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Dashboard Tests
async function testDashboards() {
  console.log('\n📊 Testing Dashboards...\n');

  try {
    // Student Dashboard
    console.log('👨‍🎓 Testing Student Dashboard...');
    const studentDashboard = await fetch(
      `${API_BASE}/bookings/student/dashboard`,
      {
        headers: {
          'Authorization': `Bearer ${STUDENT_TOKEN}`,
        }
      }
    );
    const studentData = await studentDashboard.json();
    console.log('✅ Student dashboard loaded');
    console.log(`   - Active requests: ${studentData.activeRequests?.length || 0}`);
    console.log(`   - Upcoming lessons: ${studentData.upcomingLessons?.length || 0}`);
    console.log(`   - Completed lessons: ${studentData.completedLessons?.length || 0}`);

    // Teacher Dashboard
    console.log('\n👨‍🏫 Testing Teacher Dashboard...');
    const teacherDashboard = await fetch(
      `${API_BASE}/bookings/teacher/dashboard`,
      {
        headers: {
          'Authorization': `Bearer ${TEACHER_TOKEN}`,
        }
      }
    );
    const teacherData = await teacherDashboard.json();
    console.log('✅ Teacher dashboard loaded');
    console.log(`   - Pending requests: ${teacherData.pendingRequests?.length || 0}`);
    console.log(`   - Upcoming lessons: ${teacherData.upcomingLessons?.length || 0}`);
    console.log(`   - Total bookings: ${teacherData.stats?.totalBookings || 0}`);

  } catch (error) {
    console.error('❌ Dashboard test failed:', error.message);
  }
}

// Error Handling Tests
async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling...\n');

  try {
    // Test invalid teacher ID
    console.log('Testing invalid teacher ID...');
    const invalidResponse = await fetch(
      `${API_BASE}/bookings/flow/available-slots/invalid-id`
    );
    console.log(`✅ Invalid teacher ID status: ${invalidResponse.status}`);

    // Test unauthorized access
    console.log('Testing unauthorized access...');
    const unauthorizedResponse = await fetch(
      `${API_BASE}/bookings/flow/create-with-details`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      }
    );
    console.log(`✅ Unauthorized access status: ${unauthorizedResponse.status}`);

  } catch (error) {
    console.error('❌ Error handling test failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  await testBookingFlow();
  await testDashboards();
  await testErrorHandling();
}

// Export for use in other test files
module.exports = {
  testBookingFlow,
  testDashboards,
  testErrorHandling,
  runAllTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}
