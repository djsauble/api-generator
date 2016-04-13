class Database
  include DataMapper::Resource

  property :id, Serial
  property :user, String
  property :type, String
  property :api, String
  property :username, String
  property :password, String
end
