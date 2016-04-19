class ApiKey
  include DataMapper::Resource

  property :id, Serial
  property :user, String
  property :api_key, String
  property :token, String
end
