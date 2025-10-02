function pickCrashMultiplier() {
  const r = Math.random();
  if (r < 0.49) return 2; // 49% of games end below 2x
  if (r < 0.57) return 10; // 8% below 10x
  if (r < 0.59) return 50; // 2% below 50x
  return 100; // 1% below 100x
}

function randomRugValue() {
  return parseFloat((Math.random() * 0.000099 + 0.000001).toFixed(6));
}

// Instead of precomputing, we keep state and generate the next tick
export function createTickGenerator() {
  let current = 1.0;
  let steps = 0;
  const maxTarget = pickCrashMultiplier();

  return function nextTick() {
    // insta-rug at start (1%)
    if (steps === 0 && Math.random() < 0.01) {
      steps++;
      return { value: randomRugValue(), crashed: true };
    }

    steps++;

    // drift upwards with small random jitter
    const change = (Math.random() - 0.45) * 0.5; // mostly positive
    current = Math.max(0.1, current + change);

    // check crash conditions
    if (
      (steps > 10 && Math.random() < 0.05) ||
      current >= maxTarget ||
      steps > 200
    ) {
      return { value: randomRugValue(), crashed: true };
    }

    return { value: parseFloat(current.toFixed(4)), crashed: false };
  };
}
