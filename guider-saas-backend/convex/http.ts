import { httpRouter } from "convex/server";
import { plan, transcribe } from "./guider";
import { getStats, bumpInstall } from "./stats";

const http = httpRouter();

http.route({
  path: "/api/guider/plan",
  method: "POST",
  handler: plan,
});

http.route({
  path: "/api/guider/plan",
  method: "OPTIONS",
  handler: plan, // we'll handle options inside
});

http.route({
  path: "/api/guider/transcribe",
  method: "POST",
  handler: transcribe,
});

http.route({
  path: "/api/guider/transcribe",
  method: "OPTIONS",
  handler: transcribe,
});

http.route({
  path: "/api/stats",
  method: "GET",
  handler: getStats,
});

http.route({
  path: "/api/stats/install",
  method: "POST",
  handler: bumpInstall,
});

export default http;
