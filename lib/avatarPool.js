export const AVATAR_KEYS = Array.from({ length: 43 }, (_, index) =>
  String(index + 1).padStart(2, "0")
);

export function isValidAvatarKey(value) {
  return AVATAR_KEYS.includes(String(value || ""));
}

export function pickLeastUsedAvatar(rows = []) {
  const counts = Object.fromEntries(AVATAR_KEYS.map((key) => [key, 0]));

  for (const row of rows) {
    const key = String(row?.avatar || "");
    if (isValidAvatarKey(key)) counts[key] += 1;
  }

  const minimum = Math.min(...AVATAR_KEYS.map((key) => counts[key]));
  const candidates = AVATAR_KEYS.filter((key) => counts[key] === minimum);
  return candidates[Math.floor(Math.random() * candidates.length)] || "01";
}

export function pickAndCountLeastUsedAvatar(counts) {
  const minimum = Math.min(...AVATAR_KEYS.map((key) => Number(counts[key] || 0)));
  const candidates = AVATAR_KEYS.filter((key) => Number(counts[key] || 0) === minimum);
  const selected = candidates[Math.floor(Math.random() * candidates.length)] || "01";
  counts[selected] = Number(counts[selected] || 0) + 1;
  return selected;
}
