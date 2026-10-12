import { eHttpStatusCode, eResponseStatus } from "../enums/server.enum";

export interface iResponse {
    message: string;
    data?: object;
    status: eResponseStatus;
    httpCode?: eHttpStatusCode;
}
