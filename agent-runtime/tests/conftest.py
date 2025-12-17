import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DISABLE_CONNECTIONS", "true")
os.environ.setdefault("DISABLE_WORKERS", "true")

from main import app


@pytest.fixture()
def client() -> TestClient:
    with TestClient(app) as client:
        yield client
