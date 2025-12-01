import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, FileText, Share2, Shield, ArrowLeft } from "lucide-react";

export const TeamUpgradePrompt = () => {
  const navigate = useNavigate();
  const { lang } = useParams();
  const { t } = useTranslation();

  const benefits = [
    {
      icon: Users,
      title: t('teamUpgrade.benefitCollaborationTitle'),
      description: t('teamUpgrade.benefitCollaborationDesc')
    },
    {
      icon: Share2,
      title: t('teamUpgrade.benefitHistoryTitle'),
      description: t('teamUpgrade.benefitHistoryDesc')
    },
    {
      icon: FileText,
      title: t('teamUpgrade.benefitKnowledgeTitle'),
      description: t('teamUpgrade.benefitKnowledgeDesc')
    },
    {
      icon: Shield,
      title: t('teamUpgrade.benefitReportsTitle'),
      description: t('teamUpgrade.benefitReportsDesc')
    }
  ];

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
          <h1 className="text-3xl font-bold text-[#111111]">{t('teamUpgrade.title')}</h1>
        </div>

        {/* Main Card */}
        <Card className="border-[#E5E5EA] bg-white">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl text-[#111111]">
              {t('teamUpgrade.unlockTitle')}
            </CardTitle>
            <CardDescription className="text-base text-[#86868B]">
              {t('teamUpgrade.unlockDescription')}
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
                  <CardTitle className="text-lg text-[#111111]">{t('teamUpgrade.teamPlan')}</CardTitle>
                  <div className="text-2xl font-bold text-[#0071E3]">$149<span className="text-sm font-normal text-[#86868B]">{t('teamUpgrade.perMonth')}</span></div>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-[#86868B] space-y-1">
                    <li>• {t('teamUpgrade.teamSeats5')}</li>
                    <li>• {t('teamUpgrade.sharedAudits1500')}</li>
                    <li>• {t('teamUpgrade.sharedHistory')}</li>
                    <li>• {t('teamUpgrade.knowledgeBase')}</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-[#0071E3] bg-[#0071E3]/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-[#111111]">{t('teamUpgrade.agencyPlan')}</CardTitle>
                  <div className="text-2xl font-bold text-[#0071E3]">$499<span className="text-sm font-normal text-[#86868B]">{t('teamUpgrade.perMonth')}</span></div>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-[#86868B] space-y-1">
                    <li>• {t('teamUpgrade.teamSeats20')}</li>
                    <li>• {t('teamUpgrade.sharedAudits5000')}</li>
                    <li>• {t('teamUpgrade.whitelabelReports')}</li>
                    <li>• {t('teamUpgrade.prioritySupport')}</li>
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
                {t('teamUpgrade.viewAllPlans')}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/${lang || 'en'}/app`)}
                className="flex-1"
              >
                {t('teamUpgrade.continueCurrentPlan')}
              </Button>
            </div>

            {/* Info Note */}
            <p className="text-center text-sm text-[#86868B]">
              {t('teamUpgrade.invitationNote')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
