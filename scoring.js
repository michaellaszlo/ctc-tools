var Scoring = {
  monthIds: monthIds,    // We assume that a previously imported
  monthInfo: monthInfo,  // script has defined monthIds, monthInfo,
  teamInfo: teamInfo,    // and teamInfo.
  cellWidth: 160, columnGap: 20, winnerGapHorizontal: 16,
  optionPadding: { height: 2, width: 6 },
  transpose: { horizontal: 'vertical', vertical: 'horizontal' },
  chart: { barWidth: 5, barHeight: 1 },
  initialOrientation: 'vertical'
};

Scoring.makeRankings = function () {
  var g = Scoring,
      monthIds = g.monthIds,
      monthInfo = g.monthInfo,
      teamInfo = g.teamInfo,
      teams = [];
  var previousBoard;
  for (var ii = 0; ii < monthIds.length; ++ii) {
    var id = monthIds[ii],
        tally = monthInfo[monthIds[ii]].tally,
        nonzero = {},
        board = [];
    // The previous month's winner starts anew from zero points.
    if (previousBoard !== undefined) {
      var info = teamInfo[previousBoard[0].team];
      info.lastChallenge = monthIds[ii-1];
      info.points = 0;
    }
    // Consider teams that have floated a boat.
    for (var ti = 0; ti < tally.length; ++ti) {
      var team = tally[ti].team,
          boats = tally[ti].boats,
          info = teamInfo[team];
      if (info.points === undefined) {
        teams.push(team);
        info.points = 0;
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
    // month for which the leaderboard is calculated. Future
    // implementations must use the same method in order to
    // reproduce the leaderboard archive consistently.
    // The values of m, a, c are the ones given in Numerical Recipes
    // and reproduced in the Wikipedia article on LCGs:
    //   http://en.wikipedia.org/wiki/Linear_congruential_generator
    // Also note carefully the choice of seed: 42*id*id % m
    // Also note the exact usage of nextRandomNumber() in the loop below.
    var m = Math.pow(2, 32),
        a = 1664525,
        c = 1013904223,
        seed = 42*id*id % m;
    function nextRandomNumber() {
      seed = (a*seed + c) % m;
      return seed;
    }
    // We begin by sorting the board according to team ID (ascending order).
    // Next, we shuffle the board starting from the highest index, calling
    // nextRandomNumber() to select the element to be inserted at the
    // current tail. The resulting order is used to break ties when the
    // other criteria fail.
    board.sort(function (a, b) {
      return teamInfo[a.team].id - teamInfo[b.team].id;
    });
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
    // Rearrange ties at lower ranks according to lexical order of team name.
    var pos = 1;
    while (pos < board.length && board[pos].points == board[0].points) {
      ++pos;
    }
    while (pos < board.length) {
      for (var i = pos+1; i < board.length; ++i) {
        if (board[i].points != board[pos].points) {
          break;
        }
        if (board[i].team < board[pos].team) {
          var t = board[pos];
          board[pos] = board[i];
          board[i] = t;
        }
      }
      ++pos;
    }
    // Store the board.
    monthInfo[id].board = board;
    previousBoard = board;
  }
};

Scoring.makeElement = function (tag, innerHTML, className) {
  var element = document.createElement(tag);
  if (innerHTML !== undefined) {
    element.innerHTML = innerHTML;
  }
  if (className !== undefined) {
    element.className = className;
  }
  return element;
};

Scoring.makeSummary = function (orientation) {
  var g = Scoring,
      monthInfo = g.monthInfo,
      monthIds = g.monthIds,
      teamInfo = g.teamInfo,
      summary = [];
  for (var i = 0; i < monthIds.length; ++i) {
    var board = monthInfo[monthIds[i]].board;
    for (var rank = 0; rank < board.length; ++rank) {
      var team = board[rank].team,
          boats = board[rank].boats,
          info = teamInfo[team];
      if (info.firstMonth === undefined) {
        info.firstMonth = i;
        summary.push(info);
        info.team = team;
        info.sumBoats = 0;
        info.winMonths = [];
        info.isWinMonth = {};
        info.boatsPerMonth = {};
      }
      info.sumBoats += boats;
      info.boatsPerMonth[monthIds[i]] = boats;
      if (rank == 0) {
        info.winMonths.push(i);
        info.isWinMonth[i] = true;
      }
    }
  }
  var maxBoats = 0;
  for (var i = 0; i < summary.length; ++i) {
    var info = summary[i],
        numMonths = monthIds.length - info.firstMonth;
    info.meanBoats = info.sumBoats / numMonths;
    var winMonths = info.winMonths;
    if (winMonths.length != 0) {  // else info.meanWinInterval is undefined
      var winIntervalSum = winMonths[0] - info.firstMonth;
      for (var j = 1; j < winMonths.length; ++j) {
        winIntervalSum += winMonths[j] - winMonths[j-1];
      }
      info.meanWinInterval = winIntervalSum / winMonths.length;
    }
    var monthlyBoats = info.monthlyBoats = [];
    for (var mi = 0; mi < monthIds.length; ++mi) {
      var monthId = monthIds[mi],
          boats = info.boatsPerMonth[monthId] || 0;
      monthlyBoats.push(boats);
      maxBoats = Math.max(maxBoats, boats);
    }
  }
  summary.sort(function (a, b) {
    if (a.meanBoats != b.meanBoats) {
      return b.meanBoats - a.meanBoats;
    }
    if (a.meanWinInterval !== b.meanWinInterval) {
      if (a.meanWinInterval === undefined || b.meanWinInterval === undefined) {
        return a.meanWinInterval === undefined ? 1 : -1;
      }
      return b.meanWinInterval - a.meanWinInterval;
    }
    return (a.team < b.team ? -1 : 1);
  });
  var container = document.getElementById('summary'),
      table = document.createElement('table'),
      tbody = document.createElement('tbody'),
      barWidth = g.chart.barWidth,
      barHeight = g.chart.barHeight,
      tr = document.createElement('tr');
  tr.appendChild(g.makeElement('td'));
  tr.appendChild(g.makeElement('td', 'mean boats<br />per month', 'header'));
  tr.appendChild(g.makeElement('td', 'mean months<br />until first place',
      'header'));
  tr.appendChild(g.makeElement('td', 'history of boats per month and wins',
      'header chart'));
  tbody.appendChild(tr);
  table.className = 'summary';
  for (var i = 0; i < summary.length; ++i) {
    var info = summary[i],
        fields = [info.team, g.roundDecimal(info.meanBoats, 2),
          info.meanWinInterval === undefined ?
              '&minus;' : g.roundDecimal(info.meanWinInterval, 2)],
        tr = document.createElement('tr');
    for (var j = 0; j < fields.length; ++j) {
      var td = g.makeElement('td', fields[j]);
      if (j != 0) {
        td.className = 'number';
      }
      tr.appendChild(td);
    }
    var canvas = document.createElement('canvas'),
        context = canvas.getContext('2d'),
        numMonths = monthIds.length,
        td = document.createElement('td'),
        monthlyBoats = info.monthlyBoats,
        isWinMonth = info.isWinMonth;
    canvas.width = barWidth * numMonths;
    canvas.height = barHeight * maxBoats;
    context.fillStyle = '#' + info.color;
    for (var mi = 0; mi < numMonths; ++mi) {
      var boats = monthlyBoats[mi],
          x = barWidth * (numMonths - mi - 1),
          y = barHeight * (maxBoats - boats);
      context.fillRect(x, y, barWidth, barHeight * boats);
      if (info.isWinMonth[mi]) {
        context.fillStyle = '#a92121';
        context.fillRect(x+Math.floor(barWidth/2), 0, 1, barHeight * maxBoats);
        context.fillStyle = '#' + info.color;
      }
    }
    td.appendChild(canvas);
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);
};

Scoring.roundDecimal = function (x, digits) {
  var factor = Math.pow(10, digits),
      s = Math.round(factor * x) / factor + '';
  if (s.indexOf('.') == -1) {
    s += '.';
  }
  for (var i = digits - (s.length - 1 - s.indexOf('.')); i != 0; --i) {
    s += '0';
  }
  return s;
};

Scoring.makeTable = function (orientation) {
  var g = Scoring,
      monthInfo = g.monthInfo;
  if (g.table !== undefined) {
    g.table[g.transpose[orientation]].style.display = 'none';
    g.table[orientation].style.display = 'block';
    return;
  }
  var maxLength = 0;
  for (var ii = 0; ii < monthIds.length; ++ii) {
    var length = monthInfo[monthIds[ii]].board.length;
    if (length > maxLength) {
      maxLength = length;
    }
  }
  var teamInfo = g.teamInfo,
      tbody = {
        vertical: document.createElement('tbody'),
        horizontal: document.createElement('tbody')
      };
  for (var r = 0; r <= maxLength; ++r) {  // The extra row is for dates.
    tbody.vertical.appendChild(document.createElement('tr'));
  }
  // Fill the columns of the vertical table and the rows of the horizontal one.
  for (var c = 0; c < monthIds.length; ++c) {
    tbody.horizontal.appendChild(document.createElement('tr'));
    var record = monthInfo[monthIds[monthIds.length-1-c]],
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
            color = '#'+teamInfo[team].color;
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
      monthIds.length * (g.cellWidth + g.columnGap) + 'px';
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

Scoring.fontsActive = function () {
  var g = Scoring;
  g.adjustOptionsEverything();
};

Scoring.adjustOptionsEverything = function () {
  var g = Scoring,
      dummy = g.option.dummy,
      width = dummy.offsetWidth - 2*g.optionPadding.width,
      height = dummy.offsetHeight - 2*g.optionPadding.height,
      left = dummy.offsetLeft;
  g.option.vertical.style.width = width + 'px';
  g.option.horizontal.style.width = width + 'px';
  g.option.vertical.style.height = height + 'px';
  g.option.horizontal.style.height = height + 'px';
  g.option.vertical.style.left = left + 'px';
  g.option.horizontal.style.left = left + 'px';
  g.adjustOptionsVertical();
};

Scoring.adjustOptionsVertical = function () {
  var g = Scoring,
      dummy = g.option.dummy,
      top = dummy.offsetTop,
      height = dummy.offsetHeight;
  if (g.option.vertical == g.option.live) {
    g.option.vertical.style.top = top + 'px';
    g.option.horizontal.style.top = top + height + 'px';
  } else {
    g.option.vertical.style.top = top - height + 'px';
    g.option.horizontal.style.top = top + 'px';
  }
};

Scoring.load = function () {
  var g = Scoring;
  g.makeRankings();
  g.makeSummary();
  g.container = document.getElementById('tallies');
  g.makeTable(g.initialOrientation);

  // Make option elements for switching table orientation.
  var layout = document.getElementById('layout'),
      dummy = layout.getElementsByTagName('div')[0],
      optionWidth = dummy.offsetWidth,
      optionHeight = dummy.offsetHeight;
  g.option = { dummy: dummy };
  var names = ['vertical', 'horizontal'];
  for (var i = 0; i < names.length; ++i) {
    var name = names[i],
        option = document.createElement('div');
    g.option[name] = option;
    option.id = option.innerHTML = name;
    option.className = 'option';
    if (name == g.initialOrientation) {
      option.className += ' live';
      g.option.live = option;
    } else {
      option.className += ' dead';
      g.option.dead = option;
    }
    option.onmouseover = function () {
      g.option.dead.className = 'option dead glow';
    }
    option.onmouseout = function () {
      g.option.dead.className = 'option dead';
    }
    option.onclick = function () {
      var t = g.option.live;
      g.option.live = g.option.dead;
      g.option.dead = t;
      g.option.live.className = 'option live';
      g.option.dead.className = 'option dead';
      g.adjustOptionsVertical();
      g.makeTable(g.option.live.id);
    }
    layout.appendChild(option);
  };
  g.adjustOptionsEverything();
};

window.onload = Scoring.load;
