# frozen_string_literal: true

[
  [ "GV Khoa", "teacher" ],
  [ "Hà My", "teacher" ],
  [ "Chanh", "teacher" ],
  [ "Quỳnh Giang", "teacher" ],
  [ "Phương Trà", "teacher" ],
  [ "Ngọc Hà", "teacher" ],
  [ "Trinh", "teacher" ],
  [ "nhin nhin", "sales" ],
  [ "hẹ hẹ", "sales" ],
  [ "mai mai", "sales" ],
  [ "mai mai", "cs" ]
].each do |name, role|
  Person.find_or_create_by!(name: name, role: role) do |person|
    person.active = true
  end
end

# Seed Users
[
  { email: "AnhNguyen08061999@gmail.com", roles: "teacher", person_name: "Chanh", person_role: "teacher", name: "Chanh (Châu Anh)" },
  { email: "hamylhptc@gmail.com", roles: "teacher", person_name: "Hà My", person_role: "teacher", name: "Hà My" },
  { email: "nknha1310@gmail.com", roles: "teacher", person_name: "Ngọc Hà", person_role: "teacher", name: "Ngọc Hà" },
  { email: "ngocquynhgiang.vo@gmail.com", roles: "teacher", person_name: "Quỳnh Giang", person_role: "teacher", name: "Quỳnh Giang" },
  { email: "nguyenanhkhoa305@gmail.com", roles: "teacher", person_name: "GV Khoa", person_role: "teacher", name: "GV Khoa" },
  { email: "tranguyen.works@gmail.com", roles: "teacher,admin", person_name: "Phương Trà", person_role: "teacher", name: "Phương Trà" },
  { email: "nguyenngogochanh250905@gmail.com", roles: "sales", person_name: "hẹ hẹ", person_role: "sales", name: "Ngọc Hạnh" },
  { email: "thaohienworkspace@gmail.com", roles: "sales,admin", person_name: "nhin nhin", person_role: "sales", name: "Thảo Nhiên" },
  { email: "springmai3012@gmail.com", roles: "sales,cs", person_name: "mai mai", person_role: "sales", name: "Mai Mai" },
  { email: "jimmy.nguyen@talemy.vn", roles: "admin", person_name: nil, person_role: nil, name: "Jimmy Nguyễn" }
].each do |acc|
  user = User.find_or_initialize_by(email: acc[:email].strip.downcase)
  user.name = acc[:name]
  user.roles = acc[:roles]
  user.password = "TraIELTS@123"
  user.password_confirmation = "TraIELTS@123"

  if acc[:person_name].present?
    person = Person.find_by(name: acc[:person_name], role: acc[:person_role]) || Person.find_by(name: acc[:person_name])
    user.person = person if person
  end

  user.save!
end
