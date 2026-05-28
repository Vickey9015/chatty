import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const httpServer = createServer(app);

const clientDist = path.join(__dirname, '..', 'client', 'dist');
const publicDir = path.join(__dirname, '..', 'public');
const staticDir = fs.existsSync(clientDist) ? clientDist : fs.existsSync(publicDir) ? publicDir : null;
const serveClient = staticDir !== null;

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

const io = new Server(httpServer, {
  cors: {
    origin: serveClient ? true : allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

app.use(
  cors(
    serveClient
      ? undefined
      : {
          origin: allowedOrigins,
        },
  ),
);
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /^(image|video)\//.test(file.mimetype);
    cb(null, allowed);
  },
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Invalid file type. Images and videos only.' });
  }
  const type = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
  res.json({
    url: `/uploads/${req.file.filename}`,
    type,
    filename: req.file.filename,
  });
});

const users = new Map();

io.on('connection', (socket) => {
  socket.on('join', ({ username, room }) => {
    const displayName = (username || 'Guest').trim().slice(0, 24) || 'Guest';
    const chatRoom = (room || 'general').trim().slice(0, 32) || 'general';

    socket.data.username = displayName;
    socket.data.room = chatRoom;

    users.set(socket.id, { id: socket.id, username: displayName, room: chatRoom });
    socket.join(chatRoom);

    const roomUsers = [...users.values()].filter((u) => u.room === chatRoom);
    io.to(chatRoom).emit('room_users', roomUsers);
    socket.to(chatRoom).emit('user_joined', { username: displayName });

    socket.emit('joined', { username: displayName, room: chatRoom });
  });

  socket.on('chat_message', (payload) => {
    const { room, username } = socket.data;
    if (!room) return;

    const message = {
      id: uuidv4(),
      username: username || 'Guest',
      text: payload.text?.trim() || '',
      mediaUrl: payload.mediaUrl || null,
      mediaType: payload.mediaType || null,
      timestamp: Date.now(),
    };

    io.to(room).emit('chat_message', message);
  });

  socket.on('typing', ({ isTyping }) => {
    const { room, username } = socket.data;
    if (!room) return;
    socket.to(room).emit('typing', { username, isTyping });
  });

  // WebRTC signaling
  socket.on('call_user', ({ targetId, signal }) => {
    io.to(targetId).emit('incoming_call', {
      from: socket.id,
      username: socket.data.username,
      signal,
    });
  });

  socket.on('answer_call', ({ to, signal }) => {
    io.to(to).emit('call_accepted', { signal });
  });

  socket.on('ice_candidate', ({ to, candidate }) => {
    io.to(to).emit('ice_candidate', { candidate });
  });

  socket.on('end_call', ({ to }) => {
    if (to) io.to(to).emit('call_ended');
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    users.delete(socket.id);
    if (user?.room) {
      const roomUsers = [...users.values()].filter((u) => u.room === user.room);
      io.to(user.room).emit('room_users', roomUsers);
      socket.to(user.room).emit('user_left', { username: user.username });
    }
  });
});

if (serveClient && staticDir) {
  app.use(express.static(staticDir));
  app.get(/^(?!\/api|\/uploads|\/socket\.io|\/health).*/, (_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
}

const PORT = Number(process.env.PORT) || 3001;

app.get('/health', (_req, res) => {
  res.json({ ok: true, static: serveClient, port: PORT });
});

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\nPort ${PORT} is already in use. Stop the other process or run:\n  lsof -ti tcp:${PORT} | xargs kill -9\n`,
    );
    process.exit(1);
  }
  throw err;
});
const HOST = process.env.HOST || '0.0.0.0';
httpServer.listen(PORT, HOST, () => {
  const mode = serveClient ? 'app + API' : 'API only (run client separately in dev)';
  console.log(`ChitChat server (${mode}) → http://${HOST}:${PORT}`);
});
