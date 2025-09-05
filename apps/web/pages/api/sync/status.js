import { websiteSyncClient } from '../../../lib/sync-client';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    // Validate user ID
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get sync status
    const syncStatus = await websiteSyncClient.getSyncStatus(userId);

    res.status(200).json({
      success: true,
      ...syncStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status'
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
