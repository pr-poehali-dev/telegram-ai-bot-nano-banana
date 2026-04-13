import os
import json
import psycopg2


def get_user_id_from_session(cur, schema: str, session_id: str):
    if not session_id:
        return None
    cur.execute(
        f"SELECT user_id FROM {schema}.sessions WHERE id = %s AND expires_at > NOW()",
        (session_id,)
    )
    row = cur.fetchone()
    return row[0] if row else None


def handler(event: dict, context) -> dict:
    """
    Возвращает историю генераций текущего пользователя из БД.
    Требует заголовок X-Session-Id. Query params: limit (default 50), offset (default 0).
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    headers = event.get('headers') or {}
    session_id = headers.get('X-Session-Id') or headers.get('x-session-id', '')

    params = event.get('queryStringParameters') or {}
    limit = min(int(params.get('limit', 50)), 100)
    offset = int(params.get('offset', 0))

    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    user_id = get_user_id_from_session(cur, schema, session_id)

    if user_id:
        cur.execute(
            f"SELECT id, prompt, style, quality, image_url, status, created_at "
            f"FROM {schema}.generations "
            f"WHERE user_id = %s "
            f"ORDER BY created_at DESC LIMIT %s OFFSET %s",
            (user_id, limit, offset)
        )
    else:
        cur.execute(
            f"SELECT id, prompt, style, quality, image_url, status, created_at "
            f"FROM {schema}.generations "
            f"WHERE user_id IS NULL "
            f"ORDER BY created_at DESC LIMIT %s OFFSET %s",
            (limit, offset)
        )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    items = [
        {
            'id': r[0],
            'prompt': r[1],
            'style': r[2],
            'quality': r[3],
            'image_url': r[4],
            'status': r[5],
            'created_at': r[6].isoformat(),
        }
        for r in rows
    ]

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'items': items, 'total': len(items)})
    }
