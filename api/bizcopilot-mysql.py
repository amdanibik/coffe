"""
BizCopilot MySQL Connector - Vercel Serverless Handler
"""
import json
import os
import re
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse

# Environment variables
API_KEY = os.getenv("CONNECTOR_API_KEY", "test-api-key-12345")
DATABASE_URL = os.getenv("MYSQL_URL") or os.getenv("DATABASE_URL", "")

def parse_mysql_url(url):
    """Parse MySQL URL to connection parameters"""
    # Handle mysql:// or mysql+pymysql:// formats
    if url.startswith("mysql://"):
        url = url.replace("mysql://", "mysql+pymysql://")
    
    parsed = urlparse(url.replace("mysql+pymysql://", "http://"))
    
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 3306,
        "user": parsed.username or "root",
        "password": parsed.password or "",
        "database": parsed.path.lstrip("/") if parsed.path else "",
    }

def get_db_connection():
    """Create MySQL connection"""
    import mysql.connector
    params = parse_mysql_url(DATABASE_URL)
    return mysql.connector.connect(**params)

def verify_api_key(headers):
    """Verify API key from headers"""
    api_key = headers.get("x-api-key") or headers.get("X-API-Key") or headers.get("X-API-KEY")
    if not api_key or api_key != API_KEY:
        return False
    return True

def execute_query(query_text, timeout_ms=30000):
    """Execute MySQL query"""
    import mysql.connector
    
    params = parse_mysql_url(DATABASE_URL)
    conn = mysql.connector.connect(**params)
    cursor = conn.cursor(dictionary=True)
    
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
        
        cursor.execute(query_text)
        rows = cursor.fetchall()
        return {"data": rows, "rows_affected": len(rows)}
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
                "database_type": "mysql",
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
            database_type = data.get("database_type", "mysql")
            request_id = data.get("request_id", "")
            timeout_ms = data.get("timeout_ms", 30000)
            
            if not query:
                raise Exception("Query is required in request body")
            
            if database_type != "mysql":
                raise Exception(f"Database type mismatch. Expected mysql, got {database_type}")
            
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
