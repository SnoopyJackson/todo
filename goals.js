const now = new Date();
const todayKey = now.toISOString().slice(0,10);

// Storage keys — daily resets each day, monthly each month, yearly each year, longterm persists
const keys = {
  daily:    'goals_daily_'    + now.toISOString().slice(0,10),
  monthly:  'goals_monthly_'  + now.toISOString().slice(0,7),
  yearly:   'goals_yearly_'   + now.getFullYear(),
  longterm: 'goals_longterm',
  habits:   'goals_habits',
};

// Meta labels
const metas = {
  daily:    now.toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'}).toUpperCase(),
  monthly:  now.toLocaleDateString('en-US', {month:'long', year:'numeric'}).toUpperCase(),
  yearly:   now.getFullYear().toString(),
  longterm: 'ONGOING · NO DEADLINE',
};

Object.entries(metas).forEach(([id, val]) => {
  const el = document.getElementById('meta-' + id);
  if (el) el.textContent = val;
});

// State
const state = {};
['daily','monthly','yearly','longterm'].forEach(id => {
  state[id] = JSON.parse(localStorage.getItem(keys[id]) || '[]');
});

// Habits state: [{id, name, log: {date: bool}}]
state.habits = JSON.parse(localStorage.getItem(keys.habits) || '[]');

function save(id) { localStorage.setItem(keys[id], JSON.stringify(state[id])); }

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function render(id) {
  const list  = document.getElementById('list-' + id);
  const empty = document.getElementById('empty-' + id);
  const tasks = state[id];
  list.innerHTML = '';

  const total = tasks.length, done = tasks.filter(t=>t.done).length;
  const pct   = total === 0 ? 0 : Math.round(done/total*100);

  empty.style.display = total === 0 ? 'block' : 'none';
  document.getElementById('pf-' + id).style.width = pct + '%';
  document.getElementById('ps-' + id).textContent = `${done} of ${total} done`;
  document.getElementById('pp-' + id).textContent = pct + '%';

  renderHistory(id);

  tasks.forEach((task, i) => {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' done' : '');
    li.innerHTML = `
      <div class="check-box">
        <svg viewBox="0 0 10 8" fill="none" stroke="var(--bg)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1,4 4,7 9,1"/>
        </svg>
      </div>
      <span class="task-label">${esc(task.text)}</span>
      <button class="del" title="Delete">×</button>
    `;
    li.querySelector('.check-box').addEventListener('click', () => toggle(id, i));
    li.querySelector('.task-label').addEventListener('click', () => toggle(id, i));
    li.querySelector('.del').addEventListener('click', () => remove(id, i));
    list.appendChild(li);
  });
}

function formatPeriod(id, period) {
  if (id === 'daily') {
    const d = new Date(period + 'T00:00:00');
    return d.toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'}).toUpperCase();
  }
  if (id === 'monthly') {
    const d = new Date(period + '-01T00:00:00');
    return d.toLocaleDateString('en-US', {month:'long', year:'numeric'}).toUpperCase();
  }
  return period;
}

function renderHistory(id) {
  const histEl = document.getElementById('history-' + id);
  if (!histEl) return;

  if (id === 'longterm') {
    const done = state.longterm.filter(t => t.done);
    histEl.innerHTML = '';
    if (done.length === 0) { histEl.style.display = 'none'; return; }
    histEl.style.display = '';
    const title = document.createElement('div');
    title.className = 'history-title';
    title.textContent = 'completed';
    histEl.appendChild(title);
    done.forEach(t => {
      const row = document.createElement('div');
      row.className = 'history-item done';
      row.textContent = t.text;
      histEl.appendChild(row);
    });
    return;
  }

  const prefix = 'goals_' + id + '_';
  const currentKey = keys[id];
  const histKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix) && k !== currentKey) histKeys.push(k);
  }
  histKeys.sort().reverse();
  const limited = histKeys.slice(0, 7);

  histEl.innerHTML = '';
  if (limited.length === 0) { histEl.style.display = 'none'; return; }

  histEl.style.display = '';
  const title = document.createElement('div');
  title.className = 'history-title';
  title.textContent = 'history';
  histEl.appendChild(title);

  limited.forEach(k => {
    const period = k.replace(prefix, '');
    const tasks = JSON.parse(localStorage.getItem(k) || '[]');
    if (tasks.length === 0) return;
    const group = document.createElement('div');
    group.className = 'history-group';
    const label = document.createElement('div');
    label.className = 'history-period';
    label.textContent = formatPeriod(id, period);
    group.appendChild(label);
    tasks.forEach(t => {
      const row = document.createElement('div');
      row.className = 'history-item' + (t.done ? ' done' : '');
      row.textContent = t.text;
      group.appendChild(row);
    });
    histEl.appendChild(group);
  });
}

function toggle(id, i) {
  state[id][i].done = !state[id][i].done;
  save(id); render(id);
}

function remove(id, i) {
  state[id].splice(i, 1);
  save(id); render(id);
}

// Inputs
document.querySelectorAll('.add-row input').forEach(input => {
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const val = e.target.value.trim();
    if (!val) return;
    const id = e.target.dataset.list;
    if (id === 'habits') {
      state.habits.push({ id: Date.now().toString(), name: val, log: {} });
      localStorage.setItem(keys.habits, JSON.stringify(state.habits));
      renderHabits();
    } else {
      state[id].push({ text: val, done: false });
      e.target.value = '';
      save(id); render(id);
    }
    e.target.value = '';
  });
});

// Streak calculator
function calcStreak(log) {
  let streak = 0;
  const d = new Date(now);
  while (true) {
    const k = d.toISOString().slice(0,10);
    if (log[k]) { streak++; d.setDate(d.getDate()-1); }
    else break;
  }
  return streak;
}

// Last 28 days keys
function last28() {
  const days = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0,10));
  }
  return days;
}

function renderHabits() {
  const list  = document.getElementById('list-habits');
  const empty = document.getElementById('empty-habits');
  const habits = state.habits;
  list.innerHTML = '';

  const total = habits.length;
  const doneToday = habits.filter(h => h.log[todayKey]).length;
  const pct = total === 0 ? 0 : Math.round(doneToday/total*100);

  empty.style.display = total === 0 ? 'block' : 'none';
  document.getElementById('pf-habits').style.width = pct + '%';
  document.getElementById('ps-habits').textContent = `${doneToday} of ${total} done today`;
  document.getElementById('pp-habits').textContent = pct + '%';

  const days = last28();

  habits.forEach((habit, i) => {
    const streak = calcStreak(habit.log);
    const li = document.createElement('li');
    li.className = 'habit-item';

    const checkedToday = !!habit.log[todayKey];

    li.innerHTML = `
      <div class="habit-top">
        <div class="check-box ${checkedToday ? 'checked-h' : ''}">
          <svg viewBox="0 0 10 8" fill="none" stroke="var(--bg)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1,4 4,7 9,1"/>
          </svg>
        </div>
        <span class="habit-name">${esc(habit.name)}</span>
        <span class="streak-badge">${streak > 0 ? '🔥 ' + streak + 'd' : ''}</span>
        <button class="del" title="Delete">×</button>
      </div>
      <div class="habit-grid-label">last 28 days</div>
      <div class="habit-grid" id="hgrid-${i}"></div>
    `;

    // Style today's check-box like others
    const cb = li.querySelector('.check-box');
    if (checkedToday) {
      cb.style.background = 'var(--habits)';
      cb.style.borderColor = 'var(--habits)';
      cb.querySelector('svg').style.opacity = '1';
    } else {
      cb.style.borderColor = 'var(--muted)';
    }

    cb.addEventListener('click', () => {
      habit.log[todayKey] = !habit.log[todayKey];
      localStorage.setItem(keys.habits, JSON.stringify(state.habits));
      renderHabits();
    });

    li.querySelector('.del').addEventListener('click', () => {
      state.habits.splice(i, 1);
      localStorage.setItem(keys.habits, JSON.stringify(state.habits));
      renderHabits();
    });

    list.appendChild(li);

    // Build dot grid
    const grid = document.getElementById('hgrid-' + i);
    days.forEach(day => {
      const dot = document.createElement('div');
      dot.className = 'day-dot' + (habit.log[day] ? ' checked' : '');
      dot.title = day;
      dot.addEventListener('click', () => {
        habit.log[day] = !habit.log[day];
        localStorage.setItem(keys.habits, JSON.stringify(state.habits));
        renderHabits();
      });
      grid.appendChild(dot);
    });
  });
}

// Tabs
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.id).classList.add('active');
  });
});

// Init
['daily','monthly','yearly','longterm'].forEach(render);
renderHabits();
