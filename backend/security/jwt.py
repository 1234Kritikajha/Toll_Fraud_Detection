from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from jose import jwt


JWT_ISSUER = os.getenv("JWT_ISSUER", "toll-detection")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "toll-detection")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))


def create_access_token(*, subject: str, user_id: int, roles: list[str], permissions: list[str]) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    jti = uuid.uuid4().hex

    payload = {
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "sub": subject,
        "uid": user_id,
        "roles": roles,
        "perms": permissions,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=JWT_EXPIRE_MINUTES)).timestamp()),
        "jti": jti,
    }
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return {"access_token": token, "token_type": "bearer", "jti": jti}


def decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(
        token,
        JWT_SECRET_KEY,
        algorithms=[JWT_ALGORITHM],
        audience=JWT_AUDIENCE,
        issuer=JWT_ISSUER,
    )

