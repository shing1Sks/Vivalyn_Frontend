export interface RazorpayOptions {
  key: string;
  // Provide either subscription_id (recurring) or order_id + amount + currency (one-time order)
  subscription_id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  name: string;
  description: string;
  handler: (response: RazorpayPaymentResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

export interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  // Present for subscription payments
  razorpay_subscription_id?: string;
  // Present for order payments
  razorpay_order_id?: string;
  razorpay_signature: string;
}

export interface RazorpayInstance {
  open(): void;
  on(event: string, handler: () => void): void;
}

declare global {
  interface Window {
    Razorpay: new (opts: RazorpayOptions) => RazorpayInstance;
  }
}

export async function loadRazorpayScript(): Promise<boolean> {
  if (typeof window.Razorpay !== "undefined") return true;
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-checkout-js")) {
      const check = setInterval(() => {
        if (typeof window.Razorpay !== "undefined") {
          clearInterval(check);
          resolve(true);
        }
      }, 100);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
