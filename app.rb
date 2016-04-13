# Run the app with `ruby app.rb`

require 'rubygems'
require 'sinatra'
require 'tilt/haml'
require 'dm-core'
require 'dm-migrations'
require 'dm-aggregates'
require 'digest/sha1'
require 'sinatra-authentication'
require 'json'

# Definition for the database table
require './models/db'

# Connect to our MySQL database
DataMapper.setup(:default, "#{ENV["CLEARDB_DATABASE_URL"]}")
DataMapper.auto_upgrade!

# Configure the session cookie
use Rack::Session::Cookie, :secret => "#{ENV["CACHE_SECRET"]}"

get '/' do
  login_required

  # Has user been deleted?
  if current_user == nil
    redirect '/logout'
  end

  # Get the number of databases for the current user
  @count = Db.count(:user => current_user.id)

  # Render the view
  haml :index, :locals => {:count => @count}
end

# Provide input for new database connection
get '/databases/add' do
  login_required

  # Render the view
  haml :add
end

# Create a new database connection
post '/databases/add' do
  login_required

  Db.create(
    :user     => current_user.id,
    :type     => params[:type],
    :api      => params[:api],
    :username => params[:username],
    :password => params[:password]
  )

  # Redirect to the index view
  redirect to('/')
end
