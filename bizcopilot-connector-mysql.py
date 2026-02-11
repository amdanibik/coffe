"""
BizCopilot Database Connector - MySQL

Purpose:
- A small FastAPI app that BizCopilot can call to execute queries.
- Runs inside the tenant's infrastructure and talks directly to their database.
- Protects access with an API key and optional IP whitelist.

Required environment variables:
- CONNECTOR_API_KEY:
    Secret token required on every request (header: X-API-KEY).
    Prevents unauthorized access to the connector endpoint.
- DATABASE_URL:
    MySQL connection string used by mysql-connector-python.
    Format: mysql://user:pass@host:port/dbname

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

READ-ONLY USER SETUP (MYSQL):
  -- Run as admin/root
  CREATE USER 'bizcopilot_ro'@'%' IDENTIFIED BY 'change-me';
  GRANT SELECT ON your_db.* TO 'bizcopilot_ro'@'%';
  FLUSH PRIVILEGES;
  -- Optional: use views to expose only specific columns
  CREATE VIEW v_orders AS
    SELECT id, created_at, total_amount FROM orders;
  GRANT SELECT ON v_orders TO 'bizcopilot_ro'@'%';

Run:
  pip install fastapi uvicorn mysql-connector-python
  export CONNECTOR_API_KEY="replace-me"
  export DATABASE_URL="mysql://user:pass@host:3306/dbname"
  python connector_mysql_app.py
"""

import logging
import os
import re
import sys
import time
import ipaddress
from datetime import datetime
from typing import Any, Dict, List, Optional

import mysql.connector
import uvicorn
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

API_KEY = os.getenv("CONNECTOR_API_KEY", "test-api-key-12345")
DATABASE_URL = os.getenv("DATABASE_URL", "https://coffee-git-main-amdanibiks-projects.vercel.app/mysql")
DATABASE_TYPE = "mysql"

app = FastAPI(
    title="BizCopilot Connector (MySQL)",
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
    database_type: str = Field(..., description="Database type: mysql")
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
        conn = build_connection()
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

        result = execute_mysql_query(query_request)
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


def build_connection():
    parts = DATABASE_URL.replace("mysql://", "").split("@")
    user_pass = parts[0].split(":")
    host_port_db = parts[1].split("/")
    host_port = host_port_db[0].split(":")
    return mysql.connector.connect(
        host=host_port[0],
        port=int(host_port[1]) if len(host_port) > 1 else 3306,
        user=user_pass[0],
        password=user_pass[1],
        database=host_port_db[1],
    )


def execute_mysql_query(query_request: QueryRequest) -> Dict[str, Any]:
    conn = build_connection()
    cursor = conn.cursor(dictionary=True)
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

        cursor.execute(query_request.query)

        if is_select:
            rows = cursor.fetchall()
            return {"data": rows, "rows_affected": len(rows)}
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    log_level = os.getenv("LOG_LEVEL", "info").upper()
    reload = os.getenv("RELOAD", "false").lower() == "true"
    uvicorn.run(app, host="0.0.0.0", port=port, log_level=log_level, reload=reload)
