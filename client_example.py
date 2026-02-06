"""
Coffee Database Connector - Python Client

Contoh penggunaan Direct Database Connection API dengan Python
"""

import requests
import json
from typing import List, Dict, Any, Optional
from datetime import datetime


class CoffeeDatabaseClient:
    """Client untuk Coffee Database Connector API"""
    
    def __init__(self, api_key: str, base_url: str = "http://localhost:3000"):
        """
        Initialize client
        
        Args:
            api_key: API key untuk authentication
            base_url: Base URL dari API
        """
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
    
    def connect(self) -> Dict[str, Any]:
        """Establish database connection"""
        try:
            response = requests.post(
                f"{self.base_url}/api/db/connect",
                headers=self.headers
            )
            return response.json()
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def execute(
        self, 
        query: str, 
        params: List[Any] = None,
        transaction: bool = False,
        allow_destructive: bool = False
    ) -> Dict[str, Any]:
        """
        Execute a query
        
        Args:
            query: SQL query
            params: Query parameters
            transaction: Use transaction
            allow_destructive: Allow destructive queries
        """
        try:
            body = {
                'query': query,
                'params': params or [],
                'transaction': transaction,
                'allowDestructive': allow_destructive
            }
            
            response = requests.post(
                f"{self.base_url}/api/db/execute",
                headers=self.headers,
                json=body
            )
            return response.json()
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_pool_status(self) -> Dict[str, Any]:
        """Get connection pool status"""
        try:
            response = requests.get(
                f"{self.base_url}/api/db/pool-status",
                headers=self.headers
            )
            return response.json()
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def execute_batch(self, queries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Execute batch queries
        
        Args:
            queries: List of query objects [{'query': '...', 'params': [...]}, ...]
        """
        try:
            response = requests.post(
                f"{self.base_url}/api/db/batch",
                headers=self.headers,
                json={'queries': queries}
            )
            return response.json()
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    # Convenience methods
    
    def get_tenants(self, limit: int = 100) -> Dict[str, Any]:
        """Get all tenants"""
        return self.execute(
            'SELECT * FROM tenants ORDER BY name LIMIT $1',
            [limit]
        )
    
    def get_tenant(self, tenant_id: int) -> Dict[str, Any]:
        """Get tenant by ID"""
        result = self.execute(
            'SELECT * FROM tenants WHERE id = $1',
            [tenant_id]
        )
        if result.get('success') and result.get('data'):
            result['data'] = result['data'][0]
        return result
    
    def get_orders(
        self, 
        tenant_id: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """Get orders with filters"""
        query = 'SELECT * FROM orders WHERE 1=1'
        params = []
        param_count = 1
        
        if tenant_id:
            query += f' AND tenant_id = ${param_count}'
            params.append(tenant_id)
            param_count += 1
        
        if start_date:
            query += f' AND order_date >= ${param_count}'
            params.append(start_date)
            param_count += 1
        
        if end_date:
            query += f' AND order_date <= ${param_count}'
            params.append(end_date)
            param_count += 1
        
        query += f' ORDER BY order_date DESC LIMIT {limit}'
        
        return self.execute(query, params)
    
    def create_tenant(self, tenant: Dict[str, Any]) -> Dict[str, Any]:
        """Create new tenant"""
        return self.execute(
            """INSERT INTO tenants (name, code, address, phone, email, active) 
               VALUES ($1, $2, $3, $4, $5, $6) 
               RETURNING *""",
            [
                tenant.get('name'),
                tenant.get('code'),
                tenant.get('address'),
                tenant.get('phone'),
                tenant.get('email'),
                tenant.get('active', True)
            ],
            transaction=True
        )
    
    def update_tenant(self, tenant_id: int, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update tenant"""
        fields = []
        params = []
        param_count = 1
        
        for key, value in updates.items():
            fields.append(f"{key} = ${param_count}")
            params.append(value)
            param_count += 1
        
        params.append(tenant_id)
        
        return self.execute(
            f"UPDATE tenants SET {', '.join(fields)} WHERE id = ${param_count} RETURNING *",
            params,
            transaction=True,
            allow_destructive=True
        )
    
    def delete_tenant(self, tenant_id: int, hard: bool = False) -> Dict[str, Any]:
        """Delete tenant (soft delete by default)"""
        if hard:
            return self.execute(
                'DELETE FROM tenants WHERE id = $1 RETURNING *',
                [tenant_id],
                transaction=True,
                allow_destructive=True
            )
        else:
            return self.execute(
                'UPDATE tenants SET active = false WHERE id = $1 RETURNING *',
                [tenant_id],
                transaction=True,
                allow_destructive=True
            )
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get database statistics"""
        return self.execute_batch([
            {
                'query': 'SELECT COUNT(*) as count FROM tenants WHERE active = true',
                'params': []
            },
            {
                'query': 'SELECT COUNT(*) as count FROM orders',
                'params': []
            },
            {
                'query': 'SELECT COUNT(*) as count FROM order_details',
                'params': []
            },
            {
                'query': 'SELECT COUNT(*) as count FROM products',
                'params': []
            },
            {
                'query': 'SELECT SUM(total) as total_revenue FROM orders',
                'params': []
            }
        ])


# ============================================
# EXAMPLE USAGE
# ============================================

def main():
    """Example usage of Coffee Database Client"""
    import os
    
    # Initialize client
    client = CoffeeDatabaseClient(
        api_key=os.getenv('CONNECTOR_API_KEY', 'your_api_key'),
        base_url=os.getenv('BASE_URL', 'http://localhost:3000')
    )
    
    print('Coffee Database Client - Example Usage\n')
    
    # 1. Test connection
    print('1. Testing connection...')
    conn = client.connect()
    print(json.dumps(conn, indent=2))
    print()
    
    # 2. Get pool status
    print('2. Getting pool status...')
    pool = client.get_pool_status()
    print(json.dumps(pool, indent=2))
    print()
    
    # 3. Get tenants
    print('3. Getting tenants...')
    tenants = client.get_tenants(5)
    print(json.dumps(tenants, indent=2))
    print()
    
    # 4. Get specific tenant
    print('4. Getting tenant by ID...')
    tenant = client.get_tenant(1)
    print(json.dumps(tenant, indent=2))
    print()
    
    # 5. Get orders with filters
    print('5. Getting orders...')
    orders = client.get_orders(limit=10)
    print(json.dumps(orders, indent=2))
    print()
    
    # 6. Get statistics
    print('6. Getting statistics...')
    stats = client.get_statistics()
    print(json.dumps(stats, indent=2))
    print()
    
    # 7. Execute custom query
    print('7. Executing custom query...')
    custom = client.execute("""
        SELECT 
            t.name as tenant_name,
            COUNT(o.id) as order_count,
            SUM(o.total) as total_revenue
        FROM tenants t
        LEFT JOIN orders o ON t.id = o.tenant_id
        GROUP BY t.id, t.name
        ORDER BY total_revenue DESC
        LIMIT 5
    """)
    print(json.dumps(custom, indent=2))
    print()
    
    # 8. Create new tenant (commented out - will modify database)
    """
    print('8. Creating new tenant...')
    new_tenant = client.create_tenant({
        'name': 'Test Cafe',
        'code': 'TEST001',
        'email': 'test@example.com',
        'phone': '08123456789'
    })
    print(json.dumps(new_tenant, indent=2))
    print()
    """
    
    print('All examples completed!')


if __name__ == '__main__':
    main()
