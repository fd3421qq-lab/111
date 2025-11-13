/**
 * networkIntegrationTest.ts
 * Integration tests for NetworkBattleManager
 */

import { NetworkBattleManager, NetworkBattleState } from '../src/NetworkBattleManager';
import { MatchmakingMode } from '../src/MatchmakingSystem';

const WS_URL = 'ws://localhost:8080';
const TEST_TIMEOUT = 15000;

/**
 * Test 1: NetworkBattleManager initialization
 */
async function testInitialization(): Promise<boolean> {
  console.log('[TEST 1] NetworkBattleManager Initialization');
  
  try {
    const nbm = new NetworkBattleManager({ serverUrl: WS_URL });
    console.log('✓ NetworkBattleManager created');
    
    const state = nbm.getState();
    console.log(`  - Initial state: ${state}`);
    
    if (state === NetworkBattleState.DISCONNECTED) {
      console.log('✓ Initial state correct');
      return true;
    } else {
      console.error('✗ Initial state incorrect');
      return false;
    }
  } catch (error) {
    console.error('✗ Initialization failed:', error);
    return false;
  }
}

/**
 * Test 2: Connection to server
 */
async function testConnection(): Promise<boolean> {
  console.log('[TEST 2] Connection to Server');
  
  try {
    const nbm = new NetworkBattleManager({ serverUrl: WS_URL });
    
    await nbm.connect();
    console.log('✓ Connected to server');
    
    const isConnected = nbm.isConnected();
    console.log(`  - Is connected: ${isConnected}`);
    
    const state = nbm.getState();
    console.log(`  - State: ${state}`);
    
    nbm.disconnect();
    console.log('✓ Disconnected successfully');
    
    return isConnected && state === NetworkBattleState.CONNECTED;
  } catch (error) {
    console.error('✗ Connection test failed:', error);
    return false;
  }
}

/**
 * Test 3: Room creation and joining
 */
async function testRoomOperations(): Promise<boolean> {
  console.log('[TEST 3] Room Operations');
  
  try {
    const nbm1 = new NetworkBattleManager({ serverUrl: WS_URL });
    const nbm2 = new NetworkBattleManager({ serverUrl: WS_URL });
    
    await nbm1.connect();
    await nbm2.connect();
    console.log('✓ Both clients connected');
    
    // Client 1 creates room
    const roomId = await nbm1.createRoom();
    console.log(`✓ Room created: ${roomId}`);
    console.log(`  - Client 1 state: ${nbm1.getState()}`);
    console.log(`  - Client 1 role: ${nbm1.getPlayerRole()}`);
    
    // Client 2 joins room
    await nbm2.joinRoom(roomId);
    console.log('✓ Client 2 joined room');
    console.log(`  - Client 2 state: ${nbm2.getState()}`);
    console.log(`  - Client 2 role: ${nbm2.getPlayerRole()}`);
    
    // Verify room IDs match
    const room1 = nbm1.getRoomId();
    const room2 = nbm2.getRoomId();
    console.log(`  - Room IDs: ${room1} === ${room2}`);
    
    nbm1.disconnect();
    nbm2.disconnect();
    
    return room1 === room2;
  } catch (error) {
    console.error('✗ Room operations test failed:', error);
    return false;
  }
}

/**
 * Test 4: Battle integration
 */
async function testBattleIntegration(): Promise<boolean> {
  console.log('[TEST 4] Battle Integration');
  
  return new Promise(async (resolve) => {
    try {
      const nbm1 = new NetworkBattleManager({ serverUrl: WS_URL });
      const nbm2 = new NetworkBattleManager({ serverUrl: WS_URL });
      
      await nbm1.connect();
      await nbm2.connect();
      
      const roomId = await nbm1.createRoom();
      await nbm2.joinRoom(roomId);
      
      let battle1Started = false;
      let battle2Started = false;
      
      // Setup battle start callbacks
      nbm1.onBattleStart(() => {
        console.log('✓ Client 1 battle started');
        battle1Started = true;
        checkCompletion();
      });
      
      nbm2.onBattleStart(() => {
        console.log('✓ Client 2 battle started');
        battle2Started = true;
        checkCompletion();
      });
      
      function checkCompletion() {
        if (battle1Started && battle2Started) {
          console.log('✓ Both clients in battle');
          console.log(`  - Client 1 state: ${nbm1.getState()}`);
          console.log(`  - Client 2 state: ${nbm2.getState()}`);
          
          nbm1.disconnect();
          nbm2.disconnect();
          resolve(true);
        }
      }
      
      // Wait for auto-start (should happen after join)
      setTimeout(() => {
        if (!battle1Started || !battle2Started) {
          console.error('✗ Battle did not start automatically');
          nbm1.disconnect();
          nbm2.disconnect();
          resolve(false);
        }
      }, 5000);
      
    } catch (error) {
      console.error('✗ Battle integration test failed:', error);
      resolve(false);
    }
  });
}

/**
 * Test 5: Move execution and sync
 */
async function testMoveExecution(): Promise<boolean> {
  console.log('[TEST 5] Move Execution and Sync');
  
  return new Promise(async (resolve) => {
    try {
      const nbm1 = new NetworkBattleManager({ serverUrl: WS_URL });
      const nbm2 = new NetworkBattleManager({ serverUrl: WS_URL });
      
      await nbm1.connect();
      await nbm2.connect();
      
      const roomId = await nbm1.createRoom();
      await nbm2.joinRoom(roomId);
      
      let moveReceived = false;
      
      // Client 2 listens for moves
      nbm2.onOpponentMove((move) => {
        console.log('✓ Client 2 received opponent move');
        console.log(`  - Move: (${move.pos1.row},${move.pos1.col}) ↔ (${move.pos2.row},${move.pos2.col})`);
        moveReceived = true;
        
        nbm1.disconnect();
        nbm2.disconnect();
        resolve(true);
      });
      
      // Wait for battle to start
      setTimeout(async () => {
        if (nbm1.isInBattle()) {
          console.log('Executing move from Client 1...');
          
          try {
            await nbm1.executeMove(
              { row: 0, col: 0 },
              { row: 0, col: 1 }
            );
            console.log('✓ Move executed');
          } catch (error) {
            console.log('Move execution error (expected if invalid):', error.message);
          }
        }
      }, 2000);
      
      // Timeout
      setTimeout(() => {
        if (!moveReceived) {
          console.error('✗ Move not received');
          nbm1.disconnect();
          nbm2.disconnect();
          resolve(false);
        }
      }, TEST_TIMEOUT);
      
    } catch (error) {
      console.error('✗ Move execution test failed:', error);
      resolve(false);
    }
  });
}

/**
 * Test 6: State change callbacks
 */
async function testStateCallbacks(): Promise<boolean> {
  console.log('[TEST 6] State Change Callbacks');
  
  return new Promise(async (resolve) => {
    try {
      const nbm = new NetworkBattleManager({ serverUrl: WS_URL });
      
      const states: NetworkBattleState[] = [];
      
      nbm.onStateChange((state) => {
        states.push(state);
        console.log(`  - State changed to: ${state}`);
      });
      
      await nbm.connect();
      
      setTimeout(() => {
        console.log(`✓ Captured ${states.length} state changes`);
        console.log('  - States:', states.join(' → '));
        
        const hasConnecting = states.includes(NetworkBattleState.CONNECTING);
        const hasConnected = states.includes(NetworkBattleState.CONNECTED);
        
        nbm.disconnect();
        
        if (hasConnecting && hasConnected) {
          console.log('✓ State callbacks working correctly');
          resolve(true);
        } else {
          console.error('✗ Missing expected states');
          resolve(false);
        }
      }, 1000);
      
    } catch (error) {
      console.error('✗ State callbacks test failed:', error);
      resolve(false);
    }
  });
}

/**
 * Test 7: Latency measurement
 */
async function testLatencyMeasurement(): Promise<boolean> {
  console.log('[TEST 7] Latency Measurement');
  
  try {
    const nbm = new NetworkBattleManager({ serverUrl: WS_URL });
    
    await nbm.connect();
    
    // Wait for ping/pong cycle
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    const latency = nbm.getLatency();
    console.log(`✓ Latency measured: ${latency}ms`);
    
    nbm.disconnect();
    
    if (latency > 0 && latency < 1000) {
      console.log('✓ Latency within acceptable range');
      return true;
    } else {
      console.error('✗ Latency measurement incorrect');
      return false;
    }
  } catch (error) {
    console.error('✗ Latency test failed:', error);
    return false;
  }
}

/**
 * Test 8: Error handling
 */
async function testErrorHandling(): Promise<boolean> {
  console.log('[TEST 8] Error Handling');
  
  try {
    const nbm = new NetworkBattleManager({ serverUrl: WS_URL });
    
    let errorCaught = false;
    
    nbm.onError((error) => {
      console.log('✓ Error callback triggered');
      console.log(`  - Error: ${error.message}`);
      errorCaught = true;
    });
    
    await nbm.connect();
    
    // Try to join non-existent room
    try {
      await nbm.joinRoom('invalid_room_123');
      console.error('✗ Should have thrown error');
      nbm.disconnect();
      return false;
    } catch (error) {
      console.log('✓ Error thrown for invalid room');
      nbm.disconnect();
      return true;
    }
  } catch (error) {
    console.error('✗ Error handling test failed:', error);
    return false;
  }
}

/**
 * Run all integration tests
 */
export async function runAllTests(): Promise<void> {
  console.log('================================');
  console.log(' NETWORK INTEGRATION TESTS');
  console.log('================================\n');

  const results: { name: string; passed: boolean }[] = [];

  // Run tests sequentially
  results.push({
    name: 'NetworkBattleManager Initialization',
    passed: await testInitialization()
  });
  
  await delay(1000);
  
  results.push({
    name: 'Connection to Server',
    passed: await testConnection()
  });
  
  await delay(1000);
  
  results.push({
    name: 'Room Operations',
    passed: await testRoomOperations()
  });
  
  await delay(1000);
  
  results.push({
    name: 'Battle Integration',
    passed: await testBattleIntegration()
  });
  
  await delay(1000);
  
  results.push({
    name: 'Move Execution and Sync',
    passed: await testMoveExecution()
  });
  
  await delay(1000);
  
  results.push({
    name: 'State Change Callbacks',
    passed: await testStateCallbacks()
  });
  
  await delay(1000);
  
  results.push({
    name: 'Latency Measurement',
    passed: await testLatencyMeasurement()
  });
  
  await delay(1000);
  
  results.push({
    name: 'Error Handling',
    passed: await testErrorHandling()
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
    console.log('\n🎉 All integration tests passed!');
  } else {
    console.log('\n⚠️  Some integration tests failed.');
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
  console.log('Integration tests ready. Call runAllTests() to execute.');
}
