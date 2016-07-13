class Sms
  include DataMapper::Resource

  property :id, Serial
  property :user, String
  property :phone, String
end
