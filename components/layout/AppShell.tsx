"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { contractor, currentWorkerId } from "@/data/jobs";
import { workerById } from "@/data/workers";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { LiveNotifier } from "../live/LiveNotifier";
import { MobileTabBar } from "./MobileTabBar";
import { TopNav } from "./TopNav";
import { CONTRACTOR_NAV, WORKER_NAV, isDashboard, titleFor } from "./nav";

/** Shared chrome for both roles. Signed-out visitors go to /login; each role is kept inside its own area. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const { session, profile, profileReady, contractorProfile } = useStore();
  const inWorkerArea = pathname === "/worker" || pathname.startsWith("/worker/");

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) router.replace("/login");
    else if (session === "worker" && !inWorkerArea) router.replace("/worker");
    else if (session === "contractor" && inWorkerArea) router.replace("/");
    else if (session === "worker" && profileReady) {
      // A new worker finishes the sign-up steps before anything else.
      if (!profile.onboarded && pathname !== "/worker/onboarding") router.replace("/worker/onboarding");
      else if (profile.onboarded && pathname === "/worker/onboarding") router.replace("/worker/profile");
    } else if (session === "contractor" && profileReady) {
      // A new contractor registers their business before posting anything.
      if (!contractorProfile.onboarded && pathname !== "/onboarding") router.replace("/onboarding");
      else if (contractorProfile.onboarded && pathname === "/onboarding") router.replace("/profile");
    }
  }, [session, inWorkerArea, router, profile.onboarded, contractorProfile.onboarded, profileReady, pathname]);

  const onboarding = pathname === "/worker/onboarding" || pathname === "/onboarding";
  const gateOpen = session === "worker" ? profileReady && profile.onboarded !== (pathname === "/worker/onboarding")
    : session === "contractor" ? profileReady && contractorProfile.onboarded !== (pathname === "/onboarding") : true;
  const allowed = gateOpen && ((session === "worker" && inWorkerArea) || (session === "contractor" && !inWorkerArea));
  if (!allowed) return <div aria-busy="true" className="min-h-screen" />;

  const worker = workerById(currentWorkerId);
  const isWorker = session === "worker";
  return (
    <>
      <TopNav
        nav={isWorker ? WORKER_NAV : CONTRACTOR_NAV} home={isWorker ? "/worker" : "/"} role={isWorker ? "Worker" : "Contractor"}
        name={isWorker ? worker.name : contractor.name}
        sub={isWorker ? `${t(worker.skill)} · ${t(worker.area)}` : `${t(contractor.company)} · ${t(contractor.city)}`}
        minimal={onboarding} profileHref={onboarding ? undefined : isWorker ? "/worker/profile" : "/profile"} profileLabel={isWorker ? "My Profile" : "My business"}
      />
      <main className="mx-auto max-w-[1400px] px-4 pb-32 md:px-10 lg:pb-16">
        {!isDashboard(pathname) && (
          <div aria-hidden className="mb-3 mt-6 text-[44px] font-medium leading-none tracking-tight text-white md:mt-10 md:text-[64px]">
            {t(titleFor(pathname))}
          </div>
        )}
        {children}
      </main>
      <LiveNotifier />
      {!onboarding && <MobileTabBar nav={isWorker ? WORKER_NAV : CONTRACTOR_NAV} />}
    </>
  );
}
