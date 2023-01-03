import { z } from 'zod';
import { SpaceUserRoleSchema } from '../enums/SpaceUserRole.schema';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<Prisma.SpaceUserCreateManyUserInput> = z
    .object({
        id: z.string().optional(),
        createdAt: z.date().optional(),
        updatedAt: z.date().optional(),
        spaceId: z.string(),
        role: z.lazy(() => SpaceUserRoleSchema),
        zenstack_guard: z.boolean().optional(),
        zenstack_transaction: z.string().optional().nullable(),
    })
    .strict();

export const SpaceUserCreateManyUserInputObjectSchema = Schema;
