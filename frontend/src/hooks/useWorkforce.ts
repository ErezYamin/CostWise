import { useState, useEffect } from 'react'
import { API_BASE } from '../config'
import { getToken } from '../lib/auth'

export interface StaffMember {
  staff_id: string
  name:     string
  role:     string
  shifts:   Record<string, string>
}

export interface WorkforceData {
  schedule:            StaffMember[]
  predicted_customers: Record<string, number>
  summary:             { total_shifts: number; understaffed_days: number; labor_cost: number }
}

const MOCK: WorkforceData = {
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

export function useWorkforce(weekStart: string) {
  const [data, setData]     = useState<WorkforceData>(MOCK)
  const [isLive, setIsLive] = useState<boolean | null>(null)

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

  return { data, isLive }
}
