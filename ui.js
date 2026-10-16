'use strict';

const $ = id => document.getElementById(id);
const E = s => String(s).replace(/[&<>"]/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;'
}[c]));

const SET = Object.assign({
  speed: 30,
  auto: true,
  dens: 1,
  seed: 7,
  tz: 7,
  mode: 'sim',
  low: false,
  rm: matchMedia('(prefers-reduced-motion:reduce)').matches,
  snd: false,
  vol: .4,
  br: 100,
  sc: 100,
  sug: true
}, (() => {
  try {
    return JSON.parse(localStorage.getItem('ppka.set') || '{}');
  } catch (e) {
    return {};
  }
})());

const save = () => {
  try {
    localStorage.setItem('ppka.set', JSON.stringify(SET));
  } catch (e) {}
};

function apply() {
  G.speed = SET.mode === 'real' ? 1 : SET.speed;
  G.auto = SET.auto;
  G.dens = SET.dens;
  G.seed = SET.seed;
  G.tz = SET.tz;
  G.sug = SET.sug;
  document.documentElement.style.fontSize = SET.sc + '%';
  $('app').style.filter = 'brightness(' + SET.br / 100 + ')';
}

/* AUDIO */
let AC;

function beep(f, d = .12) {
  if (!SET.snd || SET.vol <= 0) return;

  try {
    AC = AC || new AudioContext();

    const o = AC.createOscillator();
    const g = AC.createGain();

    o.frequency.value = f;
    o.type = 'sine';

    g.gain.setValueAtTime(.0001, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(
      .06 * SET.vol + .0002,
      AC.currentTime + .02
    );
    g.gain.exponentialRampToValueAtTime(
      .0001,
      AC.currentTime + d
    );

    o.connect(g).connect(AC.destination);
    o.start();
    o.stop(AC.currentTime + d);
  } catch (e) {}
}

const SND = {
  routeok: 660,
  rej: 220,
  arr: 520,
  dep: 440,
  warn: 330
};

G.onEv = t => {
  if (SND[t]) beep(SND[t]);
};

function toast(m, k = '') {
  const d = document.createElement('div');
  d.className = k;
  d.textContent = m;
  $('toast').prepend(d);

  setTimeout(() => d.remove(), 4200);

  while ($('toast').children.length > 3) {
    $('toast').lastChild.remove();
  }
}

/* KAMERA DAN CANVAS */
const cv = $('cv');
const cx = cv.getContext('2d');

let W = 1;
let H = 1;
let dpr = 1;

const V = {
  x: -40,
  py: 0,
  s: .5
};

const YS = () => Math.min(2.4, Math.max(1.1, V.s * 1.2));
const SX = x => (x - V.x) * V.s;
const SY = y => H * .5 + V.py + y * YS();

/*
 * Ukuran canvas dibuat lebih aman untuk layar HP.
 * Ukuran CSS dan ukuran internal canvas harus disesuaikan.
 */
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);

  const r = cv.getBoundingClientRect();
  const parent = cv.parentElement;

  W = Math.max(
    1,
    Math.round(r.width || parent?.clientWidth || window.innerWidth || 1)
  );

  H = Math.max(
    1,
    Math.round(r.height || parent?.clientHeight || window.innerHeight || 1)
  );

  const pw = Math.max(1, Math.round(W * dpr));
  const ph = Math.max(1, Math.round(H * dpr));

  if (cv.width !== pw) cv.width = pw;
  if (cv.height !== ph) cv.height = ph;

  if (!Number.isFinite(V.s) || V.s <= 0) V.s = .5;
  if (!Number.isFinite(V.x)) V.x = -45;
  if (!Number.isFinite(V.py)) V.py = 0;

  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* Menyesuaikan seluruh jalur ke area diagram. */
function fit() {
  const lastX = Array.isArray(X) && X.length
    ? Number(X[X.length - 1])
    : 0;

  const span = Math.max(
    1,
    lastX + (Number(Wz) || 0) + 90
  );

  V.s = Math.min(2.4, Math.max(.15, W / span));
  V.x = -45;
  V.py = 0;
}

/* Zoom tetap berpusat pada posisi jari atau kursor. */
function zoom(f, cxp = W / 2) {
  if (!Number.isFinite(f) || f <= 0) return;

  const oldS = Math.max(.15, V.s || .5);
  const wxp = cxp / oldS + V.x;

  V.s = Math.min(6, Math.max(.15, oldS * f));
  V.x = wxp - cxp / V.s;
}

const COL = {
  base: '#243752',
  res: '#3fd0e6',
  occ: '#ffb54a',
  fail: '#f0524f',
  G: '#38d27a',
  Y: '#f2b84b',
  R: '#f0524f'
};

function secPos(d, u) {
  return wx(kmOf(d, u));
}

function rowY(t, u) {
  const S = SEC[t.d];

  for (let j = t.k; j >= Math.max(0, t.k - 3); j--) {
    const s = S[j];

    if (u >= s.u0 - 1e-9 && u <= s.u1 + 1e-9) {
      return s.Z
        ? ROW[t.d][t.trk[j] ?? 0]
        : ROW[t.d][0];
    }
  }

  return ROW[t.d][0];
}

function occSet() {
  const o = new Set();

  for (const t of G.trains) {
    for (let j = Math.max(0, t.k - 3); j <= t.k; j++) {
      const q = SEC[t.d][j];

      if (t.u > q.u0 && t.u - t.len < q.u1) {
        o.add(
          t.d + '_' + j + '_' + (q.Z ? (t.trk[j] ?? 0) : 0)
        );
      }
    }
  }

  return o;
}

function line(x1, y1, x2, y2) {
  cx.beginPath();
  cx.moveTo(x1, y1);
  cx.lineTo(x2, y2);
  cx.stroke();
}

/* RENDER DIAGRAM */
function draw(dt) {
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx.clearRect(0, 0, W, H);

  const o = occSet();
  const ys = YS();
  const lw = Math.max(1.6, 2 * ys * .8);
  const low = SET.low;

  /* Garis penanda kilometer */
  cx.strokeStyle = '#0f1c30';
  cx.lineWidth = 1;

  for (let i = 0; i < N; i++) {
    const x = SX(X[i]);

    if (x > -20 && x < W + 20) {
      line(x, 0, x, H);
    }
  }

  /* Jalur utama untuk kedua arah */
  for (let d = 0; d < 2; d++) {
    const S = SEC[d];
    const ym = SY(ROW[d][0]);
    const yl = SY(ROW[d][1]);

    cx.lineCap = 'round';

    /* Rel dan percabangan */
    for (const s of S) {
      const a = SX(secPos(d, Math.min(s.u0, s.u1)));
      const b = SX(secPos(d, s.u1));

      const x0 = Math.min(a, b);
      const x1 = Math.max(a, b);

      if (x1 < -10 || x0 > W + 10) continue;

      const st = trk =>
        s.fail[trk]
          ? COL.fail
          : o.has(d + '_' + s.k + '_' + trk)
            ? COL.occ
            : s.res[trk] != null
              ? COL.res
              : COL.base;

      cx.lineWidth = lw;
      cx.strokeStyle = st(0);

      if (s.fl > 0 && !SET.rm) {
        cx.lineWidth = lw + 3 * s.fl;
        cx.globalAlpha = .4 + .6 * (1 - s.fl);
        s.fl = Math.max(0, s.fl - dt * .8);
      } else {
        s.fl = 0;
      }

      if (s.fail[0]) cx.setLineDash([4, 4]);

      line(x0, ym, x1, ym);

      cx.setLineDash([]);
      cx.globalAlpha = 1;

      if (s.Z) {
        cx.lineWidth = lw;
        cx.strokeStyle = st(1);

        if (s.fail[1]) cx.setLineDash([4, 4]);

        const e = Math.min(8 * V.s, (x1 - x0) * .25);

        cx.beginPath();
        cx.moveTo(x0, ym);
        cx.lineTo(x0 + e, yl);
        cx.lineTo(x1 - e, yl);
        cx.lineTo(x1, ym);
        cx.stroke();

        cx.setLineDash([]);
      }
    }

    /* Sinyal */
    for (const s of S) {
      if (!SEC[d][s.k + 1]) continue;

      const xx = SX(secPos(d, s.u1));

      if (xx < -10 || xx > W + 10) continue;

      const y = ym + (d ? 9 : -9) * ys * .8;
      const a = aspect(s);
      const c = s.sig.fail ? '#5a6677' : COL[a];

      cx.strokeStyle = '#4a5d78';
      cx.lineWidth = 1;

      line(xx, ym, xx, y);

      cx.fillStyle = c;

      if (!low && !s.sig.fail) {
        cx.shadowColor = c;
        cx.shadowBlur = 7;
      }

      cx.beginPath();
      cx.arc(xx, y, Math.max(2.6, 3 * ys * .8), 0, Math.PI * 2);
      cx.fill();

      cx.shadowBlur = 0;

      if (
        G.sel2 &&
        G.sel2.t === 'sig' &&
        G.sel2.d === d &&
        G.sel2.k === s.k
      ) {
        cx.strokeStyle = '#fff';
        cx.beginPath();
        cx.arc(xx, y, 7, 0, Math.PI * 2);
        cx.stroke();
      }
    }

    /* Wesel */
    for (const s of S) {
      if (!s.Z) continue;

      const xx = SX(secPos(d, s.u0));
      const sw = s.sw;

      const c = sw.fail
        ? COL.fail
        : sw.lock
          ? COL.res
          : '#7d92ab';

      cx.fillStyle = c;

      cx.beginPath();

      const r = Math.max(3, 3.4 * ys * .8);

      cx.moveTo(xx, ym - r);
      cx.lineTo(xx + r, ym);
      cx.lineTo(xx, ym + r);
      cx.lineTo(xx - r, ym);
      cx.fill();

      if (sw.pos) {
        cx.strokeStyle = c;
        cx.lineWidth = 1.4;

        line(
          xx,
          ym,
          xx + (d ? -1 : 1) * 7,
          ym + (yl - ym) * .4
        );
      }

      if (
        G.sel2 &&
        G.sel2.t === 'sw' &&
        G.sel2.d === d &&
        G.sel2.k === s.k
      ) {
        cx.strokeStyle = '#fff';
        cx.lineWidth = 1;
        cx.beginPath();
        cx.arc(xx, ym, r + 4, 0, Math.PI * 2);
        cx.stroke();
      }
    }
  }

  /* Stasiun */
  cx.textAlign = 'center';

  for (const s of ST) {
    const x = SX(X[s.i]);

    if (x < -60 || x > W + 60) continue;

    const y0 = SY(ROW[0][1]);
    const y1 = SY(ROW[1][1]);

    cx.fillStyle = '#16263d';
    cx.fillRect(
      x - Wz * .36 * V.s,
      y0 + 3,
      Wz * .72 * V.s,
      y1 - y0 - 6
    );

    cx.strokeStyle = '#2c4467';
    cx.lineWidth = 1;

    cx.strokeRect(
      x - Wz * .36 * V.s,
      y0 + 3,
      Wz * .72 * V.s,
      y1 - y0 - 6
    );

    cx.fillStyle = G.stSel === s.i ? '#3fd0e6' : '#9fb4cc';
    cx.font = (V.s > .9 ? '600 11px' : '600 10px') + ' system-ui';

    cx.fillText(
      V.s > .9 ? s.name : s.code,
      x,
      SY(ROW[0][0]) - 18 * YS() * .8
    );

    cx.fillStyle = '#4c617c';
    cx.font = '9px system-ui';

    if (V.s > .9) {
      cx.fillText(
        s.code + ' · km ' + s.km,
        x,
        SY(ROW[1][0]) + 22 * YS() * .8
      );
    }
  }

  /* Kereta */
  for (const t of G.trains) {
    const xh = SX(secPos(t.d, t.u));
    const xt = SX(secPos(t.d, t.u - t.len));

    if (Math.max(xh, xt) < -30 || Math.min(xh, xt) > W + 30) {
      continue;
    }

    const yh = SY(rowY(t, t.u));

    const yt = SY(
      rowY(
        t,
        Math.max(
          t.u - t.len,
          SEC[t.d][Math.max(0, t.k - 3)].u0
        )
      )
    );

    let x2 = xt;

    if (Math.abs(xh - xt) < 9) {
      x2 = xh - (t.d ? -9 : 9);
    }

    const c = t.fr
      ? '#a89572'
      : t.p >= 4
        ? '#e8f4ff'
        : '#a9bdd2';

    const sel = G.sel && G.sel.id === t.id;

    cx.lineWidth = Math.max(4, 5 * YS() * .8);
    cx.strokeStyle = c;

    if (sel && !low) {
      cx.shadowColor = '#3fd0e6';
      cx.shadowBlur = 10;
    }

    line(x2, yt, xh, yh);

    cx.shadowBlur = 0;

    cx.fillStyle = '#07101d';
    cx.beginPath();
    cx.arc(xh, yh, 1.6, 0, Math.PI * 2);
    cx.fill();

    if (t.delay >= 3) {
      cx.fillStyle = COL.Y;
      cx.beginPath();
      cx.arc(xh + (t.d ? -1 : 1) * -6, yh - 7, 2, 0, Math.PI * 2);
      cx.fill();
    }

    if (V.s > .45 || sel) {
      cx.fillStyle = sel ? '#3fd0e6' : '#c6d6e8';
      cx.font = '10px system-ui';

      cx.fillText(
        (V.s > 1.2 ? t.name + ' ' : '') + t.no,
        (xh + x2) / 2,
        yh + (t.d ? 18 : -12)
      );
    }

    if (sel) {
      cx.strokeStyle = '#3fd0e6';
      cx.lineWidth = 1;

      cx.strokeRect(
        Math.min(xh, x2) - 5,
        yh - 9,
        Math.abs(xh - x2) + 10,
        18
      );
    }
  }
}

/* INPUT PETA: DRAG, TAP, PINCH-ZOOM */
const P = new Map();

let moved = 0;
let pd = false;
let pdist = 0;

cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId);
  P.set(e.pointerId, [e.clientX, e.clientY]);

  moved = 0;
  pd = true;

  if (P.size === 2) {
    const [a, b] = [...P.values()];
    pdist = Math.hypot(a[0] - b[0], a[1] - b[1]);
  }
});

cv.addEventListener('pointermove', e => {
  if (!P.has(e.pointerId)) return;

  const o = P.get(e.pointerId);
  const n = [e.clientX, e.clientY];

  if (P.size === 1) {
    V.x -= (n[0] - o[0]) / V.s;
    V.py += n[1] - o[1];

    moved += Math.abs(n[0] - o[0]) + Math.abs(n[1] - o[1]);

    if (moved > 8) G.follow = false;
  } else if (P.size === 2) {
    P.set(e.pointerId, n);

    const [a, b] = [...P.values()];
    const d = Math.hypot(a[0] - b[0], a[1] - b[1]);

    if (pdist) {
      zoom(
        d / pdist,
        (a[0] + b[0]) / 2 - cv.getBoundingClientRect().left
      );
    }

    pdist = d;
    moved = 99;
  }

  P.set(e.pointerId, n);
});

const up = e => {
  if (P.has(e.pointerId) && P.size === 1 && moved < 8) {
    pick(
      e.clientX - cv.getBoundingClientRect().left,
      e.clientY - cv.getBoundingClientRect().top
    );
  }

  P.delete(e.pointerId);
  pd = false;
  pdist = 0;
};

cv.addEventListener('pointerup', up);
cv.addEventListener('pointercancel', up);

cv.addEventListener('wheel', e => {
  e.preventDefault();
  zoom(e.deltaY < 0 ? 1.15 : .87, e.offsetX);
}, { passive: false });

function pick(px, py) {
  let best = null;
  let bd = 22;

  const ys = YS();

  const c = (t, d, o) => {
    if (d < bd) {
      bd = d;
      best = o;
    }
  };

  for (const t of G.trains) {
    const x = SX(secPos(t.d, t.u));
    const y = SY(rowY(t, t.u));

    c(0, Math.hypot(x - px, y - py) - 4, {
      k: 'tr',
      t
    });
  }

  for (let d = 0; d < 2; d++) {
    for (const s of SEC[d]) {
      const ym = SY(ROW[d][0]);

      if (SEC[d][s.k + 1]) {
        const x = SX(secPos(d, s.u1));
        const y = ym + (d ? 9 : -9) * ys * .8;

        c(0, Math.hypot(x - px, y - py) + 2, {
          k: 'sig',
          d,
          s: s.k
        });
      }

      if (s.Z) {
        const x = SX(secPos(d, s.u0));

        c(0, Math.hypot(x - px, ym - py) + 3, {
          k: 'sw',
          d,
          s: s.k
        });
      }
    }
  }

  for (const s of ST) {
    const x = SX(X[s.i]);

    if (
      Math.abs(px - x) < Wz * .5 * V.s + 10 &&
      py > SY(ROW[0][0]) - 24 &&
      py < SY(ROW[1][0]) + 24
    ) {
      c(0, 15, {
        k: 'st',
        i: s.i
      });
    }
  }

  if (!best) return;

  if (best.k === 'tr') {
    G.sel = best.t;
    tab('ka');
  } else if (best.k === 'sig' || best.k === 'sw') {
    G.sel2 = {
      t: best.k,
      d: best.d,
      k: best.s
    };

    tab('ob');
  } else {
    G.stSel = best.i;
    tab('st');
  }
}

/* PANEL DAN TAB */
const TABS = [
  ['ka', 'Kereta'],
  ['lt', 'Lalu Lintas'],
  ['st', 'Stasiun'],
  ['ob', 'Sinyal/Wesel'],
  ['rt', 'Rute'],
  ['lg', 'Log'],
  ['as', 'Asisten'],
  ['in', 'Insiden'],
  ['sv', 'Setelan'],
  ['ab', 'Tentang']
];

let cur = 'lt';
let pdn = false;

G.stSel = 0;
G.flt = {
  ty: '',
  tr: '',
  st: ''
};

const SH = {};

const TYPES = [
  'route',
  'reject',
  'switch',
  'arrive',
  'depart',
  'delay',
  'incident',
  'hold',
  'cancel',
  'info'
];

const dl = t =>
  t.delay >= 3
    ? '<b class=am>+' + t.delay.toFixed(0) + '′</b>'
    : '<span class=mu>tepat</span>';

const opt = (a, v) =>
  a.map(x =>
    `<option value="${x[0]}"${String(x[0]) === String(v) ? ' selected' : ''}>${E(x[1])}</option>`
  ).join('');

const STOPT = () => ST.map(s => [s.i, s.name]);

const PN = {
  ka: {
    i: () => '',
    u: () => {
      const t = G.trains.find(x => G.sel && x.id === G.sel.id);

      if (!t) {
        return '<p class=mu>Ketuk kereta pada diagram atau pilih dari tab Lalu Lintas.</p>';
      }

      const S = SEC[t.d];
      const c = S[t.k];
      const n = t.ns[0];
      const nxt = n != null ? ST[n] : null;
      const dist = nxt ? Math.abs(nxt.km - kmOf(t.d, t.u)) : 0;
      const sg = S[t.k].sig ? aspect(S[t.k]) : '-';

      const ahead = S
        .filter(s => s.res.includes(t.id) && s.k >= t.k)
        .map(s => s.name + (s.Z ? ' ' + TN[t.trk[s.k]] : ''))
        .join(' → ') || '—';

      return `<h3>KA ${t.no} ${E(t.name)}</h3>
<div class=kv>
<span>Kategori</span><span>${t.cat} · prioritas ${t.p}</span>
<span>Rute</span><span>${ST[t.a].name} → ${ST[t.b].name}</span>
<span>Lokasi</span><span>${c.name}</span>
<span>Stasiun berikut</span><span>${nxt ? nxt.name + ' · ' + dist.toFixed(1) + ' km' : '—'}</span>
<span>Kecepatan</span><span>${(t.v * 3.6).toFixed(0)} km/j (target ${(t.vt * 3.6).toFixed(0)})</span>
<span>Sinyal di depan</span><span class="${aspect(c) === 'G' ? 'gr' : aspect(c) === 'Y' ? 'am' : 'rd'}">${{ G: 'Hijau', Y: 'Kuning', R: 'Merah' }[sg]} (${c.sig.id})</span>
<span>Rute ditetapkan</span><span>${E(ahead)}</span>
<span>Status</span><span>${t.state}${t.why ? ' — <span class=am>' + E(t.why) + '</span>' : ''}</span>
<span>Keterlambatan</span><span>${dl(t)}</span>
<span>ETA ${nxt ? nxt.code : ''}</span><span>${nxt ? fmt(eta(t, n), 0) : '—'}${nxt && t.sch[n] ? ' (jadwal ' + fmt(t.sch[n].a, 0) + ')' : ''}</span>
</div>
<div class=bar>
<button data-a=fol2 class="${G.follow ? 'on' : ''}">Ikuti</button>
<button data-a=hold>Tahan</button>
<button data-a=resume>Lanjut</button>
<button data-a=jad>Jadwal</button>
<button data-a=riw>Riwayat</button>
<button data-a=cancel class=dg>Batalkan</button>
</div>
${SH.jad ? '<h3>Jadwal (ilustratif)</h3>' + Object.keys(t.sch).map(j => `<div class=lg>${ST[j].code} tiba ${fmt(t.sch[j].a, 0)} · berangkat ${fmt(t.sch[j].d, 0)}</div>`).join('') : ''}
${SH.riw ? '<h3>Riwayat KA</h3>' + G.log.filter(l => l.tr === String(t.no)).slice(-12).reverse().map(lgl).join('') : ''}`;
    }
  },

  lt: {
    i: () => '',
    u: () =>
      '<h3>Lalu lintas (' + G.trains.length + ')</h3>' +
      G.trains.slice()
        .sort((a, b) => b.delay - a.delay || a.no - b.no)
        .map(t => `<button class=row data-a=sel data-x=${t.id}>
<span><b>${t.no}</b> ${E(t.name)} <small>→ ${ST[t.b].code}</small></span>
<span><small>${t.state}</small> ${dl(t)}</span>
</button>`)
        .join('')
  },

  st: {
    i: () => `<select id=ss data-s=stSel>${opt(STOPT(), G.stSel)}</select><div id=dyn></div>`,
    u: () => {
      const s = ST[G.stSel];
      let h = `<h3>${s.name} <small class=mu>${s.code}</small></h3>
<div class=kv><span>Peron/jalur</span><span>${s.plat} (simulasi)</span><span>Data</span><span class=mu>${s.src}</span></div>`;

      for (let d = 0; d < 2; d++) {
        const z = SEC[d].find(q => q.Z && q.i === s.i);

        h += `<h3>Arah ${d ? 'Barat' : 'Timur'}</h3>` +
          [0, 1].map(w => {
            const id = z.res[w];
            const t = id && G.trains.find(x => x.id === id);

            return `<div class=lg>${TN[w]}: ${
              z.fail[w]
                ? '<b class=rd>gangguan</b>'
                : t
                  ? 'KA ' + t.no + ' (' + (t.dw && t.k === z.k ? 'di peron' : 'dipesan') + ')'
                  : '<span class=gr>kosong</span>'
            }</div>`;
          }).join('') +
          `<div class=bar>
<button data-a=rt data-x="${d},${s.i},0">Sepur 2 lurus</button>
<button data-a=rt data-x="${d},${s.i},1">Sepur 1 belok</button>
<button data-a=rt data-x="${d},${s.i},-1">Otomatis</button>
</div>`;
      }

      const inc = G.trains
        .filter(t => t.ns.includes(s.i))
        .map(t => ({ t, e: eta(t, s.i) }))
        .sort((a, b) => a.e - b.e)
        .slice(0, 8);

      h += '<h3>Kedatangan</h3>' +
        (
          inc.map(x =>
            `<div class=lg>${fmt(x.e, 0)} KA ${x.t.no} ${E(x.t.name)} ${dl(x.t)}${x.t.sch[s.i] ? ' <span class=mu>jadwal ' + fmt(x.t.sch[s.i].a, 0) + '</span>' : ''}</div>`
          ).join('') || '<p class=mu>Tidak ada.</p>'
        );

      h += '<h3>Pesan stasiun</h3>' +
        (
          G.log.filter(l => l.st === s.code).slice(-5).reverse().map(lgl).join('') ||
          '<p class=mu>—</p>'
        );

      return h;
    }
  },

  ob: {
    i: () => '',
    u: () => {
      const q = G.sel2;

      if (!q) {
        return '<p class=mu>Ketuk sinyal (titik berwarna) atau wesel (belah ketupat) pada diagram.</p>';
      }

      const s = SEC[q.d][q.k];

      if (q.t === 'sig') {
        const a = aspect(s);
        const nx = SEC[q.d][q.k + 1];

        return `<h3>Sinyal ${s.sig.id}</h3>
<div class=kv>
<span>Lokasi</span><span>ujung ${s.name}</span>
<span>Arah</span><span>${q.d ? 'Barat' : 'Timur'}</span>
<span>Aspek</span><span class="${a === 'G' ? 'gr' : a === 'Y' ? 'am' : 'rd'}">${{ G: 'Hijau — jalan', Y: 'Kuning — hati-hati', R: 'Merah — berhenti' }[a]}</span>
<span>Petak berikut</span><span>${nx ? nx.name : '—'}</span>
<span>Status rute</span><span>${nx && nx.res.some(r => r) ? 'dipesan' : 'tidak ada rute'}</span>
<span>Ketersediaan</span><span>${s.sig.fail ? '<b class=rd>rusak</b>' : 'normal'}</span>
</div>
<p class=mu>Aspek dihitung otomatis dari reservasi petak berikutnya & petak sesudahnya. Tidak dapat dipaksa hijau secara manual.</p>`;
      }

      const w = s.sw;
      const t = w.lock && G.trains.find(x => x.id === w.lock);

      return `<h3>Wesel ${w.id}</h3>
<div class=kv>
<span>Posisi</span><span>${w.pos ? 'Reverse (belok → Sepur 1)' : 'Normal (lurus → Sepur 2)'}</span>
<span>Terkunci</span><span>${t ? 'ya, KA ' + t.no : 'tidak'}</span>
<span>Ketersediaan</span><span>${w.fail ? '<b class=rd>rusak</b>' : 'normal'}</span>
<span>Operasi terakhir</span><span>${E(w.last)}</span>
</div>
<div class=bar>
<button data-a=sw data-x=0>Normal</button>
<button data-a=sw data-x=1>Reverse</button>
</div>`;
    }
  },

  rt: {
    i: () => '',
    u: () => {
      const act = G.trains.filter(t =>
        SEC[t.d].some(s => s.k > t.k && s.res.includes(t.id))
      );

      const w = G.trains.filter(t => t.why && t.v < .3);

      return '<h3>Rute aktif (' + act.length + ')</h3>' +
        (
          act.map(t =>
            `<div class=lg><b>KA ${t.no}</b> ${
              SEC[t.d]
                .filter(s => s.k > t.k && s.res.includes(t.id))
                .map(s => s.name + (s.Z ? ' ' + TN[t.trk[s.k]] : ''))
                .join(' → ')
            }</div>`
          ).join('') || '<p class=mu>—</p>'
        ) +
        '<h3>Permintaan tertahan (' + w.length + ')</h3>' +
        (
          w.map(t => `<div class=lg><b>KA ${t.no}</b> <span class=am>${E(t.why)}</span></div>`).join('') ||
          '<p class=mu>Tidak ada konflik.</p>'
        );
    }
  },

  lg: {
    i: () => `<div class=bar>
<select id=ft data-s=ty><option value="">Semua jenis</option>${TYPES.map(x => `<option>${x}</option>`).join('')}</select>
<input id=fk type=text placeholder="No. KA" size=7 data-s=tr>
<select data-s=st><option value="">Semua stasiun</option>${ST.map(s => `<option>${s.code}</option>`).join('')}</select>
</div>
<div class=bar><button data-a=exj>Ekspor JSON</button><button data-a=exc>Ekspor CSV</button></div>
<div id=dyn></div>`,
    u: () =>
      fl().slice(-80).reverse().map(lgl).join('') ||
      '<p class=mu>Belum ada peristiwa.</p>'
  },

  as: {
    i: () => '',
    u: () =>
      '<h3>Asisten PPKA</h3><p class=mu>Saran saja — mesin interlocking tetap otoritatif dan tidak dapat dilewati.</p>' +
      (
        G.msgs.map(m =>
          `<div class="msg ${m.lvl}">${E(m.txt)}<small>${fmt(m.t, 0)} · ${E(m.why)}</small></div>`
        ).join('') || '<p class=mu>Belum ada saran.</p>'
      )
  },

  in: {
    i: () => `<h3>Buat gangguan</h3>
<div class=bar>
<select id=it>
<option value=blok>Petak tertutup</option>
<option value=wesel>Wesel rusak</option>
<option value=sinyal>Sinyal tidak berfungsi</option>
<option value=lambat>Pembatasan kecepatan</option>
<option value=peron>Sepur 1 tidak tersedia</option>
</select>
<select id=is>${opt(STOPT(), G.stSel)}</select>
<select id=id><option value=0>Arah Timur</option><option value=1>Arah Barat</option></select>
<button data-a=inc>Aktifkan</button>
</div>
<div id=dyn></div>`,
    u: () =>
      '<h3>Gangguan aktif</h3>' +
      (
        G.inc.map(r =>
          `<div class=lg><b>#${r.id}</b> ${r.type} · ${E(r.ref)} <button data-a=rinc data-x=${r.id}>Selesaikan</button></div>`
        ).join('') ||
        '<p class=mu>Tidak ada. Gangguan otomatis selesai dalam 30 menit simulasi.</p>'
      ) +
      '<h3>KA terdampak</h3>' +
      (
        G.trains.filter(t => t.why && t.v < .3)
          .map(t => `<div class=lg>KA ${t.no}: ${E(t.why)}</div>`)
          .join('') || '<p class=mu>—</p>'
      )
  },

  sv: {
    i: () => {
      const L = (k, l, c) => `<label class=f>${l}${c}</label>`;

      const ck = k =>
        `<input type=checkbox data-s=${k}${SET[k] ? ' checked' : ''}>`;

      const rg = (k, a, b, st) =>
        `<input type=range min=${a} max=${b} step=${st} value=${SET[k]} data-s=${k}>`;

      return '<h3>Simulasi</h3>' +
        L('mode', 'Mode jam',
          `<select data-s=mode>${opt([
            ['sim', 'Simulasi (kecepatan)'],
            ['real', 'Real-time 1×']
          ], SET.mode)}</select>`) +
        L('tz', 'Zona waktu',
          `<select data-s=tz>${opt([
            [7, 'WIB'],
            [8, 'WITA'],
            [9, 'WIT']
          ], SET.tz)}</select>`) +
        L('dens', 'Kepadatan lalu lintas ×' + SET.dens, rg('dens', .5, 2, .1)) +
        L('seed', 'Seed',
          `<input type=number data-s=seed value=${SET.seed} style="width:90px">`) +
        L('auto', 'Penetapan rute otomatis', ck('auto')) +
        L('sug', 'Saran asisten', ck('sug')) +
        `<div class=bar><button data-a=reset>Reset & ulang skenario</button></div>
<h3>Skenario</h3>
<div class=bar>
<button data-a=sc data-x=1>Normal</button>
<button data-a=sc data-x=2>Jam sibuk</button>
<button data-a=sc data-x=3>Sepi</button>
<button data-a=sc data-x=4>Wesel rusak</button>
<button data-a=ssave>Simpan</button>
<button data-a=sload>Muat</button>
</div>
<h3>Tampilan & suara</h3>` +
        L('low', 'Mode performa rendah', ck('low')) +
        L('rm', 'Kurangi gerakan', ck('rm')) +
        L('snd', 'Suara', ck('snd')) +
        L('vol', 'Volume', rg('vol', 0, 1, .05)) +
        L('br', 'Kecerahan', rg('br', 60, 110, 5)) +
        L('sc', 'Skala antarmuka', rg('sc', 85, 125, 5)) +
        '<p class=mu>Pengaturan tersimpan otomatis di perangkat ini.</p>';
    },
    u: () => ''
  },

  ab: {
    i: () => `<h3>PPKA Indonesia — RailwayOp</h3>
<p>Simulator pengaturan perjalanan KA <b>edukasi & fiksi</b> — bukan produk persinyalan, tidak tersertifikasi, tidak terhubung ke peralatan nyata, dan tidak menampilkan posisi KA sebenarnya.</p>
<p class=mu>Nama stasiun & nama layanan (Argo Bromo Anggrek, Argo Muria, Sembrani, Gumarang, Kertajaya, dst.) merujuk dunia nyata. Kilometer, jumlah jalur, nomor KA, jadwal, dan konfigurasi sinyal/wesel adalah <b>simulasi</b>. Detail aturan: README.md.</p>`,
    u: () => ''
  }
};

/* LOG */
function fl() {
  const f = G.flt;

  return G.log.filter(l =>
    (!f.ty || l.type === f.ty) &&
    (!f.tr || l.tr === f.tr) &&
    (!f.st || l.st === f.st)
  );
}

function lgl(l) {
  return `<div class=lg><b>${fmt(l.t)}</b> <span class=${l.type}>[${l.type}]</span> ${E(l.msg)}</div>`;
}

function tab(k) {
  cur = k;

  $('tabs').innerHTML = TABS.map(t =>
    `<button data-a=tab data-x=${t[0]} class="${t[0] === k ? 'on' : ''}">${t[1]}</button>`
  ).join('');

  $('pv').innerHTML =
    PN[k].i() +
    (PN[k].i().includes('id=dyn') ? '' : '<div id=dyn></div>');

  panel(1);

  $('tabs').querySelector('.on')?.scrollIntoView({
    inline: 'center',
    block: 'nearest'
  });
}

function panel(f) {
  if (pdn && !f) return;

  const d = $('dyn');

  if (d) d.innerHTML = PN[cur].u();
}

/* JAM, STATUS DAN KONTROL */
const top = () => {
  const w = new Date();
  const p = n => String(n).padStart(2, '0');

  const tzn = {
    7: 'WIB',
    8: 'WITA',
    9: 'WIT'
  }[G.tz];

  const sd = new Date((G.t + G.tz * 3600) * 1000);

  const wd = new Date(
    w.getTime() +
    (G.tz * 3600 + w.getTimezoneOffset() * 60) * 1000
  );

  const occ = occSet().size;

  const wc =
    G.trains.filter(t => t.why && t.v < .3).length +
    G.inc.length;

  $('clk').innerHTML =
    `<b>${fmt(G.t)} ${tzn}</b><br>
<span>${DAYS[sd.getUTCDay()]}, ${sd.getUTCDate()}/${sd.getUTCMonth() + 1}/${sd.getUTCFullYear()} · jam nyata ${p(wd.getHours())}:${p(wd.getMinutes())}:${p(wd.getSeconds())}</span>`;

  $('stat').innerHTML =
    `<div><b>${G.trains.length}</b>KA</div>
<div><b>${occ}</b>blok isi</div>
<div class=w><b>${wc}</b>peringatan</div>
<div><b>${G.pref ? Object.keys(G.pref).length : 0}</b>pending</div>`;

  $('ctl').innerHTML =
    `<button data-a=pause class="${G.paused ? 'on' : ''}">${G.paused ? '▶' : '⏸'}</button>` +
    [1, 2, 5, 10, 30, 60].map(s =>
      `<button data-a=spd data-x=${s} class="${G.speed === s ? 'on' : ''}">${s}×</button>`
    ).join('') +
    `<button data-a=reset aria-label=Reset>↺</button>`;
};

let tl = 0;

document.addEventListener('pointerdown', e => {
  if (e.target.closest('#pv')) pdn = true;
});

document.addEventListener('pointerup', () => {
  setTimeout(() => pdn = false, 350);
});

/* SIMPANAN LOKAL */
function idb(m, fn) {
  return new Promise((res, rej) => {
    const r = indexedDB.open('ppka', 1);

    r.onupgradeneeded = () => {
      r.result.createObjectStore('scn');
    };

    r.onsuccess = () => {
      const s = r.result.transaction('scn', m).objectStore('scn');
      const q = fn(s);

      q.onsuccess = () => res(q.result);
      q.onerror = rej;
    };

    r.onerror = rej;
  });
}

function dlf(n, t, m) {
  const a = document.createElement('a');

  a.href = URL.createObjectURL(new Blob([t], { type: m }));
  a.download = n;
  a.click();

  setTimeout(() => URL.revokeObjectURL(a.href), 999);
}

/* TOMBOL DAN AKSI */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-a]');

  if (!b) return;

  const a = b.dataset.a;
  const x = b.dataset.x;

  const t = G.trains.find(q => G.sel && q.id === G.sel.id);

  if (a === 'tab') {
    tab(x);
  } else if (a === 'pause') {
    G.paused = !G.paused;
  } else if (a === 'spd') {
    SET.speed = +x;
    SET.mode = 'sim';
    apply();
    save();
  } else if (a === 'reset') {
    reset();
    toast('Skenario direset');
  } else if (a === 'zi') {
    zoom(1.4);
  } else if (a === 'zo') {
    zoom(.7);
  } else if (a === 'fit') {
    fit();
  } else if (a === 'fol' || a === 'fol2') {
    G.follow = !G.follow;
    $('fol').classList.toggle('on', G.follow);
  } else if (a === 'sel') {
    G.sel = G.trains.find(q => q.id == x);
    G.follow = true;
    tab('ka');
  } else if (a === 'hold' || a === 'resume' || a === 'cancel') {
    if (t) {
      const r = trainCmd(t, a);
      toast(r.m, r.ok ? '' : 'e');
    }
  } else if (a === 'jad' || a === 'riw') {
    SH[a] = !SH[a];
  } else if (a === 'rt') {
    const [d, i, w] = x.split(',').map(Number);
    const r = manualRoute(d, i, w < 0 ? null : w);

    toast(r.m, r.ok ? '' : 'e');
  } else if (a === 'sw' && G.sel2) {
    const r = swCmd(G.sel2.d, G.sel2.k, +x);

    toast(r.m, r.ok ? '' : 'e');
  } else if (a === 'inc') {
    const r = addInc(
      $('it').value,
      +$('id').value,
      +$('is').value
    );

    toast(
      r ? 'Gangguan diaktifkan: ' + r.ref : 'Tidak tersedia di stasiun terakhir',
      'w'
    );
  } else if (a === 'rinc') {
    resolveInc(+x);
  } else if (a === 'exj') {
    dlf(
      'ppka-log.json',
      JSON.stringify(fl(), null, 1),
      'application/json'
    );
  } else if (a === 'exc') {
    dlf(
      'ppka-log.csv',
      'waktu,jenis,kereta,stasiun,id,pesan\n' +
        fl().map(l => [
          new Date(l.t * 1000).toISOString(),
          l.type,
          l.tr,
          l.st,
          l.id,
          '"' + l.msg.replace(/"/g, '""') + '"'
        ].join(',')).join('\n'),
      'text/csv'
    );
  } else if (a === 'sc') {
    const p = {
      1: [1, 0],
      2: [1.7, 0],
      3: [.6, 0],
      4: [1, 1]
    }[x];

    SET.dens = p[0];

    apply();
    save();
    reset();

    if (p[1]) addInc('wesel', 0, 7);

    toast('Skenario dimuat');
    tab('sv');
  } else if (a === 'ssave') {
    await idb('readwrite', s =>
      s.put({
        seed: SET.seed,
        dens: SET.dens,
        auto: SET.auto
      }, 'slot1')
    );

    toast('Skenario disimpan di perangkat');
  } else if (a === 'sload') {
    const v = await idb('readonly', s => s.get('slot1'));

    if (v) {
      Object.assign(SET, v);
      apply();
      save();
      reset();
      tab('sv');
      toast('Skenario dimuat');
    } else {
      toast('Belum ada simpanan', 'w');
    }
  }

  if ([
    'hold', 'resume', 'cancel', 'jad', 'riw',
    'rt', 'sw', 'rinc', 'inc', 'sel', 'fol2'
  ].includes(a)) {
    panel(1);
  }
});

/* PENGATURAN DAN FILTER */
document.addEventListener('change', e => {
  const k = e.target.dataset.s;

  if (!k) return;

  const v = e.target.type === 'checkbox'
    ? e.target.checked
    : e.target.value;

  if (k === 'stSel') {
    G.stSel = +v;
    panel(1);
  } else if (k in G.flt) {
    G.flt[k] = v;
    panel(1);
  } else {
    SET[k] = ['mode'].includes(k)
      ? v
      : typeof SET[k] === 'boolean'
        ? !!v
        : +v;

    apply();
    save();

    if (['dens', 'seed', 'tz'].includes(k)) reset();

    if (k === 'dens' || k === 'vol' || k === 'br' || k === 'sc') {
      const l = e.target.closest('label');

      if (l && k === 'dens') {
        l.firstChild.textContent = 'Kepadatan lalu lintas ×' + SET.dens;
      }
    }
  }
});

document.addEventListener('input', e => {
  if (e.target.dataset.s === 'tr') {
    G.flt.tr = e.target.value.trim();
    panel(1);
  }
});

/* RESPONSIVE CANVAS */
addEventListener('resize', () => {
  resize();
  fit();
});

if ('ResizeObserver' in window) {
  const mapEl = $('map');

  if (mapEl) {
    const mapObserver = new ResizeObserver(() => resize());
    mapObserver.observe(mapEl);
  }
}

/* LOOP SIMULASI */
let last = performance.now();
let skip = 0;

function frame(now) {
  const w = Math.min(.1, (now - last) / 1000);

  last = now;

  if (SET.mode === 'real') G.speed = 1;

  if (!G.paused) adv(w * G.speed);

  const tr = G.follow && G.sel &&
    G.trains.find(q => q.id === G.sel.id);

  if (tr) {
    const tx = secPos(tr.d, tr.u) - W / 2 / V.s;

    V.x = SET.rm
      ? tx
      : V.x + (tx - V.x) * Math.min(1, w * 5);
  }

  if (!(SET.low && (skip ^= 1))) {
    draw(w);
  }

  if (now - tl > 500) {
    tl = now;
    top();
    panel(0);
  }

  requestAnimationFrame(frame);
}

/* INISIALISASI */
apply();
resize();
reset();
resize();
fit();
tab('lt');
top();
requestAnimationFrame(frame);
