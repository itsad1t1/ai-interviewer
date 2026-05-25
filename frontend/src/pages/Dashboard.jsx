import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Upload, Sparkles, BookOpen, AlertCircle, FileText, ChevronRight,
  TrendingUp, Award, Clock, Star, HelpCircle, Layers, BarChart2, Check, X
} from "lucide-react";

function Dashboard() {
  const { user } = useUser();
  const navigate = useNavigate();
  const userId = user?.id || "";

  // Form State
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [type, setType] = useState("Coding/Technical");
  
  // Resume Parsing State
  const [resumeText, setResumeText] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Question & Analysis Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  // History State
  const [history, setHistory] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null); // Detailed modal report
  
  // Fetch Interview History
  const fetchHistory = async () => {
    if (!userId) return;
    try {
      const response = await axios.get("http://localhost:8000/interview/history", {
        headers: { "X-User-Id": userId }
      });
      setHistory(response.data);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchHistory();
    }
  }, [userId]);

  // Handle Resume Upload
  const handleResumeChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadError("");
    setResumeName(file.name);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://localhost:8000/resume/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResumeText(res.data.parsed_text);
    } catch (err) {
      console.error(err);
      setUploadError("Failed to parse resume. Upload a valid PDF or DOCX file.");
      setResumeName("");
      setResumeText("");
    } finally {
      setIsUploading(false);
    }
  };

  // Generate Questions and Analysis
  const handleGenerate = async () => {
    if (!resumeText) {
      alert("Please upload a resume first.");
      return;
    }
    if (!company || !role || !jobDescription) {
      alert("Please fill in Company, Role, and Job Description.");
      return;
    }

    setIsGenerating(true);
    setAiAnalysis(null);
    setQuestions([]);

    try {
      // 1. Analyze candidate suitability
      const analysisRes = await axios.post("http://localhost:8000/resume/analyze", {
        resume_text: resumeText,
        job_description: jobDescription
      });
      const analysis = analysisRes.data.analysis;
      setAiAnalysis(analysis);

      // 2. Generate questions
      const questionsRes = await axios.post("http://localhost:8000/questions/generate", {
        resume_text: resumeText,
        job_description: jobDescription,
        analysis: analysis,
        company_name: company,
        role: role,
        difficulty: difficulty,
        interview_type: type
      });
      
      // The API returns the parsed dictionary with 'questions' key
      setQuestions(questionsRes.data.questions || []);
    } catch (err) {
      console.error("Error generating interview assets:", err);
      alert("Something went wrong during question curation. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Start the Interview
  const handleStartInterview = async () => {
    if (!questions || questions.length === 0) return;
    
    try {
      const response = await axios.post("http://localhost:8000/interview/start", {
        user_id: userId,
        company_name: company,
        role: role,
        difficulty: difficulty,
        interview_type: type,
        questions: questions
      }, {
        headers: { "X-User-Id": userId }
      });
      
      const sessionId = response.data.session_id;
      navigate(`/interview?session_id=${sessionId}`);
    } catch (err) {
      console.error("Error starting session:", err);
      alert("Could not initialize the interview session. Please try again.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 min-h-screen">
      {/* Welcome header */}
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Welcome back, <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">{user?.firstName || "Candidate"}</span>
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Configure your mock assessment or review past evaluations below.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Form Panel: 5 columns */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-6 backdrop-blur-md relative overflow-hidden shadow-xl shadow-black/10">
            {/* Top decorative accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            
            <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Configure Interview
            </h2>

            <div className="space-y-4">
              
              {/* Resume Upload dropzone */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Resume Upload</label>
                <div className="relative border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl p-5 text-center cursor-pointer transition bg-zinc-950/40 group">
                  <input 
                    type="file" 
                    accept=".pdf,.docx" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    onChange={handleResumeChange}
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center justify-center py-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400 mb-2" />
                      <span className="text-sm text-zinc-400">Parsing contents...</span>
                    </div>
                  ) : resumeName ? (
                    <div className="flex flex-col items-center justify-center py-2 text-indigo-400">
                      <FileText className="w-8 h-8 mb-2" />
                      <span className="text-sm font-semibold truncate max-w-[200px] text-zinc-200">{resumeName}</span>
                      <span className="text-xs text-zinc-500 mt-1">Click or drag to replace</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-2">
                      <Upload className="w-8 h-8 text-zinc-500 group-hover:text-indigo-400 transition-colors mb-2" />
                      <span className="text-sm text-zinc-300 font-medium">Drop PDF/DOCX or click to browse</span>
                      <span className="text-xs text-zinc-500 mt-1">Maximum file size: 5MB</span>
                    </div>
                  )}
                </div>
                {uploadError && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {uploadError}
                  </p>
                )}
              </div>

              {/* Company & Role */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Company Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Google" 
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Role / Position</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Frontend Architect" 
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
              </div>

              {/* Job Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Job Description</label>
                <textarea 
                  rows="4" 
                  placeholder="Paste details of the targeted job listing here..." 
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition resize-none"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              {/* Difficulty & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Difficulty</label>
                  <select 
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    <option>Entry</option>
                    <option>Mid</option>
                    <option>Senior</option>
                    <option>Expert</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Interview Type</label>
                  <select 
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option>Coding/Technical</option>
                    <option>System Design</option>
                    <option>Behavioral</option>
                  </select>
                </div>
              </div>

              {/* Action Button */}
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || isUploading}
                className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/10 transition mt-4 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Curation in Progress...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Curate Questions
                  </>
                )}
              </button>

            </div>
          </div>
        </div>

        {/* Right Output Panel: 7 columns */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Default Placeholder */}
          {!isGenerating && !aiAnalysis && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
              <BookOpen className="w-12 h-12 text-zinc-600 mb-4" />
              <h3 className="text-base font-bold text-zinc-300">Curated Interview Prep</h3>
              <p className="text-zinc-500 text-sm max-w-sm mt-1">
                Upload your resume, input the company and role requirements, and trigger AI Curation to inspect question focuses.
              </p>
            </div>
          )}

          {/* Loading state spinner */}
          {isGenerating && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
                <div className="absolute inset-2 rounded-full border-4 border-purple-500/10 border-t-purple-500 animate-spin" style={{ animationDirection: 'reverse' }} />
              </div>
              <h3 className="text-lg font-bold text-zinc-200">Generating Assets...</h3>
              <p className="text-zinc-500 text-sm mt-2 max-w-xs animate-pulse">
                Parsing resume keywords, checking compatibility with job requirements, and curating interview questions...
              </p>
            </div>
          )}

          {/* AI Analysis and Questions Preview */}
          {!isGenerating && aiAnalysis && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Suitability Score & Overview Card */}
              <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-6 backdrop-blur-md relative">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Fitment Compatibility</h3>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Score Ring */}
                  <div className="relative w-28 h-28 flex items-center justify-center rounded-full bg-zinc-950 border border-zinc-800/80 shadow-inner">
                    <div className="text-center">
                      <span className="text-3xl font-extrabold text-white">{aiAnalysis.jd_match_score}</span>
                      <span className="text-zinc-500 text-xs block">Match %</span>
                    </div>
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    <h4 className="text-base font-bold text-zinc-100 flex items-center gap-1.5 justify-center sm:justify-start">
                      <Award className="w-4 h-4 text-indigo-400" />
                      Candidate Summary
                    </h4>
                    <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                      {aiAnalysis.candidate_summary}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                      <div className="text-xs px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                        {aiAnalysis.experience_years} Experience
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skills Analysis breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-800/80 pt-6 mt-6">
                  <div>
                    <h5 className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wide flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Matching Skills
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {aiAnalysis.skills?.slice(0, 8).map((skill, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          {skill}
                        </span>
                      )) || <span className="text-xs text-zinc-500">None detected</span>}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-rose-400 mb-2 uppercase tracking-wide flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Missing Skills
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {aiAnalysis.missing_skills?.slice(0, 8).map((skill, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400">
                          {skill}
                        </span>
                      )) || <span className="text-xs text-zinc-500">None identified</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Questions Preview Card */}
              <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-6 backdrop-blur-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Question Preview ({questions.length})</h3>
                  <span className="text-xs text-zinc-500 italic">Preselected for current configuration</span>
                </div>
                
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 scrollbar">
                  {questions.map((q, index) => (
                    <div key={index} className="flex gap-3 items-start p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/60 hover:border-zinc-700/60 transition">
                      <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                        Q{index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                            {q.category}
                          </span>
                          {q.type === "coding" && (
                            <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1.5 rounded-full font-semibold">
                              Coding IDE
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-300 font-medium mt-1">{q.question}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Start Button */}
                <button 
                  onClick={handleStartInterview}
                  className="w-full py-4.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-extrabold text-base shadow-lg shadow-indigo-600/25 transition mt-6 flex items-center justify-center gap-2.5 cursor-pointer group"
                >
                  Start Assessment Now
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* History section (Bottom) */}
      <div className="mt-14 border-t border-zinc-800/80 pt-10">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-zinc-400" />
          Assessment History
        </h2>

        {history.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/20 p-8 text-center text-zinc-500 text-sm">
            You haven't completed any assessments yet. Start your first session above to populate your feedback history.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/50 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Difficulty</th>
                  <th className="px-6 py-4">Overall Score</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
                {history.map((item, index) => (
                  <tr key={index} className="hover:bg-zinc-900/30 transition">
                    <td className="px-6 py-4 font-bold text-white">{item.company_name}</td>
                    <td className="px-6 py-4 text-zinc-300 font-medium">{item.role}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
                        {item.interview_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">{item.difficulty}</td>
                    <td className="px-6 py-4 font-semibold text-white">
                      <span className={`inline-flex items-center gap-1 ${
                        item.score >= 80 ? "text-emerald-400" : item.score >= 60 ? "text-amber-400" : "text-rose-400"
                      }`}>
                        <Star className="w-4 h-4 fill-current" />
                        {item.score}/100
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedReport(item.evaluation_report)}
                        className="text-xs px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-lg transition font-semibold cursor-pointer"
                      >
                        View Feedback
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Evaluation Report Modal Backdrop */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="sticky top-0 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 p-6 flex justify-between items-start z-10">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full uppercase tracking-wider">
                  Assessment Scorecard
                </span>
                <h3 className="text-xl font-bold text-white mt-2">AI Performance Evaluation</h3>
              </div>
              <button 
                onClick={() => setSelectedReport(null)}
                className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-8">
              
              {/* Score summary panel */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-zinc-950/40 border border-zinc-800 rounded-xl p-6">
                <div className="md:col-span-4 flex flex-col items-center justify-center">
                  <div className="w-28 h-28 rounded-full border-4 border-dashed border-indigo-500/40 flex items-center justify-center bg-indigo-500/5 shadow-lg shadow-indigo-500/5">
                    <div className="text-center">
                      <span className="text-4xl font-extrabold text-white">{selectedReport.overall_score}</span>
                      <span className="text-[10px] text-zinc-500 block uppercase tracking-wider mt-0.5">Overall</span>
                    </div>
                  </div>
                  <div className="mt-3.5 text-center">
                    <span className="text-xs text-zinc-500">Recommendation</span>
                    <span className={`block text-sm font-extrabold uppercase tracking-wide ${
                      selectedReport.recommendation?.toLowerCase().includes("strong") ? "text-emerald-400" :
                      selectedReport.recommendation?.toLowerCase().includes("no hire") ? "text-rose-400" : "text-amber-400"
                    }`}>
                      {selectedReport.recommendation}
                    </span>
                  </div>
                </div>

                <div className="md:col-span-8 space-y-4">
                  <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-indigo-400" /> Category Breakdown
                  </h4>
                  <div className="space-y-3">
                    {/* Category item */}
                    {Object.entries(selectedReport.category_scores || {}).map(([key, score], i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-zinc-400 capitalize">{key.replace("_", " ")}</span>
                          <span className="font-bold text-white">{score}/100</span>
                        </div>
                        <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800">
                          <div 
                            className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${score}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary Paragraph */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">Executive Summary</h4>
                <p className="text-sm text-zinc-400 leading-relaxed bg-zinc-950/40 border border-zinc-850 p-4 rounded-xl">
                  {selectedReport.summary_feedback}
                </p>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-xl border border-emerald-500/10 bg-emerald-500/5">
                  <h5 className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-3">
                    <Check className="w-4 h-4 bg-emerald-500/10 rounded-full p-0.5" />
                    Key Strengths
                  </h5>
                  <ul className="space-y-2 text-xs text-zinc-400 list-disc list-inside">
                    {selectedReport.strengths?.map((str, i) => (
                      <li key={i}>{str}</li>
                    )) || <li>No highlights documented</li>}
                  </ul>
                </div>

                <div className="p-5 rounded-xl border border-rose-500/10 bg-rose-500/5">
                  <h5 className="text-sm font-bold text-rose-400 flex items-center gap-2 mb-3">
                    <X className="w-4 h-4 bg-rose-500/10 rounded-full p-0.5" />
                    Areas to Improve
                  </h5>
                  <ul className="space-y-2 text-xs text-zinc-400 list-disc list-inside">
                    {selectedReport.weaknesses?.map((weak, i) => (
                      <li key={i}>{weak}</li>
                    )) || <li>No concerns highlighted</li>}
                  </ul>
                </div>
              </div>

              {/* Question Feedback detail */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">Question-by-Question Assessment</h4>
                
                <div className="space-y-4">
                  {selectedReport.question_feedback?.map((qf, i) => (
                    <div key={i} className="p-5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-4">
                      
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded">
                            Question {i + 1}
                          </span>
                          <h6 className="text-sm font-bold text-zinc-200 mt-1">{qf.question}</h6>
                        </div>
                        <span className={`text-sm font-extrabold px-2.5 py-1 rounded bg-zinc-900 border ${
                          qf.score >= 80 ? "text-emerald-400 border-emerald-500/20" : qf.score >= 60 ? "text-amber-400 border-amber-500/20" : "text-rose-400 border-rose-500/20"
                        }`}>
                          {qf.score}/100
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1.5">
                          <span className="font-semibold text-zinc-400 block uppercase tracking-wider text-[10px]">Your Answer:</span>
                          <p className="bg-zinc-900 p-3 rounded-lg border border-zinc-800/60 text-zinc-400 max-h-[140px] overflow-y-auto whitespace-pre-wrap font-mono">
                            {qf.answer}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <span className="font-semibold text-indigo-400 block uppercase tracking-wider text-[10px]">AI Model Answer:</span>
                          <p className="bg-indigo-500/5 p-3 rounded-lg border border-indigo-500/10 text-zinc-300 max-h-[140px] overflow-y-auto whitespace-pre-wrap font-mono">
                            {qf.model_answer}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/80 text-zinc-450 leading-relaxed">
                        <strong className="text-indigo-400 uppercase tracking-wider text-[9px] mr-1 block sm:inline-block">AI Critique:</strong>
                        <span className="text-zinc-400">{qf.feedback}</span>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-zinc-800 p-6 flex justify-end">
              <button 
                onClick={() => setSelectedReport(null)}
                className="px-6 py-2.5 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold rounded-lg transition text-xs cursor-pointer"
              >
                Close Report
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;