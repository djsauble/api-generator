# Run the app with `ruby app.rb`

require 'rubygems'
require 'sinatra'
require 'tilt/haml'
require 'dm-core'
require 'dm-migrations'
require 'dm-aggregates'
require 'digest/sha1'
require 'sinatra-authentication'
require 'rest-client'
require 'json'

# Definition for models in our database
require './models/db'
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
  @db = Db.first(:user => current_user.id)
  if !@db
    @db = createDatabase()
  end

  # Get all api keys for the current user
  @api_key = ApiKey.first(:user => current_user.id)
  if !@api_key
    @api_key = createApiKey()
  end

  # What is the base URL for this server?
  @base = request.url

  # Construct the database URL (including credentials if needed)
  if @db.username
    @strings = @db.api.split("://")
    @db_url = "#{@strings[0]}://#{@db.username}:#{@db.password}@#{@strings[1]}/#{@db.table}"
  else
    @db_url = "#{@db.api}/#{@db.table}"
  end

  # Render the view
  haml :index, :locals => {:db => @db, :api_key => @api_key, :base => @base, :db_url => @db_url}
end

# Create a new database
def createDatabase

  # Calculate a unique database name
  @table_name = SecureRandom.urlsafe_base64(nil, false).downcase

  # Get the URI components
  @anonymous = "" # Hardcoded for now, should move to environment variable
  @username = "djsauble"
  @password = "VrjzNAjHvDNEhZQcHJbKtCZcm9CRdMKXtiRb2PBhuKveiktswj"
  @api = "https://djsauble.cloudant.com" # Hardcoded for now, should move to environment variable
  @strings = @api.split("://")
  @strings[1].chomp!("/")

  # Instantiate the new table
  if @anonymous == "anonymous"
    # Anonymous access
    @uri = "#{@strings[0]}://#{@strings[1]}/#{@table_name}"
    RestClient.put(@uri, {"Content-Type" => "text/json"})
  else
    @uri = "#{@strings[0]}://#{@username}:#{@password}@#{@strings[1]}/#{@table_name}"
    RestClient.put(@uri, {"Content-Type" => "text/json"})
  end

  # Record data about the new database
  return Db.create(
    :user     => current_user.id,
    :api      => @api,
    :table    => @table_name,
    :username => @username,
    :password => @password
  )
end

# Create a new user
def createApiKey

  # Calculate a unique api key and a unique token
  @api_key = SecureRandom.urlsafe_base64(nil, false)
  @token = SecureRandom.urlsafe_base64(nil, false)

  # Record data about the new user
  return ApiKey.create(
    :user    => current_user.id,
    :api_key => @api_key,
    :token   => @token
  )
end

# Create a new record (extension point)
put '/api/:database_id' do
  @user   = params[:user]
  @token  = params[:token]

  # Does the given user own the specified table and API key?
  @api_key = ApiKey.first(:api_key => @user, :token => @token)
  @db = Db.get(params[:database_id])

  if @db == nil || @api_key == nil || @api_key.user != @db.user
    return
  end

  # Calculate the SHA1 digest of the data
  request.body.rewind
  data = JSON.parse request.body.read
  @sha1 = Digest::SHA1.hexdigest(data.to_s)

  # Get the URI components
  @strings = @db.api.split("://")
  @strings[1].chomp!("/")

  # Instantiate the new row
  @uri = ""
  if @db.username != "" && @db.password != ""
    @uri = "#{@strings[0]}://#{@db.username}:#{@db.password}@#{@strings[1]}/#{@db.table}/#{@sha1}"
  else
    # Anonymous access
    @uri = "#{@strings[0]}://#{@strings[1]}/#{@db.table}/#{@sha1}"
  end

  # Instantiate a new document
  @doc = JSON.parse(RestClient.put(
    @uri,
    '{"created_by":"' + @api_key.api_key + '","timestamp":"' + Time.now.getutc.to_s + '"}'
  ))

  # Add an attachment with the run data
  RestClient.put(
    "#{@uri}/data.json",
    JSON.pretty_generate(data),
    {"Content-Type" => "text/json", "If-Match" => @doc["rev"]}
  )
end
