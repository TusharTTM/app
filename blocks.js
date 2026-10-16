import { Block } from '../models/Community.js';

// IDs of users I blocked or who blocked me (hidden from my feed both ways).
export async function blockedIdsFor(userId) {
  const rows = await Block.find({ $or: [{ blockerId: userId }, { blockedId: userId }] });
  return rows.map((r) => (String(r.blockerId) === String(userId) ? r.blockedId : r.blockerId));
}
