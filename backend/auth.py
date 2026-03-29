import os
from jose import jwt, JWTError
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List

# ── Config ────────────────────────────────────────────────────
# Set JWT_SECRET in your .env — never hard-code in source
SECRET_KEY = os.getenv("JWT_SECRET", "change_this_in_production_please")
ALGORITHM  = "HS256"
TOKEN_TTL_HOURS = 8

security = HTTPBearer()

# ── Token creation ────────────────────────────────────────────
def create_token(data: dict) -> str:
    payload = {
        **data,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# ── Token verification ────────────────────────────────────────
def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    try:
        payload = jwt.decode(
            credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ── Role guard factory ────────────────────────────────────────
# Usage:  Depends(require_roles(["admin", "manager"]))
def require_roles(allowed_roles: List[str]):
    def _guard(current_user: dict = Depends(verify_token)) -> dict:
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access restricted to: {', '.join(allowed_roles)}",
            )
        return current_user
    return _guard
