import { config } from 'dotenv'
import { sql } from '@vercel/postgres'

// Load environment variables from .env.local
config({ path: '.env.local' })

/**
 * Test database connection
 * This script verifies that we can connect to the Postgres database
 */
async function testConnection() {
  try {
    console.log('Testing database connection...')

    // Test basic query
    const result = await sql`SELECT NOW() as current_time, version() as db_version`

    console.log('✅ Database connection successful!')
    console.log('Current time:', result.rows[0]?.current_time)
    console.log('Database version:', result.rows[0]?.db_version)

    // Test creating and dropping a test table
    await sql`
      CREATE TABLE IF NOT EXISTS test_connection (
        id SERIAL PRIMARY KEY,
        test_message TEXT
      )
    `
    console.log('✅ Created test table')

    await sql`INSERT INTO test_connection (test_message) VALUES ('Hello from B-Fit!')`
    console.log('✅ Inserted test data')

    const testData = await sql`SELECT * FROM test_connection`
    console.log('✅ Retrieved test data:', testData.rows)

    await sql`DROP TABLE test_connection`
    console.log('✅ Cleaned up test table')

    console.log('\n🎉 All database tests passed!')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }
}

// Run the test
testConnection()
