/** XP awarded per action */
const XP_REWARDS = {
  CSR_REGISTRATION: 20,
  CSR_COMPLETION: 100,
  VOLUNTEER_HOUR: 10,
  TRAINING_COMPLETION: 30,
  FEEDBACK_SUBMISSION: 10,
};

/** Badge trigger thresholds (must match seed data) */
const BADGE_TRIGGERS = {
  VOLUNTEER_STAR: { type: 'VOLUNTEER_HOURS', threshold: 10 },
  CSR_HERO: { type: 'CSR_COUNT', threshold: 3 },
  COMMUNITY_BUILDER: { type: 'FEEDBACK_COUNT', threshold: 5 },
  SOCIAL_AMBASSADOR: { type: 'XP_TOTAL', threshold: 500 },
  LEARNING_CHAMPION: { type: 'TRAINING_COUNT', threshold: 5 },
};

module.exports = { XP_REWARDS, BADGE_TRIGGERS };
