"""
Operator authentication: bcrypt password hashing + JWT session tokens.
Seeded with a demo operator so the scaffold runs out of the box — replace
OPERATOR_DB with a real user table (Postgres/etc.) in production.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from jwt import PyJWTError
from passlib.context import CryptContext

SECRET_KEY = "CHANGE_ME_IN_PRODUCTION_use_env_var_and_rotate_regularly"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

# pbkdf2_sha256 is pure Python (no Rust/C compilation needed), unlike bcrypt.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# Demo operator roster — swap for a real identity provider in production.
# EDIT HERE if you want to change the login username/password:
OPERATOR_DB = {
    "SUBHAN": {
        "name": "Subhan",
        "role": "Senior Reliability Engineer",
        "hashed_password": pwd_context.hash("12341234"),
    },
    "admin": {
        "name": "Site Administrator",
        "role": "Administrator",
        "hashed_password": pwd_context.hash("AegisAdmin!2026"),
    },
}


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def authenticate_operator(username: str, password: str) -> Optional[dict]:
    operator = OPERATOR_DB.get(username)
    if not operator:
        return None
    if not verify_password(password, operator["hashed_password"]):
        return None
    return {"username": username, **operator}


def create_session_token(username: str, session_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": username, "sid": session_id, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_session_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except PyJWTError:
        return None


def new_session_id() -> str:
    return str(uuid.uuid4())
