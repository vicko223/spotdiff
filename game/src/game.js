// game.js — Double Take: the spot-the-difference game itself.
// Two panels show the same scene; the right one carries the scene's differences. Click a
// difference on either panel to mark it on both. A wrong click costs five seconds and points.
// Find them all before the clock runs out to clear the level; three levels make the game.

import { SCENES } from './scenes.js';
import { panelSVG, markerRing, wrongCross, hintPulse, sparkles } from './paint.js';
import { SoundBank } from './audio.js';

const WRONG_TIME_PENALTY = 5;
const FIND_POINTS = 100;
const WRONG_POINTS = 25;
const HINT_POINTS = 50;
const TIME_BONUS_PER_SECOND = 5;

function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function storeGet(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function storeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode, file:// quirks): the game still plays
  }
}

export class Game {
  constructor(refs) {
    this.refs = refs;
    this.sound = new SoundBank();
    this.screen = 'title';
    this.levelIndex = 0;
    this.found = new Set();
    this.mistakes = 0;
    this.hintsLeft = 0;
    this.hintsUsed = 0;
    this.score = 0;
    this.levelScore = 0;
    this.timeLeft = 0;
    this.streak = 0;
    this.paused = false;
    this.frozen = false;
    this.timerId = null;
    this.lastTickSecond = -1;
    this.unlocked = storeGet('doubletake.unlocked', 1);
    this.best = storeGet('doubletake.best', {});
    this.bindControls();
  }

  get scene() {
    return SCENES[this.levelIndex];
  }

  get remaining() {
    return this.scene.diffs.length - this.found.size;
  }

  // ---------- screens ----------

  showScreen(name) {
    this.screen = name;
    this.refs.titleScreen.hidden = name !== 'title';
    this.refs.gameScreen.hidden = name !== 'game';
    this.refs.hud.hidden = name !== 'game';
  }

  showTitle() {
    this.stopTimer();
    this.sound.stopPad();
    this.hideOverlays();
    this.renderLevelCards();
    this.showScreen('title');
  }

  renderLevelCards() {
    const wrap = this.refs.levelCards;
    wrap.innerHTML = '';
    SCENES.forEach((scene, i) => {
      const locked = i >= this.unlocked;
      const best = this.best[scene.id];
      const card = document.createElement('button');
      card.className = `level-card${locked ? ' locked' : ''}`;
      card.disabled = locked;
      card.innerHTML = `
        <span class="level-num">Level ${i + 1}</span>
        <span class="level-name">${scene.name}</span>
        <span class="level-meta">${scene.difficulty} · ${scene.diffs.length} differences · ${formatTime(scene.time)}</span>
        <span class="level-blurb">${scene.blurb}</span>
        <span class="level-best">${locked ? 'Clear the previous level to unlock' : best ? `Best score ${best}` : 'Not cleared yet'}</span>`;
      card.addEventListener('click', () => {
        this.sound.ensure();
        this.sound.click();
        this.startLevel(i);
      });
      wrap.appendChild(card);
    });
  }

  hideOverlays() {
    [this.refs.pauseOverlay, this.refs.completeOverlay, this.refs.failedOverlay, this.refs.campaignOverlay]
      .forEach((el) => { el.hidden = true; });
  }

  // ---------- level flow ----------

  startLevel(index, opts = {}) {
    this.levelIndex = index;
    this.found = new Set(opts.foundIds ?? []);
    this.mistakes = opts.mistakes ?? 0;
    this.hintsUsed = opts.hintsUsed ?? 0;
    this.hintsLeft = this.scene.hints - this.hintsUsed;
    this.levelScore = opts.levelScore ?? this.found.size * FIND_POINTS;
    this.timeLeft = opts.timeLeft ?? this.scene.time;
    this.streak = 0;
    this.paused = false;
    this.frozen = Boolean(opts.frozen);
    this.lastTickSecond = -1;
    this.hideOverlays();
    this.showScreen('game');
    this.refs.levelTitle.textContent = `Level ${index + 1} · ${this.scene.name}`;
    this.refs.leftPanel.innerHTML = panelSVG(this.scene, 'left', 'L');
    this.refs.rightPanel.innerHTML = panelSVG(this.scene, 'right', 'R');
    this.renderDots();
    this.renderMarkers(false);
    this.updateHUD();
    this.toast(this.frozen ? '' : `Find ${this.scene.diffs.length} differences!`);
    if (!this.frozen) {
      this.sound.ensure();
      this.sound.startPad();
      this.startTimer();
    }
  }

  completeLevel() {
    this.stopTimer();
    this.sound.stopPad();
    const bonus = Math.ceil(this.timeLeft) * TIME_BONUS_PER_SECOND;
    this.levelScore += bonus;
    this.score += this.levelScore;
    const stars = this.mistakes === 0 && this.hintsUsed <= 1 ? 3 : this.mistakes <= 3 ? 2 : 1;
    if (!this.best[this.scene.id] || this.levelScore > this.best[this.scene.id]) {
      this.best[this.scene.id] = this.levelScore;
      storeSet('doubletake.best', this.best);
    }
    if (this.levelIndex + 2 > this.unlocked) {
      this.unlocked = Math.min(SCENES.length, this.levelIndex + 2);
      storeSet('doubletake.unlocked', this.unlocked);
    }
    const last = this.levelIndex === SCENES.length - 1;
    if (last) {
      this.sound.fanfare();
      this.refs.campaignScore.textContent = `Total score ${this.score}`;
      this.refs.campaignOverlay.hidden = false;
    } else {
      this.sound.win();
      this.refs.completeStars.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      this.refs.completeStats.innerHTML =
        `Time left ${formatTime(this.timeLeft)} · Mistakes ${this.mistakes} · Hints ${this.hintsUsed}<br>` +
        `Level score ${this.levelScore} (includes ${bonus} time bonus)`;
      this.refs.completeOverlay.hidden = false;
    }
  }

  failLevel() {
    this.stopTimer();
    this.sound.stopPad();
    this.sound.lose();
    this.refs.failedStats.textContent =
      `You found ${this.found.size} of ${this.scene.diffs.length} differences. ${this.remaining} got away.`;
    this.refs.failedOverlay.hidden = false;
  }

  // ---------- timer ----------

  startTimer() {
    this.stopTimer();
    let last = performance.now();
    this.timerId = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      if (this.paused || this.screen !== 'game') return;
      this.timeLeft -= dt;
      const whole = Math.ceil(this.timeLeft);
      if (whole <= 10 && whole >= 0 && whole !== this.lastTickSecond) {
        this.lastTickSecond = whole;
        this.sound.tick();
      }
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.updateHUD();
        this.failLevel();
        return;
      }
      this.updateHUD();
    }, 100);
  }

  stopTimer() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  setPaused(paused) {
    if (this.screen !== 'game' || this.frozen) return;
    this.paused = paused;
    this.refs.pauseOverlay.hidden = !paused;
    if (paused) this.sound.stopPad();
    else this.sound.startPad();
  }

  // ---------- input ----------

  bindControls() {
    const onPanel = (side) => (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 600;
      const y = ((event.clientY - rect.top) / rect.height) * 450;
      this.handleClick(x, y);
    };
    this.refs.leftPanel.addEventListener('click', onPanel('left'));
    this.refs.rightPanel.addEventListener('click', onPanel('right'));
    this.refs.hintButton.addEventListener('click', () => this.useHint());
    this.refs.pauseButton.addEventListener('click', () => this.setPaused(true));
    this.refs.resumeButton.addEventListener('click', () => this.setPaused(false));
    this.refs.muteButton.addEventListener('click', () => this.toggleMute());
    this.refs.nextButton.addEventListener('click', () => this.startLevel(this.levelIndex + 1));
    this.refs.replayButton.addEventListener('click', () => this.startLevel(this.levelIndex));
    this.refs.retryButton.addEventListener('click', () => this.startLevel(this.levelIndex));
    this.refs.menuButtons.forEach((btn) => btn.addEventListener('click', () => this.showTitle()));
    this.refs.againButton.addEventListener('click', () => { this.score = 0; this.startLevel(0); });
    document.addEventListener('keydown', (event) => this.handleKey(event));
  }

  handleKey(event) {
    const key = event.key.toLowerCase();
    if (key === 'm') { this.toggleMute(); return; }
    if (this.screen === 'title') {
      const n = Number(key);
      if (n >= 1 && n <= SCENES.length && n <= this.unlocked) this.startLevel(n - 1);
      return;
    }
    if (this.screen !== 'game') return;
    if (!this.refs.completeOverlay.hidden && (key === 'enter' || key === ' ')) {
      event.preventDefault();
      this.startLevel(this.levelIndex + 1);
      return;
    }
    if (!this.refs.failedOverlay.hidden && key === 'r') { this.startLevel(this.levelIndex); return; }
    if (key === 'h') this.useHint();
    else if (key === 'p' || key === 'escape') this.setPaused(!this.paused);
  }

  toggleMute() {
    this.sound.ensure();
    this.sound.setMuted(!this.sound.muted);
    this.refs.muteButton.textContent = this.sound.muted ? 'Sound: off' : 'Sound: on';
  }

  handleClick(x, y) {
    if (this.screen !== 'game' || this.paused || this.frozen) return;
    this.sound.ensure();
    const hit = this.scene.diffs.find((d) => {
      if (this.found.has(d.id)) return false;
      const dx = x - d.hit.x;
      const dy = y - d.hit.y;
      return dx * dx + dy * dy <= d.hit.r * d.hit.r;
    });
    if (hit) this.findDiff(hit);
    else this.wrongClick(x, y);
  }

  findDiff(diff) {
    this.found.add(diff.id);
    this.streak += 1;
    this.levelScore += FIND_POINTS;
    this.sound.found(this.streak);
    this.renderMarkers(true, diff);
    this.renderDots();
    this.updateHUD();
    this.toast(`Found: ${diff.label}`);
    if (this.remaining === 0) {
      setTimeout(() => this.completeLevel(), this.frozen ? 0 : 650);
    }
  }

  wrongClick(x, y) {
    this.mistakes += 1;
    this.streak = 0;
    this.levelScore = Math.max(0, this.levelScore - WRONG_POINTS);
    this.timeLeft = Math.max(0, this.timeLeft - WRONG_TIME_PENALTY);
    this.sound.wrong();
    this.flashWrong(x, y);
    this.refs.timeText.classList.remove('penalty');
    void this.refs.timeText.offsetWidth;
    this.refs.timeText.classList.add('penalty');
    this.updateHUD();
    if (this.timeLeft <= 0) this.failLevel();
  }

  useHint() {
    if (this.screen !== 'game' || this.paused || this.frozen || this.hintsLeft <= 0) return;
    const unfound = this.scene.diffs.filter((d) => !this.found.has(d.id));
    if (unfound.length === 0) return;
    this.hintsLeft -= 1;
    this.hintsUsed += 1;
    this.levelScore = Math.max(0, this.levelScore - HINT_POINTS);
    this.sound.hint();
    const pick = unfound[Math.floor(Math.random() * unfound.length)];
    [this.refs.leftOverlay, this.refs.rightOverlay].forEach((overlay) => {
      const svg = overlay.querySelector('svg');
      if (!svg) return;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.innerHTML = hintPulse(pick.hit);
      svg.appendChild(g);
      setTimeout(() => g.remove(), 2600);
    });
    this.updateHUD();
  }

  // ---------- rendering helpers ----------

  renderMarkers(animate, justFound = null) {
    const rings = this.scene.diffs
      .filter((d) => this.found.has(d.id))
      .map((d) => markerRing(d.hit, true, animate && justFound !== null && d.id === justFound.id))
      .join('');
    const extra = animate && justFound ? sparkles(justFound.hit) : '';
    const markup = `<svg viewBox="0 0 600 450" preserveAspectRatio="xMidYMid meet">${rings}${extra}</svg>`;
    this.refs.leftOverlay.innerHTML = markup;
    this.refs.rightOverlay.innerHTML = markup;
    if (animate && justFound) {
      setTimeout(() => this.renderMarkers(false), 900);
    }
  }

  flashWrong(x, y) {
    [this.refs.leftOverlay, this.refs.rightOverlay].forEach((overlay) => {
      const svg = overlay.querySelector('svg');
      if (!svg) return;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.innerHTML = wrongCross(x, y);
      svg.appendChild(g);
      setTimeout(() => g.remove(), 650);
    });
    this.refs.panels.classList.remove('shake');
    void this.refs.panels.offsetWidth;
    this.refs.panels.classList.add('shake');
  }

  renderDots() {
    this.refs.dots.innerHTML = this.scene.diffs
      .map((d) => `<span class="dot${this.found.has(d.id) ? ' on' : ''}"></span>`)
      .join('');
  }

  updateHUD() {
    this.refs.counter.textContent = this.remaining === 0
      ? 'All found!'
      : `${this.remaining} to go`;
    this.refs.foundText.textContent = `Found ${this.found.size} of ${this.scene.diffs.length}`;
    this.refs.scoreText.textContent = `Score ${this.score + this.levelScore}`;
    this.refs.timeText.textContent = formatTime(this.timeLeft);
    const frac = Math.max(0, Math.min(1, this.timeLeft / this.scene.time));
    this.refs.timeBar.style.width = `${frac * 100}%`;
    this.refs.timeBar.classList.toggle('low', this.timeLeft <= 15);
    this.refs.hintButton.textContent = `Hint (${this.hintsLeft})`;
    this.refs.hintButton.disabled = this.hintsLeft <= 0;
  }

  toast(text) {
    if (!text) { this.refs.toast.textContent = ''; return; }
    this.refs.toast.textContent = text;
    this.refs.toast.classList.remove('show');
    void this.refs.toast.offsetWidth;
    this.refs.toast.classList.add('show');
  }
}
