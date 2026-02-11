"""
BizCopilot Database Connector - PostgreSQL

Purpose:
- A small FastAPI app that BizCopilot can call to execute queries.
- Runs inside the tenant's infrastructure and talks directly to their database.
- Protects access with an API key and optional IP whitelist.

Required environment variables:
- CONNECTOR_API_KEY:
    Secret token required on every request (header: X-API-KEY).
    Prevents unauthorized access to the connector endpoint.
- DATABASE_URL:
    PostgreSQL connection string used by psycopg2.
    Format: postgresql://user:pass@host:port/dbname

Optional environment variables:
- WHITELISTED_IPS:
    Comma-separated IPs or CIDRs allowed to call the connector.
    Example: "203.0.113.10,10.0.0.0/24"
    Useful when running behind a firewall or proxy.
- LOG_LEVEL:
    Logging verbosity (DEBUG, INFO, WARNING, ERROR).
- PORT:
    HTTP server port. Default: 8080.
- RELOAD:
    Enable auto-reload for development ("true" or "false").

BEST-PRACTICE RECOMMENDATIONS:
- Use a read-only database replica when possible to isolate analytics traffic.
- Create a dedicated database user with least-privilege access (read-only).
- Restrict access to only the required schemas/tables/views.
- Expose only the columns needed (prefer views or column-level grants).
- Rotate CONNECTOR_API_KEY periodically and store it securely.

READ-ONLY USER SETUP (POSTGRESQL):
  -- Run as admin/superuser
  CREATE USER bizcopilot_ro WITH PASSWORD 'change-me';
  GRANT CONNECT ON DATABASE your_db TO bizcopilot_ro;
  GRANT USAGE ON SCHEMA public TO bizcopilot_ro;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO bizcopilot_ro;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO bizcopilot_ro;
  -- Optional: use views to expose only specific columns
  CREATE VIEW public.v_orders AS
    SELECT id, created_at, total_amount FROM public.orders;
  GRANT SELECT ON public.v_orders TO bizcopilot_ro;

Run:
  pip install fastapi uvicorn psycopg2-binary
  export CONNECTOR_API_KEY="replace-me"
  export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
  python connector_postgresql_app.py
"""

import logging
import os
import re
import sys
import time
import ipaddress
from datetime import datetime
from typing import Any, Dict, List, Optional

import psycopg2
import psycopg2.extras
import uvicorn
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

API_KEY = os.getenv("CONNECTOR_API_KEY", "test-api-key-12345")
DATABASE_URL = os.getenv("DATABASE_URL", "https://coffee-git-main-amdanibiks-projects.vercel.app")
DATABASE_TYPE = "postgresql"

app = FastAPI(
    title="BizCopilot Connector (PostgreSQL)",
    description="External database connector for BizCopilot",
    version="1.0.0",
)

# IP whitelist configuration
WHITELISTED_IPS_RAW = os.getenv("WHITELISTED_IPS", "").strip()
_ALLOWED_NETWORKS: List[ipaddress._BaseNetwork] = []
if WHITELISTED_IPS_RAW:
    for token in [t.strip() for t in WHITELISTED_IPS_RAW.split(",") if t.strip()]:
        try:
            if "/" in token:
                _ALLOWED_NETWORKS.append(ipaddress.ip_network(token, strict=False))
            else:
                if ":" in token:
                    _ALLOWED_NETWORKS.append(ipaddress.ip_network(token + "/128", strict=False))
                else:
                    _ALLOWED_NETWORKS.append(ipaddress.ip_network(token + "/32", strict=False))
        except ValueError:
            pass

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logger = logging.getLogger("connector")
logger.setLevel(LOG_LEVEL)
handler = logging.StreamHandler(stream=sys.stdout)
handler.setLevel(LOG_LEVEL)
formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s")
handler.setFormatter(formatter)
if not logger.handlers:
    logger.addHandler(handler)


class QueryRequest(BaseModel):
    query_type: str = Field(..., description="Type of query: SELECT (read-only)")
    query: str = Field(..., description="SQL query to execute")
    database_type: str = Field(..., description="Database type: postgresql")
    request_id: str = Field(..., description="Unique request ID for tracking")
    timeout_ms: Optional[int] = Field(30000, description="Query timeout in milliseconds")


class QueryResponse(BaseModel):
    success: bool
    data: Optional[List[Dict[str, Any]]] = None
    rows_affected: Optional[int] = None
    execution_time_ms: int
    request_id: str


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    error_code: str
    request_id: Optional[str] = None


def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


@app.middleware("http")
async def ip_whitelist_middleware(request: Request, call_next):
    if not _ALLOWED_NETWORKS:
        return await call_next(request)

    xff = request.headers.get("x-forwarded-for")
    client_ip = None
    if xff:
        client_ip = xff.split(",")[0].strip()
    elif request.client:
        client_ip = request.client.host

    if not client_ip:
        return JSONResponse(status_code=400, content={"detail": "Unable to determine client IP"})

    try:
        ip = ipaddress.ip_address(client_ip)
    except ValueError:
        return JSONResponse(status_code=400, content={"detail": "Invalid client IP format"})

    allowed = any(ip in net for net in _ALLOWED_NETWORKS)
    if not allowed:
        return JSONResponse(status_code=403, content={"detail": "IP not allowed"})

    return await call_next(request)


@app.get("/health")
async def health_check(api_key: str = Depends(verify_api_key)):
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.close()
        return {
            "status": "healthy",
            "database_type": DATABASE_TYPE,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(exc),
                "timestamp": datetime.utcnow().isoformat(),
            },
        )


@app.post("/execute", response_model=QueryResponse)
async def execute_query(query_request: QueryRequest, api_key: str = Depends(verify_api_key)):
    start_time = time.time()
    try:
        if query_request.database_type != DATABASE_TYPE:
            raise HTTPException(
                status_code=400,
                detail=f"Database type mismatch. Connector is configured for {DATABASE_TYPE}",
            )

        result = execute_postgresql_query(query_request)
        execution_time_ms = int((time.time() - start_time) * 1000)
        return QueryResponse(
            success=True,
            data=result.get("data"),
            rows_affected=result.get("rows_affected"),
            execution_time_ms=execution_time_ms,
            request_id=query_request.request_id,
        )
    except Exception as exc:
        execution_time_ms = int((time.time() - start_time) * 1000)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(exc),
                "error_code": "QUERY_EXECUTION_ERROR",
                "request_id": query_request.request_id,
                "execution_time_ms": execution_time_ms,
            },
        )


def execute_postgresql_query(query_request: QueryRequest) -> Dict[str, Any]:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        query_text = query_request.query.strip()
        if ";" in query_text.rstrip().rstrip(";"):
            raise HTTPException(status_code=400, detail="Multiple statements are not allowed")

        query_upper = query_text.upper()
        if query_upper.startswith("EXPLAIN"):
            if not re.match(r"^EXPLAIN(\s+ANALYZE)?\s+(SELECT|WITH)\b", query_upper):
                raise HTTPException(
                    status_code=400,
                    detail="Only EXPLAIN SELECT/WITH queries are allowed",
                )
            is_select = True
        else:
            is_select = query_upper.startswith("SELECT") or query_upper.startswith("WITH")
        if not is_select:
            raise HTTPException(
                status_code=400,
                detail="Only SELECT/WITH/EXPLAIN queries are allowed",
            )

        timeout_seconds = query_request.timeout_ms / 1000
        cursor.execute(f"SET statement_timeout = {int(timeout_seconds * 1000)}")
        cursor.execute(query_request.query)

        if is_select:
            rows = cursor.fetchall()
            data = [dict(row) for row in rows]
            return {"data": data, "rows_affected": len(data)}
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    # Uvicorn expects lowercase log levels
    log_level = os.getenv("LOG_LEVEL", "info").lower()
    reload = os.getenv("RELOAD", "false").lower() == "true"
    uvicorn.run(app, host="0.0.0.0", port=port, log_level=log_level, reload=reload)
