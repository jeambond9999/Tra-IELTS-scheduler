# frozen_string_literal: true

[
  { email: "anhnguyen08061999@gmail.com", roles: "teacher", name: "Chanh (Châu Anh)" },
  { email: "hamylhptc@gmail.com", roles: "teacher", name: "Hà My" },
  { email: "nknha1310@gmail.com", roles: "teacher", name: "Ngọc Hà" },
  { email: "ngocquynhgiang.vo@gmail.com", roles: "teacher", name: "Quỳnh Giang" },
  { email: "nguyenanhkhoa305@gmail.com", roles: "teacher", name: "GV Khoa" },
  { email: "ngphtrinh23@gmail.com", roles: "teacher", name: "Suzie Nguyen" },
  { email: "tranguyen.works@gmail.com", roles: "teacher,admin", name: "Phương Trà" },
  { email: "nguyenngogochanh250905@gmail.com", roles: "sales", name: "Ngọc Hạnh" },
  { email: "thaonhienworkspace@gmail.com", roles: "sales,admin", name: "Thảo Nhiên" },
  { email: "springmai3012@gmail.com", roles: "sales,cs", name: "Mai Mai" },
  { email: "jimmy.nguyen@talemy.vn", roles: "admin", name: "Jimmy Nguyễn" }
].each do |account|
  user = User.find_or_initialize_by(email: account[:email])
  user.name = account[:name]
  user.roles = account[:roles]
  user.password = "TraIELTS@123" if user.new_record?
  user.save!
end
