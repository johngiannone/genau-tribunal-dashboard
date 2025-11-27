import { Plus, MessageSquare, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const sampleChats = [
  { id: 1, title: "Contract Review Analysis", time: "2h ago" },
  { id: 2, title: "Legal Document Audit", time: "5h ago" },
  { id: 3, title: "Compliance Check Report", time: "1d ago" },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header with Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-2xl font-bold text-sidebar-foreground tracking-tight">
          Genau
        </h1>
        <p className="text-xs text-muted-foreground mt-1">AI Auditing Platform</p>
      </div>

      {/* New Audit Button */}
      <div className="p-4">
        <Button 
          className="w-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground font-semibold shadow-lg transition-all hover:shadow-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Audit
        </Button>
      </div>

      {/* Chat History */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Recent Audits
          </h3>
          {sampleChats.map((chat) => (
            <button
              key={chat.id}
              className="w-full text-left p-3 rounded-lg hover:bg-sidebar-accent transition-all group"
            >
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 group-hover:text-sidebar-foreground transition-colors" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-sidebar-foreground truncate font-medium">
                    {chat.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {chat.time}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* Settings at Bottom */}
      <div className="p-4 border-t border-sidebar-border">
        <button className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-sidebar-accent transition-all text-sidebar-foreground">
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium">Settings</span>
        </button>
      </div>
    </aside>
  );
};
