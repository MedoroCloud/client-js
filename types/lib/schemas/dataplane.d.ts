import { z } from 'zod/v4';
declare const BucketConfigSchema: z.ZodObject<{
    v1: z.ZodObject<{
        allowedPublicKeys: z.ZodRecord<z.ZodNumber, z.ZodObject<{
            alg: z.ZodLiteral<"ed25519">;
            contentBase64: z.ZodString;
            label: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type BucketConfig = z.infer<typeof BucketConfigSchema>;
declare const ValidationConditionSchema: z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodObject<{
    startsWith: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    endsWith: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    lte: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    gte: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    oneOf: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
}, z.core.$strip>, z.ZodObject<{
    range: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
}, z.core.$strip>]>;
export declare const ApiPutRequestValidationPolicySchema: z.ZodObject<{
    apiPutV1: z.ZodObject<{
        conditions: z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodObject<{
            startsWith: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            endsWith: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            lte: z.ZodNumber;
        }, z.core.$strip>, z.ZodObject<{
            gte: z.ZodNumber;
        }, z.core.$strip>, z.ZodObject<{
            oneOf: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
        }, z.core.$strip>, z.ZodObject<{
            range: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
        }, z.core.$strip>]>>;
        accessControl: z.ZodEnum<{
            public: "public";
            private: "private";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type ValidationCondition = z.infer<typeof ValidationConditionSchema>;
export type ApiPutRequestValidationPolicy = z.infer<typeof ApiPutRequestValidationPolicySchema>;
export {};
