import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, Settings2 } from "lucide-react"

interface ProviderConfig {
  primary_provider: "openrouter" | "together"
  fallback_enabled: boolean
  fallback_provider: "openrouter" | "together"
  auto_fallback: boolean
  manual_override: boolean
}

export const ProviderManagement = () => {
  const [config, setConfig] = useState<ProviderConfig>({
    primary_provider: "openrouter",
    fallback_enabled: true,
    fallback_provider: "together",
    auto_fallback: true,
    manual_override: false
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProviderConfig()
  }, [])

  const fetchProviderConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'ai_provider_config')
        .single()

      if (error) throw error

      if (data?.value) {
        setConfig(data.value as any as ProviderConfig)
      }
    } catch (error) {
      console.error('Failed to fetch provider config:', error)
      toast.error('Failed to load provider configuration')
    } finally {
      setLoading(false)
    }
  }

  const saveProviderConfig = async (newConfig: ProviderConfig) => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('system_settings')
        .update({
          value: newConfig as any,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('key', 'ai_provider_config')

      if (error) throw error

      setConfig(newConfig)
      toast.success('Provider configuration updated')
    } catch (error) {
      console.error('Failed to save provider config:', error)
      toast.error('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const handlePrimaryProviderChange = (provider: "openrouter" | "together") => {
    const newConfig: ProviderConfig = {
      ...config,
      primary_provider: provider,
      fallback_provider: (provider === "openrouter" ? "together" : "openrouter") as "openrouter" | "together"
    }
    saveProviderConfig(newConfig)
  }

  const handleToggleFallback = (enabled: boolean) => {
    saveProviderConfig({ ...config, fallback_enabled: enabled })
  }

  const handleToggleAutoFallback = (enabled: boolean) => {
    saveProviderConfig({ ...config, auto_fallback: enabled })
  }

  const handleManualOverride = (override: boolean) => {
    saveProviderConfig({ ...config, manual_override: override })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            AI Provider Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const getProviderStatus = (provider: string) => {
    if (provider === config.primary_provider && !config.manual_override) {
      return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>
    }
    if (provider === config.fallback_provider && config.fallback_enabled) {
      return <Badge variant="secondary"><Activity className="h-3 w-3 mr-1" />Fallback</Badge>
    }
    return <Badge variant="outline">Inactive</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          AI Provider Management
        </CardTitle>
        <CardDescription>
          Configure primary and fallback AI providers for consensus engine
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">OpenRouter</CardTitle>
                {getProviderStatus("openrouter")}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Access to:</span>
                <span className="font-medium">330+ Models</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Includes:</span>
                <span className="font-medium">GPT-4o, Claude, Gemini</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Together AI</CardTitle>
                {getProviderStatus("together")}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Access to:</span>
                <span className="font-medium">50+ Models</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Includes:</span>
                <span className="font-medium">Llama, Mistral, Qwen</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Primary Provider Selection */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Primary Provider</Label>
          <RadioGroup
            value={config.primary_provider}
            onValueChange={(value) => handlePrimaryProviderChange(value as "openrouter" | "together")}
            disabled={saving}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="openrouter" id="openrouter" />
              <Label htmlFor="openrouter" className="font-normal cursor-pointer">
                OpenRouter (Recommended)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="together" id="together" />
              <Label htmlFor="together" className="font-normal cursor-pointer">
                Together AI
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Fallback Configuration */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Enable Fallback</Label>
              <p className="text-sm text-muted-foreground">
                Automatically switch to backup provider if primary fails
              </p>
            </div>
            <Switch
              checked={config.fallback_enabled}
              onCheckedChange={handleToggleFallback}
              disabled={saving}
            />
          </div>

          {config.fallback_enabled && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto-Fallback</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically retry with fallback on errors
                  </p>
                </div>
                <Switch
                  checked={config.auto_fallback}
                  onCheckedChange={handleToggleAutoFallback}
                  disabled={saving}
                />
              </div>

              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-1">Current Fallback Chain:</p>
                <div className="flex items-center gap-2">
                  <Badge variant="default">{config.primary_provider === "openrouter" ? "OpenRouter" : "Together AI"}</Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant="secondary">{config.fallback_provider === "openrouter" ? "OpenRouter" : "Together AI"}</Badge>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Manual Override */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Emergency Override
              </Label>
              <p className="text-sm text-muted-foreground">
                Force all requests to fallback provider (use if primary is down)
              </p>
            </div>
            <Switch
              checked={config.manual_override}
              onCheckedChange={handleManualOverride}
              disabled={saving}
            />
          </div>

          {config.manual_override && (
            <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    Manual Override Active
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    All AI requests are being routed to {config.fallback_provider === "openrouter" ? "OpenRouter" : "Together AI"}. 
                    Disable this when the primary provider is restored.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProviderConfig}
            disabled={saving}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>

          {saving && (
            <Badge variant="secondary">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Saving...
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
