import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5001;
const HOST = '0.0.0.0'; // Explicitly bind to 0.0.0.0 for LAN clients

app.use(cors({ origin: '*' }));
app.use(express.json());

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory simulation state
let activeDisruptions = {
  roadBlocks: [
    {
      id: 'RB-01',
      roadName: 'Moosarambagh Musi Causeway Bridge',
      latitude: 17.3753,
      longitude: 78.5085,
      severity: 'TOTAL_BLOCKAGE',
      cause: 'Musi River Flood Waters Overtopping Causeway & Heavy Debris Accumulation',
      reportedAt: new Date().toISOString()
    }
  ],
  warehouseOutages: [],
  activeSurge: false
};

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'RELIEFLINK 360 Simulator Microservice',
    hostBinding: HOST,
    connectedClients: io.engine.clientsCount,
    activeDisruptionsCount: activeDisruptions.roadBlocks.length + activeDisruptions.warehouseOutages.length
  });
});

// Simulator State
app.get('/api/v1/simulator/disruptions', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    disruptions: activeDisruptions
  });
});

// Trigger Disruption Event
app.post('/api/v1/simulator/event', (req, res) => {
  const { eventType, payload } = req.body;
  
  if (eventType === 'ROAD_BLOCK') {
    const newBlock = {
      id: `RB-${Date.now().toString().slice(-4)}`,
      ...payload,
      reportedAt: new Date().toISOString()
    };
    activeDisruptions.roadBlocks.push(newBlock);
    io.emit('SIMULATOR_ROAD_BLOCK_ADDED', newBlock);
    return res.status(201).json({ success: true, event: 'ROAD_BLOCK', data: newBlock });
  }

  if (eventType === 'WAREHOUSE_OUTAGE') {
    activeDisruptions.warehouseOutages.push(payload);
    io.emit('SIMULATOR_WAREHOUSE_OUTAGE', payload);
    return res.status(201).json({ success: true, event: 'WAREHOUSE_OUTAGE', data: payload });
  }

  if (eventType === 'RESET_ALL') {
    activeDisruptions = { roadBlocks: [], warehouseOutages: [], activeSurge: false };
    io.emit('SIMULATOR_RESET', { message: 'All disruptions cleared.' });
    return res.json({ success: true, message: 'Simulator reset successfully.' });
  }

  res.status(400).json({ error: 'Unknown simulation eventType' });
});

io.on('connection', (socket) => {
  console.log(`[Simulator WebSocket] Client connected from ${socket.handshake.address}: ${socket.id}`);
  socket.emit('SIMULATOR_STATE_SYNC', activeDisruptions);

  socket.on('disconnect', () => {
    console.log(`[Simulator WebSocket] Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`[Simulator Service] Listening on http://${HOST}:${PORT} (Accessible to all LAN laptops)`);
});
