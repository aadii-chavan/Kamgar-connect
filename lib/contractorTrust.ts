import type { ContractorProfile, Site } from "@/data/types";
import { levelOf, type TrustLevel } from "./trust";
import type { CheckItem } from "./trust";

/** Contractor checklist; points add up to 100. (Document uploads are planned for a later release.) */
export function contractorChecklist(p: ContractorProfile, sites: Site[], workerReviews: number): CheckItem[] {
  const withAmenities = sites.filter((s) => s.amenities.length >= 3).length;
  const withPhotos = sites.filter((s) => s.photos.length > 0).length;
  return [
    { id: "basics", label: "Business details", hint: "Company, trades and areas you work in", points: 30, earned: p.onboarded ? 30 : 0, done: p.onboarded },
    { id: "upi", label: "Payout details", hint: "A UPI ID for paying workers quickly", points: 15, earned: p.upi.trim() ? 15 : 0, done: !!p.upi.trim() },
    { id: "pledge", label: "Fair-pay pledge", hint: "Promise to pay fairly, on time, on a safe site", points: 10, earned: p.pledge ? 10 : 0, done: p.pledge },
    { id: "sites", label: "Safe, described sites", hint: "Add sites with at least 3 amenities", points: 15, earned: Math.min(15, withAmenities * 5), done: withAmenities >= 3 },
    { id: "photos", label: "Site photos", hint: "Show workers where they will work", points: 10, earned: withPhotos > 0 ? 10 : 0, done: withPhotos > 0 },
    { id: "logo", label: "Logo or photo", hint: "Helps workers recognise you", points: 5, earned: p.logo ? 5 : 0, done: !!p.logo },
    { id: "about", label: "About your business", hint: "Write a few lines about your work", points: 5, earned: p.about.trim().length >= 20 ? 5 : 0, done: p.about.trim().length >= 20 },
    { id: "reviews", label: "Reviews from workers", hint: "Finish jobs and get rated", points: 10, earned: Math.min(10, workerReviews * 2), done: workerReviews >= 5 },
  ];
}

export const contractorScore = (p: ContractorProfile, sites: Site[], workerReviews: number) =>
  contractorChecklist(p, sites, workerReviews).reduce((s, c) => s + c.earned, 0);

export { levelOf };
export type { TrustLevel };
