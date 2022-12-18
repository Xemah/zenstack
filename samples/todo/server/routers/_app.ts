import { createRouter as createCRUDRouter } from './generated/routers';
import { initTRPC } from '@trpc/server';
import { type Context } from '../context';
import superjson from 'superjson';

const t = initTRPC.context<Context>().create({
    transformer: superjson,
});

export const appRouter = createCRUDRouter(t.router, t.procedure);

export type AppRouter = typeof appRouter;
