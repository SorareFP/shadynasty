// Prospect board: filters, sorting, scheme fit, a watchlist and pipeline tiers.
// The watchlist and pipeline tiers are saved in this browser only.
// Without this script the page still shows the top prospects rendered into it.
(function () {
  // Team needs: show one team at a time, remembering the viewer's choice.
  (function () {
    var pick = document.getElementById('needs-team');
    if (!pick) return;
    var KEY = 'shadynasty.team';
    function show() {
      Array.prototype.forEach.call(document.querySelectorAll('.needs[data-team]'), function (el) {
        el.hidden = pick.value !== 'all' && el.getAttribute('data-team') !== pick.value;
      });
    }
    try {
      var saved = localStorage.getItem(KEY);
      if (saved && pick.querySelector('option[value="' + saved + '"]')) pick.value = saved;
    } catch (e) { /* keep the default */ }
    pick.addEventListener('change', function () {
      try { localStorage.setItem(KEY, pick.value); } catch (e) { /* not remembered */ }
      show();
    });
    show();
  })();

  var PAGE = 100;
  var WATCH_STORE = 'shadynasty.watchlist';
  var PIPE_STORE = 'shadynasty.pipelines';
  var table = document.getElementById('prospect-table');
  if (!table) return;
  var tbody = table.tBodies[0];
  var count = document.getElementById('prospect-count');
  var more = document.getElementById('prospect-more');
  var form = document.getElementById('prospect-filters');
  var f = {};
  ['group', 'position', 'stars', 'state', 'pipeline', 'archetype', 'role', 'name', 'watch', 'mypipe'].forEach(function (k) {
    f[k] = document.getElementById('f-' + k);
  });
  var all = [];
  var shown = PAGE;
  var sortKey = 'rank';
  var sortDir = 1;
  var watch = new Set(load(WATCH_STORE, []));
  var tiers = load(PIPE_STORE, {});

  // Short labels for the Fit column, read from the scheme filter's own options.
  var roleLabel = {};
  Array.prototype.forEach.call(f.role.querySelectorAll('optgroup'), function (group) {
    var prefix = /Tite/.test(group.label) ? 'Tite ' : /Air Raid/.test(group.label) ? 'Raid ' : '';
    Array.prototype.forEach.call(group.querySelectorAll('option'), function (o) {
      if (o.value.indexOf('scheme:') !== 0) roleLabel[o.value] = prefix ? prefix + o.textContent : 'S-tier';
    });
  });

  function load(key, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(key));
      return v === null || typeof v !== 'object' ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* storage unavailable: the choice lasts for this visit only */ }
  }

  function tierOf(r) {
    return Number(tiers[r.pipeline]) || 0;
  }

  function height(inches) {
    return inches ? Math.floor(inches / 12) + "'" + (inches % 12) + '"' : '—';
  }

  function cell(row, text, numeric) {
    var td = document.createElement('td');
    if (numeric) td.className = 'n';
    td.textContent = text === null || text === undefined || text === '' ? '—' : text;
    row.appendChild(td);
    return td;
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
      save(WATCH_STORE, Array.from(watch));
      draw();
    });
    td.appendChild(b);
    row.appendChild(td);
  }

  function fitsRole(r, value) {
    if (!value) return true;
    var roles = r.roles || [];
    if (value.indexOf('scheme:') === 0) {
      var prefix = value.slice(7) + '-';
      return roles.some(function (k) { return k.indexOf(prefix) === 0; });
    }
    return roles.indexOf(value) !== -1;
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
      if (!fitsRole(r, f.role.value)) return false;
      if (stars === 5 ? r.stars !== 5 : r.stars < stars) return false;
      if (name && r.name.toLowerCase().indexOf(name) === -1) return false;
      if (f.watch.checked && !watch.has(r.key)) return false;
      if (f.mypipe.checked && !tierOf(r)) return false;
      return true;
    });
    rows.sort(function (a, b) {
      var x = sortKey === 'pipeTier' ? -tierOf(a) : a[sortKey];
      var y = sortKey === 'pipeTier' ? -tierOf(b) : b[sortKey];
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
      var tier = tierOf(r);
      var pipe = cell(tr, r.pipeline);
      if (tier) {
        var badge = document.createElement('span');
        badge.className = 'tier';
        badge.textContent = 'Tier ' + tier;
        pipe.appendChild(document.createTextNode(' '));
        pipe.appendChild(badge);
      }
      var labels = [];
      (r.roles || []).forEach(function (k) {
        if (roleLabel[k] && labels.indexOf(roleLabel[k]) === -1) labels.push(roleLabel[k]);
      });
      var fit = cell(tr, labels.join(', ') || ' ');
      fit.className = 'wrap-cell';
      frag.appendChild(tr);
    });
    tbody.replaceChildren(frag);
    var empty = 'No prospects match these filters';
    if (f.watch.checked && !watch.size) empty = 'Your watchlist is empty. Star a prospect to add him.';
    else if (f.mypipe.checked && !Object.keys(tiers).length) empty = 'You have not set any pipelines yet. Open "My pipelines" above the table.';
    count.textContent = rows.length ? 'Showing ' + Math.min(shown, rows.length) + ' of ' + rows.length + ' prospects' : empty;
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

  function jumpTo(setFilter) {
    form.reset();
    setFilter();
    reset();
    document.getElementById('prospects').scrollIntoView();
  }

  function setupPipelines() {
    var selects = document.querySelectorAll('select[data-pipeline]');
    Array.prototype.forEach.call(selects, function (sel) {
      sel.value = String(Number(tiers[sel.getAttribute('data-pipeline')]) || 0);
      sel.addEventListener('change', function () {
        var region = sel.getAttribute('data-pipeline');
        if (Number(sel.value)) tiers[region] = Number(sel.value); else delete tiers[region];
        save(PIPE_STORE, tiers);
        draw();
      });
    });
    var clear = document.getElementById('pipe-clear');
    if (clear) {
      clear.addEventListener('click', function () {
        tiers = {};
        save(PIPE_STORE, tiers);
        Array.prototype.forEach.call(selects, function (sel) { sel.value = '0'; });
        draw();
      });
    }
  }

  fetch('prospects.json')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      all = data;
      ['group', 'position', 'stars', 'state', 'pipeline', 'archetype', 'role', 'watch', 'mypipe'].forEach(function (k) {
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
      document.querySelectorAll('button[data-group]').forEach(function (b) {
        b.addEventListener('click', function () {
          jumpTo(function () { f.group.value = b.getAttribute('data-group'); });
        });
      });
      document.querySelectorAll('button[data-role]').forEach(function (b) {
        b.addEventListener('click', function () {
          jumpTo(function () { f.role.value = b.getAttribute('data-role'); });
        });
      });
      setupPipelines();
      draw();
    })
    .catch(function () { /* keep the rows already on the page */ });
})();
