import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";

import {
  User, Shield, History, Settings, ExternalLink, BarChart2,
  FileText, LogOut, CheckCircle2, AlertTriangle, XCircle, ArrowRight,
  Brain, Sparkles
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

const CLIP_STYLES = `
  .clip-corner-xl {
    clip-path: polygon(0 18px, 18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%);
  }
  .clip-corner-lg {
    clip-path: polygon(0 12px, 12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%);
  }
  .clip-corner-sm {
    clip-path: polygon(0 5px, 5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%);
  }
`;

import { veritasAPI } from "../../services/api";

export function Profile() {

  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();

  const [trainStatus, setTrainStatus] = useState<any>({
    status: "idle",
    samples_trained: 0,
    epoch: 0,
    loss: 0.0,
    last_run: null,
    weights_file_exists: false
  });

  useEffect(() => {
    veritasAPI.getTrainStatus().then(setTrainStatus).catch(console.error);
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (trainStatus.status === "training") {
      interval = setInterval(() => {
        veritasAPI.getTrainStatus()
          .then((res) => {
            setTrainStatus(res);
            if (res.status !== "training") {
              clearInterval(interval);
            }
          })
          .catch(console.error);
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [trainStatus.status]);

  const handleTriggerTraining = async () => {
    try {
      await veritasAPI.triggerTraining();
      setTrainStatus((prev: any) => ({ ...prev, status: "training" }));
    } catch (err) {
      console.error("Failed to trigger training:", err);
    }
  };

  const [keys, setKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  useEffect(() => {
    veritasAPI.listKeys().then(setKeys).catch(console.error);
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const data = await veritasAPI.createKey(newKeyName);
      setGeneratedKey(data.api_key);
      setKeys((prev) => [...prev, data]);
      setNewKeyName("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      await veritasAPI.deleteKey(keyId);
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
    } catch (err) {
      console.error(err);
    }
  };


  const user = {

    name: authUser?.name || "Michael Mazhambe",
    email: authUser?.email || "m.mazhambe@student.richfield.ac.za",
    studentId: "402100810",
    role: "BSc Information Technology Student",
    institution: "Richfield Faculty of ICT",
    joined: authUser?.joined_at ? new Date(authUser.joined_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "June 2026",
  };

  const getInitials = (n: string) => {
    return n.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
  };


  const recentActivity = [
    {
      id: "e6ae25ee-e70c-4d33-bd32-b2f96bf55b1e",
      title: "Nature research on teenager social media attention span",
      type: "text",
      score: 74.2,
      status: "Moderately Credible",
      date: "Today, 18:55",
    },
    {
      id: "1",
      title: "Climate change and global temperatures correlation study",
      type: "text",
      score: 95.0,
      status: "Highly Credible",
      date: "Yesterday, 14:20",
    },
    {
      id: "2",
      title: "5G towers health hazards breaking report",
      type: "text",
      score: 23.5,
      status: "Low Credibility",
      date: "24 June, 10:15",
    },
  ];

  const getStatusBadge = (score: number) => {
    if (score >= 80) return "bg-green-50 text-green-700 border-green-200";
    if (score >= 60) return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-red-50 text-red-700 border-red-200";
  };

  const getStatusIcon = (score: number) => {
    if (score >= 80) return CheckCircle2;
    if (score >= 60) return AlertTriangle;
    return XCircle;
  };

  return (
    <div className="min-h-screen py-10 lg:py-16 bg-gradient-to-b from-blue-50/30 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Banner Card */}
        <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 rounded-2xl p-8 mb-8 text-white clip-corner-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-800/30 rounded-full blur-2xl" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center font-bold text-2xl border border-white/20">
                {getInitials(user.name)}
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">{user.name}</h1>
                <p className="text-blue-100 text-sm mt-1">{user.role}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/verify")}
                className="px-5 py-2.5 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-all font-semibold clip-corner-sm text-sm"
              >
                New Analysis
              </button>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="px-5 py-2.5 bg-red-600/30 border border-red-500/20 text-white rounded-lg hover:bg-red-600/40 transition-all font-semibold clip-corner-sm text-sm flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>

          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column: Account Details */}
          <div className="space-y-6">
            <div className="bg-white border border-blue-200/50 rounded-xl p-6 clip-corner-lg">
              <h3 className="flex items-center gap-2 mb-4 font-semibold text-lg">
                <User className="w-5 h-5 text-blue-600" />
                Profile Information
              </h3>
              
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Email</span>
                  <span className="font-medium text-gray-900">{user.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Student ID</span>
                  <span className="font-mono font-medium text-gray-900">{user.studentId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Institution</span>
                  <span className="font-medium text-gray-900">{user.institution}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Joined</span>
                  <span className="font-medium text-gray-900">{user.joined}</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white border border-blue-200/50 rounded-xl p-6 clip-corner-lg">
              <h3 className="flex items-center gap-2 mb-4 font-semibold text-lg">
                <BarChart2 className="w-5 h-5 text-blue-600" />
                Platform Statistics
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <span className="text-muted-foreground text-xs">Total Scans</span>
                  <span className="block text-3xl font-bold text-blue-700 mt-1">12</span>
                </div>
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <span className="text-muted-foreground text-xs">Avg. index</span>
                  <span className="block text-3xl font-bold text-blue-700 mt-1">74%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Recent Activity */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-blue-200/50 rounded-xl p-6 clip-corner-lg">
              <h3 className="flex items-center gap-2 mb-6 font-semibold text-lg">
                <History className="w-5 h-5 text-blue-600" />
                Recent Credibility Assessments
              </h3>
              
              <div className="space-y-4">
                {recentActivity.map((activity, idx) => {
                  const BadgeIcon = getStatusIcon(activity.score);
                  return (
                    <div
                      key={idx}
                      className="group border border-blue-100 hover:border-blue-300 rounded-xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase">
                            {activity.type}
                          </span>
                          <span className="text-xs text-muted-foreground">{activity.date}</span>
                        </div>
                        <h4 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                          {activity.title}
                        </h4>
                      </div>
                      
                      <div className="flex items-center gap-3 justify-between md:justify-end">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${getStatusBadge(activity.score)}`}>
                          <BadgeIcon className="w-3.5 h-3.5" />
                          <span>{activity.score}%</span>
                        </div>
                        
                        <Link
                          to={activity.id === "e6ae25ee-e70c-4d33-bd32-b2f96bf55b1e" ? `/results/${activity.id}` : "/verify"}
                          className="p-2 text-muted-foreground hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Learning & Self-Training Panel */}
            <div className="bg-white border border-blue-200/50 rounded-xl p-6 clip-corner-lg shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-6 h-6 text-blue-600 animate-pulse" />
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 leading-tight">Active Self-Training</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Misinformation dataset reinforcement loop</p>
                  </div>
                </div>
                <div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${
                    trainStatus.status === "training"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}>
                    {trainStatus.status}
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground block text-xs font-medium uppercase tracking-wider mb-0.5">Model Status</span>
                    <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                      {trainStatus.weights_file_exists ? "RoBERTa (Custom Optimized Heuristics)" : "RoBERTa Base Sequence Classifier"}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground block text-xs font-medium uppercase tracking-wider mb-0.5">Feedback Samples Gathered</span>
                    <span className="font-semibold text-gray-900">{trainStatus.samples_trained} samples</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground block text-xs font-medium uppercase tracking-wider mb-0.5">Last Pipeline Execution</span>
                    <span className="font-mono text-gray-900 text-xs sm:text-sm">
                      {trainStatus.last_run ? new Date(trainStatus.last_run).toLocaleString("en-GB") : "Never run"}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground block text-xs font-medium uppercase tracking-wider mb-0.5">Automated Interval</span>
                    <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-xs inline-block mt-0.5">
                      Runs every 2 weeks
                    </span>
                  </div>
                </div>
              </div>

              {trainStatus.status === "training" ? (
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5">
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="font-medium text-blue-800">Fine-Tuning Classifier...</span>
                    <span className="text-xs text-muted-foreground font-mono">Epoch {trainStatus.epoch}/3 · Loss: {trainStatus.loss}</span>
                  </div>
                  <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${(trainStatus.epoch / 3) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleTriggerTraining}
                  className="w-full py-3 bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all text-sm clip-corner-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Execute Training Loop Now</span>
                </button>
              )}
            </div>

            {/* Developer & Researcher API Key Card */}
            <div className="bg-white border border-blue-200/50 rounded-xl p-6 clip-corner-lg shadow-sm">
              <h3 className="flex items-center gap-2 mb-2 font-semibold text-lg text-gray-900">
                <Settings className="w-5 h-5 text-blue-600" />
                Developer API Keys
              </h3>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Researchers and fact-checkers can query the VeritasAI analysis engine programmatically. 
                Include the header <code className="bg-blue-50 text-blue-700 px-1 py-0.5 rounded font-mono text-[11px]">X-Veritas-API-Key</code> in requests.
              </p>

              {/* Show generated key warning */}
              {generatedKey && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5 text-sm">
                  <div className="flex items-start gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-green-800">Key generated successfully!</span>
                      <p className="text-xs text-green-700 mt-0.5">
                        Copy this key now. For security reasons, it will not be displayed again.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-green-200 p-2.5 rounded-lg">
                    <code className="font-mono text-xs select-all break-all flex-1 text-gray-900">
                      {generatedKey}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedKey);
                        alert("Key copied to clipboard!");
                      }}
                      className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => setGeneratedKey(null)}
                      className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* API Keys Table/List */}
              <div className="space-y-3 mb-5 max-h-[220px] overflow-y-auto pr-1">
                {keys.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 italic text-center">
                    No API keys generated yet. Create one below to begin developer access.
                  </p>
                ) : (
                  keys.map((k) => (
                    <div
                      key={k.id}
                      className="flex items-center justify-between p-3 bg-blue-50/20 border border-blue-100/50 rounded-lg text-xs"
                    >
                      <div>
                        <span className="font-semibold text-gray-900 block">{k.name}</span>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span>Prefix: <code className="font-mono">{k.key_prefix}...</code></span>
                          <span>·</span>
                          <span>Created: {new Date(k.created_at).toLocaleDateString("en-GB")}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to revoke key '${k.name}'?`)) {
                            handleDeleteKey(k.id);
                          }
                        }}
                        className="text-[10px] font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors border border-red-100 cursor-pointer"
                      >
                        Revoke
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Generate Key Form */}
              <form onSubmit={handleCreateKey} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Research Script Key"
                  className="flex-1 px-3 py-2 bg-blue-50/20 border border-blue-200/50 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Generate Key
                </button>
              </form>
            </div>

            {/* API Settings / Integrations */}

            <div className="bg-white border border-blue-200/50 rounded-xl p-6 clip-corner-lg">
              <h3 className="flex items-center gap-2 mb-4 font-semibold text-lg">
                <Settings className="w-5 h-5 text-blue-600" />
                Integration Status
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50/20 border border-blue-100/50 rounded-lg text-sm">
                  <span className="font-medium">FastAPI Credibility Engine</span>
                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">Online</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50/20 border border-blue-100/50 rounded-lg text-sm">
                  <span className="font-medium">MongoDB Database Handle</span>
                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">Connected</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50/20 border border-blue-100/50 rounded-lg text-sm">
                  <span className="font-medium">News API Key Layer</span>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">Configured</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
      <style>{CLIP_STYLES}</style>
    </div>
  );
}
