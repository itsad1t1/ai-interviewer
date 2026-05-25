import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Video, VideoOff, Mic, MicOff, Play, CheckCircle2, ChevronLeft, ChevronRight,
  Timer, Award, Sparkles, Terminal, Activity, RefreshCw, BarChart2, Star, Check, X, ArrowLeft
} from "lucide-react";

function Interview() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");

  // Interview Data State
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [currentAnswer, setCurrentAnswer] = useState("");
  
  // Timer State
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Webcam and Voice Transcription
  const [webcamActive, setWebcamActive] = useState(false);
  const [speechActive, setSpeechActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);

  // Language state for coding editor
  const [editorLang, setEditorLang] = useState("python");

  // Loading / Flow States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);

  // Mock code compilation output
  const [codeOutput, setCodeOutput] = useState("");
  const [isRunningCode, setIsRunningCode] = useState(false);

  // Fetch Session data on mount
  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) return;
      try {
        const res = await axios.get(`http://localhost:8000/interview/${sessionId}`);
        setSession(res.data);
        const fetchedQuestions = res.data.questions || [];
        setQuestions(fetchedQuestions);
        
        // Restore answers if already started
        const savedAnswers = {};
        res.data.answers?.forEach(item => {
          savedAnswers[item.question_idx] = item.answer;
        });
        setAnswers(savedAnswers);
        
        // Set first question starter code or empty text
        if (fetchedQuestions.length > 0) {
          const q = fetchedQuestions[0];
          if (q.type === "coding") {
            const starter = q.code_templates?.[editorLang] || "";
            setCurrentAnswer(savedAnswers[0] || starter);
          } else {
            setCurrentAnswer(savedAnswers[0] || "");
          }
        }
      } catch (err) {
        console.error("Error fetching session:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSession();
  }, [sessionId]);

  // Active Timer Effect
  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  // Webcam controls
  useEffect(() => {
    if (webcamActive) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("Webcam access denied:", err);
          alert("Webcam permission denied or unavailable.");
          setWebcamActive(false);
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [webcamActive]);

  // Speech Recognition (Voice Typing) configuration
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        }
      }
      if (finalTranscript) {
        setCurrentAnswer(prev => prev + finalTranscript);
      }
    };

    rec.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setSpeechActive(false);
    };

    rec.onend = () => {
      setSpeechActive(false);
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleSpeech = () => {
    if (!recognitionRef.current) {
      alert("Voice transcription is not supported by your current browser. Try Chrome, Edge or Safari.");
      return;
    }
    
    if (speechActive) {
      recognitionRef.current.stop();
      setSpeechActive(false);
    } else {
      recognitionRef.current.start();
      setSpeechActive(true);
    }
  };

  // Format Timer as MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  // Save current answer to backend
  const saveAnswer = async (idx, ans) => {
    setIsSaving(true);
    try {
      await axios.post(`http://localhost:8000/interview/${sessionId}/answer`, {
        question_idx: idx,
        answer: ans
      });
      // Update local state copy
      setAnswers(prev => ({ ...prev, [idx]: ans }));
    } catch (err) {
      console.error("Error saving answer:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle language change in Coding Editor
  const handleLangChange = (lang) => {
    setEditorLang(lang);
    const q = questions[currentIdx];
    // If the user hasn't typed anything yet or it's equal to another template, load target starter code
    const currentAnsTrim = currentAnswer.trim();
    const isStarter = Object.values(q.code_templates || {}).some(tpl => tpl.trim() === currentAnsTrim) || !currentAnswer;
    
    if (isStarter && q.code_templates?.[lang]) {
      setCurrentAnswer(q.code_templates[lang]);
    }
  };

  // Navigate Questions
  const handleNavigate = async (newIdx) => {
    if (newIdx < 0 || newIdx >= questions.length) return;
    
    // Save current response
    await saveAnswer(currentIdx, currentAnswer);
    
    // Set next question
    setCurrentIdx(newIdx);
    setCodeOutput("");
    
    // Restore or load templates
    const nextQ = questions[newIdx];
    const restored = answers[newIdx];
    
    if (restored !== undefined) {
      setCurrentAnswer(restored);
    } else if (nextQ.type === "coding") {
      setCurrentAnswer(nextQ.code_templates?.[editorLang] || "");
    } else {
      setCurrentAnswer("");
    }
  };

  // Skip Question
  const handleSkip = () => {
    handleNavigate(currentIdx + 1);
  };

  // Mock code compile trigger
  const runCode = () => {
    setIsRunningCode(true);
    setCodeOutput("Compiling files...\nLinker running...\nRunning test cases...\n");
    
    setTimeout(() => {
      const q = questions[currentIdx];
      const constraintsPassed = q.constraints ? `Checking constraints: ${q.constraints} -> Passed.\n` : "";
      
      setCodeOutput(prev => prev + 
        `${constraintsPassed}Test Case 1: Input: [Example Case] -> Output: Passed\n` +
        `Test Case 2: Input: [Edge Case] -> Output: Passed\n\n` +
        `Result: Success (All test cases passed in 8ms)`
      );
      setIsRunningCode(false);
    }, 1500);
  };

  // Submit and Evaluates entire interview
  const handleFinish = async () => {
    setIsFinishing(true);
    setIsActive(false); // Stop timer

    // Save final question response
    await saveAnswer(currentIdx, currentAnswer);

    try {
      const res = await axios.post(`http://localhost:8000/interview/${sessionId}/finish`);
      setEvaluation(res.data);
    } catch (err) {
      console.error("Error evaluating session:", err);
      alert("AI evaluation service timed out. You can access your report from the dashboard history.");
      navigate("/");
    } finally {
      setIsFinishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] bg-zinc-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400" />
        <span className="text-sm text-zinc-400 mt-4 font-medium">Booting interview session room...</span>
      </div>
    );
  }

  // Display AI Evaluation Scorecard if completed
  if (evaluation) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 min-h-screen">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Assessment Scorecard</h1>
            <p className="text-zinc-400 text-sm mt-1">Here is your customized feedback reports powered by Gemini.</p>
          </div>
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-zinc-800 text-sm font-semibold rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>

        <div className="space-y-8 animate-fadeIn">
          {/* Summary & category panel */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-zinc-900/40 border border-zinc-800 p-8 rounded-2xl backdrop-blur-md relative overflow-hidden shadow-xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            
            <div className="md:col-span-4 flex flex-col items-center justify-center text-center">
              <div className="w-32 h-32 rounded-full border-4 border-dashed border-indigo-500/40 flex items-center justify-center bg-indigo-500/5 shadow-inner">
                <div>
                  <span className="text-5xl font-black text-white">{evaluation.overall_score}</span>
                  <span className="text-[10px] text-zinc-500 block uppercase tracking-wider mt-1">Grade</span>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xs text-zinc-500 uppercase tracking-widest block font-medium">Recommendation</span>
                <span className={`text-lg font-black uppercase tracking-wide ${
                  evaluation.recommendation?.toLowerCase().includes("strong") ? "text-emerald-400" :
                  evaluation.recommendation?.toLowerCase().includes("no hire") ? "text-rose-400" : "text-amber-400"
                }`}>
                  {evaluation.recommendation}
                </span>
              </div>
            </div>

            <div className="md:col-span-8 space-y-4">
              <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                <BarChart2 className="w-4.5 h-4.5 text-indigo-400" /> Category Breakdown
              </h4>
              <div className="space-y-3.5">
                {Object.entries(evaluation.category_scores || {}).map(([key, score], i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-zinc-400 capitalize">{key.replace("_", " ")}</span>
                      <span className="text-white">{score}/100</span>
                    </div>
                    <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
                      <div 
                        className="bg-indigo-500 h-full rounded-full transition-all duration-700" 
                        style={{ width: `${score}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feedback summary text */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Executive Critique</h4>
            <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-900/20 border border-zinc-800 p-5 rounded-2xl backdrop-blur-sm whitespace-pre-line">
              {evaluation.summary_feedback}
            </p>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-emerald-500/10 bg-emerald-500/5">
              <h5 className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-4">
                <Check className="w-4 h-4 bg-emerald-500/10 rounded-full p-0.5" />
                Key Highlights
              </h5>
              <ul className="space-y-2.5 text-xs text-zinc-400 list-disc list-inside">
                {evaluation.strengths?.map((str, i) => (
                  <li key={i}>{str}</li>
                )) || <li>No strengths mapped</li>}
              </ul>
            </div>

            <div className="p-6 rounded-2xl border border-rose-500/10 bg-rose-500/5">
              <h5 className="text-sm font-bold text-rose-400 flex items-center gap-2 mb-4">
                <X className="w-4 h-4 bg-rose-500/10 rounded-full p-0.5" />
                Growth Areas
              </h5>
              <ul className="space-y-2.5 text-xs text-zinc-400 list-disc list-inside">
                {evaluation.weaknesses?.map((weak, i) => (
                  <li key={i}>{weak}</li>
                )) || <li>No concerns mapped</li>}
              </ul>
            </div>
          </div>

          {/* Q&A feedback accordion */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Detailed Question Review</h4>
            <div className="space-y-5">
              {evaluation.question_feedback?.map((qf, i) => (
                <div key={i} className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-sm space-y-4 shadow-sm">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                        Question {i + 1}
                      </span>
                      <h6 className="text-base font-bold text-zinc-200 mt-1">{qf.question}</h6>
                    </div>
                    <span className={`text-xs font-black px-2.5 py-1 rounded bg-zinc-950 border ${
                      qf.score >= 80 ? "text-emerald-400 border-emerald-500/20" : qf.score >= 60 ? "text-amber-400 border-amber-500/20" : "text-rose-400 border-rose-500/20"
                    }`}>
                      {qf.score}/100
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="space-y-1.5">
                      <span className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px] font-sans">Your Answer</span>
                      <p className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-zinc-450 overflow-x-auto whitespace-pre-wrap max-h-[160px]">
                        {qf.answer}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <span className="font-semibold text-indigo-400 uppercase tracking-wider text-[10px] font-sans">AI Reference Answer</span>
                      <p className="bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10 text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-[160px]">
                        {qf.model_answer}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-zinc-400 leading-relaxed">
                    <strong className="text-indigo-400 uppercase tracking-wider text-[9px] mr-1 block sm:inline-block font-sans">AI Feedback:</strong>
                    {qf.feedback}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Interview Session Page UI
  const q = questions[currentIdx];
  const isCoding = q?.type === "coding";

  return (
    <div className="min-h-[calc(100vh-73px)] bg-zinc-950 flex flex-col">
      
      {/* Session progress and timer header */}
      <div className="border-b border-zinc-800 bg-zinc-900/40 px-6 py-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-zinc-500 font-semibold uppercase tracking-wider text-xs">Interview Room</span>
            <h2 className="text-base font-bold text-white mt-0.5">{session?.company_name} — {session?.role}</h2>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-full">
            {session?.difficulty}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="hidden md:flex items-center gap-3 w-72">
          <span className="text-xs text-zinc-400 whitespace-nowrap font-medium">Progress</span>
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden border border-zinc-700">
            <div 
              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold text-white whitespace-nowrap">{currentIdx + 1}/{questions.length}</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
          <Timer className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span className="font-mono font-bold text-white tracking-wide">{formatTime(seconds)}</span>
        </div>
      </div>

      {/* Main Room Workspace: Split layout if coding, standard otherwise */}
      {isCoding ? (
        // LeetCode Split Screen Mode
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* Left Column: Problem description */}
          <div className="lg:col-span-5 border-r border-zinc-800 p-6 flex flex-col justify-between overflow-y-auto max-h-[calc(100vh-147px)]">
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                  Technical Coding Challenge
                </span>
                <h3 className="text-xl font-bold text-white mt-2">{q.question}</h3>
              </div>

              {q.constraints && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Constraints:</span>
                  <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 font-mono overflow-x-auto whitespace-pre-wrap">
                    {q.constraints}
                  </pre>
                </div>
              )}

              {q.examples && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Examples:</span>
                  <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 font-mono overflow-x-auto whitespace-pre-wrap">
                    {q.examples}
                  </pre>
                </div>
              )}
            </div>

            {/* Micro Camera overlay if requested */}
            <div className="mt-8 pt-4 border-t border-zinc-900">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setWebcamActive(!webcamActive)}
                  className={`p-2.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                    webcamActive ? "bg-indigo-600 border-indigo-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400"
                  }`}
                  title="Toggle Mock Webcam stream"
                >
                  {webcamActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
                <span className="text-xs text-zinc-500 font-medium">Mock Interview FaceCam widget</span>
              </div>
              
              {webcamActive && (
                <div className="mt-4 relative w-48 h-32 rounded-xl border border-zinc-800 overflow-hidden bg-black shadow-lg">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                  <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Code Editor */}
          <div className="lg:col-span-7 flex flex-col justify-between overflow-hidden bg-[#0d0d0f] max-h-[calc(100vh-147px)]">
            
            {/* Editor toolbar */}
            <div className="border-b border-zinc-800 bg-zinc-950 px-4 py-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-zinc-500" />
                <span className="font-semibold text-zinc-400">Solution.code</span>
                <select 
                  className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded px-2 py-1 focus:outline-none ml-2"
                  value={editorLang}
                  onChange={(e) => handleLangChange(e.target.value)}
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="cpp">C++</option>
                </select>
              </div>

              {/* Status lights */}
              <div className="flex items-center gap-3">
                <span className="text-zinc-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Editor Ready
                </span>
              </div>
            </div>

            {/* Code Textarea editor with line numbers */}
            <div className="flex-1 flex overflow-hidden">
              {/* Line numbers column */}
              <div className="w-10 bg-zinc-950 text-right pr-2 py-4 select-none font-mono text-xs text-zinc-600 border-r border-zinc-800">
                {Array.from({ length: Math.max(15, currentAnswer.split("\n").length + 5) }).map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Textarea */}
              <textarea 
                className="flex-1 bg-transparent p-4 font-mono text-xs text-zinc-200 focus:outline-none resize-none overflow-y-auto spellcheck-false leading-normal select-text"
                spellCheck="false"
                autoComplete="off"
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="# Write your technical coding solution here..."
              />
            </div>

            {/* Code Output panel */}
            {codeOutput && (
              <div className="border-t border-zinc-800 bg-zinc-950 p-4 font-mono text-xs max-h-36 overflow-y-auto">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Standard Console Output</span>
                <pre className="text-zinc-400 whitespace-pre-wrap">{codeOutput}</pre>
              </div>
            )}

            {/* Bottom Actions toolbar */}
            <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-3 flex justify-between items-center">
              <button 
                onClick={runCode}
                disabled={isRunningCode || isSaving}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-300 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isRunningCode ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Compiling...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-400" /> Run Code
                  </>
                )}
              </button>

              <span className="text-[10px] text-zinc-600 font-medium">Use Ctrl+Enter to save progress</span>
            </div>

          </div>

        </div>
      ) : (
        // Standard Conceptual / Behavioral Split Room layout
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden max-h-[calc(100vh-147px)]">
          
          {/* Left Column: Webcam and mic feedback */}
          <div className="md:col-span-5 border-r border-zinc-800 p-6 flex flex-col justify-between overflow-y-auto bg-zinc-950/40">
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                  {q?.category} Assessment
                </span>
                <h3 className="text-xl font-bold text-white mt-2">{q?.question}</h3>
              </div>

              {/* Tips for behavioral answering */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/10 space-y-2 text-xs text-zinc-500 leading-relaxed">
                <span className="font-semibold text-zinc-400 block uppercase tracking-wider text-[10px]">Interviewer Tip</span>
                Use the STAR methodology: Describe the <strong className="text-indigo-400">Situation</strong>, <strong className="text-indigo-400">Task</strong>, <strong className="text-indigo-400">Action</strong>, and <strong className="text-indigo-400">Result</strong> of your experience.
              </div>
            </div>

            {/* Webcam / Mic Widget Panel */}
            <div className="space-y-6 border-t border-zinc-900 pt-6 mt-8">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Media Feedback Status</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setWebcamActive(!webcamActive)}
                    className={`p-2 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                      webcamActive ? "bg-indigo-600 border-indigo-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}
                    title="Toggle Webcam stream"
                  >
                    {webcamActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={toggleSpeech}
                    className={`p-2 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                      speechActive ? "bg-purple-600 border-purple-500 text-white animate-pulse" : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}
                    title="Toggle speech transcription"
                  >
                    {speechActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Simulated camera stream frame */}
              <div className="relative aspect-video rounded-xl border border-zinc-800 bg-black flex items-center justify-center overflow-hidden shadow-inner">
                {webcamActive ? (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                ) : (
                  <div className="text-center text-zinc-600 flex flex-col items-center">
                    <VideoOff className="w-10 h-10 mb-2 text-zinc-700" />
                    <span className="text-xs">Camera Feed Disabled</span>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/60 backdrop-blur-sm border border-zinc-800 text-[10px] text-zinc-400 font-semibold flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${webcamActive ? "bg-emerald-500 animate-ping" : "bg-zinc-500"}`} />
                  Candidate Feed
                </div>
              </div>

              {/* Mic soundbar indicator */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Audio Level</span>
                <div className="flex-1 flex gap-1 h-3 items-end">
                  {Array.from({ length: 16 }).map((_, i) => {
                    const active = speechActive && (i % 3 === 0 || i % 4 === 0);
                    return (
                      <div 
                        key={i} 
                        className={`flex-1 rounded-sm transition-all duration-300 ${
                          active ? "bg-indigo-500" : "bg-zinc-800"
                        }`} 
                        style={{ height: active ? `${Math.floor(Math.random() * 80) + 20}%` : "30%" }} 
                      />
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Text Answer Textarea */}
          <div className="md:col-span-7 flex flex-col justify-between overflow-hidden bg-[#0d0d0f]">
            
            {/* Editor toolbar */}
            <div className="border-b border-zinc-800 bg-zinc-950 px-5 py-3 flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-400">Response Console</span>
              {speechActive && (
                <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-semibold animate-pulse">
                  Listening / Voice Typing Active
                </span>
              )}
            </div>

            {/* Answer Textarea */}
            <div className="flex-1 p-6 overflow-hidden">
              <textarea 
                className="w-full h-full bg-transparent font-sans text-sm text-zinc-200 focus:outline-none resize-none overflow-y-auto leading-relaxed select-text"
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type or click the microphone to dictate your mock answer response here..."
              />
            </div>

            {/* Actions Toolbar */}
            <div className="border-t border-zinc-800 bg-zinc-950 px-5 py-3 text-xs text-zinc-500 flex items-center justify-between">
              <span>Dictated responses are transcribed automatically.</span>
              <button 
                onClick={toggleSpeech}
                className="px-3.5 py-1.5 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500 text-purple-400 hover:text-white rounded-lg transition font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
                {speechActive ? "Pause Voice Dictation" : "Voice Dictate Answer"}
              </button>
            </div>

          </div>

        </div>
      )}

      {/* Footer controls for navigation */}
      <div className="border-t border-zinc-800 bg-zinc-900/60 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleNavigate(currentIdx - 1)}
            disabled={currentIdx === 0 || isSaving}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          
          <button 
            onClick={() => handleNavigate(currentIdx + 1)}
            disabled={currentIdx === questions.length - 1 || isSaving}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {currentIdx < questions.length - 1 ? (
            <button 
              onClick={handleSkip}
              disabled={isSaving}
              className="px-4 py-2 bg-transparent hover:bg-zinc-900 text-zinc-400 hover:text-zinc-300 text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Skip Question
            </button>
          ) : null}

          {currentIdx === questions.length - 1 ? (
            <button 
              onClick={handleFinish}
              disabled={isFinishing || isSaving}
              className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-extrabold rounded-lg shadow-lg shadow-indigo-500/10 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isFinishing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Synthesizing scorecard...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Finish & Evaluate
                </>
              )}
            </button>
          ) : (
            <button 
              onClick={() => handleNavigate(currentIdx + 1)}
              disabled={isSaving}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              Save & Continue <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

export default Interview;