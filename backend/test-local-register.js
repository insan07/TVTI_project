const axios = require('axios');

async function testLocalRegister() {
  const email = `test_user_${Date.now()}@example.com`;
  const registerData = {
    name: 'Test Student',
    email: email,
    password: 'password123',
    phone: '0779876543',
    nic: '199912345678',
    desired_course: '67c9c0490b4d4554b73b5cbb' // Using a valid course ID
  };

  console.log('Sending registration request to local backend...');
  try {
    const res = await axios.post('http://localhost:5000/api/auth/register', registerData);
    console.log('SUCCESS: Local Registration works!', res.data);
    
    // Now try logging in with the newly registered user (which should be inactive by default)
    console.log('Attempting local login with the inactive registered user...');
    try {
      await axios.post('http://localhost:5000/api/auth/login', {
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
    console.error('FAILURE: Local Registration failed');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

testLocalRegister();
