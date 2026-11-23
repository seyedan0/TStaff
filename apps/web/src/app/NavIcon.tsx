import {
  Activity,
  Archive,
  BookOpen,
  ClipboardCheck,
  FileUser,
  FolderOpen,
  GraduationCap,
  History,
  Inbox,
  LayoutDashboard,
  Library,
  MapPin,
  MessagesSquare,
  Network,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

const icons = {
  overview: LayoutDashboard,
  settings: Settings,
  archive: Archive,
  managers: ShieldCheck,
  health: Activity,
  pipeline: Network,
  assignments: ClipboardCheck,
  audit: History,
  tickets: Inbox,
  users: Users,
  metrics: MapPin,
  admissions: FileUser,
  reviews: BookOpen,
  evaluations: GraduationCap,
  library: Library,
  messages: MessagesSquare,
  "resource-bank": FolderOpen,
};
export function NavIcon({ path }: { path: string }) {
  const key = path.split("/").pop() as keyof typeof icons;
  const Icon = icons[key] ?? FolderOpen;
  return <Icon size={17} aria-hidden="true" className="atlas-nav-icon" />;
}
