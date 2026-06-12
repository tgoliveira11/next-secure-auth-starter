import { createNextAuthRouteHandlers } from "./create-nextauth-route-handlers";

let handlers: ReturnType<typeof createNextAuthRouteHandlers> | undefined;

async function getHandlers() {
  if (!handlers) {
    const { default: NextAuth } = await import("next-auth");
    handlers = createNextAuthRouteHandlers(NextAuth);
  }
  return handlers;
}

function lazyHandler(request: Request, context: unknown) {
  return getHandlers().then(({ GET }) => GET(request, context));
}

export { lazyHandler as GET, lazyHandler as POST };