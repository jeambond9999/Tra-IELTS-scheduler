export type PersonRole = 'teacher' | 'sales' | 'cs' | 'admin'

export type CSReservationReminderItem = {
  enrollmentId: number
  studentId?: number
  studentName: string
  studentCode: string
  course: string
  teacherName?: string
  reservedFrom?: string | null
  resumeDate?: string | null
  reservationNote?: string | null
  preReservationSchedule?: string | null
  reservationDays: number
  daysUntilResume?: number | null
  isOverdue: boolean
  isExpiringSoon: boolean
}

export type CSReservationReminders = {
  totalReserved: number
  overdueCount: number
  expiringSoonCount: number
  items: CSReservationReminderItem[]
}

export type AdminTeacherStat = {
  teacherId: number
  teacherName: string
  monthSummary: {
    availableCa: number
    bookedCa: number
    completedCa: number
    totalCa: number
    monthlyCommitment: number
    kpiPercentage: number
    bookRatioPercentage: number
    doneRatePercentage?: number
  }
  studentCount: number
  almostEndCount: number
  studentTracking: Array<{
    enrollmentId?: number
    studentId?: number
    teacherId?: number
    teacherName?: string
    studentName: string
    studentCode: string
    course: string
    baseline?: string | null
    aim?: string | null
    examDate?: string | null
    studentNote?: string | null
    examStatus?: 'chưa thi' | 'sắp thi' | 'đã thi' | string | null
    actualScore?: string | null
    aimAchieved?: boolean | null
    paymentStatus: string
    tuitionNote?: string | null
    active?: boolean
    status?: string
    isReserved?: boolean
    reservedFrom?: string | null
    resumeDate?: string | null
    reservationNote?: string | null
    preReservationSchedule?: string | null
    reservationDays?: number
    daysUntilResume?: number | null
    isReservationOverdue?: boolean
    isReservationExpiringSoon?: boolean
    total: number
    completed: number
    remaining: number
    pct: number
    almostEnd: boolean
    isEnded?: boolean
    isActive?: boolean
    hasNewerCourse?: boolean
    isLatestCourse?: boolean
    sessions?: StudentSessionItem[]
  }>
  monthLessons?: LessonSession[]
}

export type SchedulerMutationRedirectParams = {
  role: PersonRole
  person_id: number
  teacher_id: number | 'all' | string
  month_key: string
  week_name: string
}

export type Person = {
  id: number
  name: string
  role: PersonRole
  active: boolean
  weeklyAvailabilityTarget: number
}

export type Student = {
  id: number
  name: string
  code: string
  baseline?: string | null
  aim?: string | null
  examDate?: string | null
  studentNote?: string | null
  examStatus?: string | null
  actualScore?: string | null
  aimAchieved?: boolean | null
}

export type StudentSessionItem = {
  id: number
  scheduledOn: string
  scheduled_on?: string
  startTime: string
  start_time?: string
  endTime: string
  end_time?: string
  durationMinutes: number
  duration_minutes?: number
  dayLabel: string
  day_label?: string
  lessonStatus: string
  lesson_status?: string
  lessonNotes?: string | null
  lesson_notes?: string | null
  csForm: string
  cs_form?: string
  csStatus: string
  cs_status?: string
  teacherId: number
  teacher_id?: number
  teacherName?: string
  teacher_name?: string
}

export type Enrollment = {
  id: number
  courseName: string
  paymentStatus: string
  tuitionNote?: string | null
  meetLink: string
  startDate: string
  totalSessions: number
  frequencyPerWeek: number
  durationMinutes: number
  active: boolean
  status?: string
  reservedFrom?: string | null
  resumeDate?: string | null
  reservationNote?: string | null
  preReservationSchedule?: string | null
  isReserved?: boolean
  reservationDays?: number
  daysUntilResume?: number | null
  isReservationOverdue?: boolean
  isReservationExpiringSoon?: boolean
  teacherId: number
  salesId: number
  student: Student
  existingSessionsCount?: number
  sessions?: StudentSessionItem[]
}

export type LessonSession = {
  id: number
  teacherId: number
  teacherName: string
  scheduledOn: string
  startTime: string
  endTime: string
  durationMinutes: number
  dayLabel: string
  lessonStatus: string
  lessonNotes?: string | null
  csForm: string
  csStatus: string
  enrollment: Enrollment
}

export type TeacherAvailability = {
  id: number
  teacherId: number
  teacherName?: string
  availableOn: string
  startTime: string
  endTime: string
  durationMinutes: number
}

export type WeekDay = {
  name: string
  dayNum: string
  monthNum: string
  yearNum: number
  isoDate: string
  dateFormatted: string
  headerLabel: string
}

export type SchedulerProps = {
  people: {
    teachers: Person[]
    sales: Person[]
    cs: Person[]
  }
  selected: {
    role: PersonRole
    personId: number
    teacherId: number | 'all' | string
    monthKey: string
    weekName: string
  }
  timeIntervals: string[]
  weeks: string[]
  weekDays: WeekDay[]
  teacherAvailabilities: TeacherAvailability[]
  lessonSessions: LessonSession[]
  allWeekAvailabilities?: TeacherAvailability[]
  allWeekLessons?: LessonSession[]
  monthLessonSessions?: LessonSession[]
  monthAvailabilities?: TeacherAvailability[]
  weekSummary: {
    availableCa: number
    bookedCa: number
    completedCa?: number
    totalCa?: number
    fillRatePercentage?: number
    doneRatePercentage?: number
  }
  monthSummary: {
    availableCa: number
    bookedCa: number
    completedCa: number
    totalCa: number
    monthlyCommitment: number
    kpiPercentage: number
    bookRatioPercentage: number
    doneRatePercentage?: number
  }
  weeklyKpis: Array<{
    week: string
    count: number
    availableCa?: number
    bookedCa?: number
    completedCa?: number
    fillRate?: number
    doneRate?: number
    target: number
    pct: number
  }>
  studentTracking: Array<{
    enrollmentId?: number
    studentId?: number
    teacherId?: number
    teacherName?: string
    studentName: string
    studentCode: string
    course: string
    baseline?: string | null
    aim?: string | null
    examDate?: string | null
    studentNote?: string | null
    paymentStatus: string
    tuitionNote?: string | null
    active?: boolean
    status?: string
    isReserved?: boolean
    reservedFrom?: string | null
    resumeDate?: string | null
    reservationNote?: string | null
    preReservationSchedule?: string | null
    reservationDays?: number
    daysUntilResume?: number | null
    isReservationOverdue?: boolean
    isReservationExpiringSoon?: boolean
    total: number
    completed: number
    remaining: number
    pct: number
    almostEnd: boolean
    isEnded?: boolean
    isActive?: boolean
    hasNewerCourse?: boolean
    isLatestCourse?: boolean
    sessions?: StudentSessionItem[]
  }>
  adminStats: AdminTeacherStat[]
  adminUsers?: UserAccount[]
  enrollments?: Enrollment[]
  csReservationReminders?: CSReservationReminders
}

export type StudentTrackingItem = SchedulerProps['studentTracking'][number]

export type KpiQuotaState = {
  count: number
  initialTarget?: number
  updatedTarget?: number
  lastUpdated?: string
}

export type UserAccount = {
  id: number
  name: string
  email: string
  avatarUrl?: string
  roles: string
  rolesList: string[]
  personId?: number | null
  personName?: string | null
  isAdmin?: boolean
  isPureAdmin?: boolean
}

export type TutorRank = 'standard' | 'expert' | 'warning'

export type SalaryMilestoneKey = 'base' | 'active' | 'professional' | 'dedicated'

export type SalaryMilestoneInfo = {
  key: SalaryMilestoneKey
  name: string
  monthlySlots: number
  weeklySlots: number
  expectedMonthly85: number
  expectedWeekly85: number
  standardRate: number
  expertRate: number
  standardIncome: number
  expertIncome: number
}
