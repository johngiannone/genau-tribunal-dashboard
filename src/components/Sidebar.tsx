import { Plus, Cpu, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const sampleChats = [
  { id: 1, title: "Code Review Analysis", time: "2h ago" },
  { id: 2, title: "Research Synthesis", time: "5h ago" },
  { id: 3, title: "Data Quality Check", time: "1d ago" },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header with Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-2xl font-bold text-sidebar-foreground tracking-tight font-mono">
          GENAU
        </h1>
        <p className="text-xs text-muted-foreground mt-1 font-mono">CONSENSUS ENGINE</p>
      </div>

      {/* New Session Button */}
      <div className="p-4">
        <Button 
          variant="ghost"
          className="w-full border border-sidebar-primary text-sidebar-primary hover:bg-sidebar-primary hover:text-sidebar-primary-foreground font-semibold transition-all font-mono"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Session
        </Button>
      </div>

      {/* Session History */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-0.5">
          <h3 className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2 font-mono">
            Recent Sessions
          </h3>
          {sampleChats.map((chat) => (
            <button
              key={chat.id}
              className="w-full text-left px-2 py-2 rounded hover:bg-sidebar-accent/50 transition-all group flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Cpu className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0" />
                <p className="text-xs text-muted-foreground/70 group-hover:text-sidebar-foreground truncate">
                  {chat.title}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground/50 font-mono flex-shrink-0">
                {chat.time}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* Settings at Bottom */}
      <div className="p-3 border-t border-sidebar-border">
        <button className="p-2 rounded hover:bg-sidebar-accent/50 transition-all text-muted-foreground hover:text-sidebar-foreground">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
