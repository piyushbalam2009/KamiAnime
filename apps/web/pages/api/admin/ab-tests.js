// API endpoint for managing A/B tests
import { config } from '../../../lib/config';
import { abTesting } from '../../../lib/ab-testing';

// Rate limiting
const rateLimiter = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 30;

  if (!rateLimiter.has(ip)) {
    rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  const limit = rateLimiter.get(ip);
  if (now > limit.resetTime) {
    rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (limit.count >= maxRequests) {
    return false;
  }

  limit.count++;
  return true;
}

function validateApiKey(req) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  return apiKey === config.admin.apiKey;
}

export default async function handler(req, res) {
  try {
    // Rate limiting
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // API key validation
    if (!validateApiKey(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { method } = req;

    switch (method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'PUT':
        return await handlePut(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('A/B tests API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req, res) {
  const { action, testId, userId } = req.query;

  try {
    switch (action) {
      case 'list':
        const tests = Array.from(abTesting.activeTests.values());
        return res.json({ tests });

      case 'results':
        if (!testId) {
          return res.status(400).json({ error: 'Test ID required' });
        }
        const results = await abTesting.getTestResults(testId);
        return res.json({ results });

      case 'templates':
        const templates = abTesting.getTestTemplates();
        return res.json({ templates });

      case 'user_tests':
        if (!userId) {
          return res.status(400).json({ error: 'User ID required' });
        }
        const userTests = [];
        for (const [key, assignment] of abTesting.userAssignments.entries()) {
          if (assignment.userId === userId) {
            const test = abTesting.activeTests.get(assignment.testId);
            if (test) {
              userTests.push({
                testId: assignment.testId,
                testName: test.name,
                variant: assignment.variant,
                assignedAt: assignment.assignedAt
              });
            }
          }
        }
        return res.json({ userTests });

      case 'feature_config':
        const { feature } = req.query;
        if (!userId || !feature) {
          return res.status(400).json({ error: 'User ID and feature required' });
        }
        const config = abTesting.getFeatureConfig(userId, feature);
        const enabled = abTesting.isFeatureEnabled(userId, feature);
        return res.json({ feature, config, enabled });

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Get A/B tests error:', error);
    return res.status(500).json({ error: 'Failed to fetch data' });
  }
}

async function handlePost(req, res) {
  const { action } = req.body;

  try {
    switch (action) {
      case 'create_test':
        const { testConfig } = req.body;
        if (!testConfig) {
          return res.status(400).json({ error: 'Test configuration required' });
        }
        const test = await abTesting.createTest(testConfig);
        return res.json({ test });

      case 'assign_user':
        const { userId, testId } = req.body;
        if (!userId || !testId) {
          return res.status(400).json({ error: 'User ID and test ID required' });
        }
        const assignment = abTesting.assignUserToTest(userId, testId);
        return res.json({ assignment });

      case 'track_exposure':
        const { userId: expUserId, testId: expTestId, context } = req.body;
        if (!expUserId || !expTestId) {
          return res.status(400).json({ error: 'User ID and test ID required' });
        }
        await abTesting.trackExposure(expUserId, expTestId, context);
        return res.json({ success: true });

      case 'track_conversion':
        const { userId: convUserId, event, metadata } = req.body;
        if (!convUserId || !event) {
          return res.status(400).json({ error: 'User ID and event required' });
        }
        await abTesting.trackConversion(convUserId, event, metadata);
        return res.json({ success: true });

      case 'create_from_template':
        const { templateId, customConfig } = req.body;
        if (!templateId) {
          return res.status(400).json({ error: 'Template ID required' });
        }
        const templates = abTesting.getTestTemplates();
        const template = templates[templateId];
        if (!template) {
          return res.status(400).json({ error: 'Template not found' });
        }
        const testFromTemplate = await abTesting.createTest({
          ...template,
          ...customConfig
        });
        return res.json({ test: testFromTemplate });

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Post A/B tests error:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}

async function handlePut(req, res) {
  const { testId, updates } = req.body;

  try {
    if (!testId) {
      return res.status(400).json({ error: 'Test ID required' });
    }

    const test = abTesting.activeTests.get(testId);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Update test
    const updatedTest = { ...test, ...updates, updatedAt: new Date() };
    abTesting.activeTests.set(testId, updatedTest);
    
    // Store updated test
    await abTesting.storeTest(updatedTest);

    return res.json({ test: updatedTest });
  } catch (error) {
    console.error('Put A/B tests error:', error);
    return res.status(500).json({ error: 'Failed to update test' });
  }
}

async function handleDelete(req, res) {
  const { testId } = req.body;

  try {
    if (!testId) {
      return res.status(400).json({ error: 'Test ID required' });
    }

    const test = abTesting.activeTests.get(testId);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Mark test as stopped
    test.status = 'stopped';
    test.stoppedAt = new Date();
    
    await abTesting.storeTest(test);
    abTesting.activeTests.delete(testId);

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete A/B tests error:', error);
    return res.status(500).json({ error: 'Failed to stop test' });
  }
}
