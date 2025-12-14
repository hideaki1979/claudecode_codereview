import type { ErrorCode } from "@/types/api";
import { HTTP_STATUS } from "@/types/api";

/**
 * GitHub APIエラーの基底クラス
 */
export class GitHubError extends Error {
    public readonly code: ErrorCode;
    public readonly status: number;
    public readonly originalStatus?: number;

    constructor(
        message: string,
        code: ErrorCode,
        status: number,
        originalStatus?: number
    ) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.status = status;
        this.originalStatus = originalStatus;

        // Errorクラスのスタックトレースを正しく保持
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * リソースが見つからない場合のエラー
 */
export class NotFoundError extends GitHubError {
    constructor(message: string = 'リポジトリまたはプルリクエストが見つかりません。') {
        super(message, 'NOT_FOUND', HTTP_STATUS.NOT_FOUND, 404);
    }
}

/**
 * 認証エラー
 */
export class UnauthorizedError extends GitHubError {
    constructor(
        message: string = 'GitHubトークンが無効または不足しています。認証情報を確認してください。'
    ) {
        super(message, 'UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED, 401);
    }
}

/**
 * 権限不足エラー
 */
export class ForbiddenError extends GitHubError {
    constructor(
        message: string = '権限が不足しています。トークンのスコープを確認してください。'
    ) {
        super(message, 'FORBIDDEN', HTTP_STATUS.FORBIDDEN, 403);
    }
}

/**
 * レート制限エラー
 */
export class RateLimitError extends GitHubError {
    constructor(
        message: string = 'GitHub APIのレート制限に達しました。しばらく待ってから再試行してください。'
    ) {
        super(message, 'RATE_LIMIT_EXCEEDED', HTTP_STATUS.TOO_MANY_REQUESTS, 403);
    }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends GitHubError {
    constructor(message: string) {
        super(message, 'VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST);
    }
}

/**
 * 内部エラー
 */
export class InternalError extends GitHubError {
    constructor(message: string = '予期しないエラーが発生しました。再試行してください。') {
        super(message, 'INTERNAL_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
}

/**
 * GitHub APIエラー
 */
export class GitHubAPIError extends GitHubError {
    constructor(
        message: string,
        status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
        originalStatus: number = status
    ) {
        super(message, 'GITHUB_API_ERROR', status, originalStatus);
    }
}
