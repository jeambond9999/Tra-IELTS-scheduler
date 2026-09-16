# frozen_string_literal: true

require "test_helper"
require "open3"

class DatabaseAdapterTest < ActiveSupport::TestCase
  test "test environment uses SQLite" do
    assert_equal "SQLite", ActiveRecord::Base.connection.adapter_name
  end

  test "test environment ignores database URL overrides" do
    env = {
      "RAILS_ENV" => "test",
      "DATABASE_URL" => "postgresql://postgres:postgres@127.0.0.1:1/not_real",
      "TEST_DATABASE_URL" => "postgresql://postgres:postgres@127.0.0.1:1/not_real"
    }
    command = [ RbConfig.ruby, Rails.root.join("bin/rails").to_s, "runner", "puts ActiveRecord::Base.connection_db_config.adapter" ]

    stdout, stderr, status = Open3.capture3(env, *command, chdir: Rails.root.to_s)

    assert status.success?, stderr
    assert_equal "sqlite3", stdout.strip
  end
end
