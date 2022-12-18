import { z } from 'zod';
import { StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema';
import { SpaceUpdateOneRequiredWithoutListsNestedInputObjectSchema } from './SpaceUpdateOneRequiredWithoutListsNestedInput.schema';
import { UserUpdateOneRequiredWithoutListsNestedInputObjectSchema } from './UserUpdateOneRequiredWithoutListsNestedInput.schema';
import { BoolFieldUpdateOperationsInputObjectSchema } from './BoolFieldUpdateOperationsInput.schema';
import { TodoUpdateManyWithoutListNestedInputObjectSchema } from './TodoUpdateManyWithoutListNestedInput.schema';
import { NullableStringFieldUpdateOperationsInputObjectSchema } from './NullableStringFieldUpdateOperationsInput.schema';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<Prisma.ListUpdateInput> = z
  .object({
    id: z
      .union([
        z.string(),
        z.lazy(() => StringFieldUpdateOperationsInputObjectSchema),
      ])
      .optional(),
    createdAt: z
      .union([
        z.date(),
        z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema),
      ])
      .optional(),
    updatedAt: z
      .union([
        z.date(),
        z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema),
      ])
      .optional(),
    space: z
      .lazy(() => SpaceUpdateOneRequiredWithoutListsNestedInputObjectSchema)
      .optional(),
    owner: z
      .lazy(() => UserUpdateOneRequiredWithoutListsNestedInputObjectSchema)
      .optional(),
    title: z
      .union([
        z.string(),
        z.lazy(() => StringFieldUpdateOperationsInputObjectSchema),
      ])
      .optional(),
    private: z
      .union([
        z.boolean(),
        z.lazy(() => BoolFieldUpdateOperationsInputObjectSchema),
      ])
      .optional(),
    todos: z
      .lazy(() => TodoUpdateManyWithoutListNestedInputObjectSchema)
      .optional(),
    zenstack_guard: z
      .union([
        z.boolean(),
        z.lazy(() => BoolFieldUpdateOperationsInputObjectSchema),
      ])
      .optional(),
    zenstack_transaction: z
      .union([
        z.string(),
        z.lazy(() => NullableStringFieldUpdateOperationsInputObjectSchema),
      ])
      .optional()
      .nullable(),
  })
  .strict();

export const ListUpdateInputObjectSchema = Schema;
