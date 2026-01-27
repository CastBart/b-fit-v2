// Load environment variables from .env.local BEFORE any other imports
import { config } from 'dotenv'
config({ path: '.env.local' })

import { prisma } from './prisma'

/**
 * Test Prisma Client
 * This script verifies that Prisma can connect and query the database
 */
async function testPrisma() {
  try {
    console.log('Testing Prisma Client...')

    // Test basic connection
    const userCount = await prisma.user.count()
    console.log('✅ Prisma client connected successfully!')
    console.log(`Current user count: ${userCount}`)

    // Test creating a user (we'll delete it after)
    console.log('\nTesting user creation...')
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword123',
        role: 'PERSONAL',
      },
    })
    console.log('✅ Created test user:', {
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
      role: testUser.role,
    })

    // Test querying
    const users = await prisma.user.findMany()
    console.log(`✅ Retrieved ${users.length} user(s)`)

    // Test updating
    const updatedUser = await prisma.user.update({
      where: { id: testUser.id },
      data: { name: 'Updated Test User' },
    })
    console.log('✅ Updated user name:', updatedUser.name)

    // Clean up - delete test user
    await prisma.user.delete({
      where: { id: testUser.id },
    })
    console.log('✅ Deleted test user')

    console.log('\n🎉 All Prisma tests passed!')
  } catch (error) {
    console.error('❌ Prisma test failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testPrisma()
