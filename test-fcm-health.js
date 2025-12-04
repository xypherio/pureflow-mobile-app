#!/usr/bin/env node

/**
 * Quick FCM Server Health Check
 */

async function testFCMServer() {
  const serverUrl = 'https://fcm-server-jcn6xya69-xyphers-projects-a3902ca1.vercel.app';

  console.log('🩺 Testing FCM Server Health...');
  console.log('📡 URL:', serverUrl);

  try {
    const response = await fetch(serverUrl);
    const text = await response.text();

    console.log('📊 Response Status:', response.status);
    console.log('📊 Content-Type:', response.headers.get('content-type'));

    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      console.log('✅ Server is healthy and returning JSON!');
      console.log('📄 Response:', JSON.parse(text));
    } else {
      console.log('❌ Server issue detected!');
      console.log('📄 Response preview:', text.substring(0, 200) + '...');
    }
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

