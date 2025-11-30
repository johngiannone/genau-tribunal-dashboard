import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Mail, Bug, Search, CheckCircle, ArrowLeft, Ticket } from "lucide-react";
import { BugReportModal } from "@/components/BugReportModal";

const Support = () => {
  const navigate = useNavigate();
  const { lang } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [bugReportOpen, setBugReportOpen] = useState(false);

  const quickActions = [
    {
      icon: Ticket,
      title: "My Tickets",
      description: "View and track your submitted support tickets.",
      action: () => navigate(`/${lang || 'en'}/tickets`),
      color: "bg-orange-50 border-orange-200 hover:bg-orange-100"
    },
    {
      icon: BookOpen,
      title: "Documentation",
      description: "Read the guides on how to interpret verdicts.",
      action: () => window.open("https://docs.genau.io", "_blank"),
      color: "bg-blue-50 border-blue-200 hover:bg-blue-100"
    },
    {
      icon: Mail,
      title: "Contact Support",
      description: "Get help with your account or billing.",
      action: () => window.location.href = "mailto:support@genau.io",
      color: "bg-green-50 border-green-200 hover:bg-green-100"
    },
    {
      icon: Bug,
      title: "Report a Bug",
      description: "Found a glitch in the Matrix?",
      action: () => setBugReportOpen(true),
      color: "bg-purple-50 border-purple-200 hover:bg-purple-100"
    }
  ];

  const systemStatus = [
    { name: "OpenRouter API", status: "operational" },
    { name: "Database", status: "operational" },
    { name: "Edge Functions", status: "operational" },
    { name: "Authentication", status: "operational" }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/${lang || 'en'}`)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Home</span>
          </Button>
          <Link to={`/${lang || 'en'}/auth`}>
            <Button variant="default" size="sm" className="rounded-full">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-[#111111] mb-4 tracking-tight">
          How can we help you?
        </h1>
        <p className="text-xl text-[#86868B] mb-12 max-w-2xl mx-auto">
          Documentation, troubleshooting, and direct support.
        </p>

        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search for answers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 pl-12 pr-4 text-base border-gray-200 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </section>

      {/* Quick Actions Grid */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`
                ${action.color}
                border-2 rounded-2xl p-8 
                text-left transition-all duration-200
                hover:shadow-md transform hover:-translate-y-1
              `}
            >
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                <action.icon className="w-6 h-6 text-gray-700" />
              </div>
              <h3 className="text-xl font-semibold text-[#111111] mb-2">
                {action.title}
              </h3>
              <p className="text-sm text-[#86868B] leading-relaxed">
                {action.description}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* System Status Widget */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="border-2 border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <h2 className="text-2xl font-bold text-[#111111]">
              All Systems Operational
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {systemStatus.map((service, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
              >
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  {service.name}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#86868B] mt-4">
            Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </section>

      {/* Footer Spacing */}
      <div className="h-20" />

      {/* Bug Report Modal */}
      <BugReportModal
        open={bugReportOpen}
        onOpenChange={setBugReportOpen}
      />
    </div>
  );
};

export default Support;
