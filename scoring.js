var Scoring = {
  ids: ids,          // We assume that a previously imported script
  records: records,  // has defined ids, records, and colors.
  colors: colors,
  cellWidth: 160, columnGap: 20, winnerGapHorizontal: 16,
  transpose: { 'horizontal': 'vertical', 'vertical': 'horizontal' }
};

Scoring.makeRankings = function () {
  var g = Scoring,
      ids = g.ids,
      records = g.records,
      teams = [],
      teamInfo = {};
  var previousBoard;
  for (var ii = 0; ii < ids.length; ++ii) {
    var id = ids[ii],
        tally = records[ids[ii]].tally,
        nonzero = {},
        board = [];
    // The previous month's winner starts anew from zero points.
    if (previousBoard !== undefined) {
      var info = teamInfo[previousBoard[0].team];
      info.lastChallenge = ids[ii-1];
      info.points = 0;
    }
    // Consider teams that have floated a boat.
    for (var ti = 0; ti < tally.length; ++ti) {
      var team = tally[ti].team,
          boats = tally[ti].boats,
          info = teamInfo[team];
      if (info === undefined) {
        teams.push(team);
        info = teamInfo[team] = { points: 0 };
      }
      var delta = Math.floor(100*Math.log(boats+1));
      info.points += delta;
      board.push({ team: team, points: info.points,
          boats: boats, delta: delta });
      nonzero[team] = true;
    }
    // Now consider teams that haven't.
    for (var ti = 0; ti < teams.length; ++ti) {
      var team = teams[ti],
          info = teamInfo[team];
      if (info.points === 0 || nonzero[team]) {
        continue;
      }
      var delta = -Math.ceil(0.2 * info.points);
      info.points += delta;
      if (info.points <= 0) {
        info.points = 0;
      } else {
        board.push({ team: team, points: info.points,
            boats: 0, delta: delta });
      }
    }
    // Assign random ranks for tie-breaking purposes.
    // In order to make the results deterministic, we are using a
    // linear congruential generator seeded with the ID of the
    // month for which the leaderboard is calculated. All future
    // implementations must use the same method if the leaderboards
    // are to be kept in the same state.
    // The values of m, a, c are the ones from Numerical Recipes,
    // as reproduced in Wikipedia:
    //   http://en.wikipedia.org/wiki/Linear_congruential_generator
    // Also note carefully the choice of seed: 42*id % m
    // Also note the exact usage of nextRandomNumber() in the loop below.
    // Also note that our determinism depends on the ordering of elements
    // in board, which depends on the ordering of tally. Thanks to
    // process.rb, tally is ordered by boats (descending) and lexical
    // order of team name (ascending). This order must be formalized or
    // replaced with something simpler.
    var m = Math.pow(2, 32),
        a = 1664525,
        c = 1013904223,
        seed = 42*id % m;
    function nextRandomNumber() {
      seed = (a*seed + c) % m;
      return seed;
    }
    for (var bi = board.length-1; bi >= 0; --bi) {
      var p = nextRandomNumber() % (bi+1),
          t = board[p];
      board[p] = board[bi],
      board[bi] = t;
      board[bi].random = bi+1;
    }
    board.sort(function (a, b) {
      if (a.points != b.points) {
        return b.points - a.points;
      }
      var aLast = a.lastChallenge, bLast = b.lastChallenge;
      if (aLast === undefined && bLast !== undefined) {
        return -1;
      }
      if (aLast !== undefined && bLast === undefined) {
        return 1;
      }
      if (aLast !== undefined && bLast !== undefined && aLast != bLast) {
        return aLast - bLast;  // Earlier months have smaller IDs.
      }
      return a.random - b.random;
    });
    records[id].board = board;
    previousBoard = board;
  }
};

Scoring.makeTable = function (orientation) {
  var g = Scoring,
      records = g.records;
  if (g.table !== undefined) {
    g.table[g.transpose[orientation]].style.display = 'none';
    g.table[orientation].style.display = 'block';
    return;
  }
  var maxLength = 0;
  for (var ii = 0; ii < ids.length; ++ii) {
    var length = records[ids[ii]].board.length;
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
        board = record.board,
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
      if (r < board.length) {  // If we have no data, the cell stays empty.
        var info = board[r],
            team = info.team,
            boats = info.boats,
            delta = info.delta,
            points = info.points,
            color = '#'+colors[team];
        td.innerHTML = [
            '<span class="team">'+team+'</span>',
            '<span class="boats">'+
                '<b>'+boats+'</b> boat'+(boats == 1 ? '' : 's')+'</span>',
            '<span class="score">'+(delta < 0 ? '&minus;' : '+')+
                Math.abs(delta)+' &rarr; <b>'+points+'</b></span>'
          ].join('<br />');
        if (r == 0) {
          td.className = 'winner';
        }
        td.style.background = color;
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
      (1 + maxLength) * g.cellWidth + g.winnerGapHorizontal + 'px';
  var names = ['vertical', 'horizontal'];
  for (var i = 0; i < names.length; ++i) {
    var name = names[i],
        table = g.table[name];
    table.className = 'board '+name;
    table.style.display = 'none';
    g.container.appendChild(table);
    table.appendChild(tbody[name]);
  }
  g.table[g.transpose[orientation]].style.display = 'none';
  g.table[orientation].style.display = 'block';
};

Scoring.prep = function () {
  var g = Scoring;
  g.makeRankings();
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

window.onload = Scoring.prep;
