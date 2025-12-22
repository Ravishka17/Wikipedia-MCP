#!/usr/bin/env node

// Simple test script to verify MCP endpoint
const fetch = require('node-fetch');

const MCP_ENDPOINT = process.argv[2] || 'http://localhost:8000/mcp';

async function testMcpEndpoint() {
  console.log(`Testing MCP endpoint: ${MCP_ENDPOINT}`);
  
  try {
    // Test 1: GET request (should return server info)
    console.log('\n1. Testing GET /mcp (server info)...');
    const getResponse = await fetch(MCP_ENDPOINT, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (getResponse.ok) {
      const getData = await getResponse.json();
      console.log('✅ GET /mcp successful');
      console.log(`Server: ${getData.name} v${getData.version}`);
      console.log(`Tools available: ${getData.tools ? getData.tools.length : 0}`);
    } else {
      console.log(`❌ GET /mcp failed: ${getResponse.status} - ${getResponse.statusText}`);
    }
    
    // Test 2: POST initialize request
    console.log('\n2. Testing POST /mcp (initialize)...');
    const initResponse = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {}
      })
    });
    
    if (initResponse.ok) {
      const initData = await initResponse.json();
      console.log('✅ POST /mcp initialize successful');
      console.log('Response:', JSON.stringify(initData, null, 2));
    } else {
      console.log(`❌ POST /mcp initialize failed: ${initResponse.status} - ${initResponse.statusText}`);
      const errorText = await initResponse.text();
      console.log('Error details:', errorText);
    }
    
    // Test 3: POST tools/list request
    console.log('\n3. Testing POST /mcp (tools/list)...');
    const toolsResponse = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      })
    });
    
    if (toolsResponse.ok) {
      const toolsData = await toolsResponse.json();
      console.log('✅ POST /mcp tools/list successful');
      console.log(`Found ${toolsData.result.tools.length} tools`);
      console.log('Tools:', toolsData.result.tools.map(t => t.name).join(', '));
    } else {
      console.log(`❌ POST /mcp tools/list failed: ${toolsResponse.status} - ${toolsResponse.statusText}`);
      const errorText = await toolsResponse.text();
      console.log('Error details:', errorText);
    }
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

// Run the test
testMcpEndpoint().catch(console.error);