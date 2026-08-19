import { useState } from 'react'
import { getToken } from '../lib/auth'
import { API_BASE } from '../config'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SHIFT_CYCLE = ['Morning', 'Evening', 'Day Off']

const SHIFT_STYLES: Record<string, string> = {
  Morning: 'bg-blue-600 text-white',
  Evening: 'bg-purple-600 text-white',
  'Day Off': 'bg-gray-700 text-gray-400',
}

type EmployeeSchedule = {
  staff_id: string
  name: string
  role: string
  shifts: Record<string, string>
}

type WorkforceData = {
  week_start: string
  schedule: EmployeeSchedule[]
  predicted_customers: Record<string, number>
  summary: {
    total_shifts: number
    understaffed_days: number
    labor_cost: number
  }
}

function ShiftChip({ value, onClick }: { value: string; onClick: () => void }) {
  return (
    <span
      onClick={onClick}
      title="Click to change shift"
      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-75 transition-opacity select-none ${SHIFT_STYLES[value] ?? 'bg-gray-700 text-gray-400'}`}
    >
      {value}
    </span>
  )
}

export default function WorkforcePage() {
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay())
    return d.toISOString().split('T')[0]
  })

  const [data, setData] = useState<WorkforceData | null>(null)
  const [schedule, setSchedule] = useState<EmployeeSchedule[]>([])
  const [approved, setApproved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLive, setIsLive] = useState<boolean | null>(null)

  const generateSchedule = async () => {
    try {
      setLoading(true)
      setError('')
      setApproved(false)

      const token = await getToken()
      const response = await fetch(`${API_BASE}/workforce?week=${weekStart}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const result: WorkforceData = await response.json()
      setData(result)
      setSchedule(result.schedule ?? [])
      setIsLive(true)
    } catch (err) {
      console.error(err)
      setError('Failed to generate workforce schedule. Please try again.')
      setIsLive(false)
    } finally {
      setLoading(false)
    }
  }

  const cycleShift = (staffId: string, day: string) => {
    setSchedule(prev => prev.map(emp => {
      if (emp.staff_id !== staffId) return emp
      const current = emp.shifts[day] ?? 'Day Off'
      const nextIdx = (SHIFT_CYCLE.indexOf(current) + 1) % SHIFT_CYCLE.length
      return { ...emp, shifts: { ...emp.shifts, [day]: SHIFT_CYCLE[nextIdx] } }
    }))
  }

  const dayWarnings = DAYS.reduce<Record<string, string>>((acc, d) => {
    const shifts = schedule.map(emp => emp.shifts[d] ?? 'Day Off')
    const hasMorning = shifts.some(s => s === 'Morning')
    const hasEvening = shifts.some(s => s === 'Evening')
    if (!hasMorning && !hasEvening) acc[d] = 'no staff'
    else if (!hasMorning) acc[d] = 'no morning'
    else if (!hasEvening) acc[d] = 'no evening'
    return acc
  }, {})
  const canApprove = data !== null && Object.keys(dayWarnings).length === 0

  const formatWeekRange = (start: string) => {
    const s = new Date(start)
    const e = new Date(start)
    e.setDate(e.getDate() + 6)
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const resetGeneratedSchedule = (newWeekStart: string) => {
    setWeekStart(newWeekStart)
    setData(null)
    setSchedule([])
    setApproved(false)
    setError('')
    setIsLive(null)
  }

  const prevWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    resetGeneratedSchedule(d.toISOString().split('T')[0])
  }

  const nextWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    resetGeneratedSchedule(d.toISOString().split('T')[0])
  }

  const approveSchedule = async () => {
    if (!data) return

    if (isLive) {
      const token = await getToken()
      await fetch(`${API_BASE}/workforce/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ week_start: weekStart, schedule }),
      }).catch(() => {})
    }
    setApproved(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">Workforce Management</h1>
            <p className="text-sm mt-1" style={{ color: '#8899BB' }}>
              Configure workforce factors, then let the AI generate an optimal weekly schedule
            </p>
          </div>
          {loading && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-400">● Generating</span>}
          {!loading && isLive === true && <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#052e16', color: '#10B981' }}>● Live</span>}
          {!loading && isLive === false && <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#1A2A40', color: '#8899BB' }}>● Error</span>}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prevWeek} className="px-3 py-1.5 rounded-lg text-white" style={{ background: '#1A2A40' }}>←</button>
          <span className="text-white text-sm font-medium">{formatWeekRange(weekStart)}</span>
          <button onClick={nextWeek} className="px-3 py-1.5 rounded-lg text-white" style={{ background: '#1A2A40' }}>→</button>
        </div>
      </div>

      {/* Generate card */}
      <div className="rounded-xl p-6 space-y-4" style={{ background: '#111827', border: '1px solid #1A2A40' }}>
        <div>
          <h2 className="text-white font-semibold">Prediction Factors</h2>
          <p className="text-sm mt-1" style={{ color: '#8899BB' }}>
            The AI considers previous sales, predicted customers, weather and weekly demand patterns.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <span className="px-4 py-2 rounded-full text-sm" style={{ background: '#0C1422', color: '#8899BB', border: '1px solid #1A2A40' }}>📊 Previous sales</span>
          <span className="px-4 py-2 rounded-full text-sm" style={{ background: '#0C1422', color: '#8899BB', border: '1px solid #1A2A40' }}>☔ Weather forecast</span>
          <span className="px-4 py-2 rounded-full text-sm" style={{ background: '#0C1422', color: '#8899BB', border: '1px solid #1A2A40' }}>👥 Staff roles</span>
          <span className="px-4 py-2 rounded-full text-sm" style={{ background: '#0C1422', color: '#8899BB', border: '1px solid #1A2A40' }}>📅 Weekly demand</span>
        </div>

        <button
          onClick={generateSchedule}
          disabled={loading}
          className="px-6 py-3 rounded-lg font-semibold text-white disabled:opacity-50 transition-colors"
          style={{ background: '#3B82F6' }}
        >
          {loading ? 'Generating Workforce Schedule...' : 'Generate Workforce Schedule'}
        </button>

        {error && <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>}
      </div>

      {!data && !loading && (
        <div className="rounded-xl p-6 text-center" style={{ background: '#0C1422', border: '1px dashed #1A2A40' }}>
          <p className="text-sm" style={{ color: '#8899BB' }}>
            No schedule generated yet. Click the button above to create the AI workforce plan.
          </p>
        </div>
      )}

      {data && (
        <>
          {/* Schedule grid */}
          <div className="rounded-xl overflow-hidden" style={{ background: '#111827' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #1A2A40' }}>
                  <th className="text-left px-4 py-3" style={{ color: '#8899BB' }}>Employee</th>
                  {DAYS.map(d => (
                    <th key={d} className="px-4 py-3 text-center font-semibold"
                      style={{ color: dayWarnings[d] ? '#EF4444' : '#8899BB' }}>
                      {d}
                      {dayWarnings[d] && <div className="text-xs font-normal">{dayWarnings[d]}</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedule.map(emp => (
                  <tr key={emp.staff_id} style={{ borderBottom: '1px solid #1A2A40' }}>
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{emp.name}</div>
                      <div className="text-xs" style={{ color: '#8899BB' }}>{emp.role}</div>
                    </td>
                    {DAYS.map(d => (
                      <td key={d} className="px-4 py-3 text-center">
                        <ShiftChip
                          value={emp.shifts[d] ?? 'Day Off'}
                          onClick={() => cycleShift(emp.staff_id, d)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr style={{ background: '#0C1422' }}>
                  <td className="px-4 py-3 text-xs font-semibold" style={{ color: '#3B82F6' }}>Predicted Customers</td>
                  {DAYS.map(d => (
                    <td key={d} className="px-4 py-3 text-center text-white font-medium text-xs">
                      {data.predicted_customers[d]}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl p-4" style={{ background: '#111827' }}>
              <div className="text-xs mb-1" style={{ color: '#8899BB' }}>Total Shifts This Week</div>
              <div className="text-2xl font-bold text-white">{data.summary.total_shifts}</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: '#111827' }}>
              <div className="text-xs mb-1" style={{ color: '#8899BB' }}>Understaffed Days</div>
              <div className="text-2xl font-bold" style={{ color: data.summary.understaffed_days > 0 ? '#F59E0B' : '#10B981' }}>
                {data.summary.understaffed_days}
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: '#111827' }}>
              <div className="text-xs mb-1" style={{ color: '#8899BB' }}>Labor Cost Estimate</div>
              <div className="text-2xl font-bold text-white">${data.summary.labor_cost.toLocaleString()}</div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4">
            {!canApprove && (
              <p className="text-sm" style={{ color: '#EF4444' }}>
                {Object.entries(dayWarnings).map(([d, w]) => `${d}: ${w}`).join(' · ')}
              </p>
            )}
            <button onClick={approveSchedule} disabled={approved || !canApprove}
              className="px-6 py-3 rounded-lg font-semibold text-white disabled:opacity-40 transition-colors"
              style={{ background: approved ? '#10B981' : '#3B82F6' }}>
              {approved ? '✓ Schedule Approved' : 'Approve Schedule'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
