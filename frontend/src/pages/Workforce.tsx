import { useState, useEffect } from 'react'
import { API_BASE } from '../config'
import { getToken } from '../lib/auth'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const SHIFT_STYLES: Record<string, string> = {
  'Morning': 'bg-blue-600 text-white',
  'Evening': 'bg-purple-600 text-white',
  'Day Off': 'bg-gray-700 text-gray-400',
}

function ShiftChip({ value }: { value: string }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${SHIFT_STYLES[value] ?? 'bg-gray-700 text-gray-400'}`}>
      {value}
    </span>
  )
}

const MOCK = {
  schedule: [
    { staff_id: 's1', name: 'David Cohen',   role: 'Waiter',  shifts: { Sun: 'Morning', Mon: 'Day Off', Tue: 'Evening', Wed: 'Morning', Thu: 'Morning', Fri: 'Evening', Sat: 'Morning' } },
    { staff_id: 's2', name: 'Sarah Johnson', role: 'Waiter',  shifts: { Sun: 'Evening', Mon: 'Morning', Tue: 'Day Off', Wed: 'Evening', Thu: 'Day Off', Fri: 'Morning', Sat: 'Evening' } },
    { staff_id: 's3', name: 'Michael Zhang', role: 'Chef',    shifts: { Sun: 'Morning', Mon: 'Morning', Tue: 'Evening', Wed: 'Day Off', Thu: 'Morning', Fri: 'Morning', Sat: 'Evening' } },
    { staff_id: 's4', name: 'Lisa Park',     role: 'Cashier', shifts: { Sun: 'Day Off', Mon: 'Evening', Tue: 'Morning', Wed: 'Morning', Thu: 'Evening', Fri: 'Day Off', Sat: 'Morning' } },
    { staff_id: 's5', name: 'Tom Wilson',    role: 'Manager', shifts: { Sun: 'Morning', Mon: 'Morning', Tue: 'Morning', Wed: 'Morning', Thu: 'Morning', Fri: 'Day Off', Sat: 'Day Off' } },
  ],
  predicted_customers: { Sun: 120, Mon: 95, Tue: 140, Wed: 110, Thu: 160, Fri: 210, Sat: 195 },
  summary: { total_shifts: 28, understaffed_days: 1, labor_cost: 4200 },
}

export default function WorkforcePage() {
  const [data, setData]       = useState(MOCK)
  const [approved, setApproved] = useState(false)
  const [isLive, setIsLive]   = useState<boolean | null>(null)
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay())
    return d.toISOString().split('T')[0]
  })

  useEffect(() => {
    setIsLive(null)
    getToken()
      .then(token =>
        fetch(`${API_BASE}/workforce?week=${weekStart}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(r => r.json())
          .then(raw => {
            const d = raw.body ? JSON.parse(raw.body) : raw
            if (d?.schedule && d?.predicted_customers && d?.summary) {
              setData(d)
              setIsLive(true)
            } else {
              setIsLive(false)
            }
          })
          .catch(() => setIsLive(false))
      )
      .catch(() => setIsLive(false))
  }, [weekStart])

  const formatWeekRange = (start: string) => {
    const s = new Date(start)
    const e = new Date(start)
    e.setDate(e.getDate() + 6)
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d.toISOString().split('T')[0]) }
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d.toISOString().split('T')[0]) }

  const approveSchedule = async () => {
    if (isLive) {
      const token = await getToken()
      await fetch(`${API_BASE}/workforce/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ week_start: weekStart, schedule: data.schedule }),
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
            <p className="text-sm mt-1" style={{ color: '#8899BB' }}>AI-generated weekly schedule</p>
          </div>
          {isLive === null && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-400">● Loading</span>
          )}
          {isLive === true && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#052e16', color: '#10B981' }}>● Live</span>
          )}
          {isLive === false && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#1A2A40', color: '#8899BB' }}>● Mock</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prevWeek} className="px-3 py-1.5 rounded-lg text-white" style={{ background: '#1A2A40' }}>←</button>
          <span className="text-white text-sm font-medium">{formatWeekRange(weekStart)}</span>
          <button onClick={nextWeek} className="px-3 py-1.5 rounded-lg text-white" style={{ background: '#1A2A40' }}>→</button>
        </div>
      </div>

      {/* Schedule grid */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#111827' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #1A2A40' }}>
              <th className="text-left px-4 py-3" style={{ color: '#8899BB' }}>Employee</th>
              {DAYS.map(d => <th key={d} className="px-4 py-3 text-center" style={{ color: '#8899BB' }}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.schedule.map(emp => (
              <tr key={emp.staff_id} style={{ borderBottom: '1px solid #1A2A40' }}>
                <td className="px-4 py-3">
                  <div className="text-white font-medium">{emp.name}</div>
                  <div className="text-xs" style={{ color: '#8899BB' }}>{emp.role}</div>
                </td>
                {DAYS.map(d => (
                  <td key={d} className="px-4 py-3 text-center">
                    <ShiftChip value={emp.shifts[d as keyof typeof emp.shifts] ?? 'Day Off'} />
                  </td>
                ))}
              </tr>
            ))}
            <tr style={{ background: '#0C1422' }}>
              <td className="px-4 py-3 text-xs font-semibold" style={{ color: '#3B82F6' }}>Predicted Customers</td>
              {DAYS.map(d => (
                <td key={d} className="px-4 py-3 text-center text-white font-medium text-xs">
                  {data.predicted_customers[d as keyof typeof data.predicted_customers]}
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

      <div className="flex justify-end">
        <button onClick={approveSchedule} disabled={approved}
          className="px-6 py-3 rounded-lg font-semibold text-white disabled:opacity-60 transition-colors"
          style={{ background: approved ? '#10B981' : '#3B82F6' }}>
          {approved ? '✓ Schedule Approved' : 'Approve Schedule'}
        </button>
      </div>
    </div>
  )
}
