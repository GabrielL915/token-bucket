import { Document } from "mongoose";
import { bucketModel, DocumentBucket } from "../entities/bucket";
import { DocumentUser, userModel } from "../entities/user";
import { Result, tryCatch } from "../utils/trycatch";
import { error } from "console";
import { sign } from "jsonwebtoken";

const TOKENS = 10
const JWT_SECRET = process.env.JWT_SECRET ?? 'teste1'

export class BucketService {

    async create(input: DocumentUser): Promise<Result<DocumentBucket>> {

        const userResult = await tryCatch(
            userModel.findOne({ username: input.username }).select("bucket")
        );

        if (userResult.success && userResult.data !== null) {
            if (userResult.data.bucket) {
                return {
                    success: false,
                    data: null,
                    error: new Error("User already has a bucket"),
                };
            }
        } else if (!userResult.success) {
            return {
                success: false,
                data: null,
                error: new Error("Failed to find user: " + userResult.error.message),
            };
        } else {
            return {
                success: false,
                data: null,
                error: new Error("Unexpected null user in bucket creation"),
            };
        }

        const bucketResult = await tryCatch(bucketModel.create({ tokens: [] }));

        if (!bucketResult.success || bucketResult.data === null) {
            return {
                success: false,
                data: null,
                error: new Error("Failed to create bucket: " + (bucketResult.error?.message || "Unknown error")),
            };
        }

        const updateResult = await tryCatch(
            userModel.updateOne({ username: input.username }, { bucket: bucketResult.data._id })
        );

        if (!updateResult.success) {
            return {
                success: false,
                data: null,
                error: new Error("Failed to assign bucket to user: " + updateResult.error.message),
            };
        }

        if (updateResult.data?.modifiedCount === 0) {
            return {
                success: false,
                data: null,
                error: new Error("User not updated"),
            };
        }

        return {
            success: true,
            data: bucketResult.data,
            error: null,
        };
    }

    async getBucketByUser(username: string): Promise<Result<DocumentBucket>> {
        const result = await tryCatch(
            userModel.findOne({ username }).select("bucket").populate("bucket")
        );

        if (result.success && result.data !== null) {
            const bucket = result.data.bucket;

            if (!bucket) {
                return {
                    success: false,
                    data: null,
                    error: new Error("User has no bucket assigned"),
                };
            }

            if (bucket instanceof Document) {
                return {
                    success: true,
                    data: bucket as DocumentBucket,
                    error: null,
                };
            }

            return {
                success: false,
                data: null,
                error: new Error("Unexpected bucket format - not a populated document"),
            };
        }

        if (!result.success) {
            return {
                success: false,
                data: null,
                error: new Error("Failed to find user: " + result.error.message),
            };
        }

        return {
            success: false,
            data: null,
            error: new Error("Unexpected null user when fetching bucket"),
        };
    }

    async fillBucket(username: string): Promise<Result<DocumentBucket>> {
        const userResult = await tryCatch(
            userModel.findOne({ username }).populate("bucket")
        )

        if (!userResult.success) {
            return {
                success: false,
                data: null,
                error: new Error("User not found")
            }
        }

        const user = userResult.data

        if (!user?.bucket || !(user?.bucket instanceof Document)) {
            return {
                success: false,
                data: null,
                error: new Error("User has no populated bucket")
            }
        }

        const bucket = user.bucket as DocumentBucket;

        const tokens = Array.from({ length: TOKENS }, () => {
            const jwt = sign({ type: "bucket_token", user: username }, JWT_SECRET);
            return `${username}:${jwt}`;
        });

        bucket.tokens = tokens;
        bucket.lastTimestamp = new Date();
        bucket.emptyBucket = false;

        const saveResult = await tryCatch(bucket.save());

        if (!saveResult.success || !saveResult.data) {
            return {
                success: false,
                data: null,
                error: new Error("Failed to save bucket")
            };
        }

        console.log("Bucket is now Full")
        return {
            success: true,
            data: saveResult.data,
            error: null
        };

    }

    //update bucket

    //add tokens

    //revoke tokens

    //verify tokens

    //check if bucket is empty

    //amout of tokens
}