/* Astra, live: the Live2D model running in the browser with a procedural idle, pointer follow,
   and a Cubism-style random-pose "ragdoll" mode. Trimmed from the Astra Player. */
(() => {
  const CORE = 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js';
  const MODEL = 'model/astra.model3.json';
  const ids = {
    angleX: 'ParamAngleX', angleY: 'ParamAngleY', angleZ: 'ParamAngleZ',
    bodyX: 'ParamBodyAngleX', bodyY: 'ParamBodyAngleY', bodyZ: 'ParamBodyAngleZ',
    breath: 'ParamBreath', eyeLOpen: 'ParamEyeLOpen', eyeROpen: 'ParamEyeROpen',
    eyeBallX: 'ParamEyeBallX', eyeBallY: 'ParamEyeBallY', browLY: 'ParamBrowLY', browRY: 'ParamBrowRY',
    mouthOpen: 'ParamMouthOpenY', mouthForm: 'ParamMouthForm', mouthPucker: 'Param', cheek: 'ParamCheek',
    armL: 'ParamArmLA', armR: 'ParamArmRA',
  };
  const framings = { full: { top: -0.03, bottom: 1.0 }, bust: { top: -0.03, bottom: 0.4 }, face: { top: -0.01, bottom: 0.22 } };

  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (dt, k) => 1 - Math.exp(-dt * k);
  const rand = (a, b) => a + Math.random() * (b - a);

  const S = {
    app: null, model: null, core: null, t: 0, manualDt: null,
    mode: 'live', framing: 'bust', pointer: null,
    att: { yaw: 0, pitch: 0, next: 1.5 }, head: { x: 0, y: 0, z: 0 }, body: { x: 0, y: 0, z: 0 },
    blink: { phase: 'open', t: 0, next: rand(1.5, 4), value: 1, double: false },
    rag: { next: 0, target: {} },
    P: {},   // per-parameter springs
  };

  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  const status = (text) => { const el = $('#stage-status'); if (el) { el.textContent = text; el.hidden = !text; } };

  async function init() {
    const stage = $('#stage');
    await loadScript(CORE);
    await loadScript('vendor/cubism4.min.js');
    PIXI.live2d.Live2DModel.registerTicker(PIXI.Ticker);
    S.app = new PIXI.Application({ resizeTo: stage, backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2) });
    stage.appendChild(S.app.view);
    const model = await PIXI.live2d.Live2DModel.from(MODEL, { autoInteract: false, autoUpdate: true });
    S.model = model; S.core = model.internalModel.coreModel;
    model.internalModel.breath = undefined;
    model.internalModel.eyeBlink = undefined;
    // Library bug: mask layout is sized by the masks in use this frame but walks the whole list, so one unused mask
    // leaves the last mask without a channel and every frame throws. Laying out all masks keeps every channel valid.
    const clip = model.internalModel.renderer._clippingManager;
    if (clip) { const layout = clip.setupLayoutBounds.bind(clip); clip.setupLayoutBounds = () => layout(clip._clippingContextListForMask.length); }
    S.app.stage.addChild(model);
    model.internalModel.on('afterMotionUpdate', () => drive(S.manualDt ?? S.app.ticker.deltaMS / 1000));
    S.app.renderer.on('resize', applyFraming);
    applyFraming();
    status('');
    stage.classList.add('ready');
    // Don't burn battery while she's scrolled off screen.
    new IntersectionObserver(([e]) => { if (S.manualDt == null) e.isIntersecting ? S.app.ticker.start() : S.app.ticker.stop(); }).observe(stage);
  }

  function applyFraming() {
    const m = S.model; if (!m) return;
    const f = framings[S.framing];
    const ow = m.internalModel.originalWidth, oh = m.internalModel.originalHeight;
    const W = S.app.screen.width, H = S.app.screen.height;
    const s = H / ((f.bottom - f.top) * oh);
    m.scale.set(s);
    m.x = W / 2 - 0.5 * ow * s;
    m.y = -f.top * oh * s;
  }

  // ---------- Per-frame ----------
  function setP(key, v) { const id = ids[key]; if (id) S.core.setParameterValueById(id, v); }
  function approach(s, target, hz, zeta, dt) {       // damped spring toward a target
    const w = 2 * Math.PI * hz;
    for (let n = Math.ceil(dt * 120), h = dt / n; n > 0; n--) { s.v += (-w * w * (s.p - target) - 2 * zeta * w * s.v) * h; s.p += s.v * h; }
  }

  function drive(dt) {
    if (!S.core || !(dt > 0)) return;
    dt = Math.min(dt, 0.1); S.t += dt;
    updateBlink(dt);
    const tg = S.mode === 'ragdoll' ? ragdollTargets(dt) : S.pointer ? followTargets() : idleTargets(dt);
    // ragdoll swings loose and overshoots like Cubism's random pose; following is snappy; idle is already smooth
    const [hz, zeta] = S.mode === 'ragdoll' ? [1.3, 0.4] : S.pointer ? [2.2, 0.75] : [5, 1];
    for (const [key, v] of Object.entries(tg)) {
      const s = S.P[key] || (S.P[key] = { p: v, v: 0 });
      approach(s, v, hz, zeta, dt); setP(key, s.p);
    }
    const open = S.blink.value * clamp(S.P.lid.p, 0, 1);
    setP('eyeLOpen', open); setP('eyeROpen', open);
  }

  function idleTargets(dt) {
    const t = S.t;
    S.att.next -= dt;
    if (S.att.next <= 0) {
      S.att.yaw = rand(-12, 12); S.att.pitch = rand(-6, 6);
      if (Math.random() < 0.3) { S.att.yaw *= 0.2; S.att.pitch *= 0.2; }
      S.att.next = rand(2, 5.5);
      if (Math.random() < 0.4) triggerBlink();
    }
    const wx = 3 * Math.sin(t * 0.31) + 1.5 * Math.sin(t * 0.83 + 1), wy = 2 * Math.sin(t * 0.47 + 2) + Math.sin(t * 1.13);
    S.head.x = lerp(S.head.x, S.att.yaw + wx, ease(dt, 3));
    S.head.y = lerp(S.head.y, S.att.pitch + wy, ease(dt, 3.5));
    S.head.z = lerp(S.head.z, 3 * Math.sin(t * 0.23 + 0.5) + 0.18 * S.head.x, ease(dt, 2));
    S.body.x = lerp(S.body.x, S.head.x * 0.3, ease(dt, 1.5));
    S.body.z = lerp(S.body.z, S.head.z * 0.35, ease(dt, 1.2));
    S.body.y = lerp(S.body.y, 1.2 * Math.sin(t * 0.4), ease(dt, 2));
    const ex = clamp((S.att.yaw - S.head.x) / 10 + S.att.yaw / 40, -1, 1), ey = clamp((S.att.pitch - S.head.y) / 8 + S.att.pitch / 30, -1, 1);
    return base({ angleX: S.head.x, angleY: S.head.y, angleZ: S.head.z, bodyX: S.body.x, bodyY: S.body.y, bodyZ: S.body.z, eyeBallX: ex, eyeBallY: ey });
  }

  // Head and eyes turn toward the pointer; the body follows a little.
  function followTargets() {
    const m = S.model, W = S.app.screen.width;
    const fx = m.x + 0.5 * m.internalModel.originalWidth * m.scale.x, fy = m.y + 0.11 * m.internalModel.originalHeight * m.scale.y;
    const dx = clamp((S.pointer.x - fx) / (W * 0.4), -1, 1), dy = clamp((S.pointer.y - fy) / (W * 0.4), -1, 1);
    S.head.x = dx * 28; S.head.y = -dy * 25; S.head.z = -dx * 6;
    return base({ angleX: S.head.x, angleY: S.head.y, angleZ: S.head.z, bodyX: dx * 8, bodyY: -dy * 3, bodyZ: -dx * 3, eyeBallX: dx, eyeBallY: -dy });
  }

  // Like Cubism's random pose preview: every second or so, every parameter jumps to a new random value.
  function ragdollTargets(dt) {
    const R = S.rag; R.next -= dt;
    if (R.next <= 0) {
      R.next = rand(0.6, 1.5);
      R.target = {
        angleX: rand(-28, 28), angleY: rand(-26, 26), angleZ: rand(-24, 24),
        bodyX: rand(-10, 10), bodyY: rand(-10, 10), bodyZ: rand(-10, 10),
        eyeBallX: rand(-1, 1), eyeBallY: rand(-1, 1), browLY: rand(-1, 1), browRY: rand(-1, 1),
        mouthOpen: Math.random() < 0.5 ? 0 : rand(0, 0.8), mouthForm: rand(-1, 1), mouthPucker: rand(-1, 1),
        cheek: Math.random() < 0.25 ? rand(0.5, 1) : 0, armL: rand(-10, 10), armR: rand(-10, 10), lid: rand(0.55, 1), breath: rand(0, 1),
      };
    }
    return { ...R.target };
  }

  function base(v) {
    const t = S.t;
    return { breath: 0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 3.6), browLY: 0, browRY: 0, mouthOpen: 0, mouthForm: 0, mouthPucker: 0, cheek: 0,
      armL: 2 * Math.sin(t * 0.5), armR: 2 * Math.sin(t * 0.5 + 1.3), lid: 1, ...v };
  }

  // ---------- Blink ----------
  function triggerBlink() { if (S.blink.phase === 'open') { S.blink.phase = 'closing'; S.blink.t = 0; } }
  function updateBlink(dt) {
    const b = S.blink; b.t += dt;
    if (b.phase === 'open') { b.value = 1; b.next -= dt; if (b.next <= 0) { b.phase = 'closing'; b.t = 0; b.double = Math.random() < 0.18; } }
    else if (b.phase === 'closing') { b.value = 1 - clamp(b.t / 0.07, 0, 1); if (b.t >= 0.07) { b.phase = 'closed'; b.t = 0; } }
    else if (b.phase === 'closed') { b.value = 0; if (b.t >= 0.04) { b.phase = 'opening'; b.t = 0; } }
    else if (b.phase === 'opening') {
      b.value = clamp(b.t / 0.12, 0, 1);
      if (b.t >= 0.12) { if (b.double) { b.double = false; b.phase = 'closing'; b.t = 0; } else { b.phase = 'open'; b.next = rand(2, 6); } }
    }
  }

  // ---------- UI ----------
  function syncChips() {
    document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === S.mode));
    document.querySelectorAll('[data-framing]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.framing === S.framing));
  }
  function setMode(mode) { S.mode = mode; S.rag.next = 0; syncChips(); }
  function setFraming(name) { S.framing = name; applyFraming(); syncChips(); }

  function ui() {
    document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
    document.querySelectorAll('[data-framing]').forEach((b) => b.addEventListener('click', () => setFraming(b.dataset.framing)));
    const stage = $('#stage');
    const move = (e) => { const r = stage.getBoundingClientRect(); S.pointer = { x: e.clientX - r.left, y: e.clientY - r.top }; };
    stage.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.buttons) move(e); });
    stage.addEventListener('pointerdown', move);
    stage.addEventListener('pointerleave', () => { S.pointer = null; });
    stage.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') S.pointer = null; });
    stage.addEventListener('pointercancel', () => { S.pointer = null; });
    syncChips();
  }

  // For rendering clips offline: astraLive.step(ms) advances one frame by exactly ms.
  window.astraLive = {
    state: S, framings, setMode, setFraming,
    step(ms) { S.manualDt = ms / 1000; S.app.ticker.stop(); S.model.autoUpdate = false; S.model.update(ms); S.app.render(); },
  };

  ui();
  init().catch((e) => { console.error(e); status("She couldn't load here. Try a recent Chrome, Edge, Firefox or Safari."); });
})();
