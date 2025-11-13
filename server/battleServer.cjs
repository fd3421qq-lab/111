/**
 * battleServer.cjs
 * WebSocket server for real-time PVP battles
 */

const WebSocket = require('ws');
const http = require('http');

/**
 * Battle room class
 */
class BattleRoom {
  constructor(id) {
    this.id = id;
    this.players = [];
    this.maxPlayers = 2;
    this.state = {
      gameStarted: false,
      currentTurn: null,
      playerStates: new Map(),
      moveHistory: []
    };
    this.createdAt = Date.now();
  }

  addPlayer(playerId, ws) {
    if (this.players.length >= this.maxPlayers) {
      return false;
    }
    
    this.players.push({ playerId, ws });
    this.state.playerStates.set(playerId, {
      score: 0,
      moves: 0,
      connected: true
    });

    // Start game when both players joined
    if (this.players.length === this.maxPlayers) {
      this.startGame();
    }

    return true;
  }

  removePlayer(playerId) {
    const index = this.players.findIndex(p => p.playerId === playerId);
    if (index !== -1) {
      this.players.splice(index, 1);
      this.state.playerStates.delete(playerId);
    }
  }

  startGame() {
    this.state.gameStarted = true;
    this.state.currentTurn = this.players[0].playerId;

    // Notify both players
    this.broadcast({
      type: 'GAME_START',
      data: {
        roomId: this.id,
        players: this.players.map(p => p.playerId),
        startingPlayer: this.state.currentTurn
      },
      timestamp: Date.now(),
      playerId: 'server'
    });
  }

  broadcast(message, excludePlayerId = null) {
    this.players.forEach(player => {
      if (player.playerId !== excludePlayerId && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(message));
      }
    });
  }

  handleMove(playerId, moveData) {
    // Record move
    this.state.moveHistory.push({
      playerId,
      move: moveData,
      timestamp: Date.now()
    });

    // Broadcast to opponent
    this.broadcast({
      type: 'MOVE',
      data: moveData,
      timestamp: Date.now(),
      playerId
    }, playerId);
  }

  isFull() {
    return this.players.length >= this.maxPlayers;
  }

  isEmpty() {
    return this.players.length === 0;
  }
}

/**
 * Battle server class
 */
class BattleServer {
  constructor(port = 8080) {
    this.port = port;
    this.rooms = new Map();
    this.clients = new Map(); // playerId -> ws
    this.matchmakingQueue = [];
    
    this.setupServer();
    this.setupMatchmaking();
  }

  setupServer() {
    // Create HTTP server
    this.httpServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('WebSocket Battle Server Running\n');
    });

    // Create WebSocket server
    this.wss = new WebSocket.Server({ server: this.httpServer });

    this.wss.on('connection', (ws) => {
      console.log('[Server] New connection');

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('[Server] Message parsing error:', error);
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('[Server] WebSocket error:', error);
      });
    });

    this.httpServer.listen(this.port, '0.0.0.0', () => {
      console.log(`[Server] Battle server listening on port ${this.port}`);
    });
  }

  setupMatchmaking() {
    // Process matchmaking queue every 2 seconds
    setInterval(() => {
      this.processMatchmakingQueue();
    }, 2000);

    // Clean up empty rooms every 30 seconds
    setInterval(() => {
      this.cleanupRooms();
    }, 30000);
  }

  handleMessage(ws, message) {
    const { type, data, playerId } = message;

    switch (type) {
      case 'CONNECT':
        this.handleConnect(ws, playerId);
        break;

      case 'CREATE_ROOM':
        this.handleCreateRoom(ws, message);
        break;

      case 'JOIN_ROOM':
        this.handleJoinRoom(ws, message);
        break;

      case 'LEAVE_ROOM':
        this.handleLeaveRoom(ws, message);
        break;

      case 'MOVE':
        this.handleMove(ws, message);
        break;

      case 'STATE_SYNC':
        this.handleStateSync(ws, message);
        break;

      case 'CHAT':
        this.handleChat(ws, message);
        break;

      case 'PING':
        this.handlePing(ws, message);
        break;

      default:
        console.log(`[Server] Unknown message type: ${type}`);
    }
  }

  handleConnect(ws, playerId) {
    this.clients.set(playerId, ws);
    ws.playerId = playerId;
    console.log(`[Server] Player connected: ${playerId}`);

    // Send connection confirmation
    this.send(ws, {
      type: 'CONNECT',
      data: { status: 'connected', playerId },
      timestamp: Date.now(),
      playerId: 'server'
    });
  }

  handleCreateRoom(ws, message) {
    const roomId = this.generateRoomId();
    const room = new BattleRoom(roomId);
    
    room.addPlayer(message.playerId, ws);
    this.rooms.set(roomId, room);

    console.log(`[Server] Room created: ${roomId} by ${message.playerId}`);

    // Send room created confirmation
    this.send(ws, {
      type: 'ROOM_CREATED',
      data: { roomId },
      timestamp: Date.now(),
      playerId: 'server',
      messageId: message.messageId
    });
  }

  handleJoinRoom(ws, message) {
    const { roomId, playerId } = message.data;
    const room = this.rooms.get(roomId);

    if (!room) {
      this.send(ws, {
        type: 'ROOM_NOT_FOUND',
        data: { roomId },
        timestamp: Date.now(),
        playerId: 'server',
        messageId: message.messageId
      });
      return;
    }

    if (room.isFull()) {
      this.send(ws, {
        type: 'ROOM_FULL',
        data: { roomId },
        timestamp: Date.now(),
        playerId: 'server',
        messageId: message.messageId
      });
      return;
    }

    room.addPlayer(playerId, ws);
    console.log(`[Server] Player ${playerId} joined room ${roomId}`);

    // Get opponent info
    const opponent = room.players.find(p => p.playerId !== playerId);

    // Send joined confirmation
    this.send(ws, {
      type: 'ROOM_JOINED',
      data: { 
        roomId,
        opponentId: opponent ? opponent.playerId : null,
        playerCount: room.players.length
      },
      timestamp: Date.now(),
      playerId: 'server',
      messageId: message.messageId
    });

    // Notify opponent
    if (opponent) {
      this.send(opponent.ws, {
        type: 'ROOM_JOINED',
        data: {
          roomId,
          opponentId: playerId,
          playerCount: room.players.length
        },
        timestamp: Date.now(),
        playerId: 'server'
      });
    }
  }

  handleLeaveRoom(ws, message) {
    const { roomId, playerId } = message.data;
    const room = this.rooms.get(roomId);

    if (room) {
      room.removePlayer(playerId);
      console.log(`[Server] Player ${playerId} left room ${roomId}`);

      // Notify remaining players
      room.broadcast({
        type: 'PLAYER_LEFT',
        data: { playerId },
        timestamp: Date.now(),
        playerId: 'server'
      });

      // Delete room if empty
      if (room.isEmpty()) {
        this.rooms.delete(roomId);
        console.log(`[Server] Room ${roomId} deleted (empty)`);
      }
    }
  }

  handleMove(ws, message) {
    const { roomId, move } = message.data;
    const room = this.rooms.get(roomId);

    if (room) {
      room.handleMove(message.playerId, move);
      console.log(`[Server] Move from ${message.playerId} in room ${roomId}`);
    }
  }

  handleStateSync(ws, message) {
    const { roomId, state } = message.data;
    const room = this.rooms.get(roomId);

    if (room) {
      // Broadcast state to opponent
      room.broadcast({
        type: 'STATE_SYNC',
        data: state,
        timestamp: Date.now(),
        playerId: message.playerId
      }, message.playerId);
    }
  }

  handleChat(ws, message) {
    const { roomId, message: chatMessage } = message.data;

    // Check if it's a matchmaking command
    if (chatMessage.startsWith('/matchmaking')) {
      this.handleMatchmakingRequest(ws, message);
      return;
    }

    // Check if it's a cancel command
    if (chatMessage.startsWith('/cancel_matchmaking')) {
      this.handleCancelMatchmaking(ws, message);
      return;
    }

    // Regular chat - broadcast to room
    const room = this.rooms.get(roomId);
    if (room) {
      room.broadcast(message, message.playerId);
    }
  }

  handleMatchmakingRequest(ws, message) {
    const playerId = message.playerId;
    
    // Add to queue
    this.matchmakingQueue.push({
      playerId,
      ws,
      timestamp: Date.now()
    });

    console.log(`[Server] Player ${playerId} added to matchmaking queue (${this.matchmakingQueue.length} waiting)`);
  }

  handleCancelMatchmaking(ws, message) {
    const playerId = message.playerId;
    const index = this.matchmakingQueue.findIndex(p => p.playerId === playerId);
    
    if (index !== -1) {
      this.matchmakingQueue.splice(index, 1);
      console.log(`[Server] Player ${playerId} removed from matchmaking queue`);
    }
  }

  processMatchmakingQueue() {
    // Match players in pairs
    while (this.matchmakingQueue.length >= 2) {
      const player1 = this.matchmakingQueue.shift();
      const player2 = this.matchmakingQueue.shift();

      // Create room and add both players
      const roomId = this.generateRoomId();
      const room = new BattleRoom(roomId);

      room.addPlayer(player1.playerId, player1.ws);
      room.addPlayer(player2.playerId, player2.ws);
      this.rooms.set(roomId, room);

      console.log(`[Server] Matchmaking: ${player1.playerId} vs ${player2.playerId} in room ${roomId}`);

      // Notify both players
      this.send(player1.ws, {
        type: 'GAME_START',
        data: {
          roomId,
          opponentId: player2.playerId
        },
        timestamp: Date.now(),
        playerId: 'server'
      });

      this.send(player2.ws, {
        type: 'GAME_START',
        data: {
          roomId,
          opponentId: player1.playerId
        },
        timestamp: Date.now(),
        playerId: 'server'
      });
    }
  }

  handlePing(ws, message) {
    this.send(ws, {
      type: 'PONG',
      data: message.data,
      timestamp: Date.now(),
      playerId: 'server'
    });
  }

  handleDisconnect(ws) {
    const playerId = ws.playerId;
    if (!playerId) return;

    console.log(`[Server] Player disconnected: ${playerId}`);

    // Remove from clients
    this.clients.delete(playerId);

    // Remove from matchmaking queue
    const queueIndex = this.matchmakingQueue.findIndex(p => p.playerId === playerId);
    if (queueIndex !== -1) {
      this.matchmakingQueue.splice(queueIndex, 1);
    }

    // Find and update rooms
    this.rooms.forEach((room, roomId) => {
      const playerIndex = room.players.findIndex(p => p.playerId === playerId);
      if (playerIndex !== -1) {
        // Notify opponent
        room.broadcast({
          type: 'PLAYER_DISCONNECTED',
          data: { playerId },
          timestamp: Date.now(),
          playerId: 'server'
        }, playerId);

        // Remove player from room
        room.removePlayer(playerId);

        // Delete room if empty
        if (room.isEmpty()) {
          this.rooms.delete(roomId);
          console.log(`[Server] Room ${roomId} deleted (empty after disconnect)`);
        }
      }
    });
  }

  cleanupRooms() {
    const now = Date.now();
    const maxRoomAge = 3600000; // 1 hour

    this.rooms.forEach((room, roomId) => {
      if (room.isEmpty() || (now - room.createdAt > maxRoomAge)) {
        this.rooms.delete(roomId);
        console.log(`[Server] Room ${roomId} cleaned up`);
      }
    });
  }

  send(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  generateRoomId() {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  getStats() {
    return {
      totalRooms: this.rooms.size,
      totalPlayers: this.clients.size,
      matchmakingQueue: this.matchmakingQueue.length
    };
  }
}

// Start server
const PORT = process.env.PORT || 8080;
const server = new BattleServer(PORT);

// Log stats every 30 seconds
setInterval(() => {
  const stats = server.getStats();
  console.log(`[Server] Stats - Rooms: ${stats.totalRooms}, Players: ${stats.totalPlayers}, Queue: ${stats.matchmakingQueue}`);
}, 30000);

module.exports = BattleServer;
