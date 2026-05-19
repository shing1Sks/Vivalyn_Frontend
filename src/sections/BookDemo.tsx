import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Zap,
  SlidersHorizontal,
  DollarSign,
  MessageCircle,
} from "lucide-react";
import { fadeInUp, staggerContainer } from "../lib/motion";

declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (opts: { url: string }) => void;
    };
  }
}

const CALENDLY_URL = "https://calendly.com/shreyash-vivalyn/30min";

const AGENDA = [
  {
    icon: Zap,
    title: "Live demo",
    desc: "See the AI agent handle real calls end-to-end.",
  },
  {
    icon: SlidersHorizontal,
    title: "Fit check",
    desc: "We map Vivalyn to your specific workflow.",
  },
  {
    icon: DollarSign,
    title: "Transparent pricing",
    desc: "No surprises. Walk away with clear numbers.",
  },
  {
    icon: MessageCircle,
    title: "Open Q&A",
    desc: "Ask anything, no sales pressure.",
  },
];

export default function BookDemo() {
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;

    if (!document.querySelector('link[href*="calendly.com/assets/external/widget.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://assets.calendly.com/assets/external/widget.css";
      document.head.appendChild(link);
    }

    if (!document.querySelector('script[src*="calendly.com/assets/external/widget.js"]')) {
      const script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  function openPopup() {
    window.Calendly?.initPopupWidget({ url: CALENDLY_URL });
  }

  return (
    <section id="demo" className="py-20 md:py-24 px-6 bg-gray-50">
      <div className="max-w-300 mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-start">

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="md:pt-6"
        >
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-2 mb-5"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-indigo-600 uppercase tracking-wide">
              Meet the founder
            </span>
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            className="text-3xl md:text-[36px] font-semibold text-gray-900 mb-4"
          >
            See Vivalyn in action
          </motion.h2>

          <motion.p variants={fadeInUp} className="text-lg text-gray-600 mb-10">
            Book a 30-minute call, get a live walkthrough and see how Vivalyn
            fits your workflow.
          </motion.p>

          <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-4 mb-5">
            {AGENDA.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-center mb-2 gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mb-3">
                    <Icon size={15} className="text-indigo-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    {title}
                  </p>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="border-t border-gray-200 pt-6"
          >
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">
              Hosted by
            </p>
            <p className="text-sm font-semibold text-gray-900">Shreyash Singh</p>
            <p className="text-sm text-gray-500">Founder, Vivalyn</p>
          </motion.div>

          <motion.div variants={fadeInUp} className="mt-8 md:hidden">
            <button
              onClick={openPopup}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-5 py-3 transition-colors duration-[120ms] cursor-pointer"
            >
              <Calendar size={15} />
              Schedule a Demo with our Founder
            </button>
          </motion.div>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="hidden md:block bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
        >
          <div
            className="calendly-inline-widget"
            data-url={`${CALENDLY_URL}?primary_color=b412e5&hide_event_type_details=1&hide_gdpr_banner=1`}
            style={{ minWidth: "320px", height: "660px" }}
          />
        </motion.div>

      </div>
    </section>
  );
}
