export const cDbNames = {
    sample: "sample" as string,
    admin: "admins" as string,
    foodPreference: "food_preferences" as string,
    foodAllergy: "food_allergies" as string,
    foodIntolerance: "food_intolerances" as string,
    dietaryRestriction: "dietary_restrictions" as string,
    exercise: "exercise" as string,
    workoutPlan: "workout_plan" as string,
    yoga: "yoga" as string,
    users: "users" as string,
    goals: "goals" as string,
    professions: "professions" as string,
    // Mongoose lower-cases the user app's "physicalIssues" model name; the collection is "physicalissues".
    physicalIssues: "physicalissues" as string,
    userWorkoutPlan: "userWorkoutPlans" as string,
    // Shared with the user app, whose "banner" model resolves to the pluralised "banners" collection.
    banner: "banners" as string,
    notificationCampaign: "notification_campaigns" as string,
    notificationTemplate: "notification_templates" as string,
};
