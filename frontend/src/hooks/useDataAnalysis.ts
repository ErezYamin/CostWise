import { useState, useEffect } from 'react'
import { API_BASE } from '../config'
import { getToken } from '../lib/auth'

export interface Upload {
  filename:     string
  uploaded_at:  string
  status:       string
  record_count: string
}

export function useDataAnalysis() {
  const [uploads, setUploads] = useState<Upload[]>([])

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
  }, [])

  return { uploads }
}
