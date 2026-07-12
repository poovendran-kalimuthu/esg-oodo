import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  console.log('Adding database-level CHECK constraints...');
  
  // 1. Corrective action progress percentage CHECK
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE corrective_actions 
      ADD CONSTRAINT check_progress_percentage 
      CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
    `);
    console.log('[OK] Added CHECK constraint on corrective_actions.progress_percentage.');
  } catch (err: any) {
    console.log('[WARN] Progress constraint skipped or exists:', err.message);
  }

  // 2. Policy dates CHECK
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE policies 
      ADD CONSTRAINT check_policy_dates 
      CHECK (expiry_date > effective_date)
    `);
    console.log('[OK] Added CHECK constraint on policies.expiry_date > effective_date.');
  } catch (err: any) {
    console.log('[WARN] Policy dates constraint skipped or exists:', err.message);
  }

  // 3. Audit dates CHECK
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE audits 
      ADD CONSTRAINT check_audit_dates 
      CHECK (completion_date IS NULL OR completion_date >= audit_date)
    `);
    console.log('[OK] Added CHECK constraint on audits.completion_date >= audits.audit_date.');
  } catch (err: any) {
    console.log('[WARN] Audit dates constraint skipped or exists:', err.message);
  }

  await prisma.$disconnect();
}

run();
