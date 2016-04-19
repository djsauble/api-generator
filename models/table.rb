class Table
  include DataMapper::Resource

  property :id, Serial
  property :name, String
  property :columns, Text

  belongs_to :db
end
