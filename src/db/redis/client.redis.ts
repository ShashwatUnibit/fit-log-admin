import { cEnv } from "../../consts/env.const";
import { createClient } from "redis";
import { iRedisData } from "../../interfaces/redis.interface";

export default class RedisClient {
    public static instance: RedisClient = new RedisClient();
    private connectPromise: Promise<boolean> | null = null;
    private isAvailable = false;
    private client = createClient({
        url: cEnv.DB_REDIS_URL,
        database: cEnv.DB_REDIS_PARTITIONS,
        pingInterval: 10000,
        disableOfflineQueue: true,
        socket: {
            connectTimeout: 10000,
            reconnectStrategy: (retries) => {
                if (retries > 3) { return false; }
                return Math.min(retries * 1000, 3000);
            },
        },
    });
    private constructor() {
        console.log("Redis client initializing...");

        this.client.on("connect", () => {
            console.log("Redis client connecting...");
        });
        this.client.on("ready", () => {
            this.isAvailable = true;
            console.log("Redis client ready");
        });
        this.client.on("end", () => {
            this.isAvailable = false;
            console.log("Redis client disconnected");
        });
        this.client.on("reconnecting", () => {
            this.isAvailable = false;
            console.log("Redis client reconnecting...");
        });
        this.client.on("warning", (warning: Error) => {
            console.log("Redis Client Warning", warning);
        });
        this.client.on("error", (error: Error) => {
            this.isAvailable = false;
            console.log("Redis Client Error", error);
        });
    }

    private async connectClient(): Promise<boolean> {
        if (this.client.isReady) { return true; }
        if (this.connectPromise) { return this.connectPromise; }

        this.connectPromise = (async (): Promise<boolean> => {
            try {
                if (!this.client.isOpen) { await this.client.connect(); }
                await this.client.select(cEnv.DB_REDIS_PARTITIONS);
                this.isAvailable = true;
                // await this.client.flushDb();
                console.log("Redis client connected");
                return true;
            } catch (error) {
                this.isAvailable = false;
                console.error("Redis client connection error:", error);
                return false;
            } finally {
                this.connectPromise = null;
            }
        })();

        return this.connectPromise;
    }

    private async ensureClient(): Promise<boolean> {
        if (this.isAvailable && this.client.isReady) { return true; }
        return this.connectClient();
    }

    private buildKey(key: string): string {
        return `${cEnv.SERVER_COMMON_CODE}:${key}`;
    }

    private handleCommandError(operation: string, error: unknown): void {
        this.isAvailable = false;
        console.error(`Redis ${operation} failed:`, error);
    }

    public async setData(data: iRedisData): Promise<void> {
        if (!(await this.ensureClient())) { return; }

        const { key, value, expiryInSec } = data;
        const redisKey = this.buildKey(key);

        try {
            if (expiryInSec) {
                await this.client.set(redisKey, value, {
                    EX: expiryInSec,
                });
            } else {
                await this.client.set(redisKey, value);
            }
        } catch (error) {
            this.handleCommandError("set", error);
        }
    }
    public async getData(key: string): Promise<string | null> {
        if (!(await this.ensureClient())) { return null; }

        key = this.buildKey(key);

        try {
            const value = await this.client.get(key);
            return value;
        } catch (error) {
            this.handleCommandError("get", error);
            return null;
        }
    }


    public async deleteData(key: string): Promise<void> {
        if (!(await this.ensureClient())) { return; }

        key = this.buildKey(key);

        try {
            await this.client.del(key);
        } catch (error) {
            this.handleCommandError("delete", error);
        }
    }


    public async isLocked(data: iRedisData): Promise<boolean> {
        if (!(await this.ensureClient())) { return false; }

        const { key, value, expiryInSec } = data;
        const redisKey = this.buildKey(key);

        try {
            const result = await this.client.set(redisKey, value, {
                NX: true,
                EX: expiryInSec,
            });
            return result === null;
        } catch (error) {
            this.handleCommandError("lock", error);
            return false;
        }
    }
    public async unlockKey(key: string): Promise<void> {
        if (!(await this.ensureClient())) { return; }

        key = this.buildKey(key);

        try {
            await this.client.del(key);
        } catch (error) {
            this.handleCommandError("unlock", error);
        }
    }
}
