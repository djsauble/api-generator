require 'dm-core'
require 'dm-migrations'
require 'dm-aggregates'

# Definition for SMS model in our database
require './models/sms'

desc "Send SMS to all users within 33% of their weekly mileage goal"
task :send_sms do
  # Connect to our MySQL database
  DataMapper.setup(:default, "#{ENV["CLEARDB_DATABASE_URL"]}")
  DataMapper.auto_upgrade!

  # Get a list of phone numbers to text
  @users = Sms.all

  # Send SMSs
  puts "Sending SMS to the following recipients:"
  @users.each do |u|
    puts u.phone
  end
end
