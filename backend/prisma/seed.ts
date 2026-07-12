import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';

async function main() {
  console.log('Seeding login users, roles, and environmental demo data...');

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

  // Environmental tables cleanup
  await prisma.carbonTransaction.deleteMany();
  await prisma.departmentEnvironmentMetric.deleteMany();
  await prisma.sustainabilityGoal.deleteMany();
  await prisma.emissionFactor.deleteMany();
  await prisma.productProfile.deleteMany();
  await prisma.environmentReport.deleteMany();

  // Core metadata cleanup
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

  // 2. Create Departments (Environmental + Governance)
  const manufacturing = await prisma.department.create({ data: { name: 'Manufacturing' } });
  const logistics = await prisma.department.create({ data: { name: 'Logistics' } });
  const facilities = await prisma.department.create({ data: { name: 'Facilities' } });
  const procurement = await prisma.department.create({ data: { name: 'Procurement' } });
  const operations = await prisma.department.create({ data: { name: 'Operations' } });
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

  console.log('Governance Users seeded.');

  // 4. Create Emission Factors
  const gridElectricity = await prisma.emissionFactor.create({
    data: {
      source: 'Grid Electricity',
      category: 'Energy',
      unit: 'kWh',
      factor: 0.417,
      status: 'Active'
    }
  });

  const naturalGas = await prisma.emissionFactor.create({
    data: {
      source: 'Natural Gas',
      category: 'Energy',
      unit: 'therm',
      factor: 5.3,
      status: 'Active'
    }
  });

  const dieselFleet = await prisma.emissionFactor.create({
    data: {
      source: 'Diesel Fleet',
      category: 'Transport',
      unit: 'liter',
      factor: 2.68,
      status: 'Active'
    }
  });

  const landfillWaste = await prisma.emissionFactor.create({
    data: {
      source: 'Landfill Waste',
      category: 'Waste',
      unit: 'kg',
      factor: 0.457,
      status: 'Inactive'
    }
  });

  console.log('Emission Factors seeded.');

  // 5. Create Product Profiles
  await prisma.productProfile.create({
    data: {
      productName: 'EcoPack Cardboard Box',
      category: 'Packaging',
      carbonFootprint: 1.2,
      recyclable: true,
      esgRating: 'A'
    }
  });

  await prisma.productProfile.create({
    data: {
      productName: 'Industrial Steel Bracket',
      category: 'Hardware',
      carbonFootprint: 14.6,
      recyclable: true,
      esgRating: 'C'
    }
  });

  await prisma.productProfile.create({
    data: {
      productName: 'Single-Use Plastic Wrap',
      category: 'Packaging',
      carbonFootprint: 3.8,
      recyclable: false,
      esgRating: 'D'
    }
  });

  console.log('Product Profiles seeded.');

  // 6. Create Department Environmental Metrics
  await prisma.departmentEnvironmentMetric.create({
    data: {
      departmentId: manufacturing.id,
      totalEmissions: 1420,
      carbonScore: 62,
      monthlyChange: -4.2,
      rank: 1
    }
  });

  await prisma.departmentEnvironmentMetric.create({
    data: {
      departmentId: logistics.id,
      totalEmissions: 980,
      carbonScore: 71,
      monthlyChange: -8.5,
      rank: 2
    }
  });

  await prisma.departmentEnvironmentMetric.create({
    data: {
      departmentId: facilities.id,
      totalEmissions: 640,
      carbonScore: 78,
      monthlyChange: 1.3,
      rank: 3
    }
  });

  await prisma.departmentEnvironmentMetric.create({
    data: {
      departmentId: procurement.id,
      totalEmissions: 310,
      carbonScore: 85,
      monthlyChange: -2.1,
      rank: 4
    }
  });

  console.log('Department Environmental Metrics seeded.');

  // 7. Create Sustainability Goals
  await prisma.sustainabilityGoal.create({
    data: {
      name: 'Reduce manufacturing plant emissions',
      departmentId: manufacturing.id,
      targetCo2: 500,
      currentCo2: 210,
      deadline: new Date('2026-12-31'),
      manager: 'Priya Nair',
      status: 'Active'
    }
  });

  await prisma.sustainabilityGoal.create({
    data: {
      name: 'Logistics fleet electrification',
      departmentId: logistics.id,
      targetCo2: 300,
      currentCo2: 45,
      deadline: new Date('2026-09-30'),
      manager: 'Daniel Cho',
      status: 'Active'
    }
  });

  await prisma.sustainabilityGoal.create({
    data: {
      name: 'Office energy efficiency upgrade',
      departmentId: facilities.id,
      targetCo2: 120,
      currentCo2: 118,
      deadline: new Date('2026-08-15'),
      manager: 'Sarah Mensah',
      status: 'Active'
    }
  });

  console.log('Sustainability Goals seeded.');

  // 8. Create Carbon Transactions
  await prisma.carbonTransaction.create({
    data: {
      departmentId: manufacturing.id,
      emissionFactorId: gridElectricity.id,
      quantity: 8500,
      calculatedCo2: 8500 * 0.417,
      date: new Date('2026-06-02')
    }
  });

  await prisma.carbonTransaction.create({
    data: {
      departmentId: logistics.id,
      emissionFactorId: dieselFleet.id,
      quantity: 1200,
      calculatedCo2: 1200 * 2.68,
      date: new Date('2026-06-05')
    }
  });

  console.log('Carbon Transactions seeded.');

  // 9. Seed Environment Reports
  await prisma.environmentReport.create({
    data: {
      type: 'Environmental Report',
      description: 'Full overview of environmental performance and goals.'
    }
  });
  await prisma.environmentReport.create({
    data: {
      type: 'Carbon Summary',
      description: 'Aggregated carbon emissions across all sources and departments.'
    }
  });
  await prisma.environmentReport.create({
    data: {
      type: 'Department Report',
      description: 'Emission breakdown and ranking by department.'
    }
  });
  await prisma.environmentReport.create({
    data: {
      type: 'Sustainability Goal Report',
      description: 'Progress and status of all active sustainability goals.'
    }
  });

  console.log('Environment Reports list seeded.');
  console.log('Full seeder run completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
