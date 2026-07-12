import { PolicyStatus, AuditStatus, FindingStatus, Severity } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';

async function main() {
  console.log('Start seeding...');

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
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@greenledger.com',
      name: 'Naren Selvan',
      roleId: adminRole.id,
      passwordHash,
      departmentId: ehs.id,
    }
  });

  // Compliance Officer
  const complianceUser = await prisma.user.create({
    data: {
      email: 'compliance@greenledger.com',
      name: 'Sarah Jenkins',
      roleId: complianceRole.id,
      passwordHash,
      departmentId: ehs.id,
    }
  });

  // Auditor
  const auditorUser = await prisma.user.create({
    data: {
      email: 'auditor@greenledger.com',
      name: 'David Miller',
      roleId: auditorRole.id,
      passwordHash,
      departmentId: ehs.id,
    }
  });

  // Department Heads
  const manufacturingHead = await prisma.user.create({
    data: {
      email: 'mfg_head@greenledger.com',
      name: 'Elena Rostova',
      roleId: headRole.id,
      passwordHash,
      departmentId: manufacturing.id,
    }
  });

  const procurementHead = await prisma.user.create({
    data: {
      email: 'proc_head@greenledger.com',
      name: 'Marcus Aurelius',
      roleId: headRole.id,
      passwordHash,
      departmentId: procurement.id,
    }
  });

  // Employees
  const empGeorge = await prisma.user.create({
    data: {
      email: 'george.russel@gmail.com',
      name: 'George Russel',
      roleId: employeeRole.id,
      passwordHash,
      departmentId: manufacturing.id,
    }
  });

  const empLewis = await prisma.user.create({
    data: {
      email: 'lewis.hamilton@greenledger.com',
      name: 'Lewis Hamilton',
      roleId: employeeRole.id,
      passwordHash,
      departmentId: manufacturing.id,
    }
  });

  const empMax = await prisma.user.create({
    data: {
      email: 'max.verstappen@greenledger.com',
      name: 'Max Verstappen',
      roleId: employeeRole.id,
      passwordHash,
      departmentId: procurement.id,
    }
  });

  console.log('Users seeded.');

  // 4. Create Policies (Q2 Waste Audit, Vendor Compliance Check are REQUIRED)
  const pol1 = await prisma.policy.create({
    data: {
      policyId: 'POL-001',
      title: 'Q2 Waste Audit Guidelines',
      category: 'Sustainability',
      description: 'Defines waste audit procedures, disposal measurements, and sorting metrics required for quarterly review of operations.',
      effectiveDate: new Date('2026-04-01'),
      expiryDate: new Date('2026-10-01'),
      status: PolicyStatus.PUBLISHED,
      version: 1,
      departmentId: manufacturing.id
    }
  });

  const pol2 = await prisma.policy.create({
    data: {
      policyId: 'POL-002',
      title: 'Vendor Compliance Check Standard',
      category: 'Compliance',
      description: 'Outlines evaluation checks, safety ratings, and social responsibility standards required before signing suppliers.',
      effectiveDate: new Date('2026-02-15'),
      expiryDate: new Date('2027-02-15'),
      status: PolicyStatus.PUBLISHED,
      version: 1,
      departmentId: procurement.id
    }
  });

  const pol3 = await prisma.policy.create({
    data: {
      policyId: 'POL-003',
      title: 'General Health and Safety Protocol',
      category: 'Health & Safety',
      description: 'Baseline health guidelines for office, storage rooms, and manufacturing floor facilities.',
      effectiveDate: new Date('2026-01-01'),
      expiryDate: new Date('2027-01-01'),
      status: PolicyStatus.PUBLISHED,
      version: 1
    }
  });

  const pol4 = await prisma.policy.create({
    data: {
      policyId: 'POL-004',
      title: 'Ethics and Anti-Corruption Policy',
      category: 'Ethics & Conduct',
      description: 'Draft framework detailing reporting tools, gift thresholds, and bribery audits.',
      effectiveDate: new Date('2026-09-01'),
      expiryDate: new Date('2027-09-01'),
      status: PolicyStatus.DRAFT,
      version: 1
    }
  });

  console.log('Policies seeded.');

  // 5. Create Policy Versions
  await prisma.policyVersion.create({
    data: {
      policyId: pol1.id,
      versionNumber: 1,
      title: pol1.title,
      description: pol1.description,
      status: PolicyStatus.PUBLISHED
    }
  });

  await prisma.policyVersion.create({
    data: {
      policyId: pol2.id,
      versionNumber: 1,
      title: pol2.title,
      description: pol2.description,
      status: PolicyStatus.PUBLISHED
    }
  });

  await prisma.policyVersion.create({
    data: {
      policyId: pol3.id,
      versionNumber: 1,
      title: pol3.title,
      description: pol3.description,
      status: PolicyStatus.PUBLISHED
    }
  });

  console.log('Policy Versions seeded.');

  // 6. Policy Acknowledgements
  const acknowledgements = [
    { employeeId: empGeorge.id, policyId: pol1.id, version: 1 },
    { employeeId: empGeorge.id, policyId: pol3.id, version: 1 },
    { employeeId: empLewis.id, policyId: pol1.id, version: 1 },
    { employeeId: empLewis.id, policyId: pol3.id, version: 1 },
    { employeeId: empMax.id, policyId: pol2.id, version: 1 },
    { employeeId: empMax.id, policyId: pol3.id, version: 1 },
  ];

  for (const ack of acknowledgements) {
    await prisma.policyAcknowledgement.create({
      data: {
        employeeId: ack.employeeId,
        policyId: ack.policyId,
        policyVersion: ack.version,
        ipAddress: '192.168.1.' + Math.floor(Math.random() * 10 + 10),
        deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0'
      }
    });
  }

  console.log('Policy Acknowledgements seeded.');

  // 7. Create Audits
  const aud1 = await prisma.audit.create({
    data: {
      auditId: 'AUD-2026-001',
      auditTitle: 'Q2 Facility & Waste Disposal Review',
      auditType: 'ESG Audit',
      departmentId: manufacturing.id,
      auditorId: auditorUser.id,
      auditDate: new Date('2026-04-10'),
      completionDate: new Date('2026-04-12'),
      status: AuditStatus.COMPLETED
    }
  });

  const aud2 = await prisma.audit.create({
    data: {
      auditId: 'AUD-2026-002',
      auditTitle: 'Procurement Supply-Chain Vetting Audit',
      auditType: 'Compliance Audit',
      departmentId: procurement.id,
      auditorId: auditorUser.id,
      auditDate: new Date('2026-05-18'),
      status: AuditStatus.IN_PROGRESS
    }
  });

  console.log('Audits seeded.');

  // 8. Create Findings (Missing MSDS Sheets, Late Vendor Disclosures are REQUIRED)
  const fnd1 = await prisma.auditFinding.create({
    data: {
      findingId: 'FND-001',
      auditId: aud1.id,
      title: 'Missing MSDS Sheets',
      description: 'Material Safety Data Sheets (MSDS) are missing for several chemical agents stored on the assembly floor.',
      category: 'Safety',
      severity: Severity.HIGH,
      ownerId: empGeorge.id,
      dueDate: new Date('2026-05-30'),
      status: FindingStatus.OPEN
    }
  });

  const fnd2 = await prisma.auditFinding.create({
    data: {
      findingId: 'FND-002',
      auditId: aud2.id,
      title: 'Late Vendor Disclosures',
      description: 'Vendor ESG performance disclosure statements were received beyond the scheduled deadline.',
      category: 'Compliance',
      severity: Severity.MEDIUM,
      ownerId: empMax.id,
      dueDate: new Date('2026-07-20'),
      status: FindingStatus.OPEN
    }
  });

  console.log('Findings seeded.');

  // 9. Corrective Actions
  await prisma.correctiveAction.create({
    data: {
      findingId: fnd1.id,
      ownerId: empGeorge.id,
      resolutionNotes: 'Currently auditing chemical shelf counts and writing folder requests.',
      progressPercentage: 20
    }
  });

  console.log('Corrective Actions seeded.');

  // 10. Activity Logs
  const activities = [
    { userId: complianceUser.id, action: 'POLICY_CREATE', details: 'Created policy POL-001 (Q2 Waste Audit)' },
    { userId: complianceUser.id, action: 'POLICY_PUBLISH', details: 'Published policy POL-001' },
    { userId: complianceUser.id, action: 'POLICY_CREATE', details: 'Created policy POL-002 (Vendor Compliance Check)' },
    { userId: complianceUser.id, action: 'POLICY_PUBLISH', details: 'Published policy POL-002' },
    { userId: auditorUser.id, action: 'AUDIT_SCHEDULE', details: 'Scheduled Q2 Facility & Waste Disposal Review' },
    { userId: empGeorge.id, action: 'POLICY_ACKNOWLEDGE', details: 'Acknowledged policy POL-001 v1' },
    { userId: empMax.id, action: 'POLICY_ACKNOWLEDGE', details: 'Acknowledged policy POL-002 v1' },
  ];

  for (const act of activities) {
    await prisma.activityLog.create({
      data: {
        userId: act.userId,
        action: act.action,
        details: act.details,
        ipAddress: '127.0.0.1'
      }
    });
  }

  console.log('Activity Logs seeded.');
  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
