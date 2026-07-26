/**
 * seed-sops.js
 * 
 * Seeds comprehensive SOP demo data for testing the SOP Management module.
 * 
 * Run: node server/seed-sops.js
 * 
 * This script creates:
 *   1. Categories (Safety, Quality Assurance, Operations, HR, IT)
 *   2. SOPs with varying statuses (Draft, For Review, Approved, Published, Archived)
 *   3. Sections (Purpose, Scope, Responsibilities, Procedure, References)
 *   4. Steps (ordered procedural steps)
 *   5. Versions for published SOPs
 *   6. Assignments (Department, Position, User)
 *   7. Acknowledgements (Pending + Acknowledged)
 *   8. Approvals (Approved/Rejected)
 *   9. Change logs (audit trail entries)
 */

const path = require('path');
const fs = require('fs');
const lockFile = path.join(__dirname, '.tmp', 'db-init.lock');
try { if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile); } catch (e) { /* ignore */ }

const db = require('./config/database');
const { generateSopCode } = require('./utils/sopUtils');

async function seedSops() {
  console.log('--- Seeding SOP Demo Data ---\n');

  // Step 1: Seed Categories
  console.log('1. Seeding categories...');
  const categories = [
    { name: 'Safety', code: 'SAFETY', description: 'Workplace safety and emergency procedures' },
    { name: 'Quality Assurance', code: 'QA', description: 'Quality management and ISO/QMS procedures' },
    { name: 'Operations', code: 'OPS', description: 'Standard operational procedures' },
    { name: 'HR & Admin', code: 'HR', description: 'Human resources and administrative procedures' },
    { name: 'IT & Security', code: 'ITSEC', description: 'Information technology and security procedures' },
    { name: 'Finance', code: 'FIN', description: 'Financial management procedures' },
    { name: 'Compliance', code: 'COMP', description: 'Regulatory compliance procedures' },
  ];

  for (const cat of categories) {
    await db.query(
      `INSERT INTO categories (name, code, description, status) VALUES (?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE description = VALUES(description)`,
      [cat.name, cat.code, cat.description]
    );
  }
  console.log('   -> ' + categories.length + ' categories created');

  const [catRows] = await db.query('SELECT id, code FROM categories WHERE code IN (?,?,?,?,?,?,?)',
    ['SAFETY', 'QA', 'OPS', 'HR', 'ITSEC', 'FIN', 'COMP']);
  const catMap = {};
  catRows.forEach(function(row) { catMap[row.code] = row.id; });

  // Step 2: Seed SOPs
  console.log('\n2. Seeding SOPs...');

  const sopsData = [
    { title: 'Workplace Emergency Evacuation Procedure',
      description: 'Standard procedure for safe and orderly evacuation of all personnel during emergency situations.',
      department_id: 1, category_id: catMap['SAFETY'], owner_user_id: 3,
      status: 'Published', version: '2.0' },
    { title: 'New Employee Onboarding Process',
      description: 'Step-by-step process for onboarding new employees.',
      department_id: 2, category_id: catMap['HR'], owner_user_id: 2,
      status: 'Published', version: '1.0' },
    { title: 'Data Backup and Recovery Protocol',
      description: 'Enterprise-wide data backup schedule and disaster recovery procedures.',
      department_id: 5, category_id: catMap['ITSEC'], owner_user_id: 5,
      status: 'For Review', version: '1.0' },
    { title: 'Purchase Requisition and Approval Workflow',
      description: 'Standard procedure for creating and processing purchase requisitions.',
      department_id: 4, category_id: catMap['FIN'], owner_user_id: 6,
      status: 'Approved', version: '1.0' },
    { title: 'Customer Complaint Handling Procedure',
      description: 'Standardized process for logging and resolving customer complaints.',
      department_id: 3, category_id: catMap['QA'], owner_user_id: 4,
      status: 'Draft', version: '0.1' },
    { title: 'Annual Performance Review Process',
      description: 'Guidelines for conducting annual employee performance reviews.',
      department_id: 2, category_id: catMap['HR'], owner_user_id: 2,
      status: 'For Review', version: '1.0' },
    { title: 'Chemical Handling and Storage Safety',
      description: 'Safety protocols for handling and storing hazardous chemicals.',
      department_id: 1, category_id: catMap['SAFETY'], owner_user_id: 1,
      status: 'Published', version: '3.0' },
    { title: 'IT Asset Management Policy',
      description: 'Policy governing IT hardware and software assets.',
      department_id: 5, category_id: catMap['ITSEC'], owner_user_id: 1,
      status: 'Archived', version: '1.0' },
    { title: 'Travel and Expense Reimbursement Policy',
      description: 'Policy for travel approval and expense reimbursement.',
      department_id: 4, category_id: catMap['FIN'], owner_user_id: 6,
      status: 'Draft', version: '0.1' },
    { title: 'Quality Control Inspection Checklist',
      description: 'Standardized inspection checklist for quality control.',
      department_id: 1, category_id: catMap['QA'], owner_user_id: 3,
      status: 'Published', version: '1.5' },
    { title: 'Password and Access Management Policy',
      description: 'Enterprise password policy and access revocation procedures.',
      department_id: 5, category_id: catMap['ITSEC'], owner_user_id: 5,
      status: 'Approved', version: '2.0' },
    { title: 'Incident Reporting and Investigation Procedure',
      description: 'Mandatory procedure for reporting workplace incidents.',
      department_id: 1, category_id: catMap['SAFETY'], owner_user_id: 7,
      status: 'For Review', version: '1.0' },
  ];

  const sopIds = [];

  for (let si = 0; si < sopsData.length; si++) {
    const sop = sopsData[si];
    const code = generateSopCode(sop.title);
    const existing = await db.query('SELECT id FROM sops WHERE code = ? AND is_deleted = FALSE', [code]);
    if (existing[0] && existing[0].length > 0) {
      console.log('   Skipping existing: ' + sop.title + ' (' + code + ')');
      sopIds.push(existing[0][0].id);
      continue;
    }

    const [result] = await db.query(
      "INSERT INTO sops (title, code, description, department_id, category_id, owner_user_id, status, version, is_published, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), NOW())",
      [sop.title, code, sop.description, sop.department_id, sop.category_id, sop.owner_user_id,
       sop.status, sop.version, sop.status === 'Published' ? 1 : 0,
       Math.floor(Math.random() * 90) + 1]
    );
    sopIds.push(result.insertId);
    console.log('   Created "' + sop.title + '" [' + sop.status + '] (code: ' + code + ')');
  }

  // Step 3: Seed Sections
  console.log('\n3. Seeding sections...');

  const sectionTemplates = [
    { type: 'Purpose', content: 'The purpose of this SOP is to establish a standardized procedure.' },
    { type: 'Scope', content: 'This SOP applies to all departments and personnel involved.' },
    { type: 'Responsibilities', content: 'Department heads ensure compliance. All employees follow procedures.' },
    { type: 'Definitions', content: 'SOP: Standard Operating Procedure.' },
    { type: 'Safety Notes', content: 'All personnel must wear appropriate PPE.' },
    { type: 'References', content: 'ISO 9001:2015, OSHA Standard 1910' },
    { type: 'Objectives', content: 'Ensure consistent execution and compliance.' },
  ];

  let totalSections = 0;
  for (let si = 0; si < sopIds.length; si++) {
    const sopId = sopIds[si];
    const numSections = Math.floor(Math.random() * 4) + 3;
    const shuffled = sectionTemplates.slice().sort(function() { return Math.random() - 0.5; }).slice(0, numSections);

    for (let i = 0; i < shuffled.length; i++) {
      const section = shuffled[i];
      await db.query(
        "INSERT INTO sop_sections (sop_id, title, section_type, content, order_index) VALUES (?, ?, ?, ?, ?)",
        [sopId, section.type, section.type, section.content, i + 1]
      );
      totalSections++;
    }
  }
  console.log('   -> ' + totalSections + ' sections created across ' + sopIds.length + ' SOPs');

  // Step 4: Seed Steps
  console.log('\n4. Seeding procedure steps...');

  const stepTemplates = [
    'Review all relevant documentation and gather necessary materials.',
    'Verify that all required personnel are present and briefed on the procedure.',
    'Conduct a preliminary assessment of the current state and document findings.',
    'Proceed with the primary action following the established guidelines.',
    'Document all actions taken, including dates, times, and personnel involved.',
    'Perform quality checks and verify that all outputs meet the specified criteria.',
    'Complete all required forms and submit to the appropriate department.',
    'Communicate results to stakeholders and update relevant tracking systems.',
    'File all documentation in the designated repository for audit purposes.',
    'Conduct a post-procedure review to identify areas for improvement.',
  ];

  let totalSteps = 0;
  for (let si = 0; si < sopIds.length; si++) {
    const sopId = sopIds[si];
    const numSteps = Math.floor(Math.random() * 5) + 4;
    for (let i = 0; i < numSteps; i++) {
      const template = stepTemplates[i % stepTemplates.length];
      const stepTitle = 'Step ' + (i + 1) + ': ' + template.split('.')[0];
      const stepInstruction = template + '\n\nExpected Duration: ' + (Math.floor(Math.random() * 30) + 5) + ' minutes.\nQuality Check: Verify completion before proceeding to next step.';

      await db.query(
        "INSERT INTO sop_steps (sop_id, title, description, step_number, order_index) VALUES (?, ?, ?, ?, ?)",
        [sopId, stepTitle, stepInstruction, i + 1, i + 1]
      );
      totalSteps++;
    }
  }
  console.log('   -> ' + totalSteps + ' steps created');

  // Step 5: Seed Versions
  console.log('\n5. Seeding version history...');
  let totalVersions = 0;

  for (let si = 0; si < sopIds.length; si++) {
    const sopId = sopIds[si];
    const [sopRows] = await db.query('SELECT status, version, title FROM sops WHERE id = ?', [sopId]);
    const sopStatus = sopRows[0] ? sopRows[0].status : null;
    const sopVersion = sopRows[0] ? (sopRows[0].version || '1.0') : '1.0';
    const sopTitle = sopRows[0] ? sopRows[0].title : '';

    if (sopStatus === 'Published') {
      const ver1 = parseFloat(sopVersion) - 1;
      if (ver1 >= 1) {
        await db.query(
          "INSERT INTO sop_versions (sop_id, version_number, title, description, status, created_by, is_published, created_at) VALUES (?, ?, ?, ?, 'Archived', ?, FALSE, DATE_SUB(NOW(), INTERVAL 60 DAY))",
          [sopId, ver1 + '.0', sopTitle + ' (v' + ver1 + '.0)', 'Initial version of this SOP.', 1]
        );
        totalVersions++;
      }

      await db.query(
        "INSERT INTO sop_versions (sop_id, version_number, title, description, status, created_by, is_published, created_at) VALUES (?, ?, ?, ?, 'Published', ?, TRUE, NOW())",
        [sopId, sopVersion, sopTitle, 'Current published version.', 3]
      );
      totalVersions++;
    }

    if (sopStatus === 'For Review' || sopStatus === 'Approved') {
      await db.query(
        "INSERT INTO sop_versions (sop_id, version_number, title, description, status, created_by, is_published, created_at) VALUES (?, ?, ?, ?, ?, ?, FALSE, DATE_SUB(NOW(), INTERVAL 5 DAY))",
        [sopId, '1.0', sopTitle, 'Initial draft under review.', sopStatus, 3]
      );
      totalVersions++;
    }
  }
  console.log('   -> ' + totalVersions + ' version records created');

  // Step 6: Seed Assignments
  console.log('\n6. Seeding assignments...');
  let totalAssignments = 0;

  const [pubSops] = await db.query("SELECT id FROM sops WHERE status = 'Published' AND is_deleted = FALSE");
  for (let pi = 0; pi < pubSops.length; pi++) {
    const sop = pubSops[pi];
    const deptId = (pi % 5) + 1;
    await db.query(
      "INSERT INTO sop_assignments (sop_id, assignment_type, department_id, assigned_by) VALUES (?, 'Department', ?, 3)",
      [sop.id, deptId]
    );
    totalAssignments++;

    const positions = ['Safety Officer', 'Quality Inspector', 'Operations Lead', 'HR Coordinator', 'IT Specialist'];
    await db.query(
      "INSERT INTO sop_assignments (sop_id, assignment_type, position_title, assigned_by) VALUES (?, 'Position', ?, 3)",
      [sop.id, positions[pi % positions.length]]
    );
    totalAssignments++;

    await db.query(
      "INSERT INTO sop_assignments (sop_id, assignment_type, user_id, assigned_by) VALUES (?, 'User', ?, 3)",
      [sop.id, (pi % 8) + 1]
    );
    totalAssignments++;
  }
  console.log('   -> ' + totalAssignments + ' assignments created');

  // Step 7: Seed Acknowledgements
  console.log('\n7. Seeding acknowledgements...');
  let totalAcks = 0;

  for (let pi = 0; pi < pubSops.length; pi++) {
    const sop = pubSops[pi];
    for (let userId = 4; userId <= 8; userId++) {
      const isAcknowledged = userId % 2 === 0;
      const ackStatus = isAcknowledged ? 'Acknowledged' : 'Pending';
      await db.query(
        "INSERT INTO sop_acknowledgements (sop_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), NOW()) ON DUPLICATE KEY UPDATE status = VALUES(status)",
        [sop.id, userId, ackStatus, isAcknowledged ? 2 : 0]
      );
      totalAcks++;
    }
  }
  console.log('   -> ' + totalAcks + ' acknowledgement records created');

  // Step 8: Seed Approvals
  console.log('\n8. Seeding approvals...');
  let totalApprovals = 0;

  const [approvableSops] = await db.query(
    "SELECT id, status FROM sops WHERE status IN ('Published', 'Approved') AND is_deleted = FALSE"
  );
  for (let ai = 0; ai < approvableSops.length; ai++) {
    const sop = approvableSops[ai];
    const aStatus = 'Approved';
    await db.query(
      "INSERT INTO sop_approvals (sop_id, approver_user_id, status, comments) VALUES (?, 1, ?, 'Reviewed and approved.'), (?, 3, ?, 'Technical review complete.')",
      [sop.id, aStatus, sop.id, aStatus]
    );
    totalApprovals += 2;
  }

  const [reviewSops] = await db.query(
    "SELECT id FROM sops WHERE status = 'For Review' AND is_deleted = FALSE"
  );
  if (reviewSops.length > 0) {
    await db.query(
      "INSERT INTO sop_approvals (sop_id, approver_user_id, status, comments) VALUES (?, 3, 'Rejected', 'Needs revision on section 3.')",
      [reviewSops[0].id]
    );
    totalApprovals++;
  }
  console.log('   -> ' + totalApprovals + ' approval records created');

  // Step 9: Seed Change Logs
  console.log('\n9. Seeding change logs (audit trail)...');
  let totalLogs = 0;

  const changeActions = [
    { action: 'sop.created', old: null, new_v: 'Draft' },
    { action: 'sop.updated', old: 'Draft', new_v: 'Draft' },
    { action: 'status.transition', old: 'Draft', new_v: 'For Review' },
    { action: 'status.transition', old: 'For Review', new_v: 'Approved' },
    { action: 'status.transition', old: 'Approved', new_v: 'Published' },
  ];

  for (let pi = 0; pi < pubSops.length; pi++) {
    const sop = pubSops[pi];
    for (let i = 0; i < changeActions.length; i++) {
      const action = changeActions[i];
      await db.query(
        "INSERT INTO sop_change_logs (sop_id, changed_by, action, old_value, new_value, created_at) VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))",
        [sop.id, (i % 3) + 1, action.action, action.old, action.new_v, (changeActions.length - i) * 5]
      );
      totalLogs++;
    }
  }
  console.log('   -> ' + totalLogs + ' change log entries created');

  // Summary
  console.log('\n--- Seed Summary ---');
  console.log('  Categories:    ' + categories.length);
  console.log('  SOPs:          ' + sopsData.length + ' (' + pubSops.length + ' Published)');
  console.log('  Sections:      ' + totalSections);
  console.log('  Steps:         ' + totalSteps);
  console.log('  Versions:      ' + totalVersions);
  console.log('  Assignments:   ' + totalAssignments);
  console.log('  Acknowledgements: ' + totalAcks);
  console.log('  Approvals:     ' + totalApprovals);
  console.log('  Change logs:   ' + totalLogs);
  console.log('\n--- SOP Seed Complete ---\n');

  const [statusCounts] = await db.query(
    "SELECT status, COUNT(*) as count FROM sops WHERE is_deleted = FALSE GROUP BY status ORDER BY FIELD(status, 'Draft', 'For Review', 'Approved', 'Published', 'Archived')"
  );
  console.log('SOP Status Breakdown:');
  for (let ri = 0; ri < statusCounts.length; ri++) {
    console.log('  ' + statusCounts[ri].status + ': ' + statusCounts[ri].count);
  }

  console.log('\nDemo SOPs created. Browse them at /sops.');
}

seedSops().catch(function(err) {
  console.error('Seed error:', err);
  process.exit(1);
});
