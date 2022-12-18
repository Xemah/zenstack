import { z } from 'zod';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<Prisma.ListCreateManyInput> = z
  .object({
    id: z.string().optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
    spaceId: z.string(),
    ownerId: z.string(),
    title: z.string(),
    private: z.boolean().optional(),
    zenstack_guard: z.boolean().optional(),
    zenstack_transaction: z.string().optional().nullable(),
  })
  .strict();

export const ListCreateManyInputObjectSchema = Schema;
