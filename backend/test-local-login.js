const axios = require('axios');

async function testLogin() {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@twintec.com',
      password: 'password123'
    });
    console.log('SUCCESS: Local Login works!', res.data.name);
  } catch (err) {
    console.error('FAILURE: Local Login failed');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

testLogin();
