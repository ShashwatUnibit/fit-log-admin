export const cRedisKeys = {
    sample: (): string => `sample`,
    session: (userId: string): string => `user:session:${userId}`,
};
