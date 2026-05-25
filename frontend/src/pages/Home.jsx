import { SignInButton } from "@clerk/clerk-react";
import { Terminal, Video, Cpu, Sparkles, ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";

function Home() {
  return (
    <div className="relative min-h-[calc(100vh-73px)] overflow-hidden bg-zinc-950 flex flex-col items-center justify-center px-6 py-12">
      {/* Background Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-1/3 w-[600px] h-[300px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto mb-16 relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-indigo-400 font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-gen Technical Interview Simulator</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-b from-white via-zinc-100 to-zinc-500 bg-clip-text text-transparent mb-6">
          Succeed in your next <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text">Tech Interview.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-8">
          Simulate the high-pressure environment of FAANG loops. Get real-time AI-led evaluations, Code execution, Webcam previews, and automated voice transcripts.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <SignInButton mode="modal">
            <button className="px-8 py-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-lg shadow-indigo-500/25 flex items-center gap-2 cursor-pointer group">
              Start Free Trial 
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </SignInButton>
          <a href="#features" className="px-8 py-3.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold transition">
            Learn More
          </a>
        </div>
      </div>

      {/* Feature Grid */}
      <div id="features" className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 w-full relative">
        {/* Card 1 */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-sm hover:border-zinc-700/60 transition group">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-105 transition-transform">
            <Terminal className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">LeetCode Split-Screen</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Write, compile, and submit code in Python, JS, C++, or Go. Experience real code completion triggers side-by-side with your problem.
          </p>
        </div>

        {/* Card 2 */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-sm hover:border-zinc-700/60 transition group">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-105 transition-transform">
            <Video className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Webcam & Voice Typing</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Simulate face-to-face setups with a mock webcam overlay and mic status. Speak to transcribe your verbal answers using high-speed voice transcription.
          </p>
        </div>

        {/* Card 3 */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-sm hover:border-zinc-700/60 transition group">
          <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-6 group-hover:scale-105 transition-transform">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Gemini 2.0 Evaluation</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Get an overall performance score, metrics for code speed/accuracy, soft-skills, strengths & weaknesses, and line-by-line code feedback.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;