const mongoose = require('mongoose');

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 5000;

const connectDB = async (retryCount = 0) => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`[MongoDB] Connected to: ${conn.connection.host} (DB: ${conn.connection.name})`);
  } catch (err) {
    console.error(`[MongoDB] Connection failed: ${err.message}`);

    if (retryCount < MAX_RETRIES) {
      // Exponential backoff: 5s, 10s, 20s, 40s, 80s
      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
      console.log(
        `[MongoDB] Retrying in ${delay / 1000}s... (attempt ${retryCount + 1}/${MAX_RETRIES})`
      );
      setTimeout(() => connectDB(retryCount + 1), delay);
    } else {
      console.error('[MongoDB] Max retries reached. Exiting process.');
      process.exit(1);
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected from database.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] Reconnected to database.');
});

mongoose.connection.on('error', (err) => {
  console.error(`[MongoDB] Runtime error: ${err.message}`);
});

module.exports = connectDB;
