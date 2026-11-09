"""Logger dùng chung. Log được pytest thu thập và hiển thị trong report khi test fail."""
import logging


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"automation.{name}")
