const db = require('./config/database');
const enrollmentModel = require('./models/enrollmentModel');

async function testEnrollmentFix() {
  console.log('Testing enrollment fix for re-enrolling soft-deleted users...');
  
  // Test data
  const courseId = 1;
  const userId = 999; // Use a test user ID that likely doesn't exist
  
  try {
    // First, clean up any existing test data
    await db.query('DELETE FROM course_enrollments WHERE course_id = ? AND user_id = ?', [courseId, userId]);
    console.log('Cleaned up existing test data');
    
    // Create a new enrollment
    const enrollmentId1 = await enrollmentModel.create({
      course_id: courseId,
      user_id: userId,
      role: 'learner',
      status: 'active'
    });
    console.log(`Created enrollment with ID: ${enrollmentId1}`);
    
    // Soft delete the enrollment
    await enrollmentModel.softDelete(enrollmentId1);
    console.log(`Soft deleted enrollment ID: ${enrollmentId1}`);
    
    // Verify it's soft deleted
    const deletedEnrollment = await db.query(
      'SELECT * FROM course_enrollments WHERE id = ? AND is_deleted = TRUE',
      [enrollmentId1]
    );
    if (deletedEnrollment[0].length === 0) {
      throw new Error('Enrollment was not soft deleted');
    }
    console.log('Verified enrollment is soft deleted');
    
    // Try to create enrollment again (should restore the soft-deleted one)
    const enrollmentId2 = await enrollmentModel.create({
      course_id: courseId,
      user_id: userId,
      role: 'learner',
      status: 'active'
    });
    console.log(`Re-enrollment returned ID: ${enrollmentId2}`);
    
    // Verify it's the same ID (restored)
    if (enrollmentId1 !== enrollmentId2) {
      throw new Error(`Expected restored enrollment ID ${enrollmentId1}, got ${enrollmentId2}`);
    }
    console.log('SUCCESS: Soft-deleted enrollment was restored!');
    
    // Verify it's no longer soft deleted
    const restoredEnrollment = await db.query(
      'SELECT * FROM course_enrollments WHERE id = ? AND is_deleted = FALSE',
      [enrollmentId1]
    );
    if (restoredEnrollment[0].length === 0) {
      throw new Error('Enrollment was not restored properly');
    }
    console.log('Verified enrollment is restored (is_deleted = FALSE)');
    
    // Test bulkCreate as well
    await enrollmentModel.softDelete(enrollmentId1);
    console.log('Soft deleted again for bulkCreate test');
    
    const bulkIds = await enrollmentModel.bulkCreate([
      { course_id: courseId, user_id: userId, role: 'learner', status: 'active' }
    ]);
    console.log(`bulkCreate returned IDs: ${bulkIds}`);
    
    if (bulkIds[0] !== enrollmentId1) {
      throw new Error(`Expected restored enrollment ID ${enrollmentId1} from bulkCreate, got ${bulkIds[0]}`);
    }
    console.log('SUCCESS: bulkCreate also restores soft-deleted enrollments!');
    
    // Clean up
    await db.query('DELETE FROM course_enrollments WHERE course_id = ? AND user_id = ?', [courseId, userId]);
    console.log('Cleaned up test data');
    
    console.log('\n✅ All tests passed! The fix works correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testEnrollmentFix();