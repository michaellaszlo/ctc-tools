var Scoring = {
  monthlyRecords: records,
  teamColors: colors,
  oppositeOrientation: { 'horizontal': 'vertical', 'vertical': 'horizontal' }
};

Scoring.makeTable = function (orientation) {
  var g = Scoring,
      records = g.monthlyRecords,
      colors = g.teamColors,
      spans = g.spans,
      container = document.getElementById('tallies'),
      table = document.createElement('table'),
      tbody = document.createElement('tbody');
  if (g.table !== undefined) {
    container.removeChild(g.table);
  }
  g.table = table;
  if (orientation == 'vertical') {
    g.spans.horizontal.className = 'dead';
    g.spans.vertical.className = 'live';
    for (var i = 0; i < records.length; ++i) {
      var record = records[i],
          tally = record.tally,
          tr = document.createElement('tr'),
          td = document.createElement('td'),
          a = document.createElement('a');
      td.className = 'date horizontal';
      a.href = 'http://c2ctc.com/index.php?c_id='+record.id;
      a.target = '_blank';
      a.innerHTML = record.dateString;
      td.appendChild(a);
      tr.appendChild(td);
      for (var j = 0; j < tally.length; ++j) {
        var team = tally[j].team,
            boats = tally[j].boats,
            color = '#'+colors[team];
        td = document.createElement('td');
        td.className = 'tally horizontal';
        td.innerHTML = team+': <span class="boats">'+boats+'</span>';
        td.style.backgroundColor = color;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  } else {
    g.spans.vertical.className = 'dead';
    g.spans.horizontal.className = 'live';
    var maxScoring = 0,
        tr = document.createElement('tr');
    for (var i = 0; i < records.length; ++i) {
      var record = records[i],
          tally = record.tally,
          td = document.createElement('td'),
          a = document.createElement('a');
      td.className = 'date vertical';
      a.href = 'http://c2ctc.com/index.php?c_id='+record.id;
      a.target = '_blank';
      a.innerHTML = record.dateString;
      td.appendChild(a);
      tr.appendChild(td);
      if (tally.length > maxScoring) {
        maxScoring = tally.length;
      }
    }
    tbody.appendChild(tr);
    for (var r = 0; r < maxScoring; ++r) {
      tr = document.createElement('tr');
      for (var c = 0; c < records.length; ++c) {
        var record = records[c],
            tally = record.tally;
        td = document.createElement('td');
        if (r < tally.length) {
          var team = tally[r].team,
              boats = tally[r].boats,
              color = '#'+colors[team];
          td.className = 'tally vertical';
          td.innerHTML = team+': <span class="boats">'+boats+'</span>';
          td.style.backgroundColor = color;
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }
  table.appendChild(tbody);
  container.appendChild(table);
};

Scoring.prep = function () {
  return;
  var g = Scoring,
      button = document.getElementById('button');
  g.spans = {
    horizontal: document.getElementById('horizontal'),
    vertical: document.getElementById('vertical'),
  };
  var initialOrientation = 'horizontal',
      otherOrientation = g.oppositeOrientation[initialOrientation];
  g.spans.live = g.spans[initialOrientation];
  g.spans.dead = g.spans[otherOrientation];
  button.onclick = function () {
    var t = g.spans.live;
    g.spans.live = g.spans.dead;
    g.spans.dead = t;
    g.spans.live.className = 'live';
    g.spans.dead.className = 'dead';
    g.makeTable(g.spans.live.id);
  };
  g.makeTable(initialOrientation);
};

window.onload = Scoring.prep;

