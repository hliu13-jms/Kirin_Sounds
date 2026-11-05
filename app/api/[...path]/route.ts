import { env } from "cloudflare:workers";
import { handleCmsRequest } from "../../../server/cms";

export const dynamic = "force-dynamic";
async function route(request: Request) {
  return await handleCmsRequest(request, env) || new Response(null, {status: 404});
}
export {route as GET, route as POST, route as PUT, route as DELETE, route as HEAD, route as OPTIONS};
