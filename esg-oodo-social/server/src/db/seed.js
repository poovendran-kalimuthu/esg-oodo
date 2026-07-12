const pool    = require('./pool');
const bcrypt  = require('bcryptjs');

/**
 * Seed default data into the database
 */
async function seed() {
  const client = await pool.connect();

  try {
    console.log('🌱 Seeding database...');

    await client.query('BEGIN');

    // ── Seed superadmin user ──────────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash('Admin@1234', 12);

    await client.query(`
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, ['Super Admin', 'admin@esg-odoo.com', hashedPassword, 'superadmin']);

    await client.query('COMMIT');
    console.log('✅ Seeding completed!');
    console.log('   → Admin Email:    admin@esg-odoo.com');
    console.log('   → Admin Password: Admin@1234');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

seed().catch(console.error);
