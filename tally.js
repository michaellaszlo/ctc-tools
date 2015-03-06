var Tally = {
  monthlyRecords: records,
  teamColors: colors,
  oppositeOrientation: { 'horizontal': 'vertical', 'vertical': 'horizontal' }
};

Tally.transposeTable = function () {
  var g = Tally,
      table = document.createElement('table'),
      tbody = document.createElement('tbody'),
      numCols = g.table.rows.length,
      numRows = g.table.rows[0].cells.length;
  console.log('numRows = '+numRows+', numCols = '+numCols);
  for (var r = 0; r < numRows; ++r) {
    var tr = document.createElement('tr');
    for (var c = 0; c < numCols; ++c) {
      var td = g.table.rows[c].cells[r].cloneNode(true);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  g.container.removeChild(g.table);
  g.container.appendChild(table);
  g.table = table;
}

Tally.makeTable = function (orientation) {
  var g = Tally;
  if (g.table !== undefined) {
    g.transposeTable();
    g.table.className = orientation;
    return;
  }
  var records = g.monthlyRecords,
      colors = g.teamColors,
      spans = g.spans,
      table = document.createElement('table'),
      tbody = document.createElement('tbody');
  g.table = table;
  // Let's make a vertical table, then transpose it afterward if necessary.
  maxTally = g.maxTally;
  // Make maxTally+1 rows to accommodate the dates.
  for (var r = 0; r <= maxTally; ++r) {
    tbody.appendChild(document.createElement('tr'));
  }
  for (var c = 0; c < records.length; ++c) {
    var record = records[c],
        tally = record.tally,
        td = document.createElement('td'),
        a = document.createElement('a');
    td.className = 'date';
    a.href = 'http://c2ctc.com/index.php?c_id='+record.id;
    a.target = '_blank';
    a.innerHTML = record.dateString;
    td.appendChild(a);
    tbody.rows[0].appendChild(td);
    for (var r = 0; r < maxTally; ++r) {
      td = document.createElement('td');
      // If we have no data, the cell stays empty and goes in the row anyway.
      if (r < tally.length) {
        var team = tally[r].team,
            boats = tally[r].boats,
            color = '#'+colors[team];
        td.className = 'tally';
        td.innerHTML = team+': <span class="boats">'+boats+'</span>';
        td.style.backgroundColor = color;
      }
      tbody.rows[1+r].appendChild(td);
    }
  }
  table.appendChild(tbody);
  g.container.appendChild(table);
  if (orientation == 'horizontal') {
    g.transposeTable();
  }
  g.table.className = orientation;
};

Tally.prep = function () {
  var g = Tally,
      records = g.monthlyRecords,
      maxTally = 0;
  for (var i = 0; i < records.length; ++i) {
    var record = records[i],
        tally = record.tally;
    if (tally.length > maxTally) {
      maxTally = tally.length;
    }
  }
  g.maxTally = maxTally;
  // The button switches the table orientation. Set it up for easy access.
  var button = document.getElementById('button');
  g.spans = {
    horizontal: document.getElementById('horizontal'),
    vertical: document.getElementById('vertical'),
  };
  var initialOrientation = 'vertical',
      otherOrientation = g.oppositeOrientation[initialOrientation];
  g.container = document.getElementById('tallies'),
  g.makeTable(initialOrientation);
  // Set the initial state of the buttons.
  g.spans.live = g.spans[initialOrientation];
  g.spans.dead = g.spans[otherOrientation];
  g.spans.live.className = 'live';
  g.spans.dead.className = 'dead';
  // Define an orientation switcher.
  button.onclick = function () {
    var t = g.spans.live;
    g.spans.live = g.spans.dead;
    g.spans.dead = t;
    g.spans.live.className = 'live';
    g.spans.dead.className = 'dead';
    g.makeTable(g.spans.live.id);
  };
};

window.onload = Tally.prep;

