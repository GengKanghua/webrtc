const path = require('path');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const dotenv = require('dotenv');
const { AccessToken } = require('livekit-server-sdk');

dotenv.config();

const app = express();

const {
  PORT = 3000,
  LIVEKIT_URL = 'ws://localhost:7880',
  LIVEKIT_API_KEY = 'devkey',
  LIVEKIT_API_SECRET = 'devsecret_change_me_32chars_long_1234',
  TURN_DOMAIN,
  TURN_USERNAME,
  TURN_PASSWORD,
} = process.env;

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.get('/api/token', (req, res) => {
  const room = req.query.room || 'live';
  const identity = req.query.identity;
  const role = (req.query.role || 'publisher').toLowerCase();

  if (!identity) {
    return res.status(400).json({ error: 'identity is required' });
  }

  const grant = {
    room,
    roomJoin: true,
    canPublish: role !== 'subscriber',
    canPublishData: true,
    canSubscribe: true,
  };

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity, ttl: 6 * 60 * 60 });
  at.addGrant(grant);

  const iceServers = [];
  if (TURN_DOMAIN && TURN_USERNAME && TURN_PASSWORD) {
    iceServers.push(
      {
        urls: `turn:${TURN_DOMAIN}:3478?transport=udp`,
        username: TURN_USERNAME,
        credential: TURN_PASSWORD,
      },
      {
        urls: `turns:${TURN_DOMAIN}:5349?transport=tcp`,
        username: TURN_USERNAME,
        credential: TURN_PASSWORD,
      },
      {
        urls: `turns:${TURN_DOMAIN}:443?transport=tcp`,
        username: TURN_USERNAME,
        credential: TURN_PASSWORD,
      }
    );
  }

  res.json({
    url: LIVEKIT_URL,
    token: at.toJwt(),
    iceServers,
    role,
    room,
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'not found' });
});

app.listen(Number(PORT), () => {
  // eslint-disable-next-line no-console
  console.log(`[signaling] listening on :${PORT} -> LiveKit ${LIVEKIT_URL}`);
});
