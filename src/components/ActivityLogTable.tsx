import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Loader2, Activity, Search, Filter, X, CalendarIcon, Download, FileJson, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
}

type ActivityTypeFilter = "all" | "login" | "logout" | "audit_completed" | "admin_change" | "profile_update" | "file_upload";

export const ActivityLogTable = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activityTypeFilter, setActivityTypeFilter] = useState<ActivityTypeFilter>("all");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    userIds: string[];
    descriptions: string[];
    ipAddresses: string[];
  }>({ userIds: [], descriptions: [], ipAddresses: [] });
  const searchInputRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Fetch suggestions when search query changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length < 2) {
        setSuggestions({ userIds: [], descriptions: [], ipAddresses: [] });
        return;
      }

      try {
        const searchTerm = searchQuery.trim();
        
        // Fetch matching user IDs
        const { data: userIdData } = await supabase
          .from('activity_logs')
          .select('user_id')
          .ilike('user_id', `%${searchTerm}%`)
          .limit(5);

        // Fetch matching descriptions
        const { data: descData } = await supabase
          .from('activity_logs')
          .select('description')
          .ilike('description', `%${searchTerm}%`)
          .limit(5);

        // Fetch matching IP addresses
        const { data: ipData } = await supabase
          .from('activity_logs')
          .select('ip_address')
          .not('ip_address', 'is', null)
          .ilike('ip_address', `%${searchTerm}%`)
          .limit(5);

        setSuggestions({
          userIds: [...new Set(userIdData?.map(d => d.user_id) || [])],
          descriptions: [...new Set(descData?.map(d => d.description) || [])],
          ipAddresses: [...new Set(ipData?.map(d => d.ip_address).filter(Boolean) || [])],
        });
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
    fetchActivityLogs();
  }, [searchQuery, activityTypeFilter, userIdFilter, dateRange, pageSize]);

  useEffect(() => {
    fetchActivityLogs(); // Fetch when page changes
  }, [currentPage]);

  // Set up realtime subscription for new activity logs
  useEffect(() => {
    const channel = supabase
      .channel('activity-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          console.log('New activity log received:', payload);
          
          // Show toast notification for new activity
          toast.info('New Activity', {
            description: (payload.new as ActivityLog).description,
            duration: 3000,
          });

          // Refetch to update count and maintain pagination
          if (currentPage === 1) {
            fetchActivityLogs();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentPage]);

  const fetchActivityLogs = async () => {
    setLoading(true);
    try {
      // Build base query for data
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      // Build count query with same filters
      let countQuery = supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true });

      // Apply activity type filter
      if (activityTypeFilter && activityTypeFilter !== "all") {
        query = query.eq('activity_type', activityTypeFilter);
        countQuery = countQuery.eq('activity_type', activityTypeFilter);
      }

      // Apply user ID filter
      if (userIdFilter.trim()) {
        query = query.ilike('user_id', `${userIdFilter.trim()}%`);
        countQuery = countQuery.ilike('user_id', `${userIdFilter.trim()}%`);
      }

      // Apply search query (description or IP address)
      if (searchQuery.trim()) {
        const searchFilter = `description.ilike.%${searchQuery.trim()}%,ip_address.ilike.%${searchQuery.trim()}%`;
        query = query.or(searchFilter);
        countQuery = countQuery.or(searchFilter);
      }

      // Apply date range filter
      if (dateRange?.from) {
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        query = query.gte('created_at', fromDate.toISOString());
        countQuery = countQuery.gte('created_at', fromDate.toISOString());
      }
      if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', toDate.toISOString());
        countQuery = countQuery.lte('created_at', toDate.toISOString());
      }

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Execute queries
      const [{ data, error }, { count, error: countError }] = await Promise.all([
        query,
        countQuery
      ]);

      if (error) throw error;
      if (countError) throw countError;

      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActivityTypeFilter("all");
    setUserIdFilter("");
    setDateRange(undefined);
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || activityTypeFilter !== "all" || userIdFilter || dateRange;

  const exportToCSV = () => {
    if (logs.length === 0) {
      toast.error("No data to export");
      return;
    }

    // CSV headers
    const headers = ["Time", "User ID", "Activity Type", "Description", "IP Address", "User Agent", "Metadata"];
    
    // Convert logs to CSV rows
    const rows = logs.map(log => [
      format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
      log.user_id,
      log.activity_type,
      `"${log.description.replace(/"/g, '""')}"`, // Escape quotes
      log.ip_address || "N/A",
      log.user_agent ? `"${log.user_agent.replace(/"/g, '""')}"` : "N/A",
      JSON.stringify(log.metadata || {})
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `activity-logs-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${logs.length} records to CSV`);
  };

  const exportToJSON = () => {
    if (logs.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Format logs with readable timestamps
    const formattedLogs = logs.map(log => ({
      ...log,
      created_at: format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
    }));

    // Create JSON blob and download
    const jsonContent = JSON.stringify(formattedLogs, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `activity-logs-${format(new Date(), "yyyy-MM-dd-HHmmss")}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${logs.length} records to JSON`);
  };

  const getActivityBadge = (type: string) => {
    const badges: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      login: { variant: "default", label: "Login" },
      logout: { variant: "secondary", label: "Logout" },
      audit_completed: { variant: "default", label: "Audit" },
      admin_change: { variant: "destructive", label: "Admin Change" },
      profile_update: { variant: "outline", label: "Profile Update" },
      file_upload: { variant: "outline", label: "File Upload" },
    };
    
    const badge = badges[type] || { variant: "outline" as const, label: type };
    return (
      <Badge variant={badge.variant} className="font-mono text-xs">
        {badge.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#0071E3]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-[#0071E3]" />
          <h2 className="text-2xl font-bold text-[#111111]">Activity Log</h2>
          <Badge variant="secondary" className="font-mono text-xs">
            {totalCount} total
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={logs.length === 0}
            className="rounded-full"
          >
            <FileText className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToJSON}
            disabled={logs.length === 0}
            className="rounded-full"
          >
            <FileJson className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="rounded-full"
            >
              <X className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-[#F9FAFB] rounded-2xl border border-[#E5E5EA] p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-[#86868B]" />
          <h3 className="font-semibold text-[#111111]">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Input with Autocomplete */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#86868B]">Search</label>
            <Popover open={showSuggestions && searchQuery.length >= 2} onOpenChange={setShowSuggestions}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#86868B] z-10" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="User ID, description, or IP..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(e.target.value.length >= 2);
                    }}
                    onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                    className="pl-10 h-11 rounded-xl border-[#E5E5EA] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent 
                className="w-[--radix-popover-trigger-width] p-0" 
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <Command>
                  <CommandList>
                    {(suggestions.userIds.length === 0 && 
                      suggestions.descriptions.length === 0 && 
                      suggestions.ipAddresses.length === 0) ? (
                      <CommandEmpty>No suggestions found</CommandEmpty>
                    ) : (
                      <>
                        {suggestions.userIds.length > 0 && (
                          <CommandGroup heading="User IDs">
                            {suggestions.userIds.map((userId) => (
                              <CommandItem
                                key={userId}
                                value={userId}
                                onSelect={(value) => {
                                  setSearchQuery(value);
                                  setShowSuggestions(false);
                                }}
                                className="cursor-pointer"
                              >
                                <span className="font-mono text-xs">{userId.slice(0, 16)}...</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                        {suggestions.descriptions.length > 0 && (
                          <CommandGroup heading="Descriptions">
                            {suggestions.descriptions.map((desc, idx) => (
                              <CommandItem
                                key={`desc-${idx}`}
                                value={desc}
                                onSelect={(value) => {
                                  setSearchQuery(value);
                                  setShowSuggestions(false);
                                }}
                                className="cursor-pointer"
                              >
                                <span className="text-sm truncate">{desc}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                        {suggestions.ipAddresses.length > 0 && (
                          <CommandGroup heading="IP Addresses">
                            {suggestions.ipAddresses.map((ip) => (
                              <CommandItem
                                key={ip}
                                value={ip}
                                onSelect={(value) => {
                                  setSearchQuery(value);
                                  setShowSuggestions(false);
                                }}
                                className="cursor-pointer"
                              >
                                <span className="font-mono text-xs">{ip}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Activity Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#86868B]">Activity Type</label>
            <Select value={activityTypeFilter} onValueChange={(value) => setActivityTypeFilter(value as ActivityTypeFilter)}>
              <SelectTrigger className="h-11 rounded-xl border-[#E5E5EA]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="audit_completed">Audit Completed</SelectItem>
                <SelectItem value="admin_change">Admin Change</SelectItem>
                <SelectItem value="profile_update">Profile Update</SelectItem>
                <SelectItem value="file_upload">File Upload</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User ID Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#86868B]">User ID</label>
            <Input
              type="text"
              placeholder="Filter by user ID..."
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              className="h-11 rounded-xl border-[#E5E5EA] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 font-mono text-sm"
            />
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#86868B]">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-11 w-full justify-start text-left font-normal rounded-xl border-[#E5E5EA] hover:bg-[#F9FAFB]",
                    !dateRange && "text-[#86868B]"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E5E5EA] bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F9FAFB]">
              <TableHead className="font-semibold text-[#111111]">Time</TableHead>
              <TableHead className="font-semibold text-[#111111]">User ID</TableHead>
              <TableHead className="font-semibold text-[#111111]">Type</TableHead>
              <TableHead className="font-semibold text-[#111111]">Description</TableHead>
              <TableHead className="font-semibold text-[#111111]">Changed By</TableHead>
              <TableHead className="font-semibold text-[#111111]">IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-[#86868B]">
                  No activity logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-[#F9FAFB]/50">
                  <TableCell className="text-sm text-[#86868B]">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[#86868B]">
                    {log.user_id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>{getActivityBadge(log.activity_type)}</TableCell>
                  <TableCell className="text-sm text-[#111111] max-w-md">
                    <div className="space-y-1">
                      <div className="truncate">{log.description}</div>
                      {log.activity_type === 'admin_change' && log.metadata && (
                        <div className="text-xs text-[#86868B] space-y-0.5">
                          {log.metadata.previous_status && log.metadata.new_status && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {log.metadata.previous_status}
                              </Badge>
                              <span>→</span>
                              <Badge variant="outline" className="text-xs">
                                {log.metadata.new_status}
                              </Badge>
                            </div>
                          )}
                          {log.metadata.automated && (
                            <Badge variant="secondary" className="text-xs">
                              Automated
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[#86868B]">
                    {log.metadata?.changed_by ? (
                      <div className="space-y-0.5">
                        <div>{log.metadata.changed_by.slice(0, 8)}...</div>
                        {log.metadata.changed_by_email && (
                          <div className="text-[10px] text-[#86868B]">
                            {log.metadata.changed_by_email}
                          </div>
                        )}
                      </div>
                    ) : log.metadata?.automated ? (
                      <Badge variant="secondary" className="text-xs">System</Badge>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[#86868B]">
                    {log.ip_address || "N/A"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-[#E5E5EA]">
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#86868B]">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} records
            </span>
            
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#86868B]">Rows per page:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-20 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#86868B] mr-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
