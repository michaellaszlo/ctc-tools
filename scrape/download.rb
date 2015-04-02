#!/usr/bin/ruby

require 'net/http'

(119..120).each do |id|
  puts 'downloading challenge %d' % id
  text = Net::HTTP.get('c2ctc.com', '/index.php?c_id=%d' % id)
  file_name = 'challenge.%d.html' % id
  file = open(file_name, 'w')
  file.write(text)
  file.close()
  puts 'wrote to %s' % file_name
end
