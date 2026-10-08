/** @type {import('next').NextConfig} */
const nextConfig = {
  // The app talks to Supabase straight from the browser, so it is built as plain static files (the "out" folder)
  // and can be hosted anywhere, including Firebase Hosting's free plan.
  output: "export",
};
export default nextConfig;
