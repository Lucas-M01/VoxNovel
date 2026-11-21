"""Errors from the explicit private migration tool, outside the HTTP API."""


class LegacyImportError(Exception):
    def __init__(self, message: str, details: str = ""):
        super().__init__(message)
        self.details = details
