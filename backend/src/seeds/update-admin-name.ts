// ============================================
// Update Admin Name Script
// ============================================
// This script updates the admin user's name in the database
// without requiring a full reseed. Run with:
//   npx tsx src/seeds/update-admin-name.ts
//
// This is useful when the database was seeded with an old name
// (e.g., "Rajesh Kumar") and needs to be updated to the correct
// name ("Abhishek Mishra") without losing any other data.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@hrms.com';
const NEW_FIRST_NAME = 'Abhishek';
const NEW_LAST_NAME = 'Mishra';

async function updateAdminName() {
  console.info('============================================');
  console.info('🔄 Updating Admin Name');
  console.info('============================================\n');

  try {
    // Step 1: Find the admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!adminUser) {
      console.error(`❌ No user found with email: ${ADMIN_EMAIL}`);
      console.info('   Make sure the database has been seeded first.');
      process.exit(1);
    }

    if (!adminUser.employee) {
      console.error(`❌ User ${ADMIN_EMAIL} has no associated employee record.`);
      process.exit(1);
    }

    const currentName = `${adminUser.employee.firstName} ${adminUser.employee.lastName}`;
    const newName = `${NEW_FIRST_NAME} ${NEW_LAST_NAME}`;

    console.info(`📋 Current admin name: "${currentName}"`);
    console.info(`📋 New admin name:     "${newName}"\n`);

    if (currentName === newName) {
      console.info('✅ Admin name is already correct. No update needed.\n');
      return;
    }

    // Step 2: Update the employee record
    const updatedEmployee = await prisma.employee.update({
      where: { id: adminUser.employee.id },
      data: {
        firstName: NEW_FIRST_NAME,
        lastName: NEW_LAST_NAME,
      },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        designation: true,
      },
    });

    console.info('✅ Admin name updated successfully!\n');
    console.info('📊 Updated Record:');
    console.info(`   Employee ID  : ${updatedEmployee.employeeId}`);
    console.info(`   Name         : ${updatedEmployee.firstName} ${updatedEmployee.lastName}`);
    console.info(`   Email        : ${updatedEmployee.email}`);
    console.info(`   Designation  : ${updatedEmployee.designation}`);
    console.info('');

    // Step 3: Create an audit log entry for the change
    try {
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE',
          entity: 'Employee',
          entityId: updatedEmployee.id,
          details: JSON.stringify({
            message: 'Admin name updated via script',
            previousName: currentName,
            newName: newName,
          }),
          userId: adminUser.id,
          userEmail: ADMIN_EMAIL,
        },
      });
      console.info('📝 Audit log entry created.\n');
    } catch (auditError) {
      // Audit log creation is non-critical
      console.warn('⚠️  Could not create audit log entry (non-critical).\n');
    }

    console.info('============================================');
    console.info('🎉 Admin name update complete!');
    console.info('============================================');
    console.info('');
    console.info('ℹ️  The admin user should now see "Abhishek Mishra"');
    console.info('   after logging out and back in (or refreshing the page).');
    console.info('');

  } catch (error) {
    console.error('❌ Error updating admin name:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminName();
