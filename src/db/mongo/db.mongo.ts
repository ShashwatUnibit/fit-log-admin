import mongoose from "mongoose";
import {cEnv} from "../../consts/env.const";

export default class MongoDB {
    public static instance: MongoDB = new MongoDB();
    private constructor() { }
    public async connect(): Promise<void> {
        if (!cEnv.MONGO_URL) {
            throw new Error("MONGO_URL is not defined in environment variables");
        }

        mongoose.pluralize(null);
        await mongoose.connect(cEnv.MONGO_URL);
        console.log("Connected to MongoDB");
    }

    public async disconnect(): Promise<void> {
        try {
            await mongoose.disconnect();
            console.log("Disconnected from MongoDB");
        } catch (error) {
            console.error("Error disconnecting from MongoDB:", error);
        }
    }

    public getConnection(): mongoose.Connection {
        return mongoose.connection;
    }
}