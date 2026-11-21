// main.js — Double Take entry point: collect the page's elements, build the game,
// and either stage a screenshot scene (?shot=...) or open on the title screen.

import { Game } from './game.js';
import { stageShot } from './shots.js';

const byId = (id) => document.getElementById(id);

const game = new Game({
  titleScreen: byId('screen-title'),
  gameScreen: byId('screen-game'),
  hud: byId('hud'),
  levelCards: byId('level-cards'),
  levelTitle: byId('level-title'),
  leftPanel: byId('panel-left'),
  rightPanel: byId('panel-right'),
  leftOverlay: byId('overlay-left'),
  rightOverlay: byId('overlay-right'),
  panels: byId('panels'),
  dots: byId('dots'),
  counter: byId('counter'),
  foundText: byId('found-text'),
  scoreText: byId('score-text'),
  timeText: byId('time-text'),
  timeBar: byId('time-bar'),
  toast: byId('toast'),
  hintButton: byId('btn-hint'),
  pauseButton: byId('btn-pause'),
  resumeButton: byId('btn-resume'),
  muteButton: byId('btn-mute'),
  nextButton: byId('btn-next'),
  replayButton: byId('btn-replay'),
  retryButton: byId('btn-retry'),
  againButton: byId('btn-again'),
  menuButtons: [...document.querySelectorAll('.btn-menu')],
  pauseOverlay: byId('overlay-pause'),
  completeOverlay: byId('overlay-complete'),
  failedOverlay: byId('overlay-failed'),
  campaignOverlay: byId('overlay-campaign'),
  completeStars: byId('complete-stars'),
  completeStats: byId('complete-stats'),
  failedStats: byId('failed-stats'),
  campaignScore: byId('campaign-score'),
});

const shot = new URLSearchParams(location.search).get('shot');
if (!shot || !stageShot(shot, game)) {
  game.showTitle();
}
