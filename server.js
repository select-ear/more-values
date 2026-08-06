import { app } from './src/app.js';
import { dbManager } from './src/dbManager.js';

const PORT = process.env.PORT || 4000;

dbManager.init().then(() => {
  // Start daily cleanup task for the Recycle Bin (runs every 24 hours)
  setInterval(async () => {
    try {
      await dbManager.cleanupRecycleBin();
      console.log('Ran daily recycle bin cleanup task.');
    } catch (err) {
      console.error('Failed to run daily cleanup:', err);
    }
  }, 24 * 60 * 60 * 1000);

  app.listen(PORT, () => {
    console.log(`8values Publisher Backend running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});
