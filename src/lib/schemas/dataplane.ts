import { z } from 'zod/v4';

const BucketConfigSchema = z.object({
    v1: z.object({
        allowedPublicKeys: z.record(z.string(), z.object({ alg: z.literal('ed25519'), contentBase64: z.string().min(1), label: z.string().min(1) })),
    }),
});

export type BucketConfig = z.infer<typeof BucketConfigSchema>;

// Define Zod schemas for validation as the source of truth for types
const ValidationConditionSchema = z.union([
    z.string(),
    z.number(),
    z.object({
        startsWith: z.string()
    }),
    z.object({
        endsWith: z.string()
    }),
    z.object({
        lte: z.number()
    }),
    z.object({
        gte: z.number()
    }),
    z.object({
        oneOf: z.array(z.union([z.string(), z.number()]))
    }),
    z.object({
        range: z.tuple([z.number(), z.number()])
    })
]);

export const ApiPutRequestValidationPolicySchema = z.object({
    apiPutV1: z.object({
        conditions: z.record(z.string().min(1), ValidationConditionSchema),
        accessControl: z.enum(['public', 'private']),
    })
});

export type ValidationCondition = z.infer<typeof ValidationConditionSchema>;
export type ApiPutRequestValidationPolicy = z.infer<typeof ApiPutRequestValidationPolicySchema>;
