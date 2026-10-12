import { Schema } from "mongoose";

export interface iYogaInstruction {
    stepNumber: number;
    instruction: string;
    breathCue?: string;
}

export interface iYogaDetailsResult {
    englishName: string;
    sanskritName: string;
    sanskritNamePhonetic: string;
    description: string;
    benefits: string[];
    instructions: iYogaInstruction[];
    defaultHoldDurationSeconds: number;
    recommendedRepitition: number;
    timeTakenPerRepetition: number;
    totalTimeTaken: number;
    propsRequired: string[];
    breathingGuidance: string;
}

export interface iCreateYogaPayload {
    englishName?: string;
    sanskritName?: string;
    imageUrl?: string;
    isActive?: boolean;
}

export interface iGetYogasQuery {
    search?: string;
    page?: number;
    limit?: number;
}

export interface iYoga {
    _id?: Schema.Types.ObjectId | string;
    englishName?: string;
    sanskritName?: string;
    sanskritNamePhonetic?: string;
    description?: string;
    benefits?: string[];
    instructions?: iYogaInstruction[];
    defaultHoldDurationSeconds?: number;
    recommendedRepitition?: number;
    timeTakenPerRepetition?: number;
    totalTimeTaken?: number;
    propsRequired?: string[];
    breathingGuidance?: string;
    imageUrl?: string;
    isActive?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

