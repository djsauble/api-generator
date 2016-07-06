class Db
  include DataMapper::Resource

  property :id, Serial
  property :user, String
  property :api, String
  property :table, String
  property :username, String
  property :password, String
end
