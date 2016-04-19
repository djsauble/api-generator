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

# Definition for tables in our database
require './models/db'
require './models/table'

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

  # Get the databases for the current user
  @dbs = Db.all(:user => current_user.id)

  # Render the view
  haml :index, :locals => {:dbs => @dbs}
end

# Provide input for new database connection
get '/databases/add' do
  login_required

  # Render the view
  haml :add_database
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

# Provide input for new table schema
get '/databases/:id/tables/add' do
  login_required

  # Render the view
  haml :add_table, :locals => {:database_id => params[:id]}
end 

# Create a new table
post '/databases/:id/tables/add' do
  login_required

  Table.create(
    :name    => params[:name],
    :columns => params[:columns],
    :db_id   => params[:id]
  )

  # Render the view
  redirect to('/')
end
