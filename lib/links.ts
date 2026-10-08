/** Links to detail pages. The app is exported as static files, so the id travels in the query string. */
export const jobHref = (id: string, tab?: string) => `/jobs/view?id=${id}${tab ? `&tab=${tab}` : ""}`;
export const workerHref = (id: string) => `/workers/view?id=${id}`;
