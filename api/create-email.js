const axios = require('axios');

const AUTH_TOKEN = 'web-test-20250801i2f2W';
const API_URL = `https://dropmail.me/api/graphql/${AUTH_TOKEN}`;

module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    console.log('📋 Nhận yêu cầu OPTIONS cho create-email');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    console.error('❌ Yêu cầu không phải POST:', req.method);
    res.status(405).json({ error: 'Only POST method allowed' });
    return;
  }

  const { domainId = 'RG9tYWluOjI=' } = req.body;
  const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2);

  const query = `
    mutation {
      introduceSession(input: {
        withAddress: true,
        domainId: "${domainId}"
      }) {
        id
        expiresAt
        addresses {
          address
          restoreKey
        }
      }
    }
  `;

  try {
    const response = await axios.post(`${API_URL}?cacheBuster=${uniqueId}`, { query }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    console.log('📡 Phản hồi DropMail create-email:', JSON.stringify(response.data, null, 2));
    res.status(200).json(response.data);
  } catch (error) {
    console.error('❌ Lỗi API create-email:', error.message, error.response?.data);
    res.status(500).json({ error: error.message });
  }
};
