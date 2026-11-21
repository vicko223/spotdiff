// paint.js — draws every scene element as SVG markup.
// A scene is a list of plain element objects ({kind, x, y, ...}); each painter below turns one
// element into SVG shapes in a 600x450 panel. The left panel paints the list as written; the
// right panel paints the same list with the scene's differences applied, so the two pictures
// are pixel-identical except where a difference says otherwise.

const TAU = Math.PI * 2;

function esc(value) {
  return String(value);
}

/** A soft-edged ellipse shadow under an object. */
function shadow(x, y, rx, ry, opacity = 0.16) {
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#1d2b3a" opacity="${opacity}"/>`;
}

const painters = {
  sun(p) {
    const rays = p.rays
      ? Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * TAU;
          const x1 = p.x + Math.cos(a) * (p.r + 6);
          const y1 = p.y + Math.sin(a) * (p.r + 6);
          const x2 = p.x + Math.cos(a) * (p.r + 22);
          const y2 = p.y + Math.sin(a) * (p.r + 22);
          return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${p.color}" stroke-width="5" stroke-linecap="round"/>`;
        }).join('')
      : '';
    return `${rays}<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${p.color}"/><circle cx="${p.x - p.r * 0.3}" cy="${p.y - p.r * 0.3}" r="${p.r * 0.55}" fill="#ffffff" opacity="0.35"/>`;
  },

  cloud(p) {
    const s = p.s ?? 1;
    return `<g fill="${p.color}" opacity="${p.opacity ?? 0.95}">
      <ellipse cx="${p.x}" cy="${p.y}" rx="${34 * s}" ry="${15 * s}"/>
      <ellipse cx="${p.x - 22 * s}" cy="${p.y + 4 * s}" rx="${22 * s}" ry="${11 * s}"/>
      <ellipse cx="${p.x + 24 * s}" cy="${p.y + 4 * s}" rx="${24 * s}" ry="${12 * s}"/>
      <ellipse cx="${p.x + 2 * s}" cy="${p.y - 9 * s}" rx="${20 * s}" ry="${12 * s}"/></g>`;
  },

  mountain(p) {
    const { x, y, w, h, color } = p;
    const peak = `${x},${y - h} ${x + w / 2},${y} ${x - w / 2},${y}`;
    const snow = p.snow
      ? `<polygon points="${x},${y - h} ${x + w * 0.14},${y - h * 0.72} ${x - w * 0.14},${y - h * 0.72}" fill="#ffffff" opacity="0.9"/>`
      : '';
    return `<polygon points="${peak}" fill="${color}"/>${snow}`;
  },

  sea(p) {
    let waves = '';
    for (let row = 0; row < (p.rows ?? 4); row += 1) {
      const y = p.y + 14 + row * 16;
      for (let i = 0; i < 9; i += 1) {
        const x = 18 + i * 68 + (row % 2) * 30;
        waves += `<path d="M ${x} ${y} q 10 -7 20 0 q 10 7 20 0" fill="none" stroke="#ffffff" stroke-width="2.4" opacity="0.4" stroke-linecap="round"/>`;
      }
    }
    return `<rect x="0" y="${p.y}" width="600" height="${450 - p.y}" fill="${p.color}"/>${waves}`;
  },

  ground(p) {
    let stones = '';
    if (p.stones) {
      for (let row = 0; row < 4; row += 1) {
        for (let i = 0; i < 8; i += 1) {
          const x = 20 + i * 76 + (row % 2) * 34;
          const y = p.y + 16 + row * 15;
          stones += `<ellipse cx="${x}" cy="${y}" rx="30" ry="6.5" fill="#000000" opacity="0.08"/>`;
        }
      }
    }
    return `<rect x="0" y="${p.y}" width="600" height="${450 - p.y}" fill="${p.color}"/>${stones}`;
  },

  lighthouse(p) {
    const s = p.s ?? 1;
    const x = p.x;
    const y = p.y; // base
    const w = 44 * s;
    const h = 130 * s;
    const top = y - h;
    return `${shadow(x, y + 4, 46 * s, 7 * s)}
      <polygon points="${x - w / 2},${y} ${x - w * 0.32},${top + 26 * s} ${x + w * 0.32},${top + 26 * s} ${x + w / 2},${y}" fill="${p.stripeA}"/>
      <polygon points="${x - w * 0.44},${y - h * 0.34} ${x - w * 0.4},${y - h * 0.55} ${x + w * 0.4},${y - h * 0.55} ${x + w * 0.44},${y - h * 0.34}" fill="${p.stripeB}"/>
      <polygon points="${x - w * 0.37},${y - h * 0.72} ${x - w * 0.34},${top + 26 * s} ${x + w * 0.34},${top + 26 * s} ${x + w * 0.37},${y - h * 0.72}" fill="${p.stripeB}"/>
      <rect x="${x - w * 0.42}" y="${top + 20 * s}" width="${w * 0.84}" height="${7 * s}" rx="${3 * s}" fill="#33414f"/>
      <rect x="${x - w * 0.3}" y="${top}" width="${w * 0.6}" height="${22 * s}" fill="${p.lamp}"/>
      <rect x="${x - w * 0.3}" y="${top}" width="${w * 0.6}" height="${22 * s}" fill="none" stroke="#33414f" stroke-width="${2.4 * s}"/>
      <polygon points="${x - w * 0.42},${top} ${x},${top - 16 * s} ${x + w * 0.42},${top}" fill="#33414f"/>
      <rect x="${x - 6 * s}" y="${y - 26 * s}" width="${12 * s}" height="${26 * s}" rx="${5 * s}" fill="#33414f"/>
      <circle cx="${x}" cy="${y - h * 0.45}" r="${5.5 * s}" fill="#ffe9a8" stroke="#33414f" stroke-width="${1.8 * s}"/>`;
  },

  rock(p) {
    return `<polygon points="${p.x - p.w / 2},${p.y} ${p.x - p.w * 0.2},${p.y - p.h} ${p.x + p.w * 0.25},${p.y - p.h * 0.8} ${p.x + p.w / 2},${p.y}" fill="${p.color}"/><polygon points="${p.x - p.w * 0.2},${p.y - p.h} ${p.x + p.w * 0.25},${p.y - p.h * 0.8} ${p.x + p.w * 0.1},${p.y}" fill="#ffffff" opacity="0.14"/>`;
  },

  sailboat(p) {
    const s = p.s ?? 1;
    const { x, y } = p;
    return `${shadow(x, y + 16 * s, 52 * s, 5 * s, 0.2)}
      <line x1="${x}" y1="${y}" x2="${x}" y2="${y - 74 * s}" stroke="#6b4a2f" stroke-width="${3.4 * s}"/>
      <polygon points="${x + 3 * s},${y - 70 * s} ${x + 3 * s},${y - 6 * s} ${x + 34 * s},${y - 6 * s}" fill="${p.sail}"/>
      <polygon points="${x - 3 * s},${y - 62 * s} ${x - 3 * s},${y - 6 * s} ${x - 26 * s},${y - 6 * s}" fill="${p.sail2}"/>
      <polygon points="${x},${y - 74 * s} ${x + 13 * s},${y - 69 * s} ${x},${y - 64 * s}" fill="${p.flag ?? '#ff6b5e'}"/>
      <path d="M ${x - 46 * s} ${y} L ${x + 46 * s} ${y} L ${x + 34 * s} ${y + 15 * s} L ${x - 34 * s} ${y + 15 * s} Z" fill="${p.hull}"/>
      <rect x="${x - 46 * s}" y="${y - 4 * s}" width="${92 * s}" height="${5 * s}" fill="#ffffff" opacity="0.5"/>`;
  },

  fishboat(p) {
    const s = p.s ?? 1;
    const { x, y } = p;
    return `${shadow(x, y + 15 * s, 56 * s, 5 * s, 0.2)}
      <path d="M ${x - 52 * s} ${y} L ${x + 52 * s} ${y} L ${x + 40 * s} ${y + 14 * s} L ${x - 40 * s} ${y + 14 * s} Z" fill="${p.hull}"/>
      <rect x="${x - 16 * s}" y="${y - 22 * s}" width="${34 * s}" height="${22 * s}" rx="${3 * s}" fill="#f4f1e8"/>
      <rect x="${x - 10 * s}" y="${y - 17 * s}" width="${10 * s}" height="${9 * s}" fill="#7fb6d9"/>
      <rect x="${x + 4 * s}" y="${y - 17 * s}" width="${10 * s}" height="${9 * s}" fill="#7fb6d9"/>
      <rect x="${x + 22 * s}" y="${y - 30 * s}" width="${8 * s}" height="${30 * s}" fill="#33414f"/>
      <circle cx="${x + 26 * s}" cy="${y - 38 * s}" r="${6 * s}" fill="#ffffff" opacity="0.75"/>
      <circle cx="${x + 32 * s}" cy="${y - 47 * s}" r="${8 * s}" fill="#ffffff" opacity="0.55"/>
      <line x1="${x - 34 * s}" y1="${y}" x2="${x - 34 * s}" y2="${y - 34 * s}" stroke="#6b4a2f" stroke-width="${3 * s}"/>
      <circle cx="${x - 34 * s}" cy="${y - 38 * s}" r="${4 * s}" fill="#ffd94d"/>`;
  },

  gull(p) {
    const s = p.s ?? 1;
    return `<path d="M ${p.x - 14 * s} ${p.y} Q ${p.x - 6 * s} ${p.y - 8 * s} ${p.x} ${p.y} Q ${p.x + 6 * s} ${p.y - 8 * s} ${p.x + 14 * s} ${p.y}" fill="none" stroke="${p.color}" stroke-width="${2.6 * s}" stroke-linecap="round"/>`;
  },

  pier(p) {
    const posts = [0.08, 0.38, 0.68, 0.94].map((f) => `<rect x="${p.x + p.w * f - 4}" y="${p.y}" width="8" height="34" fill="#7a5a3c"/>`).join('');
    let planks = '';
    for (let i = 0; i < 8; i += 1) planks += `<line x1="${p.x + (p.w / 8) * i}" y1="${p.y - 9}" x2="${p.x + (p.w / 8) * i}" y2="${p.y}" stroke="#8a6844" stroke-width="2"/>`;
    return `${posts}<rect x="${p.x}" y="${p.y - 9}" width="${p.w}" height="9" fill="#a67c52"/>${planks}`;
  },

  crate(p) {
    const s = p.s ?? 1;
    const w = 34 * s;
    return `<rect x="${p.x - w / 2}" y="${p.y - w}" width="${w}" height="${w}" fill="${p.color}"/>
      <rect x="${p.x - w / 2}" y="${p.y - w}" width="${w}" height="${w}" fill="none" stroke="#7a5a3c" stroke-width="${2.4 * s}"/>
      <line x1="${p.x - w / 2}" y1="${p.y - w}" x2="${p.x + w / 2}" y2="${p.y}" stroke="#7a5a3c" stroke-width="${2.2 * s}"/>
      <line x1="${p.x + w / 2}" y1="${p.y - w}" x2="${p.x - w / 2}" y2="${p.y}" stroke="#7a5a3c" stroke-width="${2.2 * s}"/>`;
  },

  barrel(p) {
    const s = p.s ?? 1;
    const w = 26 * s;
    const h = 36 * s;
    return `<path d="M ${p.x - w / 2} ${p.y - h} L ${p.x + w / 2} ${p.y - h} L ${p.x + w / 2 - 2 * s} ${p.y} L ${p.x - w / 2 + 2 * s} ${p.y} Z" fill="${p.color}"/>
      <line x1="${p.x - w / 2}" y1="${p.y - h * 0.72}" x2="${p.x + w / 2}" y2="${p.y - h * 0.72}" stroke="#5d4430" stroke-width="${3 * s}"/>
      <line x1="${p.x - w / 2 + 1 * s}" y1="${p.y - h * 0.3}" x2="${p.x + w / 2 - 1 * s}" y2="${p.y - h * 0.3}" stroke="#5d4430" stroke-width="${3 * s}"/>
      <ellipse cx="${p.x}" cy="${p.y - h}" rx="${w / 2}" ry="${4 * s}" fill="#ffffff" opacity="0.25"/>`;
  },

  buoy(p) {
    const s = p.s ?? 1;
    return `<polygon points="${p.x - 13 * s},${p.y} ${p.x + 13 * s},${p.y} ${p.x + 8 * s},${p.y - 18 * s} ${p.x - 8 * s},${p.y - 18 * s}" fill="${p.color}"/>
      <rect x="${p.x - 10 * s}" y="${p.y - 11 * s}" width="${20 * s}" height="${4.5 * s}" fill="#ffffff"/>
      <line x1="${p.x}" y1="${p.y - 18 * s}" x2="${p.x}" y2="${p.y - 28 * s}" stroke="#33414f" stroke-width="${2.6 * s}"/>
      <circle cx="${p.x}" cy="${p.y - 31 * s}" r="${4 * s}" fill="#ffd94d"/>`;
  },

  fish(p) {
    const s = p.s ?? 1;
    const dir = p.flip ? -1 : 1;
    return `<g transform="translate(${p.x} ${p.y}) scale(${dir * s} ${s})">
      <path d="M -16 0 Q 0 -10 16 0 Q 0 10 -16 0 Z" fill="${p.color}"/>
      <polygon points="-14,0 -24,-8 -24,8" fill="${p.color}"/>
      <circle cx="9" cy="-2" r="2.2" fill="#1d2b3a"/>
      <path d="M 2 -6 Q 5 0 2 6" fill="none" stroke="#ffffff" stroke-width="1.8" opacity="0.6"/></g>`;
  },

  building(p) {
    const { x, y, w, h } = p; // y = base
    let windows = '';
    const cols = p.cols ?? 3;
    const rows = p.rows ?? 3;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const wx = x - w / 2 + 12 + c * ((w - 24) / Math.max(1, cols - 1 || 1)) - 8;
        const wy = y - h + 16 + r * ((h - 40) / Math.max(1, rows - 1 || 1));
        const lit = (p.lit ?? []).includes(`${r},${c}`);
        windows += `<rect x="${wx}" y="${wy}" width="16" height="20" rx="2" fill="${lit ? '#ffd94d' : '#5b7a99'}"/>`;
      }
    }
    return `${shadow(x, y + 3, w * 0.55, 6, 0.18)}
      <rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" fill="${p.color}"/>
      <polygon points="${x - w / 2 - 7},${y - h} ${x},${y - h - 24} ${x + w / 2 + 7},${y - h}" fill="${p.roof}"/>
      ${windows}
      <rect x="${x - 9}" y="${y - 30}" width="18" height="30" rx="3" fill="#6b4a2f"/>`;
  },

  clocktower(p) {
    const s = p.s ?? 1;
    const { x, y } = p;
    const h = 190 * s;
    const hourA = ((p.hour % 12) + p.min / 60) * (TAU / 12) - Math.PI / 2;
    const minA = (p.min / 60) * TAU - Math.PI / 2;
    const cy = y - h + 34 * s;
    const hx = x + Math.cos(hourA) * 13 * s;
    const hy = cy + Math.sin(hourA) * 13 * s;
    const mx = x + Math.cos(minA) * 19 * s;
    const my = cy + Math.sin(minA) * 19 * s;
    return `${shadow(x, y + 3, 34 * s, 6 * s, 0.18)}
      <rect x="${x - 26 * s}" y="${y - h}" width="${52 * s}" height="${h}" fill="${p.color}"/>
      <polygon points="${x - 32 * s},${y - h} ${x},${y - h - 30 * s} ${x + 32 * s},${y - h}" fill="${p.roof}"/>
      <circle cx="${x}" cy="${cy}" r="${24 * s}" fill="#fdf6e3" stroke="#33414f" stroke-width="${3 * s}"/>
      <line x1="${x}" y1="${cy}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="#33414f" stroke-width="${3.4 * s}" stroke-linecap="round"/>
      <line x1="${x}" y1="${cy}" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" stroke="#33414f" stroke-width="${2.4 * s}" stroke-linecap="round"/>
      <circle cx="${x}" cy="${cy}" r="${2.6 * s}" fill="#33414f"/>
      <rect x="${x - 8 * s}" y="${y - 92 * s}" width="${16 * s}" height="${24 * s}" rx="${7 * s}" fill="#5b7a99"/>
      <rect x="${x - 10 * s}" y="${y - 34 * s}" width="${20 * s}" height="${34 * s}" rx="${3 * s}" fill="#6b4a2f"/>`;
  },

  awning(p) {
    const stripes = 6;
    let body = '';
    for (let i = 0; i < stripes; i += 1) {
      const x1 = p.x - p.w / 2 + (p.w / stripes) * i;
      body += `<polygon points="${x1},${p.y} ${x1 + p.w / stripes},${p.y} ${x1 + p.w / stripes + 5},${p.y + 20} ${x1 + 5},${p.y + 20}" fill="${i % 2 ? p.colorB : p.colorA}"/>`;
    }
    let scallops = '';
    for (let i = 0; i < stripes; i += 1) {
      const cx = p.x - p.w / 2 + 5 + (p.w / stripes) * (i + 0.5);
      scallops += `<circle cx="${cx}" cy="${p.y + 20}" r="${p.w / stripes / 2}" fill="${i % 2 ? p.colorB : p.colorA}"/>`;
    }
    return `${body}${scallops}`;
  },

  stall(p) {
    const s = p.s ?? 1;
    const { x, y } = p; // y = counter top
    return `<line x1="${x - 52 * s}" y1="${y}" x2="${x - 52 * s}" y2="${y - 62 * s}" stroke="#6b4a2f" stroke-width="${4 * s}"/>
      <line x1="${x + 52 * s}" y1="${y}" x2="${x + 52 * s}" y2="${y - 62 * s}" stroke="#6b4a2f" stroke-width="${4 * s}"/>
      <polygon points="${x - 62 * s},${y - 62 * s} ${x + 62 * s},${y - 62 * s} ${x + 52 * s},${y - 78 * s} ${x - 52 * s},${y - 78 * s}" fill="${p.canopy}"/>
      <rect x="${x - 56 * s}" y="${y}" width="${112 * s}" height="${12 * s}" fill="#8a6844"/>
      <rect x="${x - 50 * s}" y="${y + 12 * s}" width="${100 * s}" height="${26 * s}" fill="#a67c52"/>
      <line x1="${x - 50 * s}" y1="${y + 25 * s}" x2="${x + 50 * s}" y2="${y + 25 * s}" stroke="#8a6844" stroke-width="${2 * s}"/>`;
  },

  fruitpile(p) {
    const n = p.n ?? 6;
    const spots = [
      [-18, 0], [-6, 0], [6, 0], [18, 0], [-12, -9], [0, -9], [12, -9], [-6, -18], [6, -18], [0, -27],
    ];
    let out = '';
    for (let i = 0; i < Math.min(n, spots.length); i += 1) {
      out += `<circle cx="${p.x + spots[i][0]}" cy="${p.y + spots[i][1]}" r="7.5" fill="${p.color}"/><circle cx="${p.x + spots[i][0] - 2}" cy="${p.y + spots[i][1] - 2}" r="2.4" fill="#ffffff" opacity="0.45"/>`;
    }
    return out;
  },

  lantern(p) {
    const s = p.s ?? 1;
    const glow = p.glow ? `<circle cx="${p.x}" cy="${p.y}" r="${20 * s}" fill="${p.color}" opacity="0.28"/>` : '';
    return `${glow}<line x1="${p.x}" y1="${p.y - 26 * s}" x2="${p.x}" y2="${p.y - 12 * s}" stroke="#33414f" stroke-width="${2 * s}"/>
      <ellipse cx="${p.x}" cy="${p.y}" rx="${11 * s}" ry="${13 * s}" fill="${p.color}"/>
      <path d="M ${p.x - 11 * s} ${p.y} Q ${p.x} ${p.y + 4 * s} ${p.x + 11 * s} ${p.y}" fill="none" stroke="#00000033" stroke-width="${1.6 * s}"/>
      <rect x="${p.x - 5 * s}" y="${p.y - 15 * s}" width="${10 * s}" height="${4 * s}" fill="#33414f"/>
      <rect x="${p.x - 5 * s}" y="${p.y + 12 * s}" width="${10 * s}" height="${4 * s}" fill="#33414f"/>`;
  },

  cat(p) {
    const s = p.s ?? 1;
    const { x, y } = p; // y = base (sitting)
    return `<path d="M ${x + 12 * s} ${y} Q ${x + 26 * s} ${y - 4 * s} ${x + 22 * s} ${y - 18 * s}" fill="none" stroke="${p.color}" stroke-width="${5 * s}" stroke-linecap="round"/>
      <ellipse cx="${x}" cy="${y - 13 * s}" rx="${13 * s}" ry="${15 * s}" fill="${p.color}"/>
      <circle cx="${x}" cy="${y - 32 * s}" r="${10 * s}" fill="${p.color}"/>
      <polygon points="${x - 9 * s},${y - 38 * s} ${x - 5 * s},${y - 47 * s} ${x - 1 * s},${y - 39 * s}" fill="${p.color}"/>
      <polygon points="${x + 9 * s},${y - 38 * s} ${x + 5 * s},${y - 47 * s} ${x + 1 * s},${y - 39 * s}" fill="${p.color}"/>
      <circle cx="${x - 3.6 * s}" cy="${y - 33 * s}" r="${1.5 * s}" fill="#1d2b3a"/>
      <circle cx="${x + 3.6 * s}" cy="${y - 33 * s}" r="${1.5 * s}" fill="#1d2b3a"/>
      <ellipse cx="${x - 8 * s}" cy="${y - 1 * s}" rx="${5 * s}" ry="${2.6 * s}" fill="${p.color}"/>
      <ellipse cx="${x + 8 * s}" cy="${y - 1 * s}" rx="${5 * s}" ry="${2.6 * s}" fill="${p.color}"/>`;
  },

  bicycle(p) {
    const s = p.s ?? 1;
    const { x, y } = p; // y = ground
    const wy = y - 16 * s;
    return `<circle cx="${x - 26 * s}" cy="${wy}" r="${16 * s}" fill="none" stroke="#33414f" stroke-width="${2.6 * s}"/>
      <circle cx="${x + 26 * s}" cy="${wy}" r="${16 * s}" fill="none" stroke="#33414f" stroke-width="${2.6 * s}"/>
      <path d="M ${x - 26 * s} ${wy} L ${x - 4 * s} ${wy - 20 * s} L ${x + 20 * s} ${wy - 18 * s} L ${x + 26 * s} ${wy} M ${x - 4 * s} ${wy - 20 * s} L ${x + 2 * s} ${wy} L ${x + 20 * s} ${wy - 18 * s}" fill="none" stroke="${p.color}" stroke-width="${3 * s}" stroke-linejoin="round"/>
      <line x1="${x - 10 * s}" y1="${wy - 24 * s}" x2="${x + 2 * s}" y2="${wy - 24 * s}" stroke="#33414f" stroke-width="${3.4 * s}" stroke-linecap="round"/>
      <path d="M ${x + 20 * s} ${wy - 18 * s} L ${x + 24 * s} ${wy - 26 * s} M ${x + 18 * s} ${wy - 27 * s} L ${x + 30 * s} ${wy - 25 * s}" fill="none" stroke="#33414f" stroke-width="${2.8 * s}" stroke-linecap="round"/>
      <circle cx="${x + 2 * s}" cy="${wy}" r="${3 * s}" fill="#33414f"/>`;
  },

  plant(p) {
    const s = p.s ?? 1;
    const { x, y } = p;
    return `<path d="M ${x} ${y - 16 * s} Q ${x - 14 * s} ${y - 30 * s} ${x - 16 * s} ${y - 40 * s} Q ${x - 4 * s} ${y - 38 * s} ${x} ${y - 26 * s} Q ${x + 4 * s} ${y - 38 * s} ${x + 16 * s} ${y - 40 * s} Q ${x + 14 * s} ${y - 30 * s} ${x} ${y - 16 * s} Z" fill="${p.leaf}"/>
      <path d="M ${x - 12 * s} ${y - 16 * s} L ${x + 12 * s} ${y - 16 * s} L ${x + 9 * s} ${y} L ${x - 9 * s} ${y} Z" fill="${p.pot}"/>
      <rect x="${x - 13 * s}" y="${y - 19 * s}" width="${26 * s}" height="${5 * s}" rx="${2 * s}" fill="${p.pot}"/>`;
  },

  signpost(p) {
    const dir = p.dir ?? 1;
    return `<rect x="${p.x - 3}" y="${p.y - 58}" width="6" height="58" fill="#6b4a2f"/>
      <polygon points="${p.x},${p.y - 58} ${p.x + 40 * dir},${p.y - 58} ${p.x + 50 * dir},${p.y - 49} ${p.x + 40 * dir},${p.y - 40} ${p.x},${p.y - 40}" fill="${p.color}"/>
      <circle cx="${p.x}" cy="${p.y - 49}" r="2.6" fill="#33414f"/>`;
  },

  wirebirds(p) {
    let birds = '';
    (p.birds ?? []).forEach((b) => {
      birds += `<g transform="translate(${b.x} ${b.y})"><ellipse cx="0" cy="0" rx="6" ry="4.6" fill="#33414f"/><circle cx="5" cy="-3.4" r="3" fill="#33414f"/><polygon points="7.6,-3.4 11,-2.6 7.6,-1.8" fill="#ffb84d"/><polygon points="-5,0 -11,-3 -10,2" fill="#33414f"/></g>`;
    });
    return `<path d="M 0 ${p.y} Q 300 ${p.y + 26} 600 ${p.y - 6}" fill="none" stroke="#33414f" stroke-width="2" opacity="0.65"/>${birds}`;
  },

  moon(p) {
    const craters = [
      [-0.35, -0.2, 0.16], [0.25, 0.3, 0.2], [0.4, -0.35, 0.12], [-0.1, 0.45, 0.1],
    ].slice(0, p.craters ?? 3).map(([fx, fy, fr]) => `<circle cx="${p.x + fx * p.r}" cy="${p.y + fy * p.r}" r="${fr * p.r}" fill="#d9d3b8"/>`).join('');
    return `<circle cx="${p.x}" cy="${p.y}" r="${p.r * 1.5}" fill="#fdf6d8" opacity="0.14"/><circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="#fdf6d8"/>${craters}`;
  },

  star(p) {
    const s = p.s ?? 1;
    return `<path d="M ${p.x} ${p.y - 7 * s} L ${p.x + 1.8 * s} ${p.y - 1.8 * s} L ${p.x + 7 * s} ${p.y} L ${p.x + 1.8 * s} ${p.y + 1.8 * s} L ${p.x} ${p.y + 7 * s} L ${p.x - 1.8 * s} ${p.y + 1.8 * s} L ${p.x - 7 * s} ${p.y} L ${p.x - 1.8 * s} ${p.y - 1.8 * s} Z" fill="${p.color}"/>`;
  },

  tree(p) {
    const s = p.s ?? 1;
    const { x, y } = p;
    return `${shadow(x, y + 3, 44 * s, 6 * s, 0.22)}
      <path d="M ${x - 7 * s} ${y} L ${x - 4 * s} ${y - 58 * s} L ${x + 4 * s} ${y - 58 * s} L ${x + 7 * s} ${y} Z" fill="${p.trunk}"/>
      <path d="M ${x} ${y - 46 * s} Q ${x + 26 * s} ${y - 56 * s} ${x + 38 * s} ${y - 50 * s}" fill="none" stroke="${p.trunk}" stroke-width="${6 * s}" stroke-linecap="round"/>
      <circle cx="${x}" cy="${y - 82 * s}" r="${34 * s}" fill="${p.leaf}"/>
      <circle cx="${x - 28 * s}" cy="${y - 64 * s}" r="${24 * s}" fill="${p.leaf}"/>
      <circle cx="${x + 28 * s}" cy="${y - 66 * s}" r="${25 * s}" fill="${p.leaf}"/>
      <circle cx="${x - 8 * s}" cy="${y - 94 * s}" r="${12 * s}" fill="#ffffff" opacity="0.1"/>`;
  },

  owl(p) {
    const s = p.s ?? 1;
    const { x, y } = p; // y = branch line (feet)
    const eye = (cx, open) => (open
      ? `<circle cx="${cx}" cy="${y - 34 * s}" r="${4.6 * s}" fill="#ffffff"/><circle cx="${cx}" cy="${y - 34 * s}" r="${2.4 * s}" fill="#1d2b3a"/>`
      : `<path d="M ${cx - 4.4 * s} ${y - 34 * s} Q ${cx} ${y - 31 * s} ${cx + 4.4 * s} ${y - 34 * s}" fill="none" stroke="#1d2b3a" stroke-width="${1.8 * s}" stroke-linecap="round"/>`);
    return `<ellipse cx="${x}" cy="${y - 16 * s}" rx="${14 * s}" ry="${17 * s}" fill="${p.color}"/>
      <ellipse cx="${x}" cy="${y - 12 * s}" rx="${8.6 * s}" ry="${11 * s}" fill="#f4ead2"/>
      <polygon points="${x - 12 * s},${y - 40 * s} ${x - 8 * s},${y - 50 * s} ${x - 4 * s},${y - 41 * s}" fill="${p.color}"/>
      <polygon points="${x + 12 * s},${y - 40 * s} ${x + 8 * s},${y - 50 * s} ${x + 4 * s},${y - 41 * s}" fill="${p.color}"/>
      ${eye(x - 5.4 * s, p.eyeL !== false)}${eye(x + 5.4 * s, p.eyeR !== false)}
      <polygon points="${x - 2.4 * s},${y - 29 * s} ${x + 2.4 * s},${y - 29 * s} ${x},${y - 25.4 * s}" fill="#ffb84d"/>
      <line x1="${x - 5 * s}" y1="${y - 1 * s}" x2="${x - 5 * s}" y2="${y + 3 * s}" stroke="#ffb84d" stroke-width="${2 * s}"/>
      <line x1="${x + 5 * s}" y1="${y - 1 * s}" x2="${x + 5 * s}" y2="${y + 3 * s}" stroke="#ffb84d" stroke-width="${2 * s}"/>`;
  },

  fence(p) {
    const planks = p.planks ?? 9;
    const skip = p.skip ?? -1;
    let out = `<line x1="${p.x}" y1="${p.y - 22}" x2="${p.x + p.w}" y2="${p.y - 22}" stroke="${p.color}" stroke-width="5"/><line x1="${p.x}" y1="${p.y - 8}" x2="${p.x + p.w}" y2="${p.y - 8}" stroke="${p.color}" stroke-width="5"/>`;
    for (let i = 0; i < planks; i += 1) {
      if (i === skip) continue;
      const x = p.x + (p.w / (planks - 1)) * i;
      out += `<polygon points="${x - 5},${p.y} ${x - 5},${p.y - 34} ${x},${p.y - 40} ${x + 5},${p.y - 34} ${x + 5},${p.y}" fill="${p.color}"/>`;
    }
    return out;
  },

  mushroom(p) {
    const s = p.s ?? 1;
    const spots = [[-0.4, -0.45], [0.15, -0.6], [0.45, -0.3], [-0.05, -0.25], [0.3, -0.75]]
      .slice(0, p.spots ?? 3)
      .map(([fx, fy]) => `<circle cx="${p.x + fx * 20 * s}" cy="${p.y - 16 * s + fy * 10 * s}" r="${2.6 * s}" fill="#ffffff" opacity="0.85"/>`).join('');
    return `<path d="M ${p.x - 5 * s} ${p.y} L ${p.x - 4 * s} ${p.y - 14 * s} L ${p.x + 4 * s} ${p.y - 14 * s} L ${p.x + 5 * s} ${p.y} Z" fill="#f4ead2"/>
      <path d="M ${p.x - 17 * s} ${p.y - 13 * s} Q ${p.x} ${p.y - 32 * s} ${p.x + 17 * s} ${p.y - 13 * s} Q ${p.x} ${p.y - 8 * s} ${p.x - 17 * s} ${p.y - 13 * s} Z" fill="${p.cap}"/>${spots}`;
  },

  firefly(p) {
    return `<circle cx="${p.x}" cy="${p.y}" r="7" fill="#ffe98a" opacity="0.35"/><circle cx="${p.x}" cy="${p.y}" r="2.8" fill="#fff3b0"/>`;
  },

  pond(p) {
    const rings = Array.from({ length: p.rings ?? 2 }, (_, i) => `<ellipse cx="${p.x - 18}" cy="${p.y}" rx="${16 + i * 13}" ry="${5 + i * 4}" fill="none" stroke="#cfe8ff" stroke-width="1.8" opacity="0.55"/>`).join('');
    return `<ellipse cx="${p.x}" cy="${p.y}" rx="${p.rx}" ry="${p.ry}" fill="${p.color}"/><ellipse cx="${p.x - p.rx * 0.25}" cy="${p.y - p.ry * 0.3}" rx="${p.rx * 0.4}" ry="${p.ry * 0.32}" fill="#ffffff" opacity="0.13"/>${rings}`;
  },

  frog(p) {
    const s = p.s ?? 1;
    const { x, y } = p;
    return `<ellipse cx="${x}" cy="${y}" rx="${13 * s}" ry="${9 * s}" fill="${p.color}"/>
      <circle cx="${x - 7 * s}" cy="${y - 8 * s}" r="${4.6 * s}" fill="${p.color}"/><circle cx="${x + 7 * s}" cy="${y - 8 * s}" r="${4.6 * s}" fill="${p.color}"/>
      <circle cx="${x - 7 * s}" cy="${y - 9 * s}" r="${2.2 * s}" fill="#ffffff"/><circle cx="${x + 7 * s}" cy="${y - 9 * s}" r="${2.2 * s}" fill="#ffffff"/>
      <circle cx="${x - 7 * s}" cy="${y - 9 * s}" r="${1.1 * s}" fill="#1d2b3a"/><circle cx="${x + 7 * s}" cy="${y - 9 * s}" r="${1.1 * s}" fill="#1d2b3a"/>
      <path d="M ${x - 6 * s} ${y + 1 * s} Q ${x} ${y + 5 * s} ${x + 6 * s} ${y + 1 * s}" fill="none" stroke="#1d2b3a" stroke-width="${1.5 * s}" stroke-linecap="round"/>`;
  },

  flower(p) {
    const s = p.s ?? 1;
    const petals = Array.from({ length: 5 }, (_, i) => {
      const a = (i / 5) * TAU - Math.PI / 2;
      return `<circle cx="${(p.x + Math.cos(a) * 6.4 * s).toFixed(1)}" cy="${(p.y - 16 * s + Math.sin(a) * 6.4 * s).toFixed(1)}" r="${4.6 * s}" fill="${p.petal}"/>`;
    }).join('');
    return `<line x1="${p.x}" y1="${p.y}" x2="${p.x}" y2="${p.y - 13 * s}" stroke="#4d7c4d" stroke-width="${2.2 * s}"/>
      <path d="M ${p.x} ${p.y - 6 * s} Q ${p.x - 8 * s} ${p.y - 8 * s} ${p.x - 9 * s} ${p.y - 3 * s} Q ${p.x - 3 * s} ${p.y - 2 * s} ${p.x} ${p.y - 6 * s} Z" fill="#4d7c4d"/>${petals}
      <circle cx="${p.x}" cy="${p.y - 16 * s}" r="${3.4 * s}" fill="${p.center}"/>`;
  },

  statue(p) {
    const s = p.s ?? 1;
    const { x, y } = p;
    return `${shadow(x, y + 2, 26 * s, 5 * s, 0.25)}
      <rect x="${x - 20 * s}" y="${y - 8 * s}" width="${40 * s}" height="${8 * s}" fill="#8d99a6"/>
      <path d="M ${x - 11 * s} ${y - 8 * s} L ${x - 8 * s} ${y - 34 * s} L ${x + 8 * s} ${y - 34 * s} L ${x + 11 * s} ${y - 8 * s} Z" fill="#a7b3bf"/>
      <circle cx="${x}" cy="${y - 42 * s}" r="${8.6 * s}" fill="#a7b3bf"/>
      <polygon points="${x - 9 * s},${y - 48 * s} ${x},${y - 64 * s} ${x + 9 * s},${y - 48 * s}" fill="${p.hat}"/>
      <circle cx="${x - 3 * s}" cy="${y - 43 * s}" r="${1.3 * s}" fill="#33414f"/><circle cx="${x + 3 * s}" cy="${y - 43 * s}" r="${1.3 * s}" fill="#33414f"/>
      <path d="M ${x - 3.4 * s} ${y - 37 * s} Q ${x} ${y - 34.6 * s} ${x + 3.4 * s} ${y - 37 * s}" fill="none" stroke="#33414f" stroke-width="${1.4 * s}" stroke-linecap="round"/>`;
  },

  wateringcan(p) {
    const s = p.s ?? 1;
    const { x, y } = p;
    return `<path d="M ${x - 13 * s} ${y} L ${x - 11 * s} ${y - 18 * s} L ${x + 11 * s} ${y - 18 * s} L ${x + 13 * s} ${y} Z" fill="${p.color}"/>
      <path d="M ${x + 11 * s} ${y - 14 * s} L ${x + 24 * s} ${y - 22 * s} L ${x + 27 * s} ${y - 18 * s} L ${x + 13 * s} ${y - 8 * s} Z" fill="${p.color}"/>
      <path d="M ${x - 11 * s} ${y - 16 * s} Q ${x - 20 * s} ${y - 10 * s} ${x - 12 * s} ${y - 4 * s}" fill="none" stroke="${p.color}" stroke-width="${3 * s}"/>
      <ellipse cx="${x}" cy="${y - 18 * s}" rx="${11 * s}" ry="${2.6 * s}" fill="#00000022"/>`;
  },

  bush(p) {
    const s = p.s ?? 1;
    return `<circle cx="${p.x}" cy="${p.y}" r="${16 * s}" fill="${p.color}"/><circle cx="${p.x - 15 * s}" cy="${p.y + 4 * s}" r="${12 * s}" fill="${p.color}"/><circle cx="${p.x + 15 * s}" cy="${p.y + 4 * s}" r="${12 * s}" fill="${p.color}"/>`;
  },

  grass(p) {
    const s = p.s ?? 1;
    return `<path d="M ${p.x - 8 * s} ${p.y} Q ${p.x - 7 * s} ${p.y - 11 * s} ${p.x - 10 * s} ${p.y - 15 * s} M ${p.x} ${p.y} Q ${p.x} ${p.y - 13 * s} ${p.x + 2 * s} ${p.y - 17 * s} M ${p.x + 8 * s} ${p.y} Q ${p.x + 8 * s} ${p.y - 10 * s} ${p.x + 11 * s} ${p.y - 14 * s}" fill="none" stroke="${p.color}" stroke-width="${2.2 * s}" stroke-linecap="round"/>`;
  },
};

/** Paint one element; unknown kinds paint nothing. */
export function paintElement(element) {
  const painter = painters[element.kind];
  return painter ? painter(element) : '';
}

/**
 * Build the full SVG markup for one panel of a scene.
 * side is 'left' (original) or 'right' (differences applied).
 */
export function panelSVG(scene, side, uid) {
  const diffByElement = new Map(scene.diffs.map((d) => [d.el, d]));
  const [skyTop, skyBottom] = scene.sky;
  let body = `<defs><linearGradient id="sky-${uid}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBottom}"/></linearGradient></defs>
    <rect x="0" y="0" width="600" height="450" fill="url(#sky-${uid})"/>`;
  for (const element of scene.elements) {
    let painted = element;
    if (side === 'right') {
      const diff = diffByElement.get(element.id);
      if (diff) {
        if (diff.change.hide) continue;
        painted = { ...element, ...diff.change };
      }
    }
    body += paintElement(painted);
  }
  return `<svg viewBox="0 0 600 450" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(scene.name)} ${side} picture">${body}</svg>`;
}

/** SVG markup for a found-difference marker ring at a hit point. */
export function markerRing(hit, found, animate = false) {
  const color = found ? '#2fbf71' : '#ffb020';
  const cls = animate ? ' class="marker-pop"' : '';
  return `<g${cls} style="transform-origin:${hit.x}px ${hit.y}px">
    <circle cx="${hit.x}" cy="${hit.y}" r="${hit.r}" fill="none" stroke="${color}" stroke-width="4.5" stroke-dasharray="9 6" stroke-linecap="round"/>
    <circle cx="${hit.x}" cy="${hit.y}" r="${hit.r - 7}" fill="none" stroke="#ffffff" stroke-width="1.6" opacity="0.75"/></g>`;
}

/** SVG markup for a wrong-click cross. */
export function wrongCross(x, y) {
  return `<g class="wrong-fade" stroke="#ff4d4d" stroke-width="5" stroke-linecap="round">
    <line x1="${x - 11}" y1="${y - 11}" x2="${x + 11}" y2="${y + 11}"/>
    <line x1="${x + 11}" y1="${y - 11}" x2="${x - 11}" y2="${y + 11}"/></g>`;
}

/** SVG markup for a hint pulse on one difference. */
export function hintPulse(hit) {
  return `<g class="hint-pulse" style="transform-origin:${hit.x}px ${hit.y}px">
    <circle cx="${hit.x}" cy="${hit.y}" r="${hit.r + 8}" fill="none" stroke="#ffd94d" stroke-width="5"/>
    <circle cx="${hit.x}" cy="${hit.y}" r="${hit.r + 18}" fill="none" stroke="#ffd94d" stroke-width="2.4" opacity="0.55"/></g>`;
}

/** A few sparkle dots that burst when a difference is found. */
export function sparkles(hit) {
  const dots = [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7], [0, -1], [0, 1]]
    .map(([fx, fy]) => `<circle cx="${hit.x + fx * hit.r}" cy="${hit.y + fy * hit.r}" r="3.4" fill="#ffe98a"/>`)
    .join('');
  return `<g class="sparkle-fade">${dots}</g>`;
}
