"""
BizCopilot PostgreSQL Connector - Vercel Serverless Handler
"""
import json
import os
import re
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler

# Environment variables
API_KEY = os.getenv("CONNECTOR_API_KEY", "test-api-key-12345")
DATABASE_URL = os.getenv("POSTGRESQL_URL") or os.getenv("DATABASE_URL", "")

def get_db_connection():
    """Create PostgreSQL connection"""
    import psycopg2
    import psycopg2.extras
    return psycopg2.connect(DATABASE_URL)

def verify_api_key(headers):
    """Verify API key from headers"""
    api_key = headers.get("x-api-key") or headers.get("X-API-Key") or headers.get("X-API-KEY")
    if not api_key or api_key != API_KEY:
        return False
    return True

def execute_query(query_text, timeout_ms=30000):
    """Execute PostgreSQL query"""
    import psycopg2
    import psycopg2.extras
    
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        # Safety check
        if ";" in query_text.strip().rstrip(";"):
            raise Exception("Multiple statements are not allowed")
        
        query_upper = query_text.upper().strip()
        
        # Check if EXPLAIN query
        if query_upper.startswith("EXPLAIN"):
            if not re.match(r"^EXPLAIN(\s+ANALYZE)?\s+(SELECT|WITH)\b", query_upper):
                raise Exception("Only EXPLAIN SELECT/WITH queries are allowed")
            is_select = True
        else:
            is_select = query_upper.startswith("SELECT") or query_upper.startswith("WITH")
        
        if not is_select:
            raise Exception("Only SELECT/WITH/EXPLAIN queries are allowed")
        
        # Set timeout
        timeout_seconds = timeout_ms / 1000
        cursor.execute(f"SET statement_timeout = {int(timeout_seconds * 1000)}")
        cursor.execute(query_text)
        
        rows = cursor.fetchall()
        data = [dict(row) for row in rows]
        return {"data": data, "rows_affected": len(data)}
    finally:
        cursor.close()
        conn.close()

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-API-Key, X-API-KEY")
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests - health check"""
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        
        # Check API key
        if not verify_api_key(dict(self.headers)):
            response = {"success": False, "error": "Invalid API key"}
            self.wfile.write(json.dumps(response).encode())
            return
        
        try:
            conn = get_db_connection()
            conn.close()
            response = {
                "status": "healthy",
                "database_type": "postgresql",
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            response = {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }
        
        self.wfile.write(json.dumps(response).encode())
    
    def do_POST(self):
        """Handle POST requests - execute query"""
        self.send_header("Access-Control-Allow-Origin", "*")
        
        # Check API key
        if not verify_api_key(dict(self.headers)):
            self.send_response(401)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            response = {"success": False, "error": "Invalid API key", "error_code": "UNAUTHORIZED"}
            self.wfile.write(json.dumps(response).encode())
            return
        
        start_time = time.time()
        
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode("utf-8"))
            
            query = data.get("query", "")
            query_type = data.get("query_type", "sql")
            database_type = data.get("database_type", "postgresql")
            request_id = data.get("request_id", "")
            timeout_ms = data.get("timeout_ms", 30000)
            
            if not query:
                raise Exception("Query is required in request body")
            
            if database_type != "postgresql":
                raise Exception(f"Database type mismatch. Expected postgresql, got {database_type}")
            
            result = execute_query(query, timeout_ms)
            execution_time_ms = int((time.time() - start_time) * 1000)
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            
            response = {
                "success": True,
                "data": result.get("data"),
                "rows_affected": result.get("rows_affected"),
                "execution_time_ms": execution_time_ms,
                "request_id": request_id,
            }
            self.wfile.write(json.dumps(response, default=str).encode())
            
        except Exception as e:
            execution_time_ms = int((time.time() - start_time) * 1000)
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            
            response = {
                "success": False,
                "error": str(e),
                "error_code": "QUERY_EXECUTION_ERROR",
                "request_id": data.get("request_id", "") if 'data' in dir() else "",
                "execution_time_ms": execution_time_ms,
            }
            self.wfile.write(json.dumps(response).encode())
