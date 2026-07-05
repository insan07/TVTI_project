const axios = require('axios');

async function testLogin() {
  try {
    const res = await axios.post('https://twintec-vti-backend.vercel.app/api/auth/login', {
      email: 'admin@twintec.com',
      password: 'password123'
    });
    console.log('SUCCESS: Login works!');
    console.log('User Name:', res.data.name);
    console.log('Role:', res.data.role);
  } catch (err) {
    console.error('FAILURE: Cannot login');
    if (err.response) {
      console.error('Server Status:', err.response.status);
      console.error('Server Data:', err.response.data);
    } else {
      console.error('Error Message:', err.message);
    }
  }
}

testLogin();
