class AppError(Exception):
    status_code = 500
    message = "Ralat pelayan"

    def __init__(self, message=None):
        super().__init__(message or self.message)
        if message is not None:
            self.message = message


class BadRequestError(AppError):
    status_code = 400


class UnauthorizedError(AppError):
    status_code = 401


class ForbiddenError(AppError):
    status_code = 403


class ServiceError(AppError):
    status_code = 500
