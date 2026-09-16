# frozen_string_literal: true

class RenameChauAnhToChanh < ActiveRecord::Migration[8.1]
  def up
    Person.where(name: "Châu Anh", role: "teacher").update_all(name: "Chanh")
  end

  def down
    Person.where(name: "Chanh", role: "teacher").update_all(name: "Châu Anh")
  end
end
