// time pole: {utc, speed} model driving re-projection. Pure, no DOM.
// speed is a real-time multiplier: 1 = realtime, 0 = paused, 60 = 1 min/s, <0 = reverse.
export function createClock(initialUTC = new Date(), initialSpeed = 1) {
  let utc = new Date(initialUTC);
  let speed = initialSpeed;
  return {
    getUTC: () => new Date(utc),
    setUTC: (d) => { utc = new Date(d); },
    setSpeed: (mult) => { speed = mult; },
    getSpeed: () => speed,
    // advance sim time by realDtMs of wall-clock, scaled by speed; returns current UTC.
    tick: (realDtMs) => {
      utc = new Date(utc.getTime() + realDtMs * speed);
      return new Date(utc);
    },
  };
}
