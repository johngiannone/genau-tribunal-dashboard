import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Fingerprint, Bot, Shield, AlertTriangle, User, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface TimelineEvent {
  id: string;
  timestamp: Date;
  eventType: 'fingerprint_change' | 'bot_detection' | 'ip_block' | 'security_flag' | 'account_change' | 'ban';
  userId: string;
  userEmail?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metadata: Record<string, any>;
}

export function ForensicTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  useEffect(() => {
    fetchAllEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchQuery, eventTypeFilter, severityFilter]);

  const fetchAllEvents = async () => {
    setLoading(true);
    try {
      const allEvents: TimelineEvent[] = [];

      // 1. Fetch fingerprint changes
      const { data: fingerprints } = await supabase
        .from('user_fingerprints')
        .select('*')
        .order('collected_at', { ascending: false })
        .limit(500);

      if (fingerprints) {
        // Group by user_id to detect changes
        const fingerprintsByUser = new Map<string, typeof fingerprints>();
        fingerprints.forEach(fp => {
          if (!fingerprintsByUser.has(fp.user_id || 'unknown')) {
            fingerprintsByUser.set(fp.user_id || 'unknown', []);
          }
          fingerprintsByUser.get(fp.user_id || 'unknown')!.push(fp);
        });

        // Detect changes
        fingerprintsByUser.forEach((userFingerprints, userId) => {
          const sorted = userFingerprints.sort((a, b) => 
            new Date(a.collected_at!).getTime() - new Date(b.collected_at!).getTime()
          );
          
          for (let i = 1; i < sorted.length; i++) {
            if (sorted[i].fingerprint_hash !== sorted[i - 1].fingerprint_hash) {
              allEvents.push({
                id: `fp-${sorted[i].id}`,
                timestamp: new Date(sorted[i].collected_at!),
                eventType: 'fingerprint_change',
                userId: userId,
                severity: 'high',
                title: 'Device Fingerprint Changed',
                description: `Device fingerprint changed from ${sorted[i - 1].fingerprint_hash.slice(0, 8)}... to ${sorted[i].fingerprint_hash.slice(0, 8)}...`,
                metadata: {
                  oldFingerprint: sorted[i - 1].fingerprint_hash,
                  newFingerprint: sorted[i].fingerprint_hash,
                  screenResolution: sorted[i].screen_resolution,
                  platform: sorted[i].platform,
                  webglRenderer: sorted[i].webgl_renderer,
                }
              });
            }
          }
        });
      }

      // 2. Fetch bot detections
      const { data: botSignals } = await supabase
        .from('behavioral_signals')
        .select('*')
        .gte('bot_likelihood_score', 50)
        .order('collected_at', { ascending: false })
        .limit(200);

      if (botSignals) {
        botSignals.forEach(signal => {
          const severity = signal.bot_likelihood_score! >= 80 ? 'critical' : 
                          signal.bot_likelihood_score! >= 70 ? 'high' : 'medium';
          
          allEvents.push({
            id: `bot-${signal.id}`,
            timestamp: new Date(signal.collected_at!),
            eventType: 'bot_detection',
            userId: signal.user_id || 'unknown',
            severity,
            title: `Bot Detection Alert (${signal.bot_likelihood_score}% confidence)`,
            description: `Suspicious behavioral patterns detected: ${(signal.bot_indicators as string[] || []).join(', ')}`,
            metadata: {
              botScore: signal.bot_likelihood_score,
              indicators: signal.bot_indicators,
              mouseEvents: signal.total_mouse_events,
              keystrokeEvents: signal.total_keystroke_events,
              clickEvents: signal.total_click_events,
            }
          });
        });
      }

      // 3. Fetch IP blocks
      const { data: blockedIps } = await supabase
        .from('blocked_ips')
        .select('*')
        .order('blocked_at', { ascending: false })
        .limit(200);

      if (blockedIps) {
        blockedIps.forEach(ip => {
          const severity = ip.is_permanent ? 'critical' : 
                          (ip.fraud_score || 0) >= 80 ? 'high' : 'medium';
          
          allEvents.push({
            id: `ip-${ip.ip_address}`,
            timestamp: new Date(ip.blocked_at),
            eventType: 'ip_block',
            userId: ip.associated_user_id || 'unknown',
            severity,
            title: `IP Address Blocked: ${ip.ip_address}`,
            description: `${ip.blocked_reason} (Fraud Score: ${ip.fraud_score || 'N/A'})`,
            metadata: {
              ipAddress: ip.ip_address,
              fraudScore: ip.fraud_score,
              isVpn: ip.is_vpn,
              isProxy: ip.is_proxy,
              isTor: ip.is_tor,
              countryCode: ip.country_code,
              isPermanent: ip.is_permanent,
            }
          });
        });
      }

      // 4. Fetch security logs
      const { data: securityLogs } = await supabase
        .from('security_logs')
        .select('*')
        .order('flagged_at', { ascending: false })
        .limit(200);

      if (securityLogs) {
        securityLogs.forEach(log => {
          allEvents.push({
            id: `sec-${log.id}`,
            timestamp: new Date(log.flagged_at),
            eventType: 'security_flag',
            userId: log.user_id,
            severity: 'high',
            title: `Content Flagged: ${log.flag_category}`,
            description: `Prompt flagged for ${log.flag_category}`,
            metadata: {
              category: log.flag_category,
              prompt: log.prompt.slice(0, 100) + '...',
            }
          });
        });
      }

      // 5. Fetch activity logs (bans and status changes)
      const { data: activityLogs } = await supabase
        .from('activity_logs')
        .select('*')
        .in('activity_type', ['admin_change'])
        .order('created_at', { ascending: false })
        .limit(200);

      if (activityLogs) {
        activityLogs.forEach(log => {
          const isBan = log.description.toLowerCase().includes('ban');
          
          allEvents.push({
            id: `act-${log.id}`,
            timestamp: new Date(log.created_at),
            eventType: isBan ? 'ban' : 'account_change',
            userId: log.user_id,
            severity: isBan ? 'critical' : 'medium',
            title: isBan ? 'User Banned' : 'Account Status Changed',
            description: log.description,
            metadata: log.metadata as Record<string, any> || {},
          });
        });
      }

      // Sort all events by timestamp (most recent first)
      allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setEvents(allEvents);
      setFilteredEvents(allEvents);
    } catch (error) {
      console.error('Error fetching timeline events:', error);
      toast.error('Failed to load forensic timeline');
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = events;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(event => 
        event.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Event type filter
    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter(event => event.eventType === eventTypeFilter);
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(event => event.severity === severityFilter);
    }

    setFilteredEvents(filtered);
  };

  const getEventIcon = (type: TimelineEvent['eventType']) => {
    switch (type) {
      case 'fingerprint_change': return <Fingerprint className="h-4 w-4" />;
      case 'bot_detection': return <Bot className="h-4 w-4" />;
      case 'ip_block': return <Shield className="h-4 w-4" />;
      case 'security_flag': return <AlertTriangle className="h-4 w-4" />;
      case 'account_change': return <User className="h-4 w-4" />;
      case 'ban': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getSeverityBadge = (severity: TimelineEvent['severity']) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500">High</Badge>;
      case 'medium': return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'low': return <Badge variant="outline">Low</Badge>;
      default: return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Forensic Timeline
            </CardTitle>
            <CardDescription>
              Chronological sequence of all security events for investigation
            </CardDescription>
          </div>
          <Button onClick={fetchAllEvents} disabled={loading} variant="outline">
            <Search className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search by user ID or event details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="fingerprint_change">Fingerprint Changes</SelectItem>
              <SelectItem value="bot_detection">Bot Detections</SelectItem>
              <SelectItem value="ip_block">IP Blocks</SelectItem>
              <SelectItem value="security_flag">Security Flags</SelectItem>
              <SelectItem value="account_change">Account Changes</SelectItem>
              <SelectItem value="ban">Bans</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-sm text-muted-foreground mb-1">Total Events</div>
            <div className="text-2xl font-bold">{filteredEvents.length}</div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-sm text-muted-foreground mb-1">Critical</div>
            <div className="text-2xl font-bold text-red-500">
              {filteredEvents.filter(e => e.severity === 'critical').length}
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-sm text-muted-foreground mb-1">High</div>
            <div className="text-2xl font-bold text-orange-500">
              {filteredEvents.filter(e => e.severity === 'high').length}
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-sm text-muted-foreground mb-1">Unique Users</div>
            <div className="text-2xl font-bold">
              {new Set(filteredEvents.map(e => e.userId)).size}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <ScrollArea className="h-[600px] rounded-lg border">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-muted-foreground">Loading timeline...</div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-muted-foreground">No events found</div>
            </div>
          ) : (
            <div className="relative p-6">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
              
              {/* Events */}
              <div className="space-y-6">
                {filteredEvents.map((event, index) => (
                  <div key={event.id} className="relative pl-12">
                    {/* Timeline dot */}
                    <div className={`absolute left-6 w-5 h-5 rounded-full border-2 border-background flex items-center justify-center ${
                      event.severity === 'critical' ? 'bg-red-500' :
                      event.severity === 'high' ? 'bg-orange-500' :
                      event.severity === 'medium' ? 'bg-yellow-500' :
                      'bg-gray-400'
                    }`}>
                      <div className="text-white text-xs">
                        {getEventIcon(event.eventType)}
                      </div>
                    </div>

                    {/* Event card */}
                    <div className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{event.title}</h4>
                          {getSeverityBadge(event.severity)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {event.timestamp.toLocaleString()}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {event.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="font-mono">{event.userId.slice(0, 16)}...</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {event.eventType.replace('_', ' ')}
                        </Badge>
                      </div>

                      {/* Metadata */}
                      {Object.keys(event.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            View Details
                          </summary>
                          <div className="mt-2 p-2 rounded bg-muted/50 text-xs font-mono">
                            {JSON.stringify(event.metadata, null, 2)}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
