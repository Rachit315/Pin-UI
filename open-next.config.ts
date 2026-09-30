import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/*
 * Every page here is prerendered at build time. Serving those prerendered
 * copies from the worker's static assets means a component page is never
 * rebuilt on a request — which matters, because building one reads its source
 * off disk, and a worker has no disk.
 */
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
