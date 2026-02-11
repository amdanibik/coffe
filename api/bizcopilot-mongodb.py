"""
BizCopilot MongoDB Connector - Vercel Serverless Handler
"""
import json
import os
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler

# Environment variables
API_KEY = os.getenv("CONNECTOR_API_KEY", "test-api-key-12345")
DATABASE_URL = os.getenv("MONGODB_URI") or os.getenv("MONGODB_URL") or os.getenv("DATABASE_URL", "")

def get_db_client():
    """Create MongoDB client"""
    from pymongo import MongoClient
    return MongoClient(DATABASE_URL, serverSelectionTimeoutMS=5000)

def verify_api_key(headers):
    """Verify API key from headers"""
    api_key = headers.get("x-api-key") or headers.get("X-API-Key") or headers.get("X-API-KEY")
    if not api_key or api_key != API_KEY:
        return False
    return True

def execute_query(query_data, timeout_ms=30000):
    """Execute MongoDB query"""
    from pymongo import MongoClient
    from bson import ObjectId
    
    client = MongoClient(DATABASE_URL, serverSelectionTimeoutMS=timeout_ms)
    db = client.get_default_database()
    
    try:
        collection_name = query_data.get("collection")
        operation = query_data.get("operation", "find")
        filter_query = query_data.get("filter") or query_data.get("query", {})
        options = query_data.get("options", {})
        
        if not collection_name:
            raise Exception("Collection name is required")
        
        # Only allow read operations
        allowed_ops = ["find", "findone", "count", "countdocuments", "aggregate"]
        if operation.lower() not in allowed_ops:
            raise Exception(f"Only read operations are allowed: {', '.join(allowed_ops)}")
        
        collection = db[collection_name]
        
        if operation.lower() == "find":
            limit = options.get("limit", 100)
            cursor = collection.find(filter_query).limit(limit)
            results = list(cursor)
        elif operation.lower() == "findone":
            results = [collection.find_one(filter_query)]
            results = [r for r in results if r is not None]
        elif operation.lower() in ["count", "countdocuments"]:
            count = collection.count_documents(filter_query)
            results = [{"count": count}]
        elif operation.lower() == "aggregate":
            pipeline = filter_query if isinstance(filter_query, list) else []
            results = list(collection.aggregate(pipeline))
        else:
            results = []
        
        # Convert ObjectId to string
        for doc in results:
            if "_id" in doc and isinstance(doc["_id"], ObjectId):
                doc["_id"] = str(doc["_id"])
        
        return {"data": results, "rows_affected": len(results)}
    finally:
        client.close()

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
            client = get_db_client()
            client.server_info()
            client.close()
            response = {
                "status": "healthy",
                "database_type": "mongodb",
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
            
            database_type = data.get("database_type", "mongodb")
            request_id = data.get("request_id", "")
            timeout_ms = data.get("timeout_ms", 30000)
            
            if database_type != "mongodb":
                raise Exception(f"Database type mismatch. Expected mongodb, got {database_type}")
            
            # Parse query - could be JSON string or object
            query_raw = data.get("query", {})
            if isinstance(query_raw, str):
                query_data = json.loads(query_raw)
            else:
                query_data = query_raw
            
            # Support direct collection/operation format
            if "collection" not in query_data:
                query_data = {
                    "collection": data.get("collection", ""),
                    "operation": data.get("operation", "find"),
                    "filter": data.get("filter") or data.get("query", {}),
                    "options": data.get("options", {})
                }
            
            if not query_data.get("collection"):
                raise Exception("Collection name is required")
            
            result = execute_query(query_data, timeout_ms)
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
