import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';

async function main() {
  console.log('Seeding database with clean target data...');

  // Clean in reverse FK order
  await prisma.employeeBadge.deleteMany();
  await prisma.employeeStreak.deleteMany();
  await prisma.employeePoints.deleteMany();
  await prisma.districtScore.deleteMany();
  await prisma.monthlyAward.deleteMany();
  await prisma.rewardCatalog.deleteMany();
  await prisma.socialActivity.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.correctiveAction.deleteMany();
  await prisma.auditFinding.deleteMany();
  await prisma.audit.deleteMany();
  await prisma.policyAcknowledgement.deleteMany();
  await prisma.policyVersion.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.user.deleteMany();
  await prisma.carbonTransaction.deleteMany();
  await prisma.departmentEnvironmentMetric.deleteMany();
  await prisma.sustainabilityGoal.deleteMany();
  await prisma.emissionFactor.deleteMany();
  await prisma.productProfile.deleteMany();
  await prisma.environmentReport.deleteMany();
  await prisma.department.deleteMany();
  await prisma.role.deleteMany();

  console.log('Database wiped completely.');

  // 1. Roles
  const adminRole = await prisma.role.create({ data: { name: 'ADMIN' } });
  const complianceRole = await prisma.role.create({ data: { name: 'COMPLIANCE_OFFICER' } });
  const auditorRole = await prisma.role.create({ data: { name: 'AUDITOR' } });
  const headRole = await prisma.role.create({ data: { name: 'DEPARTMENT_HEAD' } });
  const employeeRole = await prisma.role.create({ data: { name: 'EMPLOYEE' } });

  console.log('Roles seeded.');

  // 2. Departments
  const mfgDept = await prisma.department.create({ data: { name: 'Manufacturing' } });
  const logDept = await prisma.department.create({ data: { name: 'Logistics' } });
  const corDept = await prisma.department.create({ data: { name: 'Corporate' } });
  const hrDept = await prisma.department.create({ data: { name: 'HR' } });
  const rdDept = await prisma.department.create({ data: { name: 'R&D' } });
  const procDept = await prisma.department.create({ data: { name: 'Procurement' } });

  console.log('Departments seeded.');

  // 3. Users (Hash password: password123)
  const passwordHash = await bcrypt.hash('password123', 10);

  const sNair = await prisma.user.create({
    data: { email: 's.nair@greenledger.com', name: 'S. Nair', roleId: auditorRole.id, passwordHash, departmentId: mfgDept.id }
  });
  const rIyer = await prisma.user.create({
    data: { email: 'r.iyer@greenledger.com', name: 'R. Iyer', roleId: complianceRole.id, passwordHash, departmentId: logDept.id }
  });
  const aMehta = await prisma.user.create({
    data: { email: 'a.mehta@greenledger.com', name: 'A. Mehta', roleId: headRole.id, passwordHash, departmentId: corDept.id }
  });
  const alexRao = await prisma.user.create({
    data: { email: 'alex.rao@greenledger.com', name: 'Alex Rao', roleId: employeeRole.id, passwordHash, departmentId: mfgDept.id }
  });
  const kiranShah = await prisma.user.create({
    data: { email: 'kiran.shah@greenledger.com', name: 'Kiran Shah', roleId: employeeRole.id, passwordHash, departmentId: corDept.id }
  });

  // Admin user backup just in case
  await prisma.user.create({
    data: { email: 'admin@greenledger.com', name: 'Naren Selvan', roleId: adminRole.id, passwordHash, departmentId: corDept.id }
  });

  console.log('Target Users seeded.');

  // 4. Emission Factors
  const gridElectricity = await prisma.emissionFactor.create({
    data: { source: 'Grid Electricity', category: 'Energy', unit: 'kWh', factor: 0.417, status: 'Active' }
  });
  const dieselFleet = await prisma.emissionFactor.create({
    data: { source: 'Diesel Fleet', category: 'Transport', unit: 'liter', factor: 2.68, status: 'Active' }
  });
  await prisma.emissionFactor.create({
    data: { source: 'Natural Gas', category: 'Energy', unit: 'therm', factor: 5.3, status: 'Active' }
  });
  await prisma.emissionFactor.create({
    data: { source: 'Landfill Waste', category: 'Waste', unit: 'kg', factor: 0.457, status: 'Inactive' }
  });

  // 5. Product Profiles
  await prisma.productProfile.createMany({
    data: [
      { productName: 'EcoPack Cardboard Box', category: 'Packaging', carbonFootprint: 1.2, recyclable: true, esgRating: 'A' },
      { productName: 'Industrial Steel Bracket', category: 'Hardware', carbonFootprint: 14.6, recyclable: true, esgRating: 'C' },
      { productName: 'Single-Use Plastic Wrap', category: 'Packaging', carbonFootprint: 3.8, recyclable: false, esgRating: 'D' },
    ]
  });

  // 6. Department Environment Metrics (Matches Overview Carbon score)
  await prisma.departmentEnvironmentMetric.createMany({
    data: [
      { departmentId: mfgDept.id, totalEmissions: 1420, carbonScore: 82, monthlyChange: -4.2, rank: 1 },
      { departmentId: logDept.id, totalEmissions: 980, carbonScore: 65, monthlyChange: -8.5, rank: 3 },
      { departmentId: corDept.id, totalEmissions: 640, carbonScore: 70, monthlyChange: 1.3, rank: 2 },
      { departmentId: procDept.id, totalEmissions: 310, carbonScore: 60, monthlyChange: -2.1, rank: 4 },
    ]
  });

  // 7. Sustainability Goals (Environmental Goals Table)
  await prisma.sustainabilityGoal.createMany({
    data: [
      { name: 'Reduce Fleet Emissions', departmentId: logDept.id, targetCo2: 500, currentCo2: 390, deadline: new Date('2026-12-31'), manager: 'R. Iyer', status: 'Active' },
      { name: 'Cut Packaging Waste', departmentId: mfgDept.id, targetCo2: 120, currentCo2: 90, deadline: new Date('2026-09-30'), manager: 'S. Nair', status: 'On Track' },
      { name: 'Office Energy Cut', departmentId: corDept.id, targetCo2: 80, currentCo2: 80, deadline: new Date('2026-06-30'), manager: 'A. Mehta', status: 'Completed' },
    ]
  });

  // 8. Carbon Transactions (matches overview activity "42 carbon transactions logged")
  // We seed a couple of main transaction entries and a helper can generate the history
  await prisma.carbonTransaction.createMany({
    data: [
      { departmentId: mfgDept.id, emissionFactorId: gridElectricity.id, quantity: 8500, calculatedCo2: 8500 * 0.417, date: new Date('2026-06-02') },
      { departmentId: logDept.id, emissionFactorId: dieselFleet.id, quantity: 1200, calculatedCo2: 1200 * 2.68, date: new Date('2026-06-05') },
    ]
  });

  // 9. Environment Reports
  await prisma.environmentReport.createMany({
    data: [
      { type: 'Environmental Report', description: 'Full overview of environmental performance and goals.' },
      { type: 'Carbon Summary', description: 'Aggregated carbon emissions across all sources and departments.' },
      { type: 'Department Report', description: 'Emission breakdown and ranking by department.' },
      { type: 'Sustainability Goal Report', description: 'Progress and status of all active sustainability goals.' },
    ]
  });

  console.log('Environmental module seeded.');

  // 10. Governance: Policies
  const pol1 = await prisma.policy.create({
    data: {
      policyId: 'POL-001', title: 'Environmental Safety & Compliance Policy', category: 'Environmental',
      description: 'Defines the company environmental safety standards and reporting requirements.',
      effectiveDate: new Date('2026-01-01'), expiryDate: new Date('2027-01-01'), status: 'PUBLISHED', version: 1
    }
  });
  await prisma.policyVersion.create({
    data: { policyId: pol1.id, versionNumber: 1, title: pol1.title, description: pol1.description, status: 'PUBLISHED' }
  });

  const pol2 = await prisma.policy.create({
    data: {
      policyId: 'POL-002', title: 'Vendor Compliance & Procurement Code', category: 'Governance',
      description: 'Procurement policy for vendor ESG compliance checks and onboarding standards.',
      effectiveDate: new Date('2026-02-01'), expiryDate: new Date('2027-02-01'), status: 'PUBLISHED', version: 1, departmentId: procDept.id
    }
  });
  await prisma.policyVersion.create({
    data: { policyId: pol2.id, versionNumber: 1, title: pol2.title, description: pol2.description, status: 'PUBLISHED' }
  });

  await prisma.policy.create({
    data: {
      policyId: 'POL-003', title: 'Workplace Safety & Incident Reporting', category: 'HR',
      description: 'Mandatory incident reporting and workplace safety handbook for all employees.',
      effectiveDate: new Date('2026-03-01'), expiryDate: new Date('2027-03-01'), status: 'DRAFT', version: 1
    }
  });

  // Policy Acknowledgements
  await prisma.policyAcknowledgement.createMany({
    data: [
      { employeeId: alexRao.id, policyId: pol1.id, policyVersion: 1, ipAddress: '127.0.0.1', deviceInfo: 'Chrome' },
      { employeeId: kiranShah.id, policyId: pol2.id, policyVersion: 1, ipAddress: '127.0.0.1', deviceInfo: 'Firefox' },
    ]
  });

  // 11. Audits & Findings
  const audit1 = await prisma.audit.create({
    data: {
      auditId: 'AUD-001', auditTitle: 'Q2 Waste Audit', auditType: 'Environmental',
      departmentId: mfgDept.id, auditorId: sNair.id,
      auditDate: new Date('2026-06-12'), status: 'COMPLETED', completionDate: new Date('2026-06-12')
    }
  });

  const audit2 = await prisma.audit.create({
    data: {
      auditId: 'AUD-002', auditTitle: 'Vendor Compliance Check', auditType: 'Compliance',
      departmentId: procDept.id, auditorId: rIyer.id,
      auditDate: new Date('2026-07-01'), status: 'IN_PROGRESS' // maps to Under Review
    }
  });

  // Findings
  const finding1 = await prisma.auditFinding.create({
    data: {
      findingId: 'FND-001', auditId: audit1.id, title: 'Missing MSDS Sheets',
      description: 'Material safety data sheets missing for chemicals in plant B.',
      category: 'Documentation', severity: 'HIGH', dueDate: new Date('2026-07-31'),
      ownerId: alexRao.id, status: 'OPEN'
    }
  });

  await prisma.correctiveAction.create({
    data: { findingId: finding1.id, ownerId: alexRao.id, progressPercentage: 40, resolutionNotes: 'Contacting chemical vendor to supply missing sheets.' }
  });

  await prisma.auditFinding.create({
    data: {
      findingId: 'FND-002', auditId: audit2.id, title: 'Late Vendor Disclosures',
      description: 'Vendor ESG questionnaires are late by 15 days.',
      category: 'Compliance', severity: 'MEDIUM', dueDate: new Date('2026-08-15'),
      ownerId: kiranShah.id, status: 'RESOLVED'
    }
  });

  console.log('Governance module seeded.');

  // 12. Social Activities
  // Participation Queue:
  // Alex Rao | Tree Plantation | photo.jpg | 50 | Pending
  // Kiran Shah | ESG Workshop | cert.pdf | 30 | Approved (Completed)
  await prisma.socialActivity.create({
    data: {
      employeeId: alexRao.id,
      departmentId: mfgDept.id,
      activityType: 'csr_participation',
      title: 'Tree Plantation',
      description: 'Community tree planting near plant A.',
      hoursLogged: 4,
      date: new Date('2026-07-05'),
      status: 'Pending',
      proofUrl: 'photo.jpg',
      points: 50
    }
  });

  await prisma.socialActivity.create({
    data: {
      employeeId: kiranShah.id,
      departmentId: corDept.id,
      activityType: 'csr_participation',
      title: 'ESG Workshop',
      description: 'ESG compliance workshop training.',
      hoursLogged: 3,
      date: new Date('2026-07-08'),
      status: 'Completed',
      proofUrl: 'cert.pdf',
      points: 30
    }
  });

  // Seed bulk dummy entries to match counts in summary:
  // Tree Plantation: 24 joined (1 pending by Alex Rao, let's seed 23 completed ones)
  for (let i = 1; i <= 23; i++) {
    await prisma.socialActivity.create({
      data: {
        employeeId: i % 2 === 0 ? alexRao.id : kiranShah.id,
        departmentId: i % 2 === 0 ? mfgDept.id : corDept.id,
        activityType: 'csr_participation',
        title: 'Tree Plantation',
        description: 'Joined tree plantation campaign.',
        hoursLogged: 3,
        date: new Date('2026-06-15'),
        status: 'Completed',
        points: 50
      }
    });
  }

  // Blood Donation: 8 joined
  for (let i = 1; i <= 8; i++) {
    await prisma.socialActivity.create({
      data: {
        employeeId: i % 2 === 0 ? alexRao.id : kiranShah.id,
        departmentId: i % 2 === 0 ? mfgDept.id : corDept.id,
        activityType: 'volunteer_event',
        title: 'Blood Donation',
        description: 'Voluntary blood donation drive.',
        hoursLogged: 2,
        date: new Date('2026-06-20'),
        status: 'Completed',
        points: 25
      }
    });
  }

  // Beach Cleanup: 31 joined
  for (let i = 1; i <= 31; i++) {
    await prisma.socialActivity.create({
      data: {
        employeeId: i % 2 === 0 ? alexRao.id : kiranShah.id,
        departmentId: i % 2 === 0 ? mfgDept.id : corDept.id,
        activityType: 'volunteer_event',
        title: 'Beach Cleanup',
        description: 'Ocean cleanup drive.',
        hoursLogged: 4,
        date: new Date('2026-06-22'),
        status: 'Completed',
        points: 25
      }
    });
  }

  // ESG Workshop: 12 joined (1 completed by Kiran, let's seed 11 more completed)
  for (let i = 1; i <= 11; i++) {
    await prisma.socialActivity.create({
      data: {
        employeeId: i % 2 === 0 ? alexRao.id : kiranShah.id,
        departmentId: i % 2 === 0 ? mfgDept.id : corDept.id,
        activityType: 'training_completion',
        title: 'ESG Workshop',
        description: 'Workshop attendance.',
        hoursLogged: 2.5,
        date: new Date('2026-07-01'),
        status: 'Completed',
        points: 20
      }
    });
  }

  console.log('Social activities seeded.');

  // 13. Gamification Milestones & XP (Points log)
  // Let's seed point entries that sum up to exactly:
  // Manufacturing Department total: 4200 XP
  // HR Department total: 3910 XP
  // Corporate Department total: 3500 XP
  // Logistics Department total: 650 XP
  // R&D Department total: 755 XP

  // Manufacturing: alexRao has 2200, sNair has 2000
  await prisma.employeePoints.create({ data: { employeeId: alexRao.id, departmentId: mfgDept.id, module: 'social', activityType: 'csr_participation', points: 2200 } });
  await prisma.employeePoints.create({ data: { employeeId: sNair.id, departmentId: mfgDept.id, module: 'governance', activityType: 'audit_participation', points: 2000 } });

  // Corporate: kiranShah has 2000, aMehta has 1500
  await prisma.employeePoints.create({ data: { employeeId: kiranShah.id, departmentId: corDept.id, module: 'social', activityType: 'training_completion', points: 2000 } });
  await prisma.employeePoints.create({ data: { employeeId: aMehta.id, departmentId: corDept.id, module: 'environmental', activityType: 'energy_saving', points: 1500 } });

  // HR Dept: Seed using a dummy point entry
  await prisma.employeePoints.create({ data: { employeeId: alexRao.id, departmentId: hrDept.id, module: 'environmental', activityType: 'carbon_reduction', points: 3910 } });

  // Logistics Dept
  await prisma.employeePoints.create({ data: { employeeId: rIyer.id, departmentId: logDept.id, module: 'environmental', activityType: 'carbon_reduction', points: 650 } });

  // R&D Dept
  await prisma.employeePoints.create({ data: { employeeId: alexRao.id, departmentId: rdDept.id, module: 'environmental', activityType: 'carbon_reduction', points: 755 } });

  // 14. Streaks
  await prisma.employeeStreak.createMany({
    data: [
      { employeeId: alexRao.id, currentStreak: 12, longestStreak: 12, lastActivityDate: new Date() },
      { employeeId: kiranShah.id, currentStreak: 5, longestStreak: 5, lastActivityDate: new Date() },
      { employeeId: sNair.id, currentStreak: 3, longestStreak: 3, lastActivityDate: new Date() },
      { employeeId: rIyer.id, currentStreak: 2, longestStreak: 2, lastActivityDate: new Date() },
      { employeeId: aMehta.id, currentStreak: 1, longestStreak: 1, lastActivityDate: new Date() },
    ]
  });

  // 15. Badges
  // Milestones: Green Explorer, Carbon Saver, Sustainability Champion, Earth Hero
  await prisma.employeeBadge.createMany({
    data: [
      { employeeId: alexRao.id, badgeName: 'Green Explorer' },
      { employeeId: alexRao.id, badgeName: 'Carbon Saver' },
      { employeeId: kiranShah.id, badgeName: 'Sustainability Champion' },
      { employeeId: kiranShah.id, badgeName: 'Earth Hero' },
      { employeeId: sNair.id, badgeName: 'Green Explorer' },
    ]
  });

  // 16. District Scores (overall leaderboards)
  // Overall ESG Score: 81/100, Env: 82, Soc: 74, Gov: 88
  await prisma.districtScore.createMany({
    data: [
      { departmentId: mfgDept.id, environmentScore: 82, socialScore: 74, governanceScore: 88, overallScore: 81.4, districtLevel: 5, districtTitle: 'Sustainability Citadel' },
      { departmentId: hrDept.id, environmentScore: 75, socialScore: 85, governanceScore: 80, overallScore: 79.5, districtLevel: 4, districtTitle: 'Innovation Tower' },
      { departmentId: corDept.id, environmentScore: 70, socialScore: 75, governanceScore: 90, overallScore: 77.5, districtLevel: 4, districtTitle: 'Innovation Tower' },
      { departmentId: logDept.id, environmentScore: 65, socialScore: 60, governanceScore: 70, overallScore: 65.0, districtLevel: 3, districtTitle: 'Learning Center' },
      { departmentId: rdDept.id, environmentScore: 80, socialScore: 70, governanceScore: 75, overallScore: 75.5, districtLevel: 4, districtTitle: 'Innovation Tower' },
      { departmentId: procDept.id, environmentScore: 60, socialScore: 65, governanceScore: 70, overallScore: 64.5, districtLevel: 3, districtTitle: 'Learning Center' },
    ]
  });

  // 17. Monthly Awards
  const now = new Date();
  await prisma.monthlyAward.createMany({
    data: [
      { awardType: 'Gold Guardian', recipientName: 'S. Nair', recipientId: sNair.id, month: now.getMonth() + 1, year: now.getFullYear() },
      { awardType: 'Silver Guardian', recipientName: 'R. Iyer', recipientId: rIyer.id, month: now.getMonth() + 1, year: now.getFullYear() },
      { awardType: 'Bronze Guardian', recipientName: 'A. Mehta', recipientId: aMehta.id, month: now.getMonth() + 1, year: now.getFullYear() },
    ]
  });

  // 18. Reward Catalog
  await prisma.rewardCatalog.createMany({
    data: [
      { rewardName: 'Gift Voucher', requiredPoints: 500 },
      { rewardName: 'Cafeteria Coupon', requiredPoints: 200 },
      { rewardName: 'Company Merchandise', requiredPoints: 350 },
      { rewardName: 'Sustainability Certificate', requiredPoints: 750 },
      { rewardName: 'Recognition Award', requiredPoints: 1000 },
    ]
  });

  console.log('Gamification module seeded.');
  console.log('Database seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
