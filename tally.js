var Tally = {
  ids: ids,          // We assume that a previously imported script
  records: records,  // has defined ids, records, and colors.
  colors: colors,
  cellWidth: 160, columnGap: 20,
  transpose: { 'horizontal': 'vertical', 'vertical': 'horizontal' }
};

Tally.makeTable = function (orientation) {
  var g = Tally;
  if (g.table !== undefined) {
    g.table[g.transpose[orientation]].style.display = 'none';
    g.table[orientation].style.display = 'block';
    return;
  }
  var ids = g.ids,
      records = g.records,
      maxLength = 0;
  for (var i = 0; i < ids.length; ++i) {
    var length = records[ids[i]].tally.length;
    if (length > maxLength) {
      maxLength = length;
    }
  }
  var colors = g.colors,
      tbody = {
        vertical: document.createElement('tbody'),
        horizontal: document.createElement('tbody')
      };
  for (var r = 0; r <= maxLength; ++r) {  // The extra row is for dates.
    tbody.vertical.appendChild(document.createElement('tr'));
  }
  // Fill the columns of the vertical table and the rows of the horizontal one.
  for (var c = 0; c < ids.length; ++c) {
    tbody.horizontal.appendChild(document.createElement('tr'));
    var record = records[ids[ids.length-1-c]],
        tally = record.tally,
        td = document.createElement('td'),
        a = document.createElement('a');
    td.className = 'date';
    a.href = 'http://c2ctc.com/index.php?c_id='+record.id;
    a.target = '_blank';
    a.innerHTML = record.dateString;
    td.appendChild(a);
    tbody.vertical.rows[0].appendChild(td);
    tbody.horizontal.rows[c].appendChild(td.cloneNode(true));
    for (var r = 0; r < maxLength; ++r) {
      td = document.createElement('td');
      if (r < tally.length) {  // If we have no data, the cell stays empty.
        var team = tally[r].team,
            boats = tally[r].boats,
            color = '#'+colors[team];
        td.innerHTML = team+' <span class="boats">'+boats+'</span>';
        td.style.backgroundColor = color;
        td.className = 'tally';
      }
      tbody.vertical.rows[1+r].appendChild(td);
      tbody.horizontal.rows[c].appendChild(td.cloneNode(true));
    }
  }
  g.table = {
    vertical: document.createElement('table'),
    horizontal: document.createElement('table')
  };
  g.table.vertical.style.width =
      ids.length * (g.cellWidth + g.columnGap) + 'px';
  g.table.horizontal.style.width =
      (1 + maxLength) * g.cellWidth + 'px';
  var names = ['vertical', 'horizontal'];
  for (var i = 0; i < names.length; ++i) {
    var name = names[i],
        table = g.table[name];
    table.className = name;
    table.style.display = 'none';
    g.container.appendChild(table);
    table.appendChild(tbody[name]);
  }
  g.table[g.transpose[orientation]].style.display = 'none';
  g.table[orientation].style.display = 'block';
};

Tally.prep = function () {
  var g = Tally;
  // The button switches the table orientation.
  var button = document.getElementById('button');
  g.label = {  // These are labels inside the button.
    horizontal: document.getElementById('horizontal'),
    vertical: document.getElementById('vertical'),
  };
  var initialOrientation = 'vertical';
  g.container = document.getElementById('tallies'),
  g.makeTable(initialOrientation);
  // Set the initial state of the buttons.
  g.label.live = g.label[initialOrientation];
  g.label.dead = g.label[g.transpose[initialOrientation]];
  g.label.live.className = 'live';
  g.label.dead.className = 'dead';
  // Define an orientation switcher.
  button.onclick = function () {
    var t = g.label.live;
    g.label.live = g.label.dead;
    g.label.dead = t;
    g.label.live.className = 'live';
    g.label.dead.className = 'dead';
    g.makeTable(g.label.live.id);
  };
};

window.onload = Tally.prep;
