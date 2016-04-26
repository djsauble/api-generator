# Run the app with `ruby app.rb`

require 'rubygems'
require 'sinatra'
require 'tilt/haml'
require 'dm-core'
require 'dm-migrations'
require 'dm-aggregates'
require 'digest/sha1'
require 'sinatra-authentication'
require 'couchrest'
require 'json'

# Definition for tables in our database
require './models/db'
require './models/table'
require './models/api_key'

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

  # Get all api keys for the current user
  @api_keys = ApiKey.all(:user => current_user.id)

  # What is the base URL for this server?
  @base = request.url

  # Render the view
  haml :index, :locals => {:dbs => @dbs, :api_keys => @api_keys, :base => @base}
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

  # Record data about the new database
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

  # Fetch the username and password
  @db = Db.get(params[:id])

  # Get the URI components
  @strings = @db.api.split("://")
  @strings[1].chomp!("/")

  # Instantiate the new table
  if @db.username != "" && @db.password != ""
    @uri = "#{@strings[0]}://#{@db.username}:#{@db.password}@#{@strings[1]}/#{params[:name]}"
    CouchRest.put(@uri)
  else
    # Anonymous access
    @uri = "#{@strings[0]}://#{@strings[1]}/#{params[:name]}"
    CouchRest.put(@uri)
  end

  # Record data about the new table
  Table.create(
    :name    => params[:name],
    :columns => params[:columns],
    :db_id   => params[:id]
  )

  # Render the view
  redirect to('/')
end

# Define a new user token
get '/api_keys/add' do
  login_required

  # Render the view
  haml :add_api_key
end

# Create a new user
post '/api_keys/add' do
  login_required

  # Record data about the new user
  ApiKey.create(
    :user    => current_user.id,
    :api_key => params[:api_key],
    :token   => params[:token]
  )

  # Redirect to the index view
  redirect to('/')
end

# Create a new record (extension point)
put '/api/:table_id' do
  @token  = params[:token]

  # Does the same user own the specified table and API key?
  @api_key = ApiKey.first(:token => @token)
  @table = Table.get(params[:table_id])
  @db = Db.get(@table.db_id)

  if @api_key.user != @db.user
    return
  end

  # Calculate the SHA1 digest of the data
  request.body.rewind
  data = JSON.parse request.body.read
  @sha1 = Digest::SHA1.hexdigest(data.to_s)

  # Instantiate the new row
  CouchRest.put(
    "https://#{@db.username}:#{@db.password}@djsauble.cloudant.com/#{@table.name}/#{@sha1}",
    'created_by' => @api_key.api_key,
    'timestamp' => Time.now.getutc,
    'data' => data
  )
end
