import { eDietaryRestrictions, eFoodAllergies, eFoodIntolerances, eFoodPreferences } from "../enums/foodItems.enum";
import { eExerciseLevel, eExerciseType, eFocusPart } from "../enums/exercise.enum";

export interface iStaticData {
    foodPreferences: eFoodPreferences[];
    foodAllergies: eFoodAllergies[];
    foodIntolerance: eFoodIntolerances[];
    dietaryRestrictions: eDietaryRestrictions[];
    focusPart: eFocusPart[];
    exerciseLevel: eExerciseLevel[];
    exerciseType: eExerciseType[];
}
