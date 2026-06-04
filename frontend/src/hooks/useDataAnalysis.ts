import { useState, useEffect, useCallback } from 'react'
import { API_BASE } from '../config'
import { getToken } from '../lib/auth'

export interface Upload {
  upload_id?:   string
  filename:     string
  uploaded_at:  string
  status:       string
  record_count: number
}

export interface SummaryRow {
  metric:    string
  predicted: number
  actual:    number
  accuracy:  number
  status:    'good' | 'warning'
}

export interface Summary {
  date:                  string
  prediction_vs_reality: SummaryRow[]
}

export function useDataAnalysis() {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    getToken()
      .then(token =>
        fetch(`${API_BASE}/data/uploads`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(r => r.json())
          .then(raw => {
            const d = raw.body ? JSON.parse(raw.body) : raw
            setUploads(d.uploads ?? [])
          })
          .catch(() => {})
      )
      .catch(() => {})
  }, [refreshKey])

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  return { uploads, refresh }
}

export function useDataSummary() {
  const [data, setData]     = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getToken()
      .then(token =>
        fetch(`${API_BASE}/data/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(r => r.json())
          .then(raw => setData(raw.body ? JSON.parse(raw.body) : raw))
          .catch(() => {})
          .finally(() => setLoading(false))
      )
      .catch(() => setLoading(false))
  }, [])

  return { data, loading }
}
