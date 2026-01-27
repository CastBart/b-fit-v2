/* eslint-disable no-console */
import { hashPassword, verifyPassword } from './auth'
import { prisma } from '@/lib/db/prisma'

async function testAuth() {
  console.log('🧪 Testing NextAuth setup...\n')

  try {
    // Test 1: Hash password
    console.log('Test 1: Hashing password...')
    const password = 'TestPassword123!'
    const hashedPassword = await hashPassword(password)
    console.log('✅ Password hashed successfully')
    console.log(`   Hash: ${hashedPassword.substring(0, 20)}...\n`)

    // Test 2: Verify password
    console.log('Test 2: Verifying password...')
    const isValid = await verifyPassword(password, hashedPassword)
    console.log(`✅ Password verification: ${isValid ? 'PASS' : 'FAIL'}\n`)

    // Test 3: Verify wrong password
    console.log('Test 3: Verifying wrong password...')
    const isInvalid = await verifyPassword('WrongPassword', hashedPassword)
    console.log(`✅ Wrong password rejection: ${!isInvalid ? 'PASS' : 'FAIL'}\n`)

    // Test 4: Create test user
    console.log('Test 4: Creating test user...')

    // Clean up existing test user if any
    await prisma.user.deleteMany({
      where: { email: 'test@example.com' },
    })

    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: await hashPassword('TestPassword123!'),
        role: 'PERSONAL',
      },
    })
    console.log('✅ Test user created successfully')
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Role: ${user.role}\n`)

    // Test 5: Find user and verify password
    console.log('Test 5: Finding user and verifying credentials...')
    const foundUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    })

    if (!foundUser || !foundUser.password) {
      throw new Error('User not found or has no password')
    }

    const isPasswordCorrect = await verifyPassword('TestPassword123!', foundUser.password)
    console.log(`✅ User authentication: ${isPasswordCorrect ? 'PASS' : 'FAIL'}\n`)

    // Clean up
    console.log('Cleaning up test user...')
    await prisma.user.delete({
      where: { id: user.id },
    })
    console.log('✅ Test user deleted\n')

    console.log('✅ All tests passed!')
  } catch (error) {
    console.error('❌ Test failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testAuth()
