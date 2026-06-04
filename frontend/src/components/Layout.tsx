import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#080E1A' }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 28px',
          background: '#080E1A',
        }}
      >
        <Outlet />
      </main>
    </div>
  )
}
