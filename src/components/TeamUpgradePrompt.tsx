import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, FileText, Share2, Shield, ArrowLeft } from "lucide-react";

const benefits = [
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Invite up to 5 members (Team) or 20 members (Agency) to collaborate on audits"
  },
  {
    icon: Share2,
    title: "Shared Audit History",
    description: "Access a unified audit history across your entire team"
  },
  {
    icon: FileText,
    title: "Organization Knowledge Base",
    description: "Upload industry-specific documents for context-aware audits"
  },
  {
    icon: Shield,
    title: "White-Label Reports",
    description: "Agency tier includes custom branding for professional client deliverables"
  }
];

export const TeamUpgradePrompt = () => {
  const navigate = useNavigate();
  const { lang } = useParams();

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/${lang || 'en'}/app`)}
            className="text-[#86868B] hover:text-[#0071E3]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Building2 className="w-8 h-8 text-[#0071E3]" />
          <h1 className="text-3xl font-bold text-[#111111]">Team Features</h1>
        </div>

        {/* Main Card */}
        <Card className="border-[#E5E5EA] bg-white">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl text-[#111111]">
              Unlock Team Collaboration
            </CardTitle>
            <CardDescription className="text-base text-[#86868B]">
              You've been invited to view team features. Upgrade to Team or Agency to create your own organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Benefits Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="flex gap-4 p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E5EA]"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#0071E3]/10 flex items-center justify-center">
                    <benefit.icon className="w-5 h-5 text-[#0071E3]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#111111]">{benefit.title}</h3>
                    <p className="text-sm text-[#86868B]">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing Comparison */}
            <div className="grid md:grid-cols-2 gap-4 pt-4">
              <Card className="border-[#0071E3] bg-[#0071E3]/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-[#111111]">Team</CardTitle>
                  <div className="text-2xl font-bold text-[#0071E3]">$149<span className="text-sm font-normal text-[#86868B]">/month</span></div>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-[#86868B] space-y-1">
                    <li>• 5 team seats</li>
                    <li>• 1,500 shared audits/month</li>
                    <li>• Shared audit history</li>
                    <li>• Organization knowledge base</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-[#0071E3] bg-[#0071E3]/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-[#111111]">Agency</CardTitle>
                  <div className="text-2xl font-bold text-[#0071E3]">$499<span className="text-sm font-normal text-[#86868B]">/month</span></div>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-[#86868B] space-y-1">
                    <li>• 20 team seats</li>
                    <li>• 5,000 shared audits/month</li>
                    <li>• White-labeled reports</li>
                    <li>• Priority support</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={() => navigate(`/${lang || 'en'}/pricing`)}
                className="flex-1 bg-[#0071E3] hover:bg-[#0077ED] text-white"
              >
                View All Plans
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/${lang || 'en'}/app`)}
                className="flex-1"
              >
                Continue with Current Plan
              </Button>
            </div>

            {/* Info Note */}
            <p className="text-center text-sm text-[#86868B]">
              Already been invited to a team? Check your email for an invitation link.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
