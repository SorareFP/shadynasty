// Prospect board: filters, sorting and a per-browser watchlist.
// Without this script the page still shows the top prospects rendered into it.
(function () {
  var PAGE = 100;
  var STORE = 'shadynasty.watchlist';
  var table = document.getElementById('prospect-table');
  if (!table) return;
  var tbody = table.tBodies[0];
  var count = document.getElementById('prospect-count');
  var more = document.getElementById('prospect-more');
  var form = document.getElementById('prospect-filters');
  var f = {};
  ['group', 'position', 'stars', 'state', 'pipeline', 'archetype', 'name', 'watch'].forEach(function (k) {
    f[k] = document.getElementById('f-' + k);
  });
  var all = [];
  var shown = PAGE;
  var sortKey = 'rank';
  var sortDir = 1;
  var watch = loadWatch();

  function loadWatch() {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORE) || '[]'));
    } catch (e) {
      return new Set();
    }
  }

  function saveWatch() {
    try {
      localStorage.setItem(STORE, JSON.stringify(Array.from(watch)));
    } catch (e) { /* storage unavailable: the watchlist lasts for this visit only */ }
  }

  function height(inches) {
    return inches ? Math.floor(inches / 12) + "'" + (inches % 12) + '"' : '—';
  }

  function cell(row, text, numeric) {
    var td = document.createElement('td');
    if (numeric) td.className = 'n';
    td.textContent = text === null || text === undefined || text === '' ? '—' : text;
    row.appendChild(td);
  }

  function starCell(row, r) {
    var td = document.createElement('td');
    var b = document.createElement('button');
    var on = watch.has(r.key);
    b.type = 'button';
    b.className = 'star' + (on ? ' on' : '');
    b.textContent = on ? '★' : '☆';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + r.name + (on ? ' from' : ' to') + ' watchlist');
    b.addEventListener('click', function () {
      if (watch.has(r.key)) watch.delete(r.key); else watch.add(r.key);
      saveWatch();
      draw();
    });
    td.appendChild(b);
    row.appendChild(td);
  }

  function matches() {
    var stars = Number(f.stars.value);
    var name = f.name.value.trim().toLowerCase();
    var rows = all.filter(function (r) {
      if (f.group.value && r.group !== f.group.value) return false;
      if (f.position.value && r.position !== f.position.value) return false;
      if (f.state.value && r.state !== f.state.value) return false;
      if (f.pipeline.value && r.pipeline !== f.pipeline.value) return false;
      if (f.archetype.value && r.archetype !== f.archetype.value) return false;
      if (stars === 5 ? r.stars !== 5 : r.stars < stars) return false;
      if (name && r.name.toLowerCase().indexOf(name) === -1) return false;
      if (f.watch.checked && !watch.has(r.key)) return false;
      return true;
    });
    rows.sort(function (a, b) {
      var x = a[sortKey];
      var y = b[sortKey];
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return x === y ? (a.rank || 0) - (b.rank || 0) : (x - y) * sortDir;
    });
    return rows;
  }

  function draw() {
    var rows = matches();
    var frag = document.createDocumentFragment();
    rows.slice(0, shown).forEach(function (r) {
      var tr = document.createElement('tr');
      if (watch.has(r.key)) tr.className = 'user';
      starCell(tr, r);
      cell(tr, r.rank, true);
      cell(tr, r.name);
      cell(tr, r.stars ? new Array(r.stars + 1).join('★') : '');
      cell(tr, r.position);
      cell(tr, r.positionRank, true);
      cell(tr, r.archetype);
      cell(tr, height(r.height), true);
      cell(tr, r.weight, true);
      cell(tr, [r.hometown, r.state].filter(Boolean).join(', '));
      cell(tr, r.stateRank, true);
      cell(tr, r.pipeline);
      frag.appendChild(tr);
    });
    tbody.replaceChildren(frag);
    count.textContent = rows.length
      ? 'Showing ' + Math.min(shown, rows.length) + ' of ' + rows.length + ' prospects'
      : (f.watch.checked && !watch.size ? 'Your watchlist is empty. Star a prospect to add him.' : 'No prospects match these filters');
    more.hidden = rows.length <= shown;
    table.querySelectorAll('button.sort').forEach(function (b) {
      var active = b.getAttribute('data-sort') === sortKey;
      b.parentNode.setAttribute('aria-sort', active ? (sortDir === 1 ? 'ascending' : 'descending') : 'none');
    });
  }

  function reset() {
    shown = PAGE;
    draw();
  }

  fetch('prospects.json')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      all = data;
      ['group', 'position', 'stars', 'state', 'pipeline', 'archetype', 'watch'].forEach(function (k) {
        f[k].addEventListener('change', reset);
      });
      f.name.addEventListener('input', reset);
      form.addEventListener('submit', function (e) { e.preventDefault(); });
      form.addEventListener('reset', function () { setTimeout(reset, 0); });
      more.addEventListener('click', function () { shown += PAGE; draw(); });
      table.querySelectorAll('button.sort').forEach(function (b) {
        b.addEventListener('click', function () {
          var key = b.getAttribute('data-sort');
          if (key === sortKey) sortDir = -sortDir; else { sortKey = key; sortDir = 1; }
          reset();
        });
      });
      // "Prospects" buttons in the team-needs tables jump to the board filtered to that group.
      document.querySelectorAll('button[data-group]').forEach(function (b) {
        b.addEventListener('click', function () {
          form.reset();
          f.group.value = b.getAttribute('data-group');
          reset();
          document.getElementById('prospects').scrollIntoView();
        });
      });
      draw();
    })
    .catch(function () { /* keep the rows already on the page */ });
})();
