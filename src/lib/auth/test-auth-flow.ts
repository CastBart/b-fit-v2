/* eslint-disable no-console */
import { signup, login } from '@/server/actions/auth'
import { prisma } from '@/lib/db/prisma'

async function testAuthFlow() {
  console.log('🧪 Testing complete authentication flow...\n')

  const testEmail = 'testuser@example.com'
  const testName = 'Test User'
  const testPassword = 'TestPassword123!'

  try {
    // Clean up any existing test user
    console.log('Cleaning up existing test user...')
    await prisma.user.deleteMany({
      where: { email: testEmail },
    })
    console.log('✅ Cleanup complete\n')

    // Test 1: Signup with valid data
    console.log('Test 1: Signup with valid credentials')
    const signupResult = await signup({
      email: testEmail,
      name: testName,
      password: testPassword,
    })

    if (signupResult.success) {
      console.log('✅ Signup successful')
      console.log(`   User ID: ${signupResult.userId}`)
      console.log(`   Message: ${signupResult.message}\n`)
    } else {
      console.log('❌ Signup failed')
      console.log(`   Error: ${signupResult.error}\n`)
      throw new Error('Signup test failed')
    }

    // Test 2: Signup with duplicate email
    console.log('Test 2: Signup with duplicate email')
    const duplicateSignupResult = await signup({
      email: testEmail,
      name: 'Another User',
      password: 'AnotherPassword123!',
    })

    if (!duplicateSignupResult.success && duplicateSignupResult.error?.includes('already exists')) {
      console.log('✅ Duplicate email rejected correctly')
      console.log(`   Error: ${duplicateSignupResult.error}\n`)
    } else {
      console.log('❌ Duplicate email not rejected properly\n')
      throw new Error('Duplicate email test failed')
    }

    // Test 3: Verify user in database
    console.log('Test 3: Verify user exists in database')
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
    })

    if (user) {
      console.log('✅ User found in database')
      console.log(`   ID: ${user.id}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Name: ${user.name}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Active: ${user.isActive}`)
      console.log(`   Password hashed: ${user.password ? 'Yes' : 'No'}\n`)
    } else {
      console.log('❌ User not found in database\n')
      throw new Error('User verification test failed')
    }

    // Test 4: Login with correct credentials
    console.log('Test 4: Login with correct credentials')
    const loginResult = await login({
      email: testEmail,
      password: testPassword,
    })

    if (loginResult.success) {
      console.log('✅ Login successful')
      console.log(`   Message: ${loginResult.message}\n`)
    } else {
      console.log('❌ Login failed')
      console.log(`   Error: ${loginResult.error}\n`)
      throw new Error('Login test failed')
    }

    // Test 5: Login with incorrect password
    console.log('Test 5: Login with incorrect password')
    const incorrectLoginResult = await login({
      email: testEmail,
      password: 'WrongPassword123!',
    })

    if (!incorrectLoginResult.success && incorrectLoginResult.error?.includes('Invalid')) {
      console.log('✅ Incorrect password rejected correctly')
      console.log(`   Error: ${incorrectLoginResult.error}\n`)
    } else {
      console.log('❌ Incorrect password not rejected properly\n')
      throw new Error('Incorrect password test failed')
    }

    // Test 6: Login with non-existent email
    console.log('Test 6: Login with non-existent email')
    const nonExistentLoginResult = await login({
      email: 'nonexistent@example.com',
      password: testPassword,
    })

    if (!nonExistentLoginResult.success && nonExistentLoginResult.error?.includes('Invalid')) {
      console.log('✅ Non-existent email rejected correctly')
      console.log(`   Error: ${nonExistentLoginResult.error}\n`)
    } else {
      console.log('❌ Non-existent email not rejected properly\n')
      throw new Error('Non-existent email test failed')
    }

    // Clean up
    console.log('Cleaning up test user...')
    await prisma.user.delete({
      where: { email: testEmail },
    })
    console.log('✅ Test user deleted\n')

    console.log('✅ All authentication flow tests passed!')
  } catch (error) {
    console.error('❌ Test failed:', error)

    // Clean up on error
    try {
      await prisma.user.deleteMany({
        where: { email: testEmail },
      })
    } catch {
      // Ignore cleanup errors
    }

    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testAuthFlow()
