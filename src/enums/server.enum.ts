export enum eResponseStatus {
    SUCCESS = "success",
    ERROR = "error",
    FAIL = "fail",
}

export enum eHttpMethod {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    PATCH = "PATCH",
    DELETE = "DELETE",
}

export enum eHttpStatusCode {
    OK = 200,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    INTERNAL_SERVER_ERROR = 500,
    SERVICE_UNAVAILABLE = 503,
    GATEWAY_TIMEOUT = 504,
    BAD_GATEWAY = 502,
    UNPROCESSABLE_ENTITY = 422,
    CONFLICT = 409,
    TOO_MANY_REQUESTS = 429,
    NOT_IMPLEMENTED = 501,
    MOVED_PERMANENTLY = 301,
}

export enum eDevice {
    IOS = "ios",
    ANDROID = "android",
    WEB = "web",
    UNKNOWN = "unknown",
}

export enum eHeadersKeys {
    xAppVersion = "x-app-version",
    xAppPlatform = "x-app-platform",
    xAppId = "x-app-id",
    xUserId = "x-user-id",
    xUsername = "x-username",
    xSessionId = "x-session-id",
    xUserRole = "x-user-role",
    xServerKey = "x-server-key",
}