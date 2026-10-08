import type { Worker } from "./types";

/** People known to the signed-in user (applicants, hired workers, the user themself). Filled by the store from the database. */
export const workers: Worker[] = [];

const blank = (id: string): Worker => ({ id, name: "Worker", skill: "", experience: 0, rating: 0, phone: "", area: "", languages: [], completedJobs: 0 });

export const workerById = (id: string): Worker => workers.find((x) => x.id === id) ?? blank(id);

/** Add or refresh workers in the directory. */
export function registerWorkers(list: Worker[]) {
  for (const w of list) {
    const i = workers.findIndex((x) => x.id === w.id);
    if (i >= 0) workers[i] = w; else workers.push(w);
  }
}
