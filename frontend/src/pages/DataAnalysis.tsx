import { useState, useRef } from 'react'
import { useDataAnalysis } from '../hooks/useDataAnalysis'
import type { Upload } from '../hooks/useDataAnalysis'

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
  const { uploads }             = useDataAnalysis()
  const [dragging, setDragging] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    setUploaded(true)
    setTimeout(() => setUploaded(false), 3000)
  }

  const handleFileChange = () => {
    setUploaded(true)
    setTimeout(() => setUploaded(false), 3000)
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
            onClick={() => fileRef.current?.click()}
            className="rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors"
            style={{ borderColor: dragging ? '#3B82F6' : '#1A2A40', background: dragging ? '#0C1422' : 'transparent' }}
          >
            <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileChange} />
            <div className="text-4xl mb-3">📄</div>
            {uploaded ? (
              <p className="font-medium" style={{ color: '#10B981' }}>✓ Uploaded successfully!</p>
            ) : (
              <>
                <p className="text-white font-medium">Drop your CSV or Excel file here</p>
                <p className="text-sm mt-1" style={{ color: '#8899BB' }}>or click to browse</p>
              </>
            )}
          </div>
          <p className="text-xs text-center" style={{ color: '#8899BB' }}>Supported formats: .csv, .xlsx</p>
        </div>

        {/* Recent uploads panel */}
        <div className="rounded-xl p-6 space-y-4" style={{ background: '#111827' }}>
          <h2 className="text-white font-semibold">Recent Uploads</h2>
          {uploads.length === 0 ? (
            <p className="text-sm" style={{ color: '#8899BB' }}>No uploads yet.</p>
          ) : (
            <div className="space-y-1">
              {uploads.map(u => <UploadRow key={u.filename} upload={u} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
