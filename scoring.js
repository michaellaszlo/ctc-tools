var Scoring = {
  monthIds: monthIds,    // We assume that a previously imported
  monthInfo: monthInfo,  // script has defined monthIds, monthInfo,
  teamInfo: teamInfo,    // and teamInfo.
  cellWidth: 160, columnGap: 20, winnerGapHorizontal: 16,
  optionPadding: { height: 2, width: 6 },
  transpose: { horizontal: 'vertical', vertical: 'horizontal' },
  chart: { function: { maxBoats: 40, bar: { span: 20, delta: 1.5 } },
           summary: { bar: { span: 5, delta: 1 } } },
  initialOrientation: 'vertical',
  winner: { rolloverPoints: true }
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
        floated = {},
        board = [];
    // Adjust the point total of the previous month's winner.
    if (previousBoard !== undefined) {
      var info = teamInfo[previousBoard[0].team];
      info.lastChallenge = monthIds[ii-1];
      if (g.winner.rolloverPoints) {
        info.points = Math.max(0, Math.floor(previousBoard[0].delta / 2));
      } else {
        info.points = 0;
      }
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
      var delta = Math.floor(100*Math.log(boats+1)/Math.log(2));
      info.points += delta;
      board.push({ team: team, points: info.points,
          boats: boats, delta: delta });
      floated[team] = true;
    }
    // Now consider teams that haven't.
    for (var ti = 0; ti < teams.length; ++ti) {
      var team = teams[ti],
          info = teamInfo[team];
      if (floated[team] || info.points === 0) {
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

Scoring.makeSummaries = function (orientation) {
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
    info.meanBoats = g.round(info.sumBoats / numMonths, 2);
    var winMonths = info.winMonths;
    if (winMonths.length != 0) {  // else info.meanWinInterval is undefined
      var winIntervalSum = winMonths[0] - info.firstMonth;
      for (var j = 1; j < winMonths.length; ++j) {
        winIntervalSum += winMonths[j] - winMonths[j-1];
      }
      info.meanWinInterval = g.round(winIntervalSum / winMonths.length, 2);
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
      barWidth = g.chart.summary.bar.span,
      barHeight = g.chart.summary.bar.delta,
      tr = document.createElement('tr');
  tr.appendChild(g.makeElement('td'));
  tr.appendChild(g.makeElement('td', 'mean boats<br />per month', 'header'));
  tr.appendChild(g.makeElement('td', 'mean months<br />until first place',
      'header'));
  tr.appendChild(g.makeElement('td', 'historical record: boats floated each month',
      'header chart'));
  tbody.appendChild(tr);
  table.className = 'summary';
  for (var teamIx = 0; teamIx < summary.length; ++teamIx) {
    var info = summary[teamIx],
        fields = [info.team, info.meanBoats,
                  info.meanWinInterval === undefined ?
                  '&minus;' : info.meanWinInterval],
        tr = document.createElement('tr');
    for (var i = 0; i < fields.length; ++i) {
      var td = g.makeElement('td', fields[i]);
      if (i != 0) {
        td.className = 'number';
      }
      tr.appendChild(td);
    }
    // Prepare additional month information.
    var monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'],
        monthNameToNumber = {};
    for (var i = 0; i < monthNames.length; ++i) {
      monthNameToNumber[monthNames[i]] = i;
    }
    for (var i = 0; i < monthIds.length; ++i) {
      var id = monthIds[i],
          thisMonth = monthInfo[id],
          match = thisMonth.dateString.match(/(\d+)\s+(\w+)/);
      thisMonth.year = parseInt(match[1], 10);
      thisMonth.month = { name: match[2] };
      thisMonth.month.number = monthNameToNumber[thisMonth.month.name];
    }
    // Render summary charts.
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

Scoring.round = function (x, digits) {
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
    var monthId = monthIds[monthIds.length - 1 - c],
        record = monthInfo[monthId],
        board = record.board,
        td = document.createElement('td'),
        a = document.createElement('a');
    td.className = 'date';
    a.href = 'http://c2ctc.com/index.php?c_id=' + monthId;
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
  g.container = document.getElementById('leaderboards');
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
  //g.adjustOptionsAll();
};

Scoring.adjustOptionsAll = function () {
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

Scoring.classAdd = function (element, name) {
  if (!element.className) {
    element.className = name;
  } else {
    element.className += ' '+name;
  }
};

Scoring.classRemove = function (element, name) {
  if (!element.className) {
    return;
  }
  var names = element.className.split(/\s+/),
      newClasses = [];
  for (var i = 0; i < names.length; ++i) {
    if (names[i] !== name) {
      newClasses.push(names[i]);
    }
  }
  element.className = newClasses.join(' ');
};

Scoring.classIncludes = function (element, name) {
  if (!element.className) {
    return false;
  }
  var names = element.className.split(/\s+/);
  for (var i = 0; i < names.length; ++i) {
    if (names[i] == name) {
      return true;
    }
  }
  return false;
};

Scoring.getElementsByClass = function (container, tag, name) {
  var g = Scoring,
      elements = container.getElementsByTagName(tag),
      result = [];
  for (var i = 0; i < elements.length; ++i) {
    if (g.classIncludes(elements[i], name)) {
      result.push(elements[i]);
    }
  }
  return result;
};

Scoring.makeToggleHandler = function (toggle, infoBox) {
  var g = Scoring;
  return function () {
    if (g.classIncludes(infoBox, 'show')) {
      g.classRemove(infoBox, 'show');
      g.classRemove(toggle, 'hide');
      toggle.innerHTML = toggle.originalHTML;
    } else {
      g.classAdd(infoBox, 'show');
      g.classAdd(toggle, 'hide');
      toggle.originalHTML = toggle.innerHTML;
      toggle.innerHTML = '&#9660; Hide';
      if (infoBox.resize) {
        infoBox.resize();
      }
    }
  }
};

// Draw chart to illustrate the scoring function.
Scoring.makeFunctionChart = function () {
  var g = Scoring,
      container = document.getElementById('functionChart'),
      maxBoats = g.chart.function.maxBoats,
      scores = new Array(maxBoats + 1),
      labels = {
        count: {},
        score: {}
      },
      label, countLabel, scoreLabel;
  for (var boats = 1; boats <= maxBoats; ++boats) {
    scores[boats] = Math.floor(100 * Math.log(boats+1) / Math.log(2));
  }
  var maxScore = scores[maxBoats],
      barSpan = g.chart.function.bar.span,
      barDelta = g.chart.function.bar.delta,
      labelMargin = Math.floor(barSpan/2.25),
      width = maxScore * barDelta,
      height = maxBoats * barSpan,
      canvas = document.createElement('canvas'),
      context = canvas.getContext('2d');
  canvas.width = width;
  canvas.height = height;
  container.appendChild(canvas);
  countLabel = g.makeElement('span', 'boats', 'label');
  container.appendChild(countLabel);
  scoreLabel = g.makeElement('span', 'points', 'label');
  container.appendChild(scoreLabel);
  for (var count = 1; count <= maxBoats; ++count) {
    var score = scores[count],
        top = (count - 1) * barSpan;
    context.fillStyle = (count % 2 == 0 ? '#cad2b0' : '#c4d5a6');
    context.fillRect(0, top+1, score * barDelta, barSpan);
    context.fillStyle = '#b1ba96';
    context.fillRect(0, top + barSpan, score * barDelta, 1);
    label = labels.count[count] = g.makeElement('span', count, 'label');
    container.appendChild(label);
    label = labels.score[count] = g.makeElement('span', score, 'label');
    container.appendChild(label);
  }
  container.resize = function () {
    for (var count = 1; count <= maxBoats; ++count) {
      width = countLabel.offsetWidth;
      height = countLabel.offsetHeight;
      countLabel.style.top = canvas.offsetTop - height + 'px';
      countLabel.style.left = canvas.offsetLeft - width - labelMargin + 'px';
      scoreLabel.style.top = canvas.offsetTop - height + 'px';
      scoreLabel.style.left = canvas.offsetLeft + labelMargin + 'px';
      var top = (count - 1) * barSpan,
          label = labels.count[count],
          width = label.offsetWidth,
          height = label.offsetHeight;
      label.style.top = canvas.offsetTop + top + 'px';
      label.style.left = canvas.offsetLeft - width - labelMargin + 'px';
      label = labels.score[count];
      label.style.top = canvas.offsetTop + top + 'px';
      label.style.left = canvas.offsetLeft + scores[count]*barDelta +
          labelMargin + 'px';
    }
  };
  container.resize();
};

Scoring.load = function () {
  var g = Scoring;

  // Activate toggle switches for info boxes.
  var toggles = g.getElementsByClass(document, 'span', 'toggle'),
      infoBoxes = g.getElementsByClass(document, 'div', 'infoBox');
  for (var i = 0; i < toggles.length; ++i) {
    toggles[i].onclick = g.makeToggleHandler(toggles[i], infoBoxes[i]);
  }

  g.makeFunctionChart();
  g.makeRankings();
  g.makeSummaries();
  var initialOrientation = 'vertical';
  g.makeTable(initialOrientation);

  // Make button for switching table orientation.
  var button = document.getElementById('button');
  g.label = {  // These are labels inside the button.
    horizontal: document.getElementById('horizontal'),
    vertical: document.getElementById('vertical'),
  };
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

window.onload = Scoring.load;
