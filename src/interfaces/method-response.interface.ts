export interface iMethodResponse<T> {
    status: boolean;
    message?: string;
    data?: T;
}
