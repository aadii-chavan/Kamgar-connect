import { BadgeIndianRupee, Briefcase, CalendarCheck, FileText, LayoutDashboard, MapPinned, PlusCircle, Radio, Search, UserRound, Users, type LucideIcon } from "lucide-react";

export interface NavItem { href: string; label: string; icon: LucideIcon; mobile: boolean }

export const CONTRACTOR_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, mobile: true },
  { href: "/live", label: "Live Site", icon: Radio, mobile: true },
  { href: "/jobs", label: "Jobs", icon: Briefcase, mobile: true },
  { href: "/jobs/new", label: "Post a Job", icon: PlusCircle, mobile: false },
  { href: "/applicants", label: "Applicants", icon: Users, mobile: true },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck, mobile: true },
  { href: "/payments", label: "Payments", icon: BadgeIndianRupee, mobile: true },
];

export const WORKER_NAV: NavItem[] = [
  { href: "/worker", label: "Dashboard", icon: LayoutDashboard, mobile: true },
  { href: "/worker/today", label: "Today", icon: MapPinned, mobile: true },
  { href: "/worker/jobs", label: "Find Jobs", icon: Search, mobile: true },
  { href: "/worker/applications", label: "My Applications", icon: FileText, mobile: true },
  { href: "/worker/payouts", label: "Payouts", icon: BadgeIndianRupee, mobile: true },
  { href: "/worker/profile", label: "My Profile", icon: UserRound, mobile: true },
];

export function isActive(pathname: string, href: string) {
  if (href === "/" || href === "/worker") return pathname === href;
  if (href === "/jobs") return pathname === "/jobs" || (pathname.startsWith("/jobs/") && pathname !== "/jobs/new");
  return pathname === href || pathname.startsWith(href + "/");
}

export const isDashboard = (pathname: string) => pathname === "/" || pathname === "/worker" || pathname === "/worker/onboarding" || pathname === "/onboarding";

export function titleFor(pathname: string) {
  if (pathname === "/") return "Overview";
  if (pathname === "/worker") return "Overview";
  if (pathname === "/worker/jobs") return "Find Jobs";
  if (pathname === "/worker/applications") return "My Applications";
  if (pathname === "/worker/payouts") return "Payouts";
  if (pathname === "/worker/contractor") return "Contractor";
  if (pathname === "/worker/today") return "Today's Work";
  if (pathname === "/live") return "Live Site";
  if (pathname === "/profile") return "My Business";
  if (pathname === "/worker/profile") return "My Profile";
  if (pathname === "/jobs/new") return "Post a Job";
  if (pathname.startsWith("/jobs/")) return "Job Details";
  if (pathname.startsWith("/workers/")) return "Worker Profile";
  const seg = pathname.split("/")[1];
  return seg ? seg[0].toUpperCase() + seg.slice(1) : "Overview";
}
