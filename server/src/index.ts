import 'dotenv/config';
import { createApp } from './app.js';
import { createPool } from './db.js';

const port = Number(process.env.PORT) || 3001;
createApp(createPool()).listen(port, () => console.log(`WorkTrack API: http://localhost:${port}`));
