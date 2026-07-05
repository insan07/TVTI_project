const axios = require('axios');

async function testRegister() {
  const email = `test_user_${Date.now()}@example.com`;
  const registerData = {
    name: 'Test Student',
    email: email,
    password: 'password123',
    phone: '0779876543',
    nic: '199912345678',
    desired_course: '1' // Using '1' as a placeholder or course ID
  };

  console.log('Sending registration request to Vercel backend...');
  try {
    const res = await axios.post('https://twintec-vti-backend.vercel.app/api/auth/register', registerData);
    console.log('SUCCESS: Registration works!', res.data);
    
    // Now try logging in with the newly registered user (which should be inactive by default)
    console.log('Attempting login with the inactive registered user...');
    try {
      await axios.post('https://twintec-vti-backend.vercel.app/api/auth/login', {
        email: email,
        password: 'password123'
      });
      console.log('UNEXPECTED: Login succeeded for inactive user!');
    } catch (loginErr) {
      console.log('EXPECTED FAILURE: Login failed for inactive user.');
      if (loginErr.response) {
        console.log('Status:', loginErr.response.status);
        console.log('Message:', loginErr.response.data.message);
      } else {
        console.log('Error:', loginErr.message);
      }
    }
  } catch (err) {
    console.error('FAILURE: Registration failed');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

testRegister();
