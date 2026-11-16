// Filters the prospect table in the browser. Without this script the page
// still shows the top prospects that were rendered into it.
(function () {
  var PAGE = 100;
  var table = document.getElementById('prospect-table');
  if (!table) return;
  var tbody = table.tBodies[0];
  var count = document.getElementById('prospect-count');
  var more = document.getElementById('prospect-more');
  var fPos = document.getElementById('f-position');
  var fStars = document.getElementById('f-stars');
  var fState = document.getElementById('f-state');
  var fName = document.getElementById('f-name');
  var all = [];
  var shown = PAGE;

  function height(inches) {
    return inches ? Math.floor(inches / 12) + "'" + (inches % 12) + '"' : '—';
  }

  function cell(row, text, numeric) {
    var td = document.createElement('td');
    if (numeric) td.className = 'n';
    td.textContent = text === null || text === undefined || text === '' ? '—' : text;
    row.appendChild(td);
  }

  function matches() {
    var pos = fPos.value;
    var state = fState.value;
    var stars = Number(fStars.value);
    var name = fName.value.trim().toLowerCase();
    return all.filter(function (r) {
      if (pos && r.position !== pos) return false;
      if (state && r.state !== state) return false;
      if (stars === 5 ? r.stars !== 5 : r.stars < stars) return false;
      if (name && r.name.toLowerCase().indexOf(name) === -1) return false;
      return true;
    });
  }

  function draw() {
    var rows = matches();
    var frag = document.createDocumentFragment();
    rows.slice(0, shown).forEach(function (r) {
      var tr = document.createElement('tr');
      cell(tr, r.rank, true);
      cell(tr, r.name);
      cell(tr, r.stars ? new Array(r.stars + 1).join('★') : '');
      cell(tr, r.position);
      cell(tr, r.archetype);
      cell(tr, height(r.height), true);
      cell(tr, r.weight, true);
      cell(tr, [r.hometown, r.state].filter(Boolean).join(', '));
      frag.appendChild(tr);
    });
    tbody.replaceChildren(frag);
    count.textContent = rows.length
      ? 'Showing ' + Math.min(shown, rows.length) + ' of ' + rows.length + ' prospects'
      : 'No prospects match these filters';
    more.hidden = rows.length <= shown;
  }

  function reset() {
    shown = PAGE;
    draw();
  }

  fetch('prospects.json')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      all = data;
      [fPos, fStars, fState].forEach(function (el) { el.addEventListener('change', reset); });
      fName.addEventListener('input', reset);
      more.addEventListener('click', function () { shown += PAGE; draw(); });
      document.getElementById('prospect-filters').addEventListener('submit', function (e) { e.preventDefault(); });
      draw();
    })
    .catch(function () { /* keep the rows already on the page */ });
})();
