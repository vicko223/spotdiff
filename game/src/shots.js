// shots.js — deterministic screenshot scenes behind ?shot=cover|title|garden|complete.
// Each one stages the real game in a fixed state (frozen clock, chosen differences already
// found) so a screenshot shows exactly what a moment of play looks like, every time.

import { SCENES } from './scenes.js';

/** Stage the named screenshot scene on a fresh Game; returns true when the name matched. */
export function stageShot(name, game) {
  if (name === 'title') {
    game.showTitle();
    return true;
  }
  if (name === 'cover') {
    game.startLevel(0, {
      frozen: true,
      foundIds: ['h1', 'h3', 'h5'],
      timeLeft: 107,
      levelScore: 300,
    });
    game.toast('Found: The lighthouse lamp turned red');
    return true;
  }
  if (name === 'garden') {
    game.startLevel(2, {
      frozen: true,
      foundIds: ['g2', 'g11'],
      timeLeft: 178,
      levelScore: 200,
    });
    game.toast('Found: The moon lost a crater');
    return true;
  }
  if (name === 'complete') {
    game.startLevel(1, {
      frozen: true,
      foundIds: SCENES[1].diffs.map((d) => d.id),
      timeLeft: 64,
      levelScore: 1000,
      mistakes: 1,
      hintsUsed: 1,
    });
    game.completeLevel();
    return true;
  }
  return false;
}
