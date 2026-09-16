import { AdminDashboard } from './admin-dashboard'
import { CalendarToolbar } from './calendar-toolbar'
import { LeadCapacityCalculator } from './lead-capacity-calculator'
import { RankingPolicyTab } from './ranking-policy-tab'
import { SalaryCalculator } from './salary-calculator'
import { SalesOverviewDashboard } from './sales-overview-dashboard'
import { UserManagement } from './user-management'
import type {
  Person,
  PersonRole,
  SchedulerMutationRedirectParams,
  SchedulerProps,
  UserAccount,
} from '../types'

export type AdminTab = 'dashboard' | 'sales_dashboard' | 'salary' | 'ranking' | 'lead_calculator' | 'users'

type CalendarToolbarChange = { monthKey?: string; weekName?: string; teacherId?: number | 'all' | string }

type Props = {
  role: PersonRole
  props: SchedulerProps
  mutationRedirectParams: SchedulerMutationRedirectParams
  adminTab: AdminTab
  setAdminTab: (tab: AdminTab) => void
  monthKey: string
  weekName: string
  teacherId: number | 'all' | string
  selectedTeacher?: Person
  currentUser?: UserAccount | null
  currentCenterEmptySlots: number
  onCalendarToolbarChange: (values: CalendarToolbarChange) => void
  onSelectStudentCode: (code: string) => void
  onSwitchToSalesSchedule: (teacherId: number | 'all') => void
  onSwitchToTeacherSalary: (teacherId: number) => void
}

export function AdminPortal({
  role,
  props,
  mutationRedirectParams,
  adminTab,
  setAdminTab,
  monthKey,
  weekName,
  teacherId,
  selectedTeacher,
  currentUser,
  currentCenterEmptySlots,
  onCalendarToolbarChange,
  onSelectStudentCode,
  onSwitchToSalesSchedule,
  onSwitchToTeacherSalary,
}: Props) {
  return (
    <div className="flex flex-col gap-5">
      {adminTab === 'dashboard' ? (
        <>
          <CalendarToolbar
            role={role}
            monthKey={monthKey}
            weekName={weekName}
            weeks={props.weeks}
            teacherId={teacherId}
            teachers={props.people.teachers}
            onChange={onCalendarToolbarChange}
          />

          <AdminDashboard
            stats={props.adminStats}
            monthKey={monthKey}
            onSelectStudent={(s) => onSelectStudentCode(s.studentCode)}
            onOpenCalculator={() => setAdminTab('lead_calculator')}
          />
        </>
      ) : adminTab === 'sales_dashboard' ? (
        <>
          <CalendarToolbar
            role={role}
            monthKey={monthKey}
            weekName={weekName}
            weeks={props.weeks}
            teacherId={teacherId}
            teachers={props.people.teachers}
            onChange={onCalendarToolbarChange}
          />

          <SalesOverviewDashboard
            adminStats={props.adminStats}
            teachers={props.people.teachers}
            allWeekAvailabilities={props.allWeekAvailabilities}
            allWeekLessons={props.allWeekLessons}
            weekDays={props.weekDays}
            weekName={weekName}
            monthKey={monthKey}
            studentTracking={props.studentTracking}
            onSelectTeacherForSchedule={onSwitchToSalesSchedule}
            onSelectStudentCode={onSelectStudentCode}
            onOpenLeadCalculator={() => setAdminTab('lead_calculator')}
          />
        </>
      ) : adminTab === 'salary' ? (
        <SalaryCalculator
          monthKey={monthKey}
          monthSummary={props.monthSummary}
          adminStats={props.adminStats}
          mode="admin"
          role={role}
          monthLessonSessions={props.monthLessonSessions}
          onSwitchToTeacher={onSwitchToTeacherSalary}
          onMonthChange={(newMonth) => onCalendarToolbarChange({ monthKey: newMonth })}
          onSelectStudentCode={onSelectStudentCode}
          redirectParams={mutationRedirectParams}
        />
      ) : adminTab === 'ranking' ? (
        <RankingPolicyTab
          role={role}
          studentTracking={props.studentTracking}
          monthKey={monthKey}
          adminStats={props.adminStats}
          currentTeacherId={typeof teacherId === 'number' ? teacherId : (props.people.teachers[0]?.id ?? 0)}
          currentTeacherName={selectedTeacher?.name || props.people.teachers[0]?.name}
        />
      ) : adminTab === 'lead_calculator' ? (
        <LeadCapacityCalculator
          autoEmptySlots={currentCenterEmptySlots}
          autoEmptySource={`Lịch khả dụng toàn trung tâm tháng ${monthKey}`}
          onViewSchedule={() => setAdminTab('dashboard')}
        />
      ) : adminTab === 'users' ? (
        <UserManagement users={props.adminUsers} currentUser={currentUser} />
      ) : null}
    </div>
  )
}
