#!/usr/bin/ruby

require 'date'

file_name_re = Regexp.new('^challenge.(\d+).html$')
date_re = Regexp.new('font-weight: bold; \'>\s*(\w+)\s(\d+)')
mcnally_re = Regexp.new('bold; \'>[^>]*(Carole|McNally)')
mcnally_ids = [28, 41, 54, 67, 92, 105, 118]
team_re = Regexp.new('background: #(\w+); font-weight: bold; font-size: 12pt; white-space: nowrap" >([^<]+) (\w+) <')

max_number = 0
tallies = []
team_colors = {}

dir = 'scrape'
Dir.entries(dir).sort.each do |file_name|
  file_name =~ file_name_re
  next if $~ == nil
  id = $1.to_i
  next if mcnally_ids.index(id) != nil
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
  team_count = Hash.new(0)
  scan_tuples.each do |color, team, number|
    team_colors[team] = color.downcase
    team_count[team] += 1
  end
  counts = team_count.to_a.sort_by {|team, count| [-count, team] }
  number = counts.length
  max_number = number if number > max_number
  tally = [id, date_string, counts]
  tallies.push(tally)
end

#puts 'max_number = %d' % max_number

tallies.sort!.reverse!
puts 'var records = ['
parts = []
tallies.each do |id, date_string, counts|
  parts.push("  { id: %d, dateString: '%s', tally: [" % [id, date_string] + counts.map {|t, c| "{ team: '%s', boats: %d }" % [t, c] }.join(', ') + '] }')
end
puts parts.join(",\n")
puts '];'

puts 'var colors = {'
puts team_colors.sort.map {|team, color| "  '%s': '%s'" % [team, color] }.join ",\n"
puts '};'
