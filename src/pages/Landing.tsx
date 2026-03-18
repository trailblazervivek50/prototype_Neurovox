import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ScanFace, ShieldCheck, Sparkles } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-cream text-olive">
      {/* Navbar/Header */}
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <ScanFace className="w-6 h-6 text-sage" />
          <span>Neurovox Ai</span>
        </div>
        <div className="text-sm font-medium underline text-olive-light">
          by edge case innovators
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full flex flex-col items-center text-center mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-beige/50 text-sm font-medium text-olive-light mb-4">
            <Sparkles className="w-4 h-4" />
            <span>Next-Gen Face Scanning</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1]">
            Find Your Perfect <br className="hidden md:block" />
            Mask Fit Instantly
          </h1>
          
          <p className="text-lg md:text-xl text-olive-light max-w-2xl mx-auto mt-6">
            AI-powered face scan for accurate mask sizing. No measurements needed. 
            Just look at the camera and let our technology do the rest.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="mt-12 flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
        >
          <Link
            to="/scan"
            className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-olive text-cream rounded-full font-medium text-lg overflow-hidden transition-transform hover:scale-105 active:scale-95"
          >
            <span className="relative z-10 flex items-center gap-2">
              Start Face Scan
              <ScanFace className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-olive-light translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          </Link>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 w-full"
        >
          {[
            {
              icon: ScanFace,
              title: "Real-time Tracking",
              desc: "Advanced facial landmark detection maps your unique contours."
            },
            {
              icon: Sparkles,
              title: "Instant Results",
              desc: "Get your exact size recommendation in seconds."
            },
            {
              icon: ShieldCheck,
              title: "Privacy First",
              desc: "All processing happens locally on your device."
            }
          ].map((feature, i) => (
            <div key={i} className="flex flex-col items-center text-center p-6 rounded-3xl bg-beige/30 border border-beige/50">
              <div className="w-12 h-12 rounded-2xl bg-beige flex items-center justify-center mb-4 text-olive">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-olive-light text-sm">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
