
import fetch from 'node-fetch';

async function testServer() {
  const urls = [
    'http://localhost:3000/api/health',
    'http://localhost:3000/test',
    'http://localhost:3000/',
    'http://localhost:3000/some-random-route'
  ];

  console.log('--- Starting Server Health Check ---');

  for (const url of urls) {
    try {
      console.log(`Testing URL: ${url}`);
      const response = await fetch(url);
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (url.includes('/api/health')) {
        const data = await response.json();
        console.log('Health Check Response:', JSON.stringify(data));
      } else {
        const text = await response.text();
        console.log(`Response Preview: ${text.substring(0, 100).replace(/\n/g, ' ')}...`);
        if (text.includes('<div id="root">')) {
          console.log('✅ Found React root element');
        } else {
          console.log('❌ React root element NOT found');
        }
      }
      console.log('---');
    } catch (error) {
      console.error(`❌ Error testing ${url}:`, error.message);
      console.log('---');
    }
  }
}

testServer();
