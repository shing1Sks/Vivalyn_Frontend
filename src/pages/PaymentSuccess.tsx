import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchPaymentStatus } from "../lib/api";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

type Phase = "loading" | "success" | "timeout";

export default function PaymentSuccess() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [phase, setPhase] = useState<Phase>("loading");
  const [planTier, setPlanTier] = useState<string | null>(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (authLoading) return;
    if (!session) { navigate("/auth"); return; }

    const provider = params.get("provider") ?? "stripe";
    const ref = params.get("session_id") ?? params.get("sub_id") ?? params.get("order_id") ?? "";
    if (!ref) { setPhase("timeout"); return; }

    const token = session.access_token;
    const MAX = 15;

    const poll = async () => {
      attemptsRef.current += 1;
      try {
        const data = await fetchPaymentStatus(token, provider, ref);
        if (data.status === "completed") {
          setPlanTier(data.plan_tier ?? null);
          setPhase("success");
          return;
        }
        if (attemptsRef.current >= MAX) { setPhase("timeout"); return; }
        setTimeout(poll, 2000);
      } catch {
        if (attemptsRef.current >= MAX) { setPhase("timeout"); return; }
        setTimeout(poll, 2000);
      }
    };

    setTimeout(poll, 2000);
  }, [authLoading, session, navigate, params]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="rounded-xl border border-gray-200 shadow-sm p-10 max-w-sm w-full bg-white text-center">
        {phase === "loading" && (
          <>
            <Loader2 className="mx-auto mb-4 text-indigo-600 animate-spin" size={40} />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Confirming your payment...</h1>
            <p className="text-sm text-gray-500">This usually takes a few seconds.</p>
          </>
        )}

        {phase === "success" && (
          <>
            <CheckCircle className="mx-auto mb-4 text-indigo-600" size={40} />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Payment confirmed</h1>
            {planTier && (
              <p className="text-sm text-gray-600 mb-6 capitalize">
                Your <span className="font-medium">{planTier}</span> plan is now active.
              </p>
            )}
            <button
              onClick={() => navigate("/agent-space")}
              className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors duration-[120ms]"
            >
              Go to Workspace
            </button>
          </>
        )}

        {phase === "timeout" && (
          <>
            <AlertCircle className="mx-auto mb-4 text-amber-500" size={40} />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Still activating...</h1>
            <p className="text-sm text-gray-500 mb-6">
              Your payment was received. The plan may take a minute to activate.
              If it does not appear shortly, contact{" "}
              <a href="mailto:support@vivalyn.in" className="text-indigo-600 underline">
                support@vivalyn.in
              </a>
              .
            </p>
            <button
              onClick={() => navigate("/agent-space")}
              className="w-full border border-gray-200 text-gray-700 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors duration-[120ms]"
            >
              Go to Workspace
            </button>
          </>
        )}
      </div>
    </div>
  );
}
