import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { Activity, AlertTriangle, RefreshCw, Settings2, ArrowUp, ArrowDown } from "lucide-react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ProviderConfig {
  provider_priority: string[]
  fallback_enabled: boolean
  auto_fallback: boolean
  manual_override: boolean
}

interface SortableProviderItemProps {
  provider: string
  index: number
  isPrimary: boolean
}

function SortableProviderItem({ provider, index, isPrimary }: SortableProviderItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: provider });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const providerName = provider === 'openrouter' ? 'OpenRouter' 
    : provider === 'together' ? 'Together AI'
    : provider === 'basten' ? 'Basten'
    : provider;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center justify-between p-4 rounded-lg border cursor-move transition-colors ${
        isPrimary ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
      } hover:border-blue-400`}
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-0.5">
          <ArrowUp className="w-3 h-3 text-gray-400" />
          <ArrowDown className="w-3 h-3 text-gray-400" />
        </div>
        <Activity className="w-5 h-5 text-gray-600" />
        <div>
          <div className="font-semibold text-gray-900">{providerName}</div>
          <div className="text-xs text-gray-500">
            {isPrimary ? 'Primary Provider' : `Fallback Level ${index}`}
          </div>
        </div>
      </div>
      {isPrimary && (
        <Badge className="bg-blue-600">Primary</Badge>
      )}
    </div>
  );
}

export const ProviderManagement = () => {
  const [config, setConfig] = useState<ProviderConfig>({
    provider_priority: ['openrouter', 'together', 'basten'],
    fallback_enabled: true,
    auto_fallback: true,
    manual_override: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchProviderConfig()
  }, [])

  const fetchProviderConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'ai_provider_config')
        .maybeSingle()

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
        .upsert({
          key: 'ai_provider_config',
          value: newConfig as any,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = config.provider_priority.indexOf(active.id as string);
      const newIndex = config.provider_priority.indexOf(over.id as string);
      
      const newPriority = arrayMove(config.provider_priority, oldIndex, newIndex);
      saveProviderConfig({ ...config, provider_priority: newPriority });
    }
  };

  const handleToggleFallback = (enabled: boolean) => {
    saveProviderConfig({ ...config, fallback_enabled: enabled })
  }

  const handleToggleAutoFallback = (enabled: boolean) => {
    saveProviderConfig({ ...config, auto_fallback: enabled })
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          AI Provider Configuration
        </CardTitle>
        <CardDescription>
          Manage provider priority and fallback settings. Drag to reorder providers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Priority List */}
        <div>
          <Label className="text-base font-semibold mb-3 block">Provider Priority</Label>
          <p className="text-sm text-gray-600 mb-4">
            Primary provider is attempted first. If it fails, fallback providers are tried in order.
          </p>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={config.provider_priority}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {config.provider_priority.map((provider, index) => (
                  <SortableProviderItem
                    key={provider}
                    provider={provider}
                    index={index}
                    isPrimary={index === 0}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Fallback Settings */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="fallback-enabled" className="text-base font-semibold">
                Enable Fallback
              </Label>
              <p className="text-sm text-gray-600">
                Automatically try next provider if primary fails
              </p>
            </div>
            <Switch
              id="fallback-enabled"
              checked={config.fallback_enabled}
              onCheckedChange={handleToggleFallback}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-fallback" className="text-base font-semibold">
                Automatic Failover
              </Label>
              <p className="text-sm text-gray-600">
                Enable automatic cascading through all providers
              </p>
            </div>
            <Switch
              id="auto-fallback"
              checked={config.auto_fallback}
              disabled={!config.fallback_enabled || saving}
              onCheckedChange={handleToggleAutoFallback}
            />
          </div>
        </div>

        {/* Status Display */}
        <div className="rounded-lg bg-gray-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium">Current Configuration:</span>
          </div>
          <div className="text-sm text-gray-700 ml-6">
            Primary: <strong>{config.provider_priority[0]?.toUpperCase() || 'None'}</strong>
          </div>
          {config.fallback_enabled && config.provider_priority.length > 1 && (
            <div className="text-sm text-gray-700 ml-6">
              Fallbacks: <strong>
                {config.provider_priority.slice(1).map(p => p.toUpperCase()).join(' → ')}
              </strong>
            </div>
          )}
        </div>

        {/* Warning */}
        {!config.fallback_enabled && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>Warning:</strong> Fallback is disabled. If the primary provider fails,
                requests will fail immediately without attempting backup providers.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
