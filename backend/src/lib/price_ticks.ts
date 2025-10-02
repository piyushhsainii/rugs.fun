function pickCrashMultiplier() {
  const r = Math.random();
  if (r < 0.49) return 2; // 49% of games end below 2x
  if (r < 0.57) return 10; // 8% of games below 10x
  if (r < 0.59) return 50; // 2% below 50x
  return 100; // 1% below 100x
}

function randomRugValue() {
  return parseFloat((Math.random() * 0.000099 + 0.000001).toFixed(6));
}

export function generateChaoticPath() {
  const maxTarget = pickCrashMultiplier();
  const path = [1.0];
  let current = 1.0;
  // 1% chance of insta-rug
  if (Math.random() < 0.01) {
    path.push(randomRugValue());
    return path;
  }
  while (true) {
    // smaller random jitter for smoother progression
    const change = (Math.random() - 0.45) * 0.5; // mostly positive drift
    current = Math.max(0.1, current + change);

    path.push(parseFloat(current.toFixed(4)));

    // ~5% chance to rug each step, but only after 10 ticks
    if ((path.length > 10 && Math.random() < 0.05) || current >= maxTarget) {
      path.push(randomRugValue());
      break;
    }

    // cap length so it doesn’t go infinite
    if (path.length > 200) {
      path.push(randomRugValue());
      break;
    }
  }
  return path;
}
