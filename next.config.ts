import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server accept requests from other devices on the LAN
  // (host laptop reached by its network IP, e.g. for QR-code join testing).
  // Update this if your computer's IP address changes.
  allowedDevOrigins: ["192.168.0.17"],
};

export default nextConfig;
