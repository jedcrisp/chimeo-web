// Test script for Vercel API route
const testEmailAPI = async () => {
  try {
    console.log('🧪 Testing Vercel API route...')
    
    const response = await fetch('http://localhost:3000/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'jed@chimeo.app',
        subject: 'Test Email from Vercel API',
        text: 'This is a test email from the Vercel API route.',
        html: '<p>This is a <strong>test email</strong> from the Vercel API route.</p>',
        from: 'jed@chimeo.app'
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    console.log('✅ API test successful:', result)
    
  } catch (error) {
    console.error('❌ API test failed:', error)
  }
}

// Only run if this is executed directly
if (typeof window === 'undefined') {
  testEmailAPI()
}

module.exports = { testEmailAPI }
