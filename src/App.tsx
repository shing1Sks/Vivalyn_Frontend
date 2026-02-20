import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import AgentSpace from './pages/AgentSpace'
import InviteAccept from './pages/InviteAccept'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/agent-space" element={<AgentSpace />} />
      <Route path="/invite/:inviteId" element={<InviteAccept />} />
    </Routes>
  )
}
