import { useState, useRef } from 'react'
import { useDataAnalysis, useDataSummary } from '../hooks/useDataAnalysis'
import type { Upload } from '../hooks/useDataAnalysis'
import { API_BASE } from '../config'
import { getToken } from '../lib/auth'

const STATUS_STYLES: Record<string, string> = {
  'Processed':  'bg-green-900 text-green-400',
  'Processing': 'bg-blue-900 text-blue-400',
  'Error':      'bg-red-900 text-red-400',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-yellow-900 text-yellow-400'}`}>
      {status}
    </span>
  )
}

function UploadRow({ upload }: { upload: Upload }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #1A2A40' }}>
      <div className="flex items-center gap-3">
        <span style={{ color: '#3B82F6' }}>📄</span>
        <div>
          <div className="text-white text-sm">{upload.filename}</div>
          <div className="text-xs" style={{ color: '#8899BB' }}>
            {upload.uploaded_at} · {upload.record_count} records
          </div>
        </div>
      </div>
      <StatusBadge status={upload.status} />
    </div>
  )
}

export default function DataAnalysisPage() {
  const { uploads, refresh }          = useDataAnalysis()
  const { data: summary, loading: summaryLoading } = useDataSummary()
  const [dragging, setDragging]       = useState(false)
  const [uploaded, setUploaded]       = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const uploadFile = async (file: File) => {
    setUploading(true)
    setUploadError(null)
    try {
      const token = await getToken()
      const res = await fetch(`${API_BASE}/data/upload-url`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ filename: file.name, content_type: file.type || 'text/csv' }),
      })
      const { upload_url } = await res.json()
      await fetch(upload_url, {
        method:  'PUT',
        body:    file,
        headers: { 'Content-Type': file.type || 'text/csv' },
      })
      setUploaded(true)
      setTimeout(() => setUploaded(false), 3000)
      setTimeout(() => refresh(), 3000)
    } catch {
      setUploadError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  const handleFileChange = () => {
    const file = fileRef.current?.files?.[0]
    if (file) uploadFile(file)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Data Analysis</h1>
        <p className="text-sm mt-1" style={{ color: '#8899BB' }}>Upload shift reports to retrain AI predictions</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Upload panel */}
        <div className="rounded-xl p-6 space-y-4" style={{ background: '#111827' }}>
          <h2 className="text-white font-semibold">Upload Report</h2>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileRef.current?.click()}
            className="rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors"
            style={{ borderColor: dragging ? '#3B82F6' : '#1A2A40', background: dragging ? '#0C1422' : 'transparent' }}
          >
            <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileChange} />
            <div className="text-4xl mb-3">📄</div>
            {uploading ? (
              <p className="font-medium" style={{ color: '#3B82F6' }}>Uploading…</p>
            ) : uploaded ? (
              <p className="font-medium" style={{ color: '#10B981' }}>✓ Uploaded successfully!</p>
            ) : (
              <>
                <p className="text-white font-medium">Drop your CSV or Excel file here</p>
                <p className="text-sm mt-1" style={{ color: '#8899BB' }}>or click to browse</p>
              </>
            )}
          </div>
          {uploadError && (
            <p className="text-sm text-center" style={{ color: '#F87171' }}>{uploadError}</p>
          )}
          <p className="text-xs text-center" style={{ color: '#8899BB' }}>Supported formats: .csv, .xlsx</p>
        </div>

        {/* Recent uploads panel */}
        <div className="rounded-xl p-6 space-y-4" style={{ background: '#111827' }}>
          <h2 className="text-white font-semibold">Recent Uploads</h2>
          {uploads.length === 0 ? (
            <p className="text-sm" style={{ color: '#8899BB' }}>No uploads yet.</p>
          ) : (
            <div className="space-y-1">
              {uploads.map(u => <UploadRow key={u.upload_id ?? u.filename} upload={u} />)}
            </div>
          )}
        </div>
      </div>

      {/* Prediction vs Reality */}
      <div className="rounded-xl p-6" style={{ background: '#111827' }}>
        <h2 className="text-white font-semibold mb-4">
          Prediction vs Reality{summary?.date ? ` · ${summary.date}` : ''}
        </h2>
        {summaryLoading ? (
          <p className="text-sm" style={{ color: '#8899BB' }}>Loading…</p>
        ) : !summary?.prediction_vs_reality?.length ? (
          <p className="text-sm" style={{ color: '#8899BB' }}>No summary data available.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1A2A40' }}>
                {['Metric', 'AI Predicted', 'Actual', 'Accuracy'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#8899BB', fontSize: 12, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.prediction_vs_reality.map(row => (
                <tr key={row.metric} style={{ borderBottom: '1px solid #1A2A4066' }}>
                  <td style={{ padding: '12px', color: '#EFF6FF' }}>{row.metric}</td>
                  <td style={{ padding: '12px', color: '#8899BB' }}>{row.predicted}</td>
                  <td style={{ padding: '12px', color: '#EFF6FF', fontWeight: 600 }}>{row.actual}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ color: row.status === 'good' ? '#10B981' : '#F59E0B', fontWeight: 600 }}>
                      {row.accuracy}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
