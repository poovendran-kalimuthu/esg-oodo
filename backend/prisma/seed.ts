import bcrypt from 'bcryptjs';
import prisma from '../db.js';

async function main() {
  console.log('Seeding login users & roles only...');

  // Clean existing data in reverse order of foreign keys
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.correctiveAction.deleteMany();
  await prisma.auditFinding.deleteMany();
  await prisma.audit.deleteMany();
  await prisma.policyAcknowledgement.deleteMany();
  await prisma.policyVersion.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.role.deleteMany();

  console.log('Existing database wiped.');

  // 1. Create Roles
  const adminRole = await prisma.role.create({ data: { name: 'ADMIN' } });
  const complianceRole = await prisma.role.create({ data: { name: 'COMPLIANCE_OFFICER' } });
  const auditorRole = await prisma.role.create({ data: { name: 'AUDITOR' } });
  const headRole = await prisma.role.create({ data: { name: 'DEPARTMENT_HEAD' } });
  const employeeRole = await prisma.role.create({ data: { name: 'EMPLOYEE' } });

  console.log('Roles seeded.');

  // 2. Create Departments
  const manufacturing = await prisma.department.create({ data: { name: 'Manufacturing' } });
  const procurement = await prisma.department.create({ data: { name: 'Procurement' } });
  const ehs = await prisma.department.create({ data: { name: 'EHS & Compliance' } });

  console.log('Departments seeded.');

  // 3. Create Users
  const passwordHash = await bcrypt.hash('password123', 10);

  // Admin
  await prisma.user.create({
    data: {
      email: 'admin@greenledger.com',
      name: 'Naren Selvan',
      roleId: adminRole.id,
      passwordHash,
      departmentId: ehs.id,
    }
  });

  // Compliance Officer
  await prisma.user.create({
    data: {
      email: 'compliance@greenledger.com',
      name: 'Sarah Jenkins',
      roleId: complianceRole.id,
      passwordHash,
      departmentId: ehs.id,
    }
  });

  // Auditor
  await prisma.user.create({
    data: {
      email: 'auditor@greenledger.com',
      name: 'David Miller',
      roleId: auditorRole.id,
      passwordHash,
      departmentId: ehs.id,
    }
  });

  // Department Heads
  await prisma.user.create({
    data: {
      email: 'mfg_head@greenledger.com',
      name: 'Elena Rostova',
      roleId: headRole.id,
      passwordHash,
      departmentId: manufacturing.id,
    }
  });

  await prisma.user.create({
    data: {
      email: 'proc_head@greenledger.com',
      name: 'Marcus Aurelius',
      roleId: headRole.id,
      passwordHash,
      departmentId: procurement.id,
    }
  });

  // Employees
  await prisma.user.create({
    data: {
      email: 'george.russel@gmail.com',
      name: 'George Russel',
      roleId: employeeRole.id,
      passwordHash,
      departmentId: manufacturing.id,
    }
  });

  await prisma.user.create({
    data: {
      email: 'lewis.hamilton@greenledger.com',
      name: 'Lewis Hamilton',
      roleId: employeeRole.id,
      passwordHash,
      departmentId: manufacturing.id,
    }
  });

  await prisma.user.create({
    data: {
      email: 'max.verstappen@greenledger.com',
      name: 'Max Verstappen',
      roleId: employeeRole.id,
      passwordHash,
      departmentId: procurement.id,
    }
  });

  console.log('Seeded roles, departments, and users successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
