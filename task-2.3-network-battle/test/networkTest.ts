/**
 * networkTest.ts
 * Network functionality tests for PVP battle system
 */

import { NetworkManager, NetworkMessageType, ConnectionState } from '../src/NetworkManager';
import { MatchmakingSystem, MatchmakingMode } from '../src/MatchmakingSystem';
import { ReconnectionManager, ReconnectionStatus } from '../src/ReconnectionManager';

// Test configuration
const WS_URL = 'ws://localhost:8080';
const TEST_TIMEOUT = 10000;

/**
 * Test 1: NetworkManager connection
 */
async function testNetworkConnection(): Promise<boolean> {
  console.log('[TEST 1] NetworkManager Connection');
  
  try {
    const networkManager = new NetworkManager({ serverUrl: WS_URL });
    
    await networkManager.connect();
    console.log('✓ Connected to server successfully');
    
    const state = networkManager.getConnectionState();
    console.log(`  - Connection state: ${state}`);
    
    const playerId = networkManager.getPlayerId();
    console.log(`  - Player ID: ${playerId}`);
    
    const isConnected = networkManager.isConnected();
    console.log(`  - Is connected: ${isConnected}`);
    
    networkManager.disconnect();
    console.log('✓ Disconnected successfully');
    
    return true;
  } catch (error) {
    console.error('✗ Connection test failed:', error);
    return false;
  }
}

/**
 * Test 2: Room creation and joining
 */
async function testRoomManagement(): Promise<boolean> {
  console.log('[TEST 2] Room Management');
  
  try {
    const nm1 = new NetworkManager({ serverUrl: WS_URL });
    const nm2 = new NetworkManager({ serverUrl: WS_URL });
    
    await nm1.connect();
    await nm2.connect();
    console.log('✓ Both clients connected');
    
    // Player 1 creates room
    const roomId = await nm1.createRoom();
    console.log(`✓ Room created: ${roomId}`);
    
    // Player 2 joins room
    await nm2.joinRoom(roomId);
    console.log('✓ Player 2 joined room');
    
    // Verify room IDs match
    console.log(`  - Player 1 room: ${nm1.getRoomId()}`);
    console.log(`  - Player 2 room: ${nm2.getRoomId()}`);
    
    // Leave rooms
    nm1.leaveRoom();
    nm2.leaveRoom();
    console.log('✓ Both players left room');
    
    nm1.disconnect();
    nm2.disconnect();
    
    return true;
  } catch (error) {
    console.error('✗ Room management test failed:', error);
    return false;
  }
}

/**
 * Test 3: Message sending and receiving
 */
async function testMessageTransmission(): Promise<boolean> {
  console.log('[TEST 3] Message Transmission');
  
  return new Promise(async (resolve) => {
    try {
      const nm1 = new NetworkManager({ serverUrl: WS_URL });
      const nm2 = new NetworkManager({ serverUrl: WS_URL });
      
      await nm1.connect();
      await nm2.connect();
      
      const roomId = await nm1.createRoom();
      await nm2.joinRoom(roomId);
      
      let messageReceived = false;
      
      // Player 2 listens for move
      nm2.on(NetworkMessageType.MOVE, (msg) => {
        console.log('✓ Message received by Player 2');
        console.log(`  - Move data:`, msg.data);
        messageReceived = true;
        
        nm1.disconnect();
        nm2.disconnect();
        resolve(true);
      });
      
      // Player 1 sends move
      setTimeout(() => {
        nm1.sendMove({
          pos1: { row: 0, col: 0 },
          pos2: { row: 0, col: 1 },
          moveNumber: 1
        });
        console.log('✓ Move sent by Player 1');
      }, 500);
      
      // Timeout
      setTimeout(() => {
        if (!messageReceived) {
          console.error('✗ Message not received within timeout');
          nm1.disconnect();
          nm2.disconnect();
          resolve(false);
        }
      }, TEST_TIMEOUT);
      
    } catch (error) {
      console.error('✗ Message transmission test failed:', error);
      resolve(false);
    }
  });
}

/**
 * Test 4: Latency measurement
 */
async function testLatencyMeasurement(): Promise<boolean> {
  console.log('[TEST 4] Latency Measurement');
  
  try {
    const networkManager = new NetworkManager({ serverUrl: WS_URL });
    
    await networkManager.connect();
    
    // Wait for ping/pong cycle
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    const latency = networkManager.getLatency();
    console.log(`✓ Latency measured: ${latency}ms`);
    
    if (latency > 0 && latency < 1000) {
      console.log('✓ Latency is within acceptable range');
      networkManager.disconnect();
      return true;
    } else {
      console.error('✗ Latency measurement seems incorrect');
      networkManager.disconnect();
      return false;
    }
  } catch (error) {
    console.error('✗ Latency measurement test failed:', error);
    return false;
  }
}

/**
 * Test 5: Matchmaking system
 */
async function testMatchmaking(): Promise<boolean> {
  console.log('[TEST 5] Matchmaking System');
  
  return new Promise(async (resolve) => {
    try {
      const nm1 = new NetworkManager({ serverUrl: WS_URL });
      const nm2 = new NetworkManager({ serverUrl: WS_URL });
      
      await nm1.connect();
      await nm2.connect();
      
      const mm1 = new MatchmakingSystem(nm1);
      const mm2 = new MatchmakingSystem(nm2);
      
      // Start matchmaking for both players
      console.log('Starting matchmaking for both players...');
      
      const match1Promise = mm1.findMatch(MatchmakingMode.RANDOM);
      const match2Promise = mm2.findMatch(MatchmakingMode.RANDOM);
      
      const [result1, result2] = await Promise.all([match1Promise, match2Promise]);
      
      console.log('✓ Both players matched');
      console.log(`  - Player 1 room: ${result1.roomId}`);
      console.log(`  - Player 2 room: ${result2.roomId}`);
      console.log(`  - Player 1 opponent: ${result1.opponentId}`);
      console.log(`  - Player 2 opponent: ${result2.opponentId}`);
      
      if (result1.roomId === result2.roomId) {
        console.log('✓ Both players in same room');
        nm1.disconnect();
        nm2.disconnect();
        resolve(true);
      } else {
        console.error('✗ Players not in same room');
        nm1.disconnect();
        nm2.disconnect();
        resolve(false);
      }
      
    } catch (error) {
      console.error('✗ Matchmaking test failed:', error);
      resolve(false);
    }
  });
}

/**
 * Test 6: Reconnection handling
 */
async function testReconnection(): Promise<boolean> {
  console.log('[TEST 6] Reconnection Handling');
  
  try {
    const networkManager = new NetworkManager({ 
      serverUrl: WS_URL,
      reconnectAttempts: 3,
      reconnectDelay: 1000
    });
    
    const reconnectionManager = new ReconnectionManager(networkManager);
    
    await networkManager.connect();
    console.log('✓ Initial connection established');
    
    // Create a test snapshot
    const snapshot = {
      timestamp: Date.now(),
      roomId: 'test_room',
      playerId: networkManager.getPlayerId(),
      opponentId: 'opponent_123',
      state: {
        playerGrid: [],
        opponentGrid: [],
        playerScore: 100,
        opponentScore: 80,
        playerMoves: 10,
        opponentMoves: 9,
        eventProgress: 45,
        activeEvents: [],
        currentTurn: 'PLAYER'
      },
      moveHistory: [],
      lastSyncedMove: 0
    };
    
    reconnectionManager.saveSnapshot(snapshot);
    console.log('✓ State snapshot saved');
    
    const retrieved = reconnectionManager.getLatestSnapshot();
    if (retrieved && retrieved.roomId === snapshot.roomId) {
      console.log('✓ Snapshot retrieved successfully');
    } else {
      console.error('✗ Failed to retrieve snapshot');
      networkManager.disconnect();
      return false;
    }
    
    const status = reconnectionManager.getStatus();
    console.log(`  - Reconnection status: ${status}`);
    
    networkManager.disconnect();
    return true;
  } catch (error) {
    console.error('✗ Reconnection test failed:', error);
    return false;
  }
}

/**
 * Test 7: Multiple rooms
 */
async function testMultipleRooms(): Promise<boolean> {
  console.log('[TEST 7] Multiple Rooms');
  
  try {
    const clients = [];
    const rooms = [];
    
    // Create 3 rooms with 2 players each
    for (let i = 0; i < 3; i++) {
      const nm1 = new NetworkManager({ serverUrl: WS_URL });
      const nm2 = new NetworkManager({ serverUrl: WS_URL });
      
      await nm1.connect();
      await nm2.connect();
      
      const roomId = await nm1.createRoom();
      await nm2.joinRoom(roomId);
      
      clients.push(nm1, nm2);
      rooms.push(roomId);
      
      console.log(`✓ Room ${i + 1} created: ${roomId}`);
    }
    
    console.log(`✓ Created ${rooms.length} rooms with ${clients.length} players`);
    
    // Verify all rooms are different
    const uniqueRooms = new Set(rooms);
    if (uniqueRooms.size === rooms.length) {
      console.log('✓ All rooms have unique IDs');
    } else {
      console.error('✗ Duplicate room IDs found');
      clients.forEach(nm => nm.disconnect());
      return false;
    }
    
    // Cleanup
    clients.forEach(nm => nm.disconnect());
    return true;
  } catch (error) {
    console.error('✗ Multiple rooms test failed:', error);
    return false;
  }
}

/**
 * Test 8: Connection stress test
 */
async function testConnectionStress(): Promise<boolean> {
  console.log('[TEST 8] Connection Stress Test');
  
  try {
    const connections = 10;
    const clients = [];
    
    console.log(`Creating ${connections} simultaneous connections...`);
    
    for (let i = 0; i < connections; i++) {
      const nm = new NetworkManager({ serverUrl: WS_URL });
      clients.push(nm);
    }
    
    // Connect all clients simultaneously
    const connectPromises = clients.map(nm => nm.connect());
    await Promise.all(connectPromises);
    
    console.log(`✓ All ${connections} connections established`);
    
    // Verify all are connected
    const connectedCount = clients.filter(nm => nm.isConnected()).length;
    console.log(`  - Connected clients: ${connectedCount}/${connections}`);
    
    // Disconnect all
    clients.forEach(nm => nm.disconnect());
    console.log('✓ All clients disconnected');
    
    return connectedCount === connections;
  } catch (error) {
    console.error('✗ Stress test failed:', error);
    return false;
  }
}

/**
 * Run all tests
 */
export async function runAllTests(): Promise<void> {
  console.log('================================');
  console.log('  NETWORK FUNCTIONALITY TESTS');
  console.log('================================\n');

  const results: { name: string; passed: boolean }[] = [];

  // Run tests sequentially to avoid server overload
  results.push({ 
    name: 'NetworkManager Connection', 
    passed: await testNetworkConnection() 
  });
  
  await delay(1000);
  
  results.push({ 
    name: 'Room Management', 
    passed: await testRoomManagement() 
  });
  
  await delay(1000);
  
  results.push({ 
    name: 'Message Transmission', 
    passed: await testMessageTransmission() 
  });
  
  await delay(1000);
  
  results.push({ 
    name: 'Latency Measurement', 
    passed: await testLatencyMeasurement() 
  });
  
  await delay(1000);
  
  results.push({ 
    name: 'Matchmaking System', 
    passed: await testMatchmaking() 
  });
  
  await delay(1000);
  
  results.push({ 
    name: 'Reconnection Handling', 
    passed: await testReconnection() 
  });
  
  await delay(1000);
  
  results.push({ 
    name: 'Multiple Rooms', 
    passed: await testMultipleRooms() 
  });
  
  await delay(1000);
  
  results.push({ 
    name: 'Connection Stress Test', 
    passed: await testConnectionStress() 
  });

  // Summary
  console.log('\n================================');
  console.log('        TEST SUMMARY');
  console.log('================================\n');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(result => {
    console.log(`${result.passed ? '✓' : '✗'} ${result.name}`);
  });

  console.log(`\n${passed}/${total} tests passed`);
  console.log(`Success rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Network system is ready.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }
}

/**
 * Utility: Delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run tests if executed directly
if (typeof window !== 'undefined') {
  console.log('Network tests ready. Call runAllTests() to execute.');
}
