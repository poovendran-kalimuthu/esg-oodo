const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ── 1. Departments ─────────────────────────────────────────────────────────
  console.log('📦 Seeding departments...');
  const deptData = [
    { name: 'Human Resources', code: 'HR' },
    { name: 'Engineering', code: 'ENG' },
    { name: 'Finance', code: 'FIN' },
    { name: 'Marketing', code: 'MKT' },
    { name: 'Operations', code: 'OPS' },
    { name: 'Legal & Compliance', code: 'LEG' },
  ];

  const departments = {};
  for (const d of deptData) {
    const dept = await prisma.department.upsert({
      where: { code: d.code },
      update: {},
      create: d,
    });
    departments[d.code] = dept;
  }
  console.log(`   ✅ ${deptData.length} departments seeded`);

  // ── 2. Categories ──────────────────────────────────────────────────────────
  console.log('📦 Seeding categories...');
  const catData = [
    // CSR categories
    { name: 'Environment', type: 'CSR' },
    { name: 'Education', type: 'CSR' },
    { name: 'Community Service', type: 'CSR' },
    { name: 'Health & Wellness', type: 'CSR' },
    { name: 'Disaster Relief', type: 'CSR' },
    // Training categories
    { name: 'Compliance', type: 'TRAINING' },
    { name: 'Technical Skills', type: 'TRAINING' },
    { name: 'Leadership', type: 'TRAINING' },
    { name: 'Soft Skills', type: 'TRAINING' },
    // Feedback categories
    { name: 'General', type: 'FEEDBACK' },
  ];

  const categories = {};
  for (const c of catData) {
    const cat = await prisma.category.upsert({
      where: { name_type: { name: c.name, type: c.type } },
      update: {},
      create: c,
    });
    categories[`${c.name}_${c.type}`] = cat;
  }
  console.log(`   ✅ ${catData.length} categories seeded`);

  // ── 3. Users ───────────────────────────────────────────────────────────────
  console.log('📦 Seeding users...');
  const hashedPwd = await bcrypt.hash('EcoSphere@123', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@ecosphere.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@ecosphere.com',
      password: hashedPwd,
      role: 'SUPERADMIN',
      departmentId: departments['HR'].id,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecosphere.com' },
    update: {},
    create: {
      name: 'ESG Admin',
      email: 'admin@ecosphere.com',
      password: hashedPwd,
      role: 'ADMIN',
      departmentId: departments['HR'].id,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@ecosphere.com' },
    update: {},
    create: {
      name: 'Engineering Manager',
      email: 'manager@ecosphere.com',
      password: hashedPwd,
      role: 'MANAGER',
      departmentId: departments['ENG'].id,
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: 'employee@ecosphere.com' },
    update: {},
    create: {
      name: 'John Employee',
      email: 'employee@ecosphere.com',
      password: hashedPwd,
      role: 'EMPLOYEE',
      departmentId: departments['ENG'].id,
      xpTotal: 150,
    },
  });

  console.log('   ✅ 4 users seeded');

  // ── 4. Badges ──────────────────────────────────────────────────────────────
  console.log('📦 Seeding badges...');
  const badgeData = [
    {
      name: 'Volunteer Star',
      slug: 'volunteer-star',
      description: 'Awarded for accumulating 10+ volunteer hours',
      xpReward: 50,
      triggerType: 'VOLUNTEER_HOURS',
      triggerThreshold: 10,
    },
    {
      name: 'CSR Hero',
      slug: 'csr-hero',
      description: 'Awarded for completing 3+ CSR activities',
      xpReward: 75,
      triggerType: 'CSR_COUNT',
      triggerThreshold: 3,
    },
    {
      name: 'Community Builder',
      slug: 'community-builder',
      description: 'Awarded for submitting 5+ feedback entries',
      xpReward: 30,
      triggerType: 'FEEDBACK_COUNT',
      triggerThreshold: 5,
    },
    {
      name: 'Social Ambassador',
      slug: 'social-ambassador',
      description: 'Awarded for reaching 500+ total XP',
      xpReward: 100,
      triggerType: 'XP_TOTAL',
      triggerThreshold: 500,
    },
    {
      name: 'Learning Champion',
      slug: 'learning-champion',
      description: 'Awarded for completing 5+ trainings',
      xpReward: 60,
      triggerType: 'TRAINING_COUNT',
      triggerThreshold: 5,
    },
  ];

  for (const b of badgeData) {
    await prisma.badge.upsert({
      where: { slug: b.slug },
      update: {},
      create: b,
    });
  }
  console.log(`   ✅ ${badgeData.length} badges seeded`);

  // ── 5. Sample CSR Activity ─────────────────────────────────────────────────
  console.log('📦 Seeding sample CSR activity...');
  await prisma.cSRActivity.upsert({
    where: { id: 'seed-csr-001' },
    update: {},
    create: {
      id: 'seed-csr-001',
      title: 'Annual Tree Plantation Drive 2026',
      description: 'Join us for our flagship environmental initiative. Plant 1000 trees across the city park.',
      categoryId: categories['Environment_CSR'].id,
      departmentId: departments['ENG'].id,
      sdgGoal: 'CLIMATE_ACTION',
      organizerId: admin.id,
      eventDate: new Date('2026-08-15T09:00:00Z'),
      registrationDeadline: new Date('2026-08-01T23:59:59Z'),
      venue: 'City Central Park, Main Gate',
      maxParticipants: 100,
      status: 'PUBLISHED',
      evidenceRequired: true,
      createdById: admin.id,
    },
  });
  console.log('   ✅ 1 sample CSR activity seeded');

  // ── 6. Sample Training ─────────────────────────────────────────────────────
  console.log('📦 Seeding sample training...');
  const training = await prisma.training.upsert({
    where: { id: 'seed-train-001' },
    update: {},
    create: {
      id: 'seed-train-001',
      name: 'ESG Fundamentals & Compliance 2026',
      description: 'Core ESG compliance training mandatory for all employees.',
      categoryId: categories['Compliance_TRAINING'].id,
      departmentId: null,
      dueDate: new Date('2026-09-30T23:59:59Z'),
      totalModules: 5,
      createdById: admin.id,
    },
  });

  // Assign to employee
  await prisma.trainingCompletion.upsert({
    where: { trainingId_userId: { trainingId: training.id, userId: employee.id } },
    update: {},
    create: {
      trainingId: training.id,
      userId: employee.id,
      completionStatus: 'IN_PROGRESS',
      completedModules: 2,
      completionPercentage: 40,
    },
  });
  console.log('   ✅ 1 sample training + completion seeded');

  // ── 7. Sample Diversity Metrics ────────────────────────────────────────────
  console.log('📦 Seeding diversity metrics...');
  for (const [code, dept] of Object.entries(departments)) {
    await prisma.diversityMetric.upsert({
      where: { departmentId_year_month: { departmentId: dept.id, year: 2026, month: 7 } },
      update: {},
      create: {
        departmentId: dept.id,
        year: 2026,
        month: 7,
        totalEmployees: Math.floor(Math.random() * 40) + 10,
        maleCount: Math.floor(Math.random() * 25) + 5,
        femaleCount: Math.floor(Math.random() * 15) + 3,
        otherGenderCount: Math.floor(Math.random() * 3),
        ageGroup18_30: Math.floor(Math.random() * 15) + 2,
        ageGroup31_45: Math.floor(Math.random() * 20) + 5,
        ageGroup46Plus: Math.floor(Math.random() * 10) + 1,
        leadershipMale: Math.floor(Math.random() * 5) + 1,
        leadershipFemale: Math.floor(Math.random() * 3),
        leadershipOther: 0,
        hiringMale: Math.floor(Math.random() * 8),
        hiringFemale: Math.floor(Math.random() * 5),
        hiringOther: 0,
        promotionMale: Math.floor(Math.random() * 4),
        promotionFemale: Math.floor(Math.random() * 3),
        promotionOther: 0,
        disabilityCount: Math.floor(Math.random() * 3),
        diversityScore: Math.round((Math.random() * 30 + 60) * 10) / 10,
      },
    });
  }
  console.log(`   ✅ ${Object.keys(departments).length} diversity metric entries seeded`);

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log('\n✅ Database seeding complete!\n');
  console.log('─────────────────────────────────────────');
  console.log('  Seed Credentials (password: EcoSphere@123)');
  console.log('  superadmin@ecosphere.com  → SUPERADMIN');
  console.log('  admin@ecosphere.com       → ADMIN');
  console.log('  manager@ecosphere.com     → MANAGER');
  console.log('  employee@ecosphere.com    → EMPLOYEE');
  console.log('─────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
