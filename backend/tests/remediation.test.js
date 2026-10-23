const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const bcrypt = require('bcryptjs');
const { awardAchievements } = require('../dist/controllers/gameController');
const { registerStudent, login } = require('../dist/controllers/authController');
const { submitGameSession } = require('../dist/controllers/gameController');
const gamePoolService = require('../dist/services/gamePoolService');
const Student = require('../dist/models/Student').default;
const LearningProfile = require('../dist/models/LearningProfile').default;
const GameSession = require('../dist/models/GameSession').default;
const AnalyticsEntry = require('../dist/models/AnalyticsEntry').default;
const Achievement = require('../dist/models/Achievement').default;
const aiService = require('../dist/services/aiService').default;
const GamePool = require('../dist/models/GamePool').default;

const originalStudentFindOne = Student.findOne;
const originalStudentFindById = Student.findById;
const originalStudentCreate = Student.create;
const originalStudentFindByIdAndUpdate = Student.findByIdAndUpdate;
const originalProfileFindOne = LearningProfile.findOne;
const originalProfileFindOneAndUpdate = LearningProfile.findOneAndUpdate;
const originalAchievementFind = Achievement.find;
const originalAchievementInsertMany = Achievement.insertMany;
const originalAchievementCreate = Achievement.create;
const originalGameSessionCreate = GameSession.create;
const originalAnalyticsUpdate = AnalyticsEntry.findOneAndUpdate;
const originalAiServiceOrchestrate = aiService.orchestrate;
const originalGamePoolFindOne = GamePool.findOne;
const originalGamePoolFindOneAndUpdate = GamePool.findOneAndUpdate;
const originalSeedPool = gamePoolService.seedPoolForNewStudent;
const originalRefillPool = gamePoolService.refillPool;
const originalCompare = bcrypt.compare;
const originalHash = bcrypt.hash;

test('awardAchievements ignores duplicate-key race without deleting existing records', async () => {
  Achievement.find = () => ({ lean: () => [] });
  const insertedBadgeIds = [];
  Achievement.create = async (doc) => {
    if (doc.badgeId === 'phonics_starter') {
      const err = new Error('duplicate badge');
      err.code = 11000;
      throw err;
    }
    insertedBadgeIds.push(doc.badgeId);
  };

  const badges = await awardAchievements('student-1', 'phonics_adventure', 96, 1, 5, 100, 500, 7);
  assert.equal(Array.isArray(badges), true);
  assert.equal(badges.some((badge) => badge.badgeId === 'perfect_phonics'), true);
  assert.equal(insertedBadgeIds.includes('phonics_starter'), false);
  assert.equal(insertedBadgeIds.includes('perfect_phonics'), true);
  assert.equal(insertedBadgeIds.includes('level_5'), true);

  Achievement.find = originalAchievementFind;
  Achievement.insertMany = originalAchievementInsertMany;
  Achievement.create = originalAchievementCreate;
});

test('awardAchievements propagates non-duplicate database errors', async () => {
  Achievement.find = () => ({ lean: () => [] });
  const databaseError = new Error('database unavailable');
  Achievement.create = async () => {
    throw databaseError;
  };

  await assert.rejects(
    awardAchievements('student-1', 'phonics_adventure', 96, 1, 1, 0, 0, 0),
    (err) => err === databaseError
  );

  Achievement.find = originalAchievementFind;
  Achievement.insertMany = originalAchievementInsertMany;
  Achievement.create = originalAchievementCreate;
});

test('registerStudent creates a student and profile and returns a token', async () => {
  Student.findOne = async () => null;
  Student.create = async (payload) => ({
    _id: 'student-1',
    name: payload.name,
    age: payload.age,
    parentEmail: payload.parentEmail,
    avatarId: payload.avatarId || 'explorer',
    xp: 0,
    coins: 0,
    level: 1,
    streak: 0,
    readingLevel: payload.readingLevel || 'beginner',
  });
  LearningProfile.findOneAndUpdate = async () => ({ studentId: 'student-1' });
  gamePoolService.seedPoolForNewStudent = () => {};
  bcrypt.hash = async () => 'hashed-password';

  const req = {
    body: {
      name: 'Ava',
      age: 8,
      parentEmail: 'parent@example.com',
      password: 'secret',
      readingLevel: 'emerging',
    },
  };

  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  await registerStudent(req, res);
  assert.equal(res.code, 201);
  assert.equal(res.payload.success, true);
  assert.equal(typeof res.payload.token, 'string');

  Student.findOne = originalStudentFindOne;
  Student.create = originalStudentCreate;
  LearningProfile.findOneAndUpdate = originalProfileFindOneAndUpdate;
  gamePoolService.seedPoolForNewStudent = originalSeedPool;
  bcrypt.hash = originalHash;
});

test('login validates credentials and updates streak', async () => {
  Student.findOne = async () => ({
    _id: 'student-1',
    name: 'Ava',
    parentEmail: 'parent@example.com',
    passwordHash: 'hashed',
    streak: 0,
    lastActiveDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    age: 8,
    avatarId: 'explorer',
    xp: 20,
    coins: 10,
    level: 1,
    readingLevel: 'emerging',
  });
  Student.findByIdAndUpdate = async () => ({ ok: true });
  bcrypt.compare = async () => true;
  gamePoolService.refillPool = async () => undefined;

  const req = { body: { name: 'Ava', parentEmail: 'parent@example.com', password: 'secret' } };
  const res = {
    status(code) { this.code = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };

  await login(req, res);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.student.name, 'Ava');

  Student.findOne = originalStudentFindOne;
  Student.findByIdAndUpdate = originalStudentFindByIdAndUpdate;
  bcrypt.compare = originalCompare;
  gamePoolService.refillPool = originalRefillPool;
});

test('submitGameSession records a session and awards XP, then triggers pool refill', async () => {
  const resolvedStudentId = 'student-1';
  const profile = {
    phonicsScore: 60,
    readingScore: 70,
    memoryScore: 65,
    writingScore: 50,
    speechScore: 45,
    currentDifficulty: { phonics: 2, reading: 2, memory: 2, writing: 2, speech: 2 },
    goodSessionStreak: { phonics: 0, reading: 0, memory: 0 },
    weakAreas: ['speech'],
    strongAreas: ['reading'],
  };

  Student.findById = async () => ({
    _id: resolvedStudentId,
    name: 'Ava',
    age: 8,
    favoriteCharacter: 'fox',
    favoriteTheme: 'sunset',
    xp: 0,
    coins: 0,
    level: 1,
    streak: 0,
  });
  Student.findByIdAndUpdate = async () => ({ ok: true });
  LearningProfile.findOne = async () => profile;
  GameSession.create = async (payload) => ({ _id: 'session-1', ...payload });
  GameSession.countDocuments = async () => 1;
  LearningProfile.findOneAndUpdate = async () => ({ ok: true });
  AnalyticsEntry.findOneAndUpdate = async () => ({ ok: true });
  Achievement.find = () => ({ lean: () => [] });
  Achievement.create = async () => ({});
  aiService.orchestrate = async () => ({
    encouragementMessage: 'Nice work!',
    difficultyAdjustments: { phonics: 2 },
  });
  gamePoolService.refillPoolWithContext = async () => undefined;

  const req = {
    user: { id: resolvedStudentId },
    body: {
      gameType: 'phonics_adventure',
      score: 8,
      accuracy: 90,
      duration: 40,
      attempts: 10,
      mistakeLog: [],
      confusionMatrix: { b_for_d: 1 },
    },
  };
  const res = {
    status(code) { this.code = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };

  await submitGameSession(req, res);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.xpAwarded > 0, true);

  Student.findById = originalStudentFindById;
  LearningProfile.findOne = originalProfileFindOne;
  GameSession.create = originalGameSessionCreate;
  LearningProfile.findOneAndUpdate = originalProfileFindOneAndUpdate;
  AnalyticsEntry.findOneAndUpdate = originalAnalyticsUpdate;
  Achievement.find = originalAchievementFind;
  Achievement.insertMany = originalAchievementInsertMany;
  Achievement.create = originalAchievementCreate;
  aiService.orchestrate = originalAiServiceOrchestrate;
  gamePoolService.refillPoolWithContext = gamePoolService.refillPoolWithContext;
});

test('refillPool adds AI-generated game content when the pool is low', async () => {
  let poolItems = [];
  GamePool.findOne = () => ({
    select() {
      return { lean: async () => ({ items: poolItems }) };
    },
  });
  GamePool.findOneAndUpdate = async (_filter, update) => {
    assert.equal(update.$push.items.$each.length <= 10, true);
    poolItems = [...poolItems, ...update.$push.items.$each];
    return { ok: true };
  };
  Student.findById = async () => ({
    _id: 'student-1',
    name: 'Ava',
    age: 8,
    favoriteCharacter: 'fox',
    favoriteTheme: 'sunset',
  });
  LearningProfile.findOne = async () => ({
    readingScore: 50,
    speechScore: 50,
    memoryScore: 50,
    writingScore: 50,
    phonicsScore: 50,
    weakAreas: [],
    strongAreas: [],
    currentDifficulty: { reading: 1, speech: 1, memory: 1, writing: 1, phonics: 1 },
  });
  let generated = 0;
  aiService.orchestrate = async () => {
    generated += 1;
    return {
      activities: [{
        gameType: 'word_quest',
        title: `Word Quest ${generated}`,
        description: 'Read the story and answer the questions.',
        targetArea: 'reading',
        difficulty: 2,
        estimatedMinutes: 5,
        content: { story: `Read unique story ${generated}.`, questions: [] },
      }],
    };
  };

  await gamePoolService.refillPool('student-1', 'word_quest');

  assert.equal(poolItems.length, 10);
  GamePool.findOne = originalGamePoolFindOne;
  GamePool.findOneAndUpdate = originalGamePoolFindOneAndUpdate;
  Student.findById = originalStudentFindById;
  LearningProfile.findOne = originalProfileFindOne;
  aiService.orchestrate = originalAiServiceOrchestrate;
});

function preparePoolRefill(initialItems, orchestrate) {
  let items = [...initialItems];
  GamePool.findOne = () => ({
    select() {
      return { lean: async () => ({ items }) };
    },
  });
  GamePool.findOneAndUpdate = async (_filter, update) => {
    items = [...items, ...update.$push.items.$each];
    return { ok: true };
  };
  Student.findById = async () => ({
    _id: 'student-1',
    name: 'Ava',
    age: 8,
    favoriteCharacter: 'fox',
    favoriteTheme: 'sunset',
  });
  LearningProfile.findOne = async () => ({
    readingScore: 50,
    speechScore: 50,
    memoryScore: 50,
    writingScore: 50,
    phonicsScore: 50,
    weakAreas: [],
    strongAreas: [],
    currentDifficulty: { reading: 1, speech: 1, memory: 1, writing: 1, phonics: 1 },
  });
  aiService.orchestrate = orchestrate;
  return () => items;
}

function wordQuestActivity(title, content) {
  return {
    gameType: 'word_quest',
    title,
    description: 'Read the story and answer the questions.',
    targetArea: 'reading',
    difficulty: 2,
    estimatedMinutes: 5,
    content,
  };
}

test('refill retries duplicate AI output and accepts a later unique activity', async () => {
  const existing = {
    title: 'Forest Story',
    content: { story: 'A fox visits a quiet forest.' },
    difficulty: 2,
    generatedAt: new Date(),
    consumed: false,
  };
  let calls = 0;
  const getItems = preparePoolRefill([existing, ...Array(8).fill(existing)], async () => {
    calls += 1;
    return {
      activities: [calls === 1
        ? wordQuestActivity(' forest   story ', { story: ' A fox visits a quiet forest. ' })
        : wordQuestActivity('Moonlit Map', { story: 'A fox finds a moonlit map.' })],
    };
  });

  await gamePoolService.refillPool('student-1', 'word_quest');

  assert.equal(calls, 2);
  assert.equal(getItems().length, 10);
  assert.equal(getItems()[9].title, 'Moonlit Map');
});

test('failed retries preserve existing items and stop at the configured retry limit', async () => {
  const existing = {
    title: 'Existing Story',
    content: { story: 'Keep this valid activity.' },
    difficulty: 2,
    generatedAt: new Date(),
    consumed: false,
  };
  let calls = 0;
  const getItems = preparePoolRefill([existing], async () => {
    calls += 1;
    return { activities: [{ ...wordQuestActivity('Invalid', { story: 'Bad output' }), difficulty: 6 }] };
  });

  await gamePoolService.refillPool('student-1', 'word_quest');

  assert.equal(calls, (gamePoolService.MAX_REFILL_RETRIES + 1) * 9);
  assert.deepEqual(getItems(), [existing]);
});

test('partially successful refill appends valid items without removing existing pool entries', async () => {
  const existingItems = Array.from({ length: 7 }, (_, index) => ({
    title: `Existing ${index}`,
    content: { story: `Existing story ${index}.` },
    difficulty: 2,
    generatedAt: new Date(),
    consumed: false,
  }));
  const generated = [
    wordQuestActivity('New Story A', { story: 'A new story about a comet.' }),
    wordQuestActivity('New Story B', { story: 'A new story about a lighthouse.' }),
  ];
  let calls = 0;
  const getItems = preparePoolRefill(existingItems, async () => {
    const activity = calls === 0 ? generated[0] : calls === 3 ? generated[1] : generated[0];
    calls += 1;
    return { activities: [activity] };
  });

  await gamePoolService.refillPool('student-1', 'word_quest');

  assert.equal(calls, 6);
  assert.equal(getItems().length, 9);
  assert.deepEqual(getItems().slice(0, 7), existingItems);
  assert.deepEqual(getItems().slice(7).map((item) => item.title), ['New Story A', 'New Story B']);
});

test('refill does not request generation when the pool is already full', async () => {
  const existingItems = Array.from({ length: 10 }, (_, index) => ({
    title: `Existing ${index}`,
    content: { story: `Existing story ${index}.` },
    difficulty: 2,
    generatedAt: new Date(),
    consumed: false,
  }));
  let calls = 0;
  const getItems = preparePoolRefill(existingItems, async () => {
    calls += 1;
    return { activities: [] };
  });

  await gamePoolService.refillPool('student-1', 'word_quest');

  assert.equal(calls, 0);
  assert.deepEqual(getItems(), existingItems);
});

test('validateGeneratedActivity rejects malformed, duplicate, or out-of-range content before insertion', () => {
  const seenTitles = new Set();
  const seenContent = new Set();

  const valid = {
    gameType: 'phonics_adventure',
    title: 'Forest Letter Match',
    description: 'Match the letter sounds.',
    targetArea: 'phonics',
    difficulty: 3,
    estimatedMinutes: 5,
    content: { prompt: 'Find the letter that starts this word.', choices: ['b', 'd'] },
  };

  assert.equal(gamePoolService.validateGeneratedActivity(valid, 'phonics_adventure', seenTitles, seenContent), true);
  assert.equal(gamePoolService.validateGeneratedActivity({ ...valid, difficulty: 0 }, 'phonics_adventure', seenTitles, seenContent), false);
  assert.equal(gamePoolService.validateGeneratedActivity({ ...valid, title: 'Forest Letter Match', difficulty: 2 }, 'phonics_adventure', seenTitles, seenContent), false);
  assert.equal(gamePoolService.validateGeneratedActivity({ ...valid, content: { prompt: 'Same content' }, title: 'Different title' }, 'phonics_adventure', seenTitles, seenContent), true);
  assert.equal(gamePoolService.validateGeneratedActivity({ ...valid, gameType: 'word_quest' }, 'phonics_adventure', seenTitles, seenContent), false);
});

test('submitGameSession applies the existing adaptive difficulty thresholds, bounds, and per-domain behavior', async () => {
  const resolvedStudentId = 'student-1';
  const profile = {
    phonicsScore: 60,
    readingScore: 70,
    memoryScore: 65,
    writingScore: 50,
    speechScore: 45,
    currentDifficulty: { phonics: 2, reading: 2, memory: 2, writing: 2, speech: 2 },
    goodSessionStreak: { phonics: 1, reading: 1, memory: 0 },
    weakAreas: ['speech'],
    strongAreas: ['reading'],
  };

  const baseStudent = {
    _id: resolvedStudentId,
    name: 'Ava',
    age: 8,
    favoriteCharacter: 'fox',
    favoriteTheme: 'sunset',
    xp: 0,
    coins: 0,
    level: 1,
    streak: 0,
  };

  const capturedUpdates = [];
  Student.findById = async () => baseStudent;
  Student.findByIdAndUpdate = async () => ({ ok: true });
  LearningProfile.findOne = async () => profile;
  LearningProfile.findOneAndUpdate = async (_filter, update) => {
    capturedUpdates.push(update.$set ?? update);
    return { ok: true };
  };
  GameSession.create = async (payload) => ({ _id: 'session-1', ...payload });
  GameSession.countDocuments = async () => 1;
  AnalyticsEntry.findOneAndUpdate = async () => ({ ok: true });
  Achievement.find = () => ({ lean: () => [] });
  Achievement.insertMany = async () => [];
  aiService.orchestrate = async () => ({ encouragementMessage: 'Nice work!', difficultyAdjustments: { phonics: 3, reading: 3, memory: 3 } });
  gamePoolService.refillPoolWithContext = async () => undefined;

  const req = {
    user: { id: resolvedStudentId },
    body: {
      gameType: 'phonics_adventure',
      score: 8,
      accuracy: 90,
      duration: 40,
      attempts: 10,
      mistakeLog: [],
      confusionMatrix: { b_for_d: 1 },
    },
  };
  const res = { status(code) { this.code = code; return this; }, json(payload) { this.payload = payload; return this; } };

  await submitGameSession(req, res);
  assert.ok(capturedUpdates.some((update) => update.currentDifficulty && update.currentDifficulty.phonics === 3 && update.goodSessionStreak && update.goodSessionStreak.phonics === 0));

  profile.currentDifficulty.phonics = 5;
  profile.goodSessionStreak.phonics = 1;
  req.body.gameType = 'phonics_adventure';
  req.body.accuracy = 96;
  capturedUpdates.length = 0;
  await submitGameSession(req, res);
  assert.ok(capturedUpdates.some((update) => update.currentDifficulty && update.currentDifficulty.phonics === 5));

  profile.currentDifficulty.phonics = 1;
  profile.goodSessionStreak.phonics = 0;
  req.body.accuracy = 40;
  capturedUpdates.length = 0;
  await submitGameSession(req, res);
  assert.ok(capturedUpdates.some((update) => update.currentDifficulty && update.currentDifficulty.phonics === 1));

  profile.currentDifficulty.reading = 2;
  profile.goodSessionStreak.reading = 1;
  req.body.gameType = 'word_quest';
  req.body.accuracy = 91;
  capturedUpdates.length = 0;
  await submitGameSession(req, res);
  assert.ok(capturedUpdates.some((update) => update.currentDifficulty && update.currentDifficulty.reading === 3));

  profile.currentDifficulty.memory = 3;
  profile.goodSessionStreak.memory = 0;
  req.body.gameType = 'memory_challenge';
  req.body.accuracy = 80;
  capturedUpdates.length = 0;
  await submitGameSession(req, res);
  assert.ok(capturedUpdates.some((update) => update.currentDifficulty && update.currentDifficulty.memory === 3));

  Student.findById = originalStudentFindById;
  LearningProfile.findOne = originalProfileFindOne;
  GameSession.create = originalGameSessionCreate;
  LearningProfile.findOneAndUpdate = originalProfileFindOneAndUpdate;
  AnalyticsEntry.findOneAndUpdate = originalAnalyticsUpdate;
  Achievement.find = originalAchievementFind;
  Achievement.insertMany = originalAchievementInsertMany;
  Achievement.create = originalAchievementCreate;
  aiService.orchestrate = originalAiServiceOrchestrate;
  gamePoolService.refillPoolWithContext = gamePoolService.refillPoolWithContext;
});

test.after(() => {
  Student.findOne = originalStudentFindOne;
  Student.findById = originalStudentFindById;
  Student.create = originalStudentCreate;
  Student.findByIdAndUpdate = originalStudentFindByIdAndUpdate;
  LearningProfile.findOne = originalProfileFindOne;
  LearningProfile.findOneAndUpdate = originalProfileFindOneAndUpdate;
  Achievement.find = originalAchievementFind;
  Achievement.insertMany = originalAchievementInsertMany;
  Achievement.create = originalAchievementCreate;
  GameSession.create = originalGameSessionCreate;
  AnalyticsEntry.findOneAndUpdate = originalAnalyticsUpdate;
  aiService.orchestrate = originalAiServiceOrchestrate;
  GamePool.findOne = originalGamePoolFindOne;
  GamePool.findOneAndUpdate = originalGamePoolFindOneAndUpdate;
  gamePoolService.seedPoolForNewStudent = originalSeedPool;
  gamePoolService.refillPool = originalRefillPool;
  bcrypt.compare = originalCompare;
  bcrypt.hash = originalHash;
});
