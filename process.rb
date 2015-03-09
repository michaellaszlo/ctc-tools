#!/usr/bin/ruby

require 'date'

file_name_re = Regexp.new('^challenge.(\d+).html$')
date_re = Regexp.new('font-weight: bold; \'>\s*(\w+)\s(\d+)')
mcnally_re = Regexp.new('bold; \'>[^>]*(Carole|McNally)')
mcnally_ids = [28, 41, 54, 67, 92, 105, 118]
team_re = Regexp.new('background: #(\w+); font-weight: bold; font-size: 12pt; white-space: nowrap" >([^<]+) (\w+) <')

name_adjust = {
  'ROWING CLUB MANTOVA' => 'Rowing Club Mantova'
}
color_adjust = {
  'Fitness Matters' => '383ec8',
  'Forum Flyers' => 'ab44d0',
  'Independent' => 'f253f2',
  'Paddy Power' => '2bdf2b',
  'Empty the Tanks' => 'ec321a'
}

tallies = []
id_to_team = [nil]
team_to_info = {}

dir = 'scrape'
Dir.entries(dir).sort.each do |file_name|
  file_name =~ file_name_re
  next if $~ == nil
  month_id = $1.to_i
  next if mcnally_ids.index(month_id) != nil
  text = open(dir+'/'+file_name).read
  text.encode!('UTF-16', 'UTF-8', :invalid => :replace, :replace => '')
  text.encode!('UTF-8', 'UTF-16')
  text =~ date_re
  date = Date.parse($1+' '+$2)
  date_string = date.strftime('%Y %B')
  scan_tuples = text.scan(team_re)
  if scan_tuples.length == 0
    puts 'no match'
    break
  end
  boat_count = Hash.new(0)
  scan_tuples.each do |color, team, number|
    team = name_adjust[team] if name_adjust.include? team
    if not team_to_info.include? team
      color = color_adjust[team] if color_adjust.include? team
      color = color.downcase
      team_id = id_to_team.length
      id_to_team.push(team)
      team_to_info[team] = { 'id' => team_id, 'color' => color }
    end
    boat_count[team] += 1
  end
  counts = boat_count.to_a.sort_by {|team, count| [-count, team] }
  number = counts.length
  tally = [month_id, date_string, counts]
  tallies.push(tally)
end

tallies.sort!
puts 'var monthIds = ['+(tallies.map {|tally| tally[0] }.join ', ')+'];'
puts 'var monthInfo = {'
parts = []
tallies.each do |month_id, date_string, counts|
  parts.push("  %d: { dateString: '%s', tally: [" % [month_id, date_string] + counts.map {|t, c| "{ team: '%s', boats: %d }" % [t, c] }.join(', ') + '] }')
end
puts parts.join(",\n")
puts '};'

parts = []
id_to_team[1..-1].each do |team|
  info = team_to_info[team]
  id, color = info['id'], info['color']
  parts.push "  '%s': { id: %d, color: '%s' }" % [team, id, color]
end
puts 'var teamInfo = {'
puts parts.join ",\n"
puts '};'
