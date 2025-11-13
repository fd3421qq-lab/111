# Network Protocol Documentation

## Overview

This document describes the network protocol used for real-time PVP battles in the Match-3 game system.

## Transport Layer

### WebSocket Connection
- **Protocol**: WebSocket (ws:// for local, wss:// for production)
- **Default Port**: 8080
- **Message Format**: JSON
- **Encoding**: UTF-8

### Connection Flow
```
Client                          Server
  │                               │
  ├─── WebSocket Connect ────────>│
  │<──── Connection Accepted ─────┤
  │                               │
  ├─── CONNECT Message ──────────>│
  │<──── CONNECT Response ────────┤
  │                               │
  ├─── PING ────────────────────>│
  │<──── PONG ────────────────────┤
  │     (every 5 seconds)         │
```

## Message Structure

### Base Message Format
```typescript
interface NetworkMessage {
  type: NetworkMessageType;    // Message type
  data: any;                    // Message payload
  timestamp: number;            // Unix timestamp (ms)
  playerId: string;             // Sender player ID
  messageId?: string;           // Optional unique message ID
}
```

## Message Types

### 1. Connection Messages

#### CONNECT
Sent by client after WebSocket connection established.

**Request:**
```json
{
  "type": "CONNECT",
  "data": {
    "playerId": "player_1234567890_abc123"
  },
  "timestamp": 1699876543210,
  "playerId": "player_1234567890_abc123"
}
```

**Response:**
```json
{
  "type": "CONNECT",
  "data": {
    "status": "connected",
    "playerId": "player_1234567890_abc123"
  },
  "timestamp": 1699876543215,
  "playerId": "server"
}
```

#### DISCONNECT
Graceful disconnection notification.

**Request:**
```json
{
  "type": "DISCONNECT",
  "data": {
    "playerId": "player_1234567890_abc123"
  },
  "timestamp": 1699876543210,
  "playerId": "player_1234567890_abc123"
}
```

### 2. Room Management Messages

#### CREATE_ROOM
Create a new battle room.

**Request:**
```json
{
  "type": "CREATE_ROOM",
  "data": {
    "playerId": "player_1234567890_abc123"
  },
  "timestamp": 1699876543210,
  "playerId": "player_1234567890_abc123",
  "messageId": "msg_1699876543210_xyz789"
}
```

**Response:**
```json
{
  "type": "ROOM_CREATED",
  "data": {
    "roomId": "room_1699876543210_abc123"
  },
  "timestamp": 1699876543215,
  "playerId": "server",
  "messageId": "msg_1699876543210_xyz789"
}
```

#### JOIN_ROOM
Join an existing battle room.

**Request:**
```json
{
  "type": "JOIN_ROOM",
  "data": {
    "roomId": "room_1699876543210_abc123",
    "playerId": "player_1234567891_def456"
  },
  "timestamp": 1699876543220,
  "playerId": "player_1234567891_def456",
  "messageId": "msg_1699876543220_xyz790"
}
```

**Success Response:**
```json
{
  "type": "ROOM_JOINED",
  "data": {
    "roomId": "room_1699876543210_abc123",
    "opponentId": "player_1234567890_abc123",
    "playerCount": 2
  },
  "timestamp": 1699876543225,
  "playerId": "server",
  "messageId": "msg_1699876543220_xyz790"
}
```

**Error Responses:**
```json
{
  "type": "ROOM_NOT_FOUND",
  "data": {
    "roomId": "invalid_room"
  },
  "timestamp": 1699876543225,
  "playerId": "server",
  "messageId": "msg_1699876543220_xyz790"
}

{
  "type": "ROOM_FULL",
  "data": {
    "roomId": "room_1699876543210_abc123"
  },
  "timestamp": 1699876543225,
  "playerId": "server",
  "messageId": "msg_1699876543220_xyz790"
}
```

#### LEAVE_ROOM
Leave current room.

**Request:**
```json
{
  "type": "LEAVE_ROOM",
  "data": {
    "roomId": "room_1699876543210_abc123",
    "playerId": "player_1234567890_abc123"
  },
  "timestamp": 1699876543230,
  "playerId": "player_1234567890_abc123"
}
```

### 3. Game Action Messages

#### GAME_START
Broadcast when both players are ready.

**Server Broadcast:**
```json
{
  "type": "GAME_START",
  "data": {
    "roomId": "room_1699876543210_abc123",
    "players": [
      "player_1234567890_abc123",
      "player_1234567891_def456"
    ],
    "startingPlayer": "player_1234567890_abc123"
  },
  "timestamp": 1699876543240,
  "playerId": "server"
}
```

#### MOVE
Player move action.

**Client Request:**
```json
{
  "type": "MOVE",
  "data": {
    "roomId": "room_1699876543210_abc123",
    "move": {
      "pos1": { "row": 0, "col": 0 },
      "pos2": { "row": 0, "col": 1 },
      "moveNumber": 1
    }
  },
  "timestamp": 1699876543250,
  "playerId": "player_1234567890_abc123"
}
```

**Server Broadcast (to opponent):**
```json
{
  "type": "MOVE",
  "data": {
    "move": {
      "pos1": { "row": 0, "col": 0 },
      "pos2": { "row": 0, "col": 1 },
      "moveNumber": 1
    }
  },
  "timestamp": 1699876543255,
  "playerId": "player_1234567890_abc123"
}
```

#### STATE_SYNC
Periodic game state synchronization.

**Client Request:**
```json
{
  "type": "STATE_SYNC",
  "data": {
    "roomId": "room_1699876543210_abc123",
    "state": {
      "playerGrid": [[1,2,3,...], ...],
      "opponentGrid": [[1,2,3,...], ...],
      "playerScore": 150,
      "opponentScore": 120,
      "playerMoves": 10,
      "opponentMoves": 9,
      "eventProgress": 45,
      "activeEvents": ["GRAVITY_REVERSE"],
      "currentTurn": "PLAYER"
    }
  },
  "timestamp": 1699876543260,
  "playerId": "player_1234567890_abc123"
}
```

**Server Broadcast (to opponent):**
```json
{
  "type": "STATE_SYNC",
  "data": {
    "state": { ... }
  },
  "timestamp": 1699876543265,
  "playerId": "player_1234567890_abc123"
}
```

#### GAME_END
Game ended notification.

**Server Broadcast:**
```json
{
  "type": "GAME_END",
  "data": {
    "winner": "PLAYER",
    "finalScore": {
      "player": 250,
      "opponent": 200
    }
  },
  "timestamp": 1699876543270,
  "playerId": "server"
}
```

### 4. Communication Messages

#### CHAT
Chat message between players.

**Client Request:**
```json
{
  "type": "CHAT",
  "data": {
    "roomId": "room_1699876543210_abc123",
    "message": "Good game!"
  },
  "timestamp": 1699876543280,
  "playerId": "player_1234567890_abc123"
}
```

**Server Broadcast:**
```json
{
  "type": "CHAT",
  "data": {
    "message": "Good game!"
  },
  "timestamp": 1699876543285,
  "playerId": "player_1234567890_abc123"
}
```

### 5. System Messages

#### PING
Heartbeat ping from client.

**Client Request:**
```json
{
  "type": "PING",
  "data": {
    "timestamp": 1699876543290
  },
  "timestamp": 1699876543290,
  "playerId": "player_1234567890_abc123"
}
```

**Server Response:**
```json
{
  "type": "PONG",
  "data": {
    "timestamp": 1699876543290
  },
  "timestamp": 1699876543292,
  "playerId": "server"
}
```

#### ERROR
Error notification.

**Server Response:**
```json
{
  "type": "ERROR",
  "data": {
    "code": "INVALID_MOVE",
    "message": "Invalid move coordinates",
    "details": { ... }
  },
  "timestamp": 1699876543300,
  "playerId": "server"
}
```

## Data Types

### Position
```typescript
interface Position {
  row: number;    // 0-7
  col: number;    // 0-7
}
```

### MoveData
```typescript
interface MoveData {
  pos1: Position;
  pos2: Position;
  moveNumber: number;
}
```

### StateSyncData
```typescript
interface StateSyncData {
  playerGrid: CandyType[][];
  opponentGrid: CandyType[][];
  playerScore: number;
  opponentScore: number;
  playerMoves: number;
  opponentMoves: number;
  eventProgress: number;
  activeEvents: string[];
  currentTurn: string;
}
```

### CandyType
```typescript
enum CandyType {
  RED = 'RED',
  BLUE = 'BLUE',
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  PURPLE = 'PURPLE',
  EMPTY = 'EMPTY'
}
```

## Connection Management

### Heartbeat
- **Interval**: 5 seconds
- **Mechanism**: Client sends PING, server responds with PONG
- **Timeout**: 30 seconds (6 missed pings)

### Reconnection
- **Attempts**: 5 maximum
- **Backoff**: Exponential (2s, 4s, 8s, 16s, 32s)
- **State Recovery**: Via LocalStorage snapshots

### Latency Calculation
```typescript
latency = Date.now() - pingTimestamp
```

## Room Lifecycle

```
1. CREATED
   ↓
2. WAITING (1 player)
   ↓
3. FULL (2 players)
   ↓
4. IN_GAME (battle started)
   ↓
5. FINISHED or ABANDONED
   ↓
6. DELETED (empty for 1 hour)
```

## Matchmaking Protocol

### Random Matchmaking
1. Client sends chat message: `/matchmaking RANDOM 0`
2. Server adds to queue
3. Server pairs players (every 2 seconds)
4. Server creates room and sends GAME_START to both

### Cancel Matchmaking
1. Client sends chat message: `/cancel_matchmaking`
2. Server removes from queue

## Security Considerations

### Current Implementation
- Basic message validation
- Room ID verification
- Player ID authentication

### Production Requirements
- [ ] TLS/SSL encryption (wss://)
- [ ] Token-based authentication
- [ ] Message signing
- [ ] Rate limiting
- [ ] Input sanitization
- [ ] Anti-cheat validation

## Error Codes

| Code | Description |
|------|-------------|
| ROOM_NOT_FOUND | Room ID does not exist |
| ROOM_FULL | Room already has 2 players |
| INVALID_MOVE | Move coordinates invalid |
| NOT_YOUR_TURN | Not current player's turn |
| GAME_NOT_STARTED | Battle hasn't started yet |
| CONNECTION_TIMEOUT | No response from server |
| RECONNECTION_FAILED | Unable to restore state |

## Performance Guidelines

### Latency Targets
- **Excellent**: < 50ms
- **Good**: 50-100ms
- **Acceptable**: 100-200ms
- **Poor**: > 200ms

### Message Frequency
- **MOVE**: On demand
- **STATE_SYNC**: Every 5 seconds
- **PING**: Every 5 seconds
- **CHAT**: On demand

### Bandwidth Usage
- **Average**: ~1-2 KB/s per connection
- **Peak**: ~5-10 KB/s (during sync)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-11-13 | Initial protocol specification |

## References

- WebSocket RFC 6455: https://tools.ietf.org/html/rfc6455
- JSON Specification: https://www.json.org/
