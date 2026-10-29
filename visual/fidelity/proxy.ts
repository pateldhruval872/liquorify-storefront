import { createServer, request as forwardTo, type Server } from "node:http";

/**
 * A proxy in front of the backend for the `proxied` set-up (see
 * `shop-screens.spec.ts`). The storefront, started with `SPREE_API_URL` at
 * `http://localhost:3002`, reaches the backend (`FIDELITY_BACKEND`, default
 * `http://localhost:3000`) through it, and a state can have it delay the
 * product list by 20 seconds or answer it with a server error, or answer the
 * product list's filters with a server error.
 */
export const proxy: {
  productList: "pass" | "delay" | "fail";
  productFilters: "pass" | "fail";
} = {
  productList: "pass",
  productFilters: "pass",
};

const backend = new URL(
  process.env.FIDELITY_BACKEND ?? "http://localhost:3000",
);

export function startProxy(): Promise<Server> {
  const server = createServer((incoming, outgoing) => {
    const listsProducts = /^\/api\/v3\/store\/products(\?|$)/.test(
      incoming.url ?? "",
    );
    const listsFilters = /^\/api\/v3\/store\/products\/filters(\?|$)/.test(
      incoming.url ?? "",
    );
    if (
      (listsProducts && proxy.productList === "fail") ||
      (listsFilters && proxy.productFilters === "fail")
    ) {
      outgoing.writeHead(500, { "content-type": "application/json" });
      outgoing.end('{"error":{"code":"internal_server_error"}}');
      return;
    }
    const forward = () => {
      const upstream = forwardTo(
        {
          host: backend.hostname,
          port: backend.port,
          path: incoming.url,
          method: incoming.method,
          headers: { ...incoming.headers, host: backend.host },
        },
        (answer) => {
          outgoing.writeHead(answer.statusCode ?? 502, answer.headers);
          answer.pipe(outgoing);
        },
      );
      upstream.on("error", () => outgoing.destroy());
      incoming.pipe(upstream);
    };
    if (listsProducts && proxy.productList === "delay") {
      setTimeout(forward, 20_000);
    } else {
      forward();
    }
  });
  return new Promise((resolve) => server.listen(3002, () => resolve(server)));
}
