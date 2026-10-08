import type { Contractor } from "./types";

/** The signed-in contractor (updated from their profile). Workers use `contractorOf` instead. */
export const contractor: Contractor = { name: "Contractor", company: "Your company", city: "", initials: "C", phone: "" };

/** The signed-in account's id (set by the store on login). Imported as a live binding. */
export let currentWorkerId = "";
export const setCurrentUserId = (id: string) => { currentWorkerId = id; };

/** Contractors known to the signed-in user (for workers: whoever posted the jobs they can see). */
const contractors = new Map<string, Contractor>();
export function registerContractors(list: (Contractor & { id: string })[]) {
  for (const c of list) contractors.set(c.id, c);
}
export const contractorOf = (id: string | undefined): Contractor =>
  (id && contractors.get(id)) || { name: "Contractor", company: "Contractor", city: "", initials: "C", phone: "" };

/** The city Kamgar currently serves. */
export const CITY = "Pune";
export const SKILLS = ["Mason", "Painter", "Electrician", "Helper", "Plumber", "Tile Fitter", "Carpenter", "Welder"];
export const AREAS = ["Wakad", "Baner", "Hinjewadi", "Kharadi", "Aundh", "Viman Nagar", "Hadapsar", "Kothrud"];
