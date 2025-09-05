// Automated backup system for analytics data
import { config } from './config';

class BackupSystem {
  constructor() {
    this.backupInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.retentionDays = config.analytics.retentionDays;
    this.batchSize = 1000;
    this.isRunning = false;
  }

  /**
   * Start automated backup process
   */
  start() {
    if (this.isRunning) {
      console.log('Backup system already running');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Starting automated backup system');

    // Run initial backup
    this.performBackup();

    // Schedule periodic backups
    this.backupTimer = setInterval(() => {
      this.performBackup();
    }, this.backupInterval);

    // Schedule cleanup of old backups
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldBackups();
    }, this.backupInterval);
  }

  /**
   * Stop backup system
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.backupTimer) clearInterval(this.backupTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    console.log('⏹️ Backup system stopped');
  }

  /**
   * Perform full backup of analytics data
   */
  async performBackup() {
    try {
      console.log('📦 Starting analytics data backup...');
      const startTime = Date.now();

      const backupId = this.generateBackupId();
      const backupData = await this.collectBackupData();

      // Store backup in multiple formats
      await Promise.all([
        this.storeFirebaseBackup(backupId, backupData),
        this.storeLocalBackup(backupId, backupData),
        this.storeCloudBackup(backupId, backupData)
      ]);

      const duration = Date.now() - startTime;
      console.log(`✅ Backup completed in ${duration}ms - ID: ${backupId}`);

      // Log backup completion
      await this.logBackupEvent('backup_completed', {
        backupId,
        duration,
        recordCount: backupData.totalRecords,
        size: this.calculateBackupSize(backupData)
      });

    } catch (error) {
      console.error('❌ Backup failed:', error);
      await this.logBackupEvent('backup_failed', {
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Collect all data for backup
   */
  async collectBackupData() {
    const { db } = await import('./firebase');
    const collections = ['analytics', 'users', 'sync_events', 'notifications'];
    const backupData = {
      metadata: {
        timestamp: new Date(),
        version: '1.0',
        collections: collections.length
      },
      data: {},
      totalRecords: 0
    };

    for (const collectionName of collections) {
      try {
        console.log(`📊 Backing up collection: ${collectionName}`);
        const collectionData = await this.backupCollection(db, collectionName);
        backupData.data[collectionName] = collectionData;
        backupData.totalRecords += collectionData.length;
      } catch (error) {
        console.error(`Error backing up ${collectionName}:`, error);
        backupData.data[collectionName] = [];
      }
    }

    return backupData;
  }

  /**
   * Backup a single Firestore collection
   */
  async backupCollection(db, collectionName) {
    const data = [];
    let lastDoc = null;

    while (true) {
      let query = db.collection(collectionName)
        .orderBy('__name__')
        .limit(this.batchSize);

      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      
      if (snapshot.empty) break;

      snapshot.docs.forEach(doc => {
        data.push({
          id: doc.id,
          data: doc.data()
        });
      });

      lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }

    return data;
  }

  /**
   * Store backup in Firebase Storage
   */
  async storeFirebaseBackup(backupId, backupData) {
    try {
      const { db } = await import('./firebase');
      
      // Store backup metadata
      await db.collection('backups').doc(backupId).set({
        id: backupId,
        timestamp: new Date(),
        status: 'completed',
        recordCount: backupData.totalRecords,
        collections: Object.keys(backupData.data),
        size: this.calculateBackupSize(backupData)
      });

      // Store compressed backup data
      const compressedData = await this.compressData(backupData);
      await db.collection('backup_data').doc(backupId).set({
        data: compressedData
      });

      console.log(`💾 Firebase backup stored: ${backupId}`);
    } catch (error) {
      console.error('Firebase backup failed:', error);
      throw error;
    }
  }

  /**
   * Store backup locally (for development)
   */
  async storeLocalBackup(backupId, backupData) {
    if (config.app.isProduction) return;

    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const backupDir = path.join(process.cwd(), 'backups');
      await fs.mkdir(backupDir, { recursive: true });

      const backupFile = path.join(backupDir, `${backupId}.json`);
      await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));

      console.log(`💾 Local backup stored: ${backupFile}`);
    } catch (error) {
      console.error('Local backup failed:', error);
    }
  }

  /**
   * Store backup in cloud storage (placeholder)
   */
  async storeCloudBackup(backupId, backupData) {
    // TODO: Implement cloud storage backup (AWS S3, Google Cloud Storage, etc.)
    console.log(`☁️ Cloud backup placeholder: ${backupId}`);
  }

  /**
   * Compress backup data
   */
  async compressData(data) {
    try {
      const zlib = require('zlib');
      const jsonString = JSON.stringify(data);
      const compressed = zlib.gzipSync(jsonString);
      return compressed.toString('base64');
    } catch (error) {
      console.error('Data compression failed:', error);
      return data; // Return uncompressed if compression fails
    }
  }

  /**
   * Decompress backup data
   */
  async decompressData(compressedData) {
    try {
      const zlib = require('zlib');
      const buffer = Buffer.from(compressedData, 'base64');
      const decompressed = zlib.gunzipSync(buffer);
      return JSON.parse(decompressed.toString());
    } catch (error) {
      console.error('Data decompression failed:', error);
      return compressedData; // Return as-is if decompression fails
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups() {
    try {
      console.log('🧹 Cleaning up old backups...');
      const { db } = await import('./firebase');
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      const oldBackups = await db.collection('backups')
        .where('timestamp', '<', cutoffDate)
        .get();

      const deletePromises = [];
      oldBackups.docs.forEach(doc => {
        const backupId = doc.id;
        deletePromises.push(
          db.collection('backups').doc(backupId).delete(),
          db.collection('backup_data').doc(backupId).delete()
        );
      });

      await Promise.all(deletePromises);
      console.log(`🗑️ Cleaned up ${oldBackups.size} old backups`);

      await this.logBackupEvent('cleanup_completed', {
        deletedBackups: oldBackups.size,
        cutoffDate
      });

    } catch (error) {
      console.error('Backup cleanup failed:', error);
      await this.logBackupEvent('cleanup_failed', {
        error: error.message
      });
    }
  }

  /**
   * Restore data from backup
   */
  async restoreFromBackup(backupId) {
    try {
      console.log(`🔄 Restoring from backup: ${backupId}`);
      const { db } = await import('./firebase');

      // Get backup data
      const backupDoc = await db.collection('backup_data').doc(backupId).get();
      if (!backupDoc.exists) {
        throw new Error(`Backup ${backupId} not found`);
      }

      const compressedData = backupDoc.data().data;
      const backupData = await this.decompressData(compressedData);

      // Restore each collection
      for (const [collectionName, documents] of Object.entries(backupData.data)) {
        console.log(`📥 Restoring collection: ${collectionName}`);
        
        const batch = db.batch();
        let batchCount = 0;

        for (const doc of documents) {
          const docRef = db.collection(collectionName).doc(doc.id);
          batch.set(docRef, doc.data);
          batchCount++;

          // Commit batch when it reaches Firestore limit
          if (batchCount === 500) {
            await batch.commit();
            batchCount = 0;
          }
        }

        // Commit remaining documents
        if (batchCount > 0) {
          await batch.commit();
        }
      }

      console.log(`✅ Restore completed: ${backupId}`);
      await this.logBackupEvent('restore_completed', {
        backupId,
        restoredCollections: Object.keys(backupData.data)
      });

    } catch (error) {
      console.error('Restore failed:', error);
      await this.logBackupEvent('restore_failed', {
        backupId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * List available backups
   */
  async listBackups() {
    try {
      const { db } = await import('./firebase');
      const snapshot = await db.collection('backups')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Generate unique backup ID
   */
  generateBackupId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substr(2, 6);
    return `backup_${timestamp}_${random}`;
  }

  /**
   * Calculate backup size
   */
  calculateBackupSize(backupData) {
    const jsonString = JSON.stringify(backupData);
    return jsonString.length;
  }

  /**
   * Log backup events
   */
  async logBackupEvent(event, metadata) {
    try {
      const { analyticsLogger } = await import('./analytics-logger');
      await analyticsLogger.logSystemEvent(event, {
        type: 'backup',
        ...metadata,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to log backup event:', error);
    }
  }

  /**
   * Get backup system status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      backupInterval: this.backupInterval,
      retentionDays: this.retentionDays,
      lastBackup: this.lastBackupTime || null
    };
  }
}

// Export singleton instance
export const backupSystem = new BackupSystem();

export default BackupSystem;
