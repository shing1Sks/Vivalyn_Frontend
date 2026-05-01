import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AgentSpace from "./pages/AgentSpace";
import InviteAccept from "./pages/InviteAccept";
import AgentLive from "./pages/AgentLive";
import AgentAccessLink from "./pages/AgentAccessLink";
import AdminDashboard from "./pages/AdminDashboard";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import RefundPolicy from "./pages/RefundPolicy";
import Support from "./pages/Support";
import PaymentSuccess from "./pages/PaymentSuccess";
import { Analytics } from "@vercel/analytics/react";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/agent-space" element={<AgentSpace />} />
        <Route path="/invite/:inviteId" element={<InviteAccept />} />
        <Route path="/agent/:agentId" element={<AgentLive />} />
        <Route path="/a/:linkToken" element={<AgentAccessLink />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/support" element={<Support />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
      </Routes>

      <Analytics />
    </>
  );
}
