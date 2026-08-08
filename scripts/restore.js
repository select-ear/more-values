import { dbManager } from '../src/dbManager.js';
import fs from 'fs';
import path from 'path';

async function restore() {
  try {
    const backupPath = path.join(process.cwd(), 'data', 'backup.json');
    if (!fs.existsSync(backupPath)) {
      console.error('❌ Restore failed: Backup file not found at', backupPath);
      process.exit(1);
    }
    
    console.log(`Reading backup from ${backupPath}...`);
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    await dbManager.init();
    
    let userCount = 0;
    // Restore users safely using UPSERT strategy (INSERT OR REPLACE)
    if (backupData.users && backupData.users.length > 0) {
      for (const user of backupData.users) {
        await dbManager.run(
          `INSERT OR REPLACE INTO users (id, username, password, bio, socialMedia, profilePicture) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [user.id, user.username, user.password, user.bio, user.socialMedia, user.profilePicture]
        );
        userCount++;
      }
    }
    
    let testCount = 0;
    // Restore tests safely using UPSERT strategy (INSERT OR REPLACE)
    if (backupData.tests && backupData.tests.length > 0) {
      for (const test of backupData.tests) {
        await dbManager.run(
          `INSERT OR REPLACE INTO tests (id, ownerId, title, slug, document, isDraft, deletedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [test.id, test.ownerId, test.title, test.slug, test.document, test.isDraft, test.deletedAt]
        );
        testCount++;
      }
    }
    
    console.log(`✅ Restore completed successfully! Upserted ${userCount} users and ${testCount} tests.`);
    console.log(`(Any data created after the backup was preserved safely)`);
  } catch (err) {
    console.error('❌ Restore failed:', err);
  } finally {
    process.exit(0);
  }
}

restore();
