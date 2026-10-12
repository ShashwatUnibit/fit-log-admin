export interface iRedisData {
    key: string;
    value: string;
    expiryInSec?: number;
}