/* ============================================================
   HabitFlow — Full App Logic
   localStorage keys: hf_habits, hf_logs, hf_streaks,
                      hf_achievements, hf_settings
   ============================================================ */

// ─── STATE ───────────────────────────────────────────────────
const S = {
  habits: [],
  logs: {},
  streaks: {},
  achievements: [],
  settings: { freezeTokens: 2, notificationsEnabled: false },
  editingHabitId: null,
  selectedColor: '#2383e2',
  selectedType: 'yesno',
  timer: { habitId: null, total: 0, remaining: 0, interval: null, running: false },
  noteHabitId: null,
  reminderIntervals: [],
};

// ─── PERSISTENCE ─────────────────────────────────────────────
const save = () => {
  localStorage.setItem('hf_habits', JSON.stringify(S.habits));
  localStorage.setItem('hf_logs', JSON.stringify(S.logs));
  localStorage.setItem('hf_streaks', JSON.stringify(S.streaks));
  localStorage.setItem('hf_achievements', JSON.stringify(S.achievements));
  localStorage.setItem('hf_settings', JSON.stringify(S.settings));
};
const load = () => {
  S.habits = JSON.parse(localStorage.getItem('hf_habits') || '[]');
  S.logs = JSON.parse(localStorage.getItem('hf_logs') || '{}');
  S.streaks = JSON.parse(localStorage.getItem('hf_streaks') || '{}');
  S.achievements = JSON.parse(localStorage.getItem('hf_achievements') || '[]');
  const saved = JSON.parse(localStorage.getItem('hf_settings') || '{}');
  S.settings = { ...S.settings, ...saved };
};

// ─── HELPERS ─────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const todayKey = () => new Date().toISOString().slice(0, 10);
const dateKey = (d) => d.toISOString().slice(0, 10);
const pad = (n) => String(n).padStart(2, '0');

function getLog(habitId, date = todayKey()) {
  return (S.logs[date] || {})[habitId] || null;
}
function setLog(habitId, data, date = todayKey()) {
  if (!S.logs[date]) S.logs[date] = {};
  S.logs[date][habitId] = { ...(S.logs[date][habitId] || {}), ...data };
  save();
}

function isCompleted(habit, date = todayKey()) {
  const log = getLog(habit.id, date);
  if (!log) return false;
  if (habit.type === 'yesno') return !!log.done;
  if (habit.type === 'quantified') return (log.value || 0) >= habit.target;
  if (habit.type === 'timed') return !!log.timerDone;
  return false;
}

function getProgress(habit, date = todayKey()) {
  const log = getLog(habit.id, date);
  if (!log) return 0;
  if (habit.type === 'yesno') return log.done ? 1 : 0;
  if (habit.type === 'quantified') return Math.min((log.value || 0) / habit.target, 1);
  if (habit.type === 'timed') return log.timerDone ? 1 : Math.min((log.elapsed || 0) / (habit.duration * 60), 1);
  return 0;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

// ─── STREAK CALCULATION ───────────────────────────────────────
function calcStreak(habitId) {
  let current = 0, d = new Date();
  const habit = S.habits.find(h => h.id === habitId);
  if (!habit) return { current: 0, longest: 0 };
  // walk backwards from yesterday (today not yet finished)
  for (let i = 0; i < 365; i++) {
    const key = dateKey(d);
    if (key === todayKey()) { d.setDate(d.getDate() - 1); continue; }
    if (isCompleted(habit, key)) {
      current++;
    } else {
      // check freeze
      const log = getLog(habitId, key);
      if (log && log.frozen) { d.setDate(d.getDate() - 1); continue; }
      break;
    }
    d.setDate(d.getDate() - 1);
  }
  // include today if done
  if (isCompleted(habit, todayKey())) { current++; }
  
  let longest = Math.max(current, (S.streaks[habitId] || {}).longest || 0);
  S.streaks[habitId] = { current, longest };
  return { current, longest };
}

function allStreaks() {
  S.habits.forEach(h => calcStreak(h.id));
  save();
}

function weekCompletionPct(weekOffset = 0) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i - weekOffset * 7);
    days.push(dateKey(d));
  }
  if (!S.habits.length) return days.map(() => 0);
  return days.map(date => {
    const activeHabits = S.habits.filter(h => !h.createdAt || h.createdAt.slice(0, 10) <= date);
    if (!activeHabits.length) return 0;
    const done = activeHabits.filter(h => isCompleted(h, date)).length;
    return Math.round((done / activeHabits.length) * 100);
  });
}

function monthHeatmap(year, month) {
  const days = new Date(year, month + 1, 0).getDate();
  const result = [];
  for (let d = 1; d <= days; d++) {
    const date = `${year}-${pad(month + 1)}-${pad(d)}`;
    const activeHabits = S.habits.filter(h => !h.createdAt || h.createdAt.slice(0, 10) <= date);
    const done = activeHabits.filter(h => isCompleted(h, date)).length;
    const pct = activeHabits.length ? Math.round((done / activeHabits.length) * 100) : 0;
    result.push({ d, date, pct });
  }
  return result;
}

// ─── ACHIEVEMENTS ────────────────────────────────────────────
const ACHIEVEMENT_DEFS = [
  { id: 'first_habit', icon: '🌱', name: 'First Step', desc: 'Add your first habit' },
  { id: 'streak_3',   icon: '🔥', name: 'On Fire',    desc: '3-day streak on any habit' },
  { id: 'streak_7',   icon: '🏅', name: 'Week Warrior', desc: '7-day streak on any habit' },
  { id: 'streak_30',  icon: '💎', name: 'Diamond Mind', desc: '30-day streak on any habit' },
  { id: 'all_done',   icon: '⭐', name: 'Perfect Day',  desc: 'Complete all habits in one day' },
  { id: 'timed_5',    icon: '⏱️', name: 'Time Keeper',  desc: 'Complete 5 timed habits' },
  { id: 'noted_10',   icon: '📝', name: 'Journaler',    desc: 'Add 10 habit notes' },
  { id: 'habits_5',   icon: '🎯', name: 'Five Pillars', desc: 'Create 5 habits' },
  { id: 'freeze_used',icon: '❄️', name: 'On Ice',       desc: 'Use a freeze token' },
  { id: 'streak_100', icon: '🚀', name: 'Centurion',    desc: '100-day streak on any habit' },
];

function checkAchievements() {
  const unlock = (id) => {
    if (!S.achievements.find(a => a.id === id)) {
      S.achievements.push({ id, unlockedAt: new Date().toISOString() });
      const def = ACHIEVEMENT_DEFS.find(a => a.id === id);
      if (def) showToast(`🏆 Achievement Unlocked: ${def.name}!`);
      save();
    }
  };
  if (S.habits.length >= 1) unlock('first_habit');
  if (S.habits.length >= 5) unlock('habits_5');
  const maxStreak = Math.max(0, ...S.habits.map(h => (S.streaks[h.id] || {}).current || 0));
  if (maxStreak >= 3) unlock('streak_3');
  if (maxStreak >= 7) unlock('streak_7');
  if (maxStreak >= 30) unlock('streak_30');
  if (maxStreak >= 100) unlock('streak_100');
  if (S.habits.length && S.habits.every(h => isCompleted(h, todayKey()))) unlock('all_done');
  const timedDone = Object.values(S.logs).reduce((acc, day) =>
    acc + Object.values(day).filter(l => l.timerDone).length, 0);
  if (timedDone >= 5) unlock('timed_5');
  const notesCount = Object.values(S.logs).reduce((acc, day) =>
    acc + Object.values(day).filter(l => l.note).length, 0);
  if (notesCount >= 10) unlock('noted_10');
  if (S.settings.freezeUsedEver) unlock('freeze_used');
}

// ─── CLOCK ───────────────────────────────────────────────────
function startClock() {
  const tick = () => {
    const now = new Date();
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const mini = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dateStr = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    const el = document.getElementById('liveClock');
    const elD = document.getElementById('liveDate');
    const elM = document.getElementById('liveClockMini');
    if (el) el.textContent = timeStr;
    if (elD) elD.textContent = dateStr;
    if (elM) elM.textContent = mini;
    // Greeting
    const greet = now.getHours() < 12 ? 'Good morning 👋' : now.getHours() < 17 ? 'Good afternoon 👋' : 'Good evening 👋';
    const title = document.querySelector('#page-dashboard .page-title');
    if (title) title.textContent = greet;
  };
  tick();
  setInterval(tick, 1000);
}

// ─── NAVIGATION ──────────────────────────────────────────────
function refreshCurrentView() {
  if (document.getElementById('page-dashboard').classList.contains('active')) renderDashboard();
  else if (document.getElementById('page-timeline').classList.contains('active')) renderTimeline();
  else if (document.getElementById('page-habits').classList.contains('active')) renderHabitsGrid();
  else if (document.getElementById('page-analytics').classList.contains('active')) renderAnalytics();
  else if (document.getElementById('page-achievements').classList.contains('active')) renderAchievements();
}

function navigate(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');
  document.querySelectorAll(`[data-page="${pageId}"]`).forEach(n => n.classList.add('active'));
  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
  // Render page-specific content
  refreshCurrentView();
}

// ─── DASHBOARD RENDER ────────────────────────────────────────
function renderDashboard() {
  allStreaks();
  checkAchievements();

  // Stats
  const today = todayKey();
  const doneCnt = S.habits.filter(h => isCompleted(h, today)).length;
  const pct = S.habits.length ? Math.round((doneCnt / S.habits.length) * 100) : 0;
  const bestStreak = Math.max(0, ...S.habits.map(h => (S.streaks[h.id] || {}).longest || 0));
  const weekPcts = weekCompletionPct();
  const weekStreak = weekPcts.filter(p => p === 100).length;

  document.getElementById('statBestStreak').textContent = bestStreak;
  document.getElementById('statTodayDone').textContent = `${doneCnt}/${S.habits.length}`;
  document.getElementById('statCompletion').textContent = pct + '%';
  document.getElementById('statWeekStreak').textContent = weekStreak;

  const now = new Date();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('dashSubtitle').textContent =
    `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} · ${S.habits.length} habit${S.habits.length !== 1 ? 's' : ''} tracked`;
  document.getElementById('todayBadge').textContent =
    new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // Current hour
  const hr = now.getHours();
  document.getElementById('currentHourLabel').textContent =
    `${pad(hr)}:00 – ${pad(hr + 1 > 23 ? 23 : hr + 1)}:00`;
  const curHabits = S.habits.filter(h => parseInt(h.timeSlot) === hr);
  const curDone = curHabits.filter(h => isCompleted(h, today)).length;
  const curHabitsEl = document.getElementById('currentHourHabits');
  curHabitsEl.innerHTML = curHabits.length
    ? curHabits.map(h => `
        <div class="slot-habit-pill ${isCompleted(h, today) ? 'pill-done' : 'pill-active'}">
          <span class="pill-dot" style="background:${h.color}"></span>
          ${h.emoji} ${h.name}
        </div>`).join('')
    : '<span class="slot-empty">No habits this hour</span>';

  const hpf = document.getElementById('hourProgressFill');
  if (hpf) hpf.style.width = curHabits.length ? Math.round((curDone / curHabits.length) * 100) + '%' : '0%';
  document.getElementById('hourProgressText').textContent =
    curHabits.length ? `${curDone} of ${curHabits.length} complete` : 'No habits scheduled';

  // All today's habits
  renderTodayList();

  // Week overview
  renderWeekOverview(weekPcts);
}

function renderTodayList() {
  const el = document.getElementById('habitsTodayList');
  if (!S.habits.length) {
    el.innerHTML = '<p class="empty-msg">No habits yet. <a href="#" data-page="habits" class="nav-link-inline">Add some →</a></p>';
    el.querySelector('[data-page]')?.addEventListener('click', (e) => { e.preventDefault(); navigate('habits'); });
    return;
  }
  el.innerHTML = S.habits.map(h => {
    const log = getLog(h.id) || {};
    const done = isCompleted(h);
    const prog = getProgress(h);
    const streak = (S.streaks[h.id] || {}).current || 0;
    const timeLabel = h.timeSlot !== '' ? `${pad(h.timeSlot)}:00` : 'Anytime';

    let actionHtml = '';
    if (h.type === 'yesno') {
      actionHtml = `<button class="btn-complete ${done ? 'done' : ''}" onclick="toggleYesNo('${h.id}')">
        ${done ? '✅ Done' : '◻ Mark Done'}
      </button>`;
    } else if (h.type === 'quantified') {
      const val = log.value || 0;
      actionHtml = `
        <div class="qty-controls">
          <button class="qty-btn" onclick="changeQty('${h.id}', -1)">−</button>
          <span class="qty-value">${val}/${h.target} ${h.unit}</span>
          <button class="qty-btn" onclick="changeQty('${h.id}', 1)">+</button>
        </div>`;
    } else if (h.type === 'timed') {
      actionHtml = `<button class="btn-timer" onclick="openTimer('${h.id}')">
        ${done ? '✅ ' + h.duration + 'm done' : '⏱ Start ' + h.duration + 'm'}
      </button>`;
    }

    return `
      <div class="habit-today-row">
        <div class="habit-emoji">${h.emoji || '📌'}</div>
        <div class="habit-info">
          <div class="habit-name">${h.name}</div>
          <div class="habit-meta">${timeLabel} · ${h.type}${h.type === 'quantified' ? ` · Target: ${h.target} ${h.unit}` : ''}</div>
          ${h.type !== 'yesno' ? `
          <div class="habit-progress-mini">
            <div class="mini-bar"><div class="mini-bar-fill" style="width:${prog * 100}%;background:${h.color}"></div></div>
            <span style="font-size:11px;color:var(--text2)">${Math.round(prog * 100)}%</span>
          </div>` : ''}
        </div>
        <div class="habit-actions">
          ${actionHtml}
          <button class="btn-note" title="Add note" onclick="openNote('${h.id}')">
            ${log.note ? '📝' : '💬'}
          </button>
          ${streak > 0 ? `<span class="habit-streak">🔥${streak}</span>` : ''}
        </div>
      </div>`;
  }).join('');
}

function renderWeekOverview(weekPcts) {
  const el = document.getElementById('weekOverview');
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today = new Date();
  el.innerHTML = '';
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(today.getDate() - i);
    const isToday = dateKey(d) === todayKey();
    const pct = weekPcts[6 - i];
    const div = document.createElement('div');
    div.className = 'week-day' + (isToday ? ' today' : '');
    div.innerHTML = `
      <div class="week-day-name">${days[d.getDay()]}</div>
      <div class="week-day-date">${d.getDate()}</div>
      <div class="week-day-pct">${pct}%</div>
      <div class="week-day-bar"><div class="week-day-bar-fill" style="width:${pct}%"></div></div>`;
    el.appendChild(div);
  }
}

// ─── TIMELINE RENDER ─────────────────────────────────────────
function renderTimeline() {
  const container = document.getElementById('timelineContainer');
  const currentHour = new Date().getHours();
  container.innerHTML = '';
  for (let hr = 0; hr < 24; hr++) {
    const isNow = hr === currentHour;
    const isPast = hr < currentHour;
    const habitsAtHour = S.habits.filter(h => parseInt(h.timeSlot) === hr);
    const slot = document.createElement('div');
    slot.className = `timeline-slot ${isNow ? 'slot-now' : isPast ? 'slot-past' : 'slot-future'}`;
    const ampm = hr < 12 ? `${hr === 0 ? 12 : hr}am` : `${hr === 12 ? 12 : hr - 12}pm`;
    slot.innerHTML = `
      <div class="slot-time">
        ${pad(hr)}:00
        <div style="font-size:10px;color:var(--text3)">${ampm}</div>
        ${isNow ? '<div class="slot-now-dot"></div>' : ''}
      </div>
      <div class="slot-habits">
        ${habitsAtHour.length
          ? habitsAtHour.map(h => {
              const done = isCompleted(h);
              return `<div class="slot-habit-pill ${done ? 'pill-done' : isNow ? 'pill-active' : ''}"
                onclick="quickCompleteFromTimeline('${h.id}')">
                <span class="pill-dot" style="background:${h.color}"></span>
                ${h.emoji || ''} ${h.name}
                ${done ? '✓' : ''}
              </div>`;
            }).join('')
          : '<span class="slot-empty">—</span>'}
      </div>`;
    container.appendChild(slot);
  }
  // Scroll to current hour
  const nowSlot = container.children[currentHour];
  if (nowSlot) setTimeout(() => nowSlot.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
}

function quickCompleteFromTimeline(habitId) {
  const h = S.habits.find(x => x.id === habitId);
  if (!h) return;
  if (h.type === 'yesno') { toggleYesNo(habitId); }
  else if (h.type === 'quantified') { navigate('dashboard'); showToast(`Use the dashboard to log "${h.name}"`); }
  else if (h.type === 'timed') { openTimer(habitId); }
}

// ─── HABITS GRID RENDER ──────────────────────────────────────
function renderHabitsGrid() {
  const grid = document.getElementById('habitsGrid');
  if (!S.habits.length) {
    grid.innerHTML = '<p class="empty-msg">No habits yet. Click "+ New Habit" to get started.</p>';
    return;
  }
  grid.innerHTML = S.habits.map(h => {
    const streak = (S.streaks[h.id] || {}).current || 0;
    const longest = (S.streaks[h.id] || {}).longest || 0;
    const bgAlpha = h.color + '22';
    return `
      <div class="habit-card">
        <div class="habit-card-header">
          <div class="habit-card-icon" style="background:${bgAlpha}">
            <span>${h.emoji || '📌'}</span>
          </div>
          <div class="habit-card-info">
            <div class="habit-card-name">${h.name}</div>
            <div class="habit-card-type">${h.type}${h.timeSlot !== '' ? ` · ${pad(h.timeSlot)}:00` : ''}</div>
          </div>
          <div class="habit-card-actions">
            <button class="btn-icon" title="Edit" onclick="openEditHabit('${h.id}')">✏️</button>
            <button class="btn-icon" title="Delete" onclick="deleteHabit('${h.id}')">🗑️</button>
          </div>
        </div>
        <div class="habit-card-stats">
          <div class="habit-stat">
            <span class="habit-stat-val" style="color:var(--warning)">🔥${streak}</span>
            <span class="habit-stat-lbl">Streak</span>
          </div>
          <div class="habit-stat">
            <span class="habit-stat-val">${longest}</span>
            <span class="habit-stat-lbl">Best</span>
          </div>
          <div class="habit-stat">
            <span class="habit-stat-val">${h.target || (h.duration ? h.duration+'m' : '—')}</span>
            <span class="habit-stat-lbl">${h.type === 'quantified' ? h.unit : h.type === 'timed' ? 'mins' : 'goal'}</span>
          </div>
          <div class="habit-stat">
            <span class="habit-stat-val">${h.reminderOn ? '🔔' : '🔕'}</span>
            <span class="habit-stat-lbl">Remind</span>
          </div>
        </div>
        <div style="height:4px;border-radius:2px;background:var(--bg3);overflow:hidden;margin-top:4px">
          <div style="height:100%;width:${Math.round(getProgress(h) * 100)}%;background:${h.color};border-radius:2px;transition:width 0.3s"></div>
        </div>
      </div>`;
  }).join('');
}

// ─── ANALYTICS RENDER ────────────────────────────────────────
function renderAnalytics() {
  renderWeeklyChart();
  renderHeatmap();
  renderPerHabitChart();
}

function renderWeeklyChart() {
  const canvas = document.getElementById('weeklyChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const labels = [];
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    labels.push(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]);
  }
  const pcts = weekCompletionPct();
  pcts.forEach(p => data.push(p));

  const pad_l = 48, pad_r = 20, pad_t = 20, pad_b = 40;
  const chartW = W - pad_l - pad_r;
  const chartH = H - pad_t - pad_b;
  const barW = Math.floor(chartW / data.length) - 12;
  const today = new Date().getDay();

  ctx.font = '11px Inter, sans-serif';
  ctx.fillStyle = '#b0aeaa';

  // Grid lines
  [0, 25, 50, 75, 100].forEach(v => {
    const y = pad_t + chartH - (v / 100) * chartH;
    ctx.strokeStyle = '#e9e9e7';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad_l, y); ctx.lineTo(W - pad_r, y); ctx.stroke();
    ctx.fillText(v + '%', 2, y + 4);
  });

  // Bars
  data.forEach((val, i) => {
    const x = pad_l + i * (chartW / data.length) + 6;
    const barH = (val / 100) * chartH;
    const y = pad_t + chartH - barH;
    const isToday = (6 - (6 - i)) === (6 - (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1) % 7);
    ctx.fillStyle = i === 6 ? '#2383e2' : '#c8d8f5';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]) : ctx.rect(x, y, barW, barH);
    ctx.fill();
    // Label
    ctx.fillStyle = '#787774';
    ctx.fillText(labels[i], x + barW / 2 - 10, H - 10);
    // Value on top
    if (val > 0) {
      ctx.fillStyle = '#37352f';
      ctx.fillText(val + '%', x + barW / 2 - 10, y - 4);
    }
  });
}

function renderHeatmap() {
  const container = document.getElementById('heatmapContainer');
  if (!container) return;
  const now = new Date();
  container.innerHTML = '';

  for (let m = 2; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const monthName = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    const label = document.createElement('div');
    label.className = 'heatmap-label';
    label.textContent = monthName;
    container.appendChild(label);

    const daysWrap = document.createElement('div');
    daysWrap.style.display = 'flex';
    daysWrap.style.flexWrap = 'wrap';
    daysWrap.style.gap = '4px';

    const days = monthHeatmap(d.getFullYear(), d.getMonth());
    // Offset for day of week
    const firstDow = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
    for (let offset = 0; offset < firstDow; offset++) {
      const blank = document.createElement('div');
      blank.style.width = '28px';
      daysWrap.appendChild(blank);
    }
    days.forEach(({ d: day, pct, date }) => {
      const cell = document.createElement('div');
      cell.className = 'heatmap-day';
      cell.title = `${date}: ${pct}%`;
      cell.textContent = day;
      const alpha = pct === 0 ? 0.08 : pct < 40 ? 0.3 : pct < 70 ? 0.6 : pct < 100 ? 0.85 : 1;
      cell.style.background = `rgba(35,131,226,${alpha})`;
      cell.style.color = alpha > 0.5 ? '#fff' : '#37352f';
      daysWrap.appendChild(cell);
    });
    container.appendChild(daysWrap);
  }
}

function renderPerHabitChart() {
  const canvas = document.getElementById('perHabitChart');
  if (!canvas || !S.habits.length) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const pad_l = 150, pad_r = 60, pad_t = 20, pad_b = 20;
  const chartW = W - pad_l - pad_r;
  const chartH = H - pad_t - pad_b;
  const rowH = Math.min(32, chartH / S.habits.length);

  ctx.font = '12px Inter, sans-serif';

  S.habits.forEach((h, i) => {
    const streak = (S.streaks[h.id] || {}).current || 0;
    const longest = (S.streaks[h.id] || {}).longest || 0;
    const pct = longest > 0 ? Math.min(streak / Math.max(longest, 1), 1) : 0;
    const y = pad_t + i * (rowH + 8);
    // Label
    ctx.fillStyle = '#37352f';
    ctx.fillText(`${h.emoji || ''} ${h.name}`.slice(0, 20), 0, y + rowH - 8);
    // Bar bg
    ctx.fillStyle = '#e9e9e7';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(pad_l, y, chartW, rowH - 4, 4) : ctx.rect(pad_l, y, chartW, rowH - 4);
    ctx.fill();
    // Bar fill
    ctx.fillStyle = h.color;
    const fillW = pct * chartW;
    if (fillW > 0) {
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(pad_l, y, fillW, rowH - 4, 4) : ctx.rect(pad_l, y, fillW, rowH - 4);
      ctx.fill();
    }
    // Value
    ctx.fillStyle = '#787774';
    ctx.fillText(`🔥${streak} / best ${longest}`, pad_l + chartW + 8, y + rowH - 8);
  });
}

// ─── ACHIEVEMENTS RENDER ─────────────────────────────────────
function renderAchievements() {
  const grid = document.getElementById('achievementsGrid');
  grid.innerHTML = ACHIEVEMENT_DEFS.map(def => {
    const unlocked = S.achievements.find(a => a.id === def.id);
    const dateStr = unlocked ? new Date(unlocked.unlockedAt).toLocaleDateString() : '';
    return `
      <div class="achievement-card ${unlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-icon">${def.icon}</div>
        <div class="achievement-name">${def.name}</div>
        <div class="achievement-desc">${def.desc}</div>
        ${unlocked ? `<div class="achievement-date">Unlocked ${dateStr}</div>` : '<div class="achievement-date">Locked</div>'}
      </div>`;
  }).join('');
}

// ─── HABIT ACTIONS ───────────────────────────────────────────
function toggleYesNo(habitId) {
  const log = getLog(habitId) || {};
  const newDone = !log.done;
  setLog(habitId, { done: newDone });
  allStreaks();
  checkAchievements();
  refreshCurrentView();
  showToast(newDone ? '✅ Habit marked done!' : 'Habit unmarked');
}

function changeQty(habitId, delta) {
  const h = S.habits.find(x => x.id === habitId);
  if (!h) return;
  const log = getLog(habitId) || {};
  const wasDone = (log.value || 0) >= h.target;
  const newVal = Math.max(0, Math.min((log.value || 0) + delta, h.target * 2));
  setLog(habitId, { value: newVal });
  allStreaks();
  checkAchievements();
  if (newVal >= h.target && !wasDone) showToast(`🎯 "${h.name}" target reached!`);
  refreshCurrentView();
}

function openNote(habitId) {
  S.noteHabitId = habitId;
  const log = getLog(habitId) || {};
  document.getElementById('noteHabitId').value = habitId;
  document.getElementById('noteText').value = log.note || '';
  document.getElementById('noteModal').classList.add('open');
}
function saveNote() {
  const habitId = document.getElementById('noteHabitId').value;
  const note = document.getElementById('noteText').value.trim();
  setLog(habitId, { note });
  document.getElementById('noteModal').classList.remove('open');
  checkAchievements();
  showToast('📝 Note saved!');
  refreshCurrentView();
}

// ─── TIMER ───────────────────────────────────────────────────
function openTimer(habitId) {
  const h = S.habits.find(x => x.id === habitId);
  if (!h) return;
  clearInterval(S.timer.interval);
  S.timer = { habitId, total: h.duration * 60, remaining: h.duration * 60, interval: null, running: false };
  document.getElementById('timerHabitName').textContent = `${h.emoji || ''} ${h.name}`;
  updateTimerDisplay();
  document.getElementById('timerModal').classList.add('open');
}

function updateTimerDisplay() {
  const { total, remaining } = S.timer;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  document.getElementById('timerDisplay').textContent = `${pad(mins)}:${pad(secs)}`;
  const circumference = 339.3;
  const progress = total > 0 ? (total - remaining) / total : 0;
  document.getElementById('ringFill').style.strokeDashoffset = circumference * (1 - progress);
}

document.getElementById('timerStart').addEventListener('click', () => {
  if (S.timer.running || S.timer.remaining <= 0) return;
  S.timer.running = true;
  S.timer.interval = setInterval(() => {
    S.timer.remaining--;
    updateTimerDisplay();
    if (S.timer.remaining <= 0) {
      clearInterval(S.timer.interval);
      S.timer.running = false;
      setLog(S.timer.habitId, { timerDone: true, elapsed: S.timer.total });
      allStreaks(); checkAchievements();
      showToast('⏱ Timer complete! Habit logged.');
      fireNotification('Timer Done!', `You completed your timed habit!`);
      refreshCurrentView();
      document.getElementById('timerModal').classList.remove('open');
    }
  }, 1000);
});
document.getElementById('timerPause').addEventListener('click', () => {
  clearInterval(S.timer.interval); S.timer.running = false;
});
document.getElementById('timerReset').addEventListener('click', () => {
  clearInterval(S.timer.interval); S.timer.running = false;
  const h = S.habits.find(x => x.id === S.timer.habitId);
  if (h) { S.timer.remaining = h.duration * 60; updateTimerDisplay(); }
});
document.getElementById('timerMarkDone')?.addEventListener('click', () => {
  clearInterval(S.timer.interval);
  S.timer.running = false;
  setLog(S.timer.habitId, { timerDone: true, elapsed: S.timer.total });
  allStreaks(); checkAchievements();
  showToast('✅ Habit marked done!');
  refreshCurrentView();
  document.getElementById('timerModal').classList.remove('open');
});
document.getElementById('timerModalClose').addEventListener('click', () => {
  clearInterval(S.timer.interval); S.timer.running = false;
  document.getElementById('timerModal').classList.remove('open');
});

// ─── HABIT MODAL ─────────────────────────────────────────────
function populateTimeSlots() {
  const sel = document.getElementById('habitTimeSlot');
  sel.innerHTML = '<option value="">— Anytime —</option>';
  for (let h = 0; h < 24; h++) {
    const ampm = h < 12 ? `${h === 0 ? 12 : h}:00 AM` : `${h === 12 ? 12 : h - 12}:00 PM`;
    sel.innerHTML += `<option value="${h}">${pad(h)}:00 (${ampm})</option>`;
  }
}

function openAddHabit() {
  S.editingHabitId = null;
  S.selectedColor = '#2383e2';
  S.selectedType = 'yesno';
  document.getElementById('modalTitle').textContent = 'New Habit';
  document.getElementById('editHabitId').value = '';
  document.getElementById('habitName').value = '';
  document.getElementById('habitEmoji').value = '';
  document.getElementById('habitTimeSlot').value = '';
  document.getElementById('habitTarget').value = '';
  document.getElementById('habitUnit').value = '';
  document.getElementById('habitDuration').value = '';
  document.getElementById('habitReminder').checked = false;
  setTypeUI('yesno');
  document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
  document.querySelector('[data-color="#2383e2"]').classList.add('selected');
  document.getElementById('habitModal').classList.add('open');
}

function openEditHabit(id) {
  const h = S.habits.find(x => x.id === id);
  if (!h) return;
  S.editingHabitId = id;
  S.selectedColor = h.color;
  S.selectedType = h.type;
  document.getElementById('modalTitle').textContent = 'Edit Habit';
  document.getElementById('editHabitId').value = id;
  document.getElementById('habitName').value = h.name;
  document.getElementById('habitEmoji').value = h.emoji || '';
  document.getElementById('habitTimeSlot').value = h.timeSlot;
  document.getElementById('habitTarget').value = h.target || '';
  document.getElementById('habitUnit').value = h.unit || '';
  document.getElementById('habitDuration').value = h.duration || '';
  document.getElementById('habitReminder').checked = !!h.reminderOn;
  setTypeUI(h.type);
  document.querySelectorAll('.color-dot').forEach(d => {
    d.classList.toggle('selected', d.dataset.color === h.color);
  });
  document.getElementById('habitModal').classList.add('open');
}

function setTypeUI(type) {
  document.querySelectorAll('.type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === type));
  document.getElementById('quantifiedFields').style.display = type === 'quantified' ? 'block' : 'none';
  document.getElementById('timedFields').style.display = type === 'timed' ? 'block' : 'none';
  S.selectedType = type;
}

function saveHabit() {
  const name = document.getElementById('habitName').value.trim();
  if (!name) { showToast('⚠ Please enter a habit name'); return; }
  const timeSlotVal = document.getElementById('habitTimeSlot').value;
  const h = {
    id: S.editingHabitId || uid(),
    name,
    emoji: document.getElementById('habitEmoji').value || '📌',
    timeSlot: timeSlotVal !== '' ? parseInt(timeSlotVal) : '',
    type: S.selectedType,
    target: parseInt(document.getElementById('habitTarget').value) || 1,
    unit: document.getElementById('habitUnit').value || 'times',
    duration: parseInt(document.getElementById('habitDuration').value) || 5,
    color: S.selectedColor,
    reminderOn: document.getElementById('habitReminder').checked,
    createdAt: S.editingHabitId ? (S.habits.find(x => x.id === S.editingHabitId) || {}).createdAt : new Date().toISOString(),
  };
  if (S.editingHabitId) {
    const idx = S.habits.findIndex(x => x.id === S.editingHabitId);
    if (idx !== -1) S.habits[idx] = h;
  } else {
    S.habits.push(h);
  }
  save();
  checkAchievements();
  scheduleReminders();
  document.getElementById('habitModal').classList.remove('open');
  renderHabitsGrid();
  showToast(S.editingHabitId ? '✏️ Habit updated!' : '✅ Habit created!');
}

function deleteHabit(id) {
  if (!confirm('Delete this habit? All its logs will remain.')) return;
  S.habits = S.habits.filter(h => h.id !== id);
  save();
  renderHabitsGrid();
  showToast('🗑 Habit deleted');
}

// ─── FREEZE TOKEN ────────────────────────────────────────────
function useFreeze() {
  if (S.settings.freezeTokens <= 0) { showToast('❌ No freeze tokens left this month'); return; }
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yKey = dateKey(yesterday);
  S.habits.forEach(h => {
    if (!S.logs[yKey]) S.logs[yKey] = {};
    S.logs[yKey][h.id] = { ...(S.logs[yKey][h.id] || {}), frozen: true };
  });
  S.settings.freezeTokens--;
  S.settings.freezeUsedEver = true;
  save();
  allStreaks();
  document.getElementById('freezeCount').textContent = S.settings.freezeTokens;
  showToast('❄️ Freeze token used! Yesterday protected.');
  checkAchievements();
}

// ─── NOTIFICATIONS ───────────────────────────────────────────
function fireNotification(title, body) {
  if (!S.settings.notificationsEnabled) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '🌊' });
  }
}

async function requestNotifications() {
  if (!('Notification' in window)) { showToast('❌ Notifications not supported'); return; }
  const perm = await Notification.requestPermission();
  S.settings.notificationsEnabled = perm === 'granted';
  save();
  const btn = document.getElementById('notifyToggle');
  if (perm === 'granted') {
    btn.textContent = '🔔 Reminders On';
    btn.style.background = '#d3f0e8';
    btn.style.color = '#0f7b6c';
    showToast('🔔 Notifications enabled!');
    scheduleReminders();
  } else {
    showToast('❌ Notifications blocked');
  }
}

function scheduleReminders() {
  S.reminderIntervals.forEach(clearTimeout);
  S.reminderIntervals = [];
  if (!S.settings.notificationsEnabled) return;
  const now = new Date();
  S.habits.filter(h => h.reminderOn && h.timeSlot !== '').forEach(h => {
    const target = new Date();
    target.setHours(parseInt(h.timeSlot), 0, 0, 0);
    let ms = target - now;
    if (ms < 0) ms += 24 * 3600 * 1000; // next day
    const t = setTimeout(() => {
      fireNotification(`⏰ Habit Reminder`, `Time for: ${h.emoji} ${h.name}`);
    }, ms);
    S.reminderIntervals.push(t);
  });
}

// ─── ANALYTICS TABS ──────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
    if (tab === 'weekly') renderWeeklyChart();
    if (tab === 'monthly') renderHeatmap();
    if (tab === 'perhabit') renderPerHabitChart();
  });
});

// ─── EVENT BINDINGS ──────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    navigate(item.dataset.page);
  });
});

document.getElementById('addHabitBtn').addEventListener('click', openAddHabit);
document.getElementById('saveHabit').addEventListener('click', saveHabit);
document.getElementById('cancelHabit').addEventListener('click', () => document.getElementById('habitModal').classList.remove('open'));
document.getElementById('modalClose').addEventListener('click', () => document.getElementById('habitModal').classList.remove('open'));
document.getElementById('cancelNote').addEventListener('click', () => document.getElementById('noteModal').classList.remove('open'));
document.getElementById('noteModalClose').addEventListener('click', () => document.getElementById('noteModal').classList.remove('open'));
document.getElementById('saveNote').addEventListener('click', saveNote);
document.getElementById('notifyToggle').addEventListener('click', requestNotifications);

document.getElementById('hamburgerBtn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => setTypeUI(btn.dataset.type));
});

document.querySelectorAll('.color-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
    dot.classList.add('selected');
    S.selectedColor = dot.dataset.color;
  });
});

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// Freeze button long-hold on freeze count
document.getElementById('freezeCount').addEventListener('click', useFreeze);

// Reset freeze tokens monthly
function checkMonthlyFreezeReset() {
  const now = new Date();
  const key = `${now.getFullYear()}-${now.getMonth()}`;
  if (S.settings.lastFreezeMonth !== key) {
    S.settings.freezeTokens = 2;
    S.settings.lastFreezeMonth = key;
    save();
    document.getElementById('freezeCount').textContent = S.settings.freezeTokens;
  }
}

// ─── INIT ────────────────────────────────────────────────────
function init() {
  load();
  populateTimeSlots();
  startClock();
  checkMonthlyFreezeReset();
  allStreaks();
  checkAchievements();
  navigate('dashboard');
  document.getElementById('freezeCount').textContent = S.settings.freezeTokens;
  if (S.settings.notificationsEnabled) {
    const btn = document.getElementById('notifyToggle');
    btn.textContent = '🔔 Reminders On';
    btn.style.background = '#d3f0e8';
    btn.style.color = '#0f7b6c';
    scheduleReminders();
  }
}

init();