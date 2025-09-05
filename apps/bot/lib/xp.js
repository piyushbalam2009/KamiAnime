const { db } = require('./firebase');

class XPSystem {
  // Award XP to user
  static async awardXP(userId, amount, reason = 'Activity') {
    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        // Create new user profile
        await userRef.set({
          xp: amount,
          level: 1,
          badges: [],
          streak: 0,
          lastActive: new Date().toISOString(),
          joinedAt: new Date().toISOString(),
          watchedEpisodes: 0,
          readChapters: 0,
          isPremium: false,
          isAdmin: false
        });
        return { newXP: amount, newLevel: 1, levelUp: false };
      }

      const userData = userDoc.data();
      const currentXP = userData.xp || 0;
      const currentLevel = userData.level || 1;
      const newXP = currentXP + amount;
      const newLevel = Math.floor(newXP / 1000) + 1;
      const levelUp = newLevel > currentLevel;

      await userRef.update({
        xp: newXP,
        level: newLevel,
        lastActive: new Date().toISOString()
      });

      // Check for new badges
      await this.checkBadges(userId, userData);

      return { newXP, newLevel, levelUp, xpGained: amount };
    } catch (error) {
      console.error('Error awarding XP:', error);
      return null;
    }
  }

  // Update streak
  static async updateStreak(userId) {
    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) return 0;

      const userData = userDoc.data();
      const lastActive = new Date(userData.lastActive || 0);
      const now = new Date();
      const daysDiff = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));

      let newStreak = userData.streak || 0;
      
      if (daysDiff === 1) {
        // Consecutive day
        newStreak += 1;
      } else if (daysDiff > 1) {
        // Streak broken
        newStreak = 1;
      }
      // If daysDiff === 0, same day, no change

      await userRef.update({
        streak: newStreak,
        lastActive: now.toISOString()
      });

      return newStreak;
    } catch (error) {
      console.error('Error updating streak:', error);
      return 0;
    }
  }

  // Check and award badges
  static async checkBadges(userId, userData) {
    try {
      const badges = require('../../data/badges');
      const userBadges = userData.badges || [];
      const newBadges = [];

      for (const badge of badges) {
        if (userBadges.includes(badge.id)) continue;

        let earned = false;

        switch (badge.condition.type) {
          case 'xp':
            earned = userData.xp >= badge.condition.value;
            break;
          case 'level':
            earned = userData.level >= badge.condition.value;
            break;
          case 'episodes':
            earned = userData.watchedEpisodes >= badge.condition.value;
            break;
          case 'chapters':
            earned = userData.readChapters >= badge.condition.value;
            break;
          case 'streak':
            earned = userData.streak >= badge.condition.value;
            break;
          case 'join':
            earned = true; // Already joined
            break;
        }

        if (earned) {
          newBadges.push(badge.id);
          await this.awardXP(userId, badge.xpReward, `Badge: ${badge.name}`);
        }
      }

      if (newBadges.length > 0) {
        await db.collection('users').doc(userId).update({
          badges: [...userBadges, ...newBadges]
        });
      }

      return newBadges;
    } catch (error) {
      console.error('Error checking badges:', error);
      return [];
    }
  }

  // Get user profile
  static async getUserProfile(userId) {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) return null;
      
      return {
        id: userId,
        ...userDoc.data()
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Get leaderboard
  static async getLeaderboard(type = 'global', limit = 10) {
    try {
      let query = db.collection('users').orderBy('xp', 'desc').limit(limit);
      
      if (type === 'weekly') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.where('lastActive', '>=', weekAgo.toISOString());
      }

      const snapshot = await query.get();
      const leaderboard = [];

      snapshot.forEach((doc, index) => {
        leaderboard.push({
          rank: index + 1,
          id: doc.id,
          ...doc.data()
        });
      });

      return leaderboard;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  // Create challenge
  static async createChallenge(challengerId, targetId, type, amount) {
    try {
      const challengeRef = db.collection('challenges').doc();
      const challenge = {
        id: challengeRef.id,
        challengerId,
        targetId,
        type, // 'episodes' or 'chapters'
        amount,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };

      await challengeRef.set(challenge);
      return challenge;
    } catch (error) {
      console.error('Error creating challenge:', error);
      return null;
    }
  }

  // Accept challenge
  static async acceptChallenge(challengeId) {
    try {
      const challengeRef = db.collection('challenges').doc(challengeId);
      await challengeRef.update({
        status: 'active',
        acceptedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Error accepting challenge:', error);
      return false;
    }
  }

  // Get user challenges
  static async getUserChallenges(userId) {
    try {
      const snapshot = await db.collection('challenges')
        .where('targetId', '==', userId)
        .where('status', '==', 'pending')
        .get();

      const challenges = [];
      snapshot.forEach(doc => {
        challenges.push({ id: doc.id, ...doc.data() });
      });

      return challenges;
    } catch (error) {
      console.error('Error getting user challenges:', error);
      return [];
    }
  }
}

module.exports = XPSystem;
