import { eHttpStatusCode } from "../enums/server.enum";

export function toErrorResponse(err: unknown): { statusCode: number; message: string } {
    const error = err as { name?: string; statusCode?: number; message?: string };
    if (error?.name === "CastError") {
        return { statusCode: eHttpStatusCode.BAD_REQUEST, message: "Invalid ID provided." };
    }
    return {
        statusCode: error?.statusCode ?? eHttpStatusCode.INTERNAL_SERVER_ERROR,
        message: error?.message ?? "Internal server error.",
    };
}

export default class CommonUtils {
    public static instance: CommonUtils = new CommonUtils();
    private constructor() {}

    

    public getRandomInt(min: number, max: number): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min; // The maximum is exclusive and the minimum is inclusive
    }

    public generateRandomHexString(length: number): string {
        const characters = "abcdef0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            result += characters.charAt(randomIndex);
        }
        return result;
    }

    public devPhoneNumber: string[] = ["8076090538", "9007466165"];
}
