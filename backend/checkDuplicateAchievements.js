const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key === 'MONGODB_URI') process.env.MONGODB_URI = value;
  }
}

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('NO_MONGODB_URI');
    return;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    const duplicates = await mongoose.connection.db.collection('achievements').aggregate([
      { $group: { _id: { studentId: '$studentId', badgeId: '$badgeId' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $project: { _id: 0, studentId: '$_id.studentId', badgeId: '$_id.badgeId', count: 1 } },
      { $limit: 20 },
    ]).toArray();

    console.log(JSON.stringify({ duplicateGroups: duplicates.length, duplicates }));
  } catch (err) {
    console.log('CHECK_FAILED');
  } finally {
    await mongoose.disconnect();
  }
})();
