import os
import json
import hashlib
import secrets
import psycopg2


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def hash_password(password: str) -> str:
    salt = os.environ.get('SECRET_SALT', 'imagegen_salt_2024')
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()


def get_user_from_session(cur, schema: str, session_id: str):
    cur.execute(
        f"SELECT u.id, u.email, u.name, u.plan FROM {schema}.sessions s "
        f"JOIN {schema}.users u ON u.id = s.user_id "
        f"WHERE s.id = %s AND s.expires_at > NOW()",
        (session_id,)
    )
    return cur.fetchone()


def handler(event: dict, context) -> dict:
    """
    Авторизация через поле action в теле запроса.
    POST {action: 'register', email, password, name}
    POST {action: 'login', email, password}
    POST {action: 'logout'} + заголовок X-Session-Id
    POST {action: 'me'}    + заголовок X-Session-Id
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    cors = {'Access-Control-Allow-Origin': '*'}
    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    headers = event.get('headers') or {}
    session_id = headers.get('X-Session-Id') or headers.get('x-session-id', '')
    body = json.loads(event.get('body') or '{}')
    action = body.get('action', '')

    if action == 'me':
        if not session_id:
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Не авторизован'})}
        conn = get_conn()
        cur = conn.cursor()
        user = get_user_from_session(cur, schema, session_id)
        cur.close(); conn.close()
        if not user:
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Сессия истекла'})}
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({
            'id': user[0], 'email': user[1], 'name': user[2], 'plan': user[3]
        })}

    if action == 'register':
        email = (body.get('email') or '').strip().lower()
        password = body.get('password', '')
        name = (body.get('name') or '').strip()

        if not email or not password:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Email и пароль обязательны'})}
        if len(password) < 6:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Пароль минимум 6 символов'})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT id FROM {schema}.users WHERE email = %s", (email,))
        if cur.fetchone():
            cur.close(); conn.close()
            return {'statusCode': 409, 'headers': cors, 'body': json.dumps({'error': 'Email уже зарегистрирован'})}

        pw_hash = hash_password(password)
        display_name = name or email.split('@')[0]
        cur.execute(
            f"INSERT INTO {schema}.users (email, password_hash, name) VALUES (%s, %s, %s) RETURNING id, plan",
            (email, pw_hash, display_name)
        )
        user_row = cur.fetchone()
        user_id, plan = user_row[0], user_row[1]
        sid = secrets.token_hex(32)
        cur.execute(f"INSERT INTO {schema}.sessions (id, user_id) VALUES (%s, %s)", (sid, user_id))
        conn.commit()
        cur.close(); conn.close()

        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({
            'session_id': sid,
            'user': {'id': user_id, 'email': email, 'name': display_name, 'plan': plan}
        })}

    if action == 'login':
        email = (body.get('email') or '').strip().lower()
        password = body.get('password', '')

        if not email or not password:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Email и пароль обязательны'})}

        conn = get_conn()
        cur = conn.cursor()
        pw_hash = hash_password(password)
        cur.execute(
            f"SELECT id, email, name, plan FROM {schema}.users WHERE email = %s AND password_hash = %s",
            (email, pw_hash)
        )
        user = cur.fetchone()
        if not user:
            cur.close(); conn.close()
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Неверный email или пароль'})}

        sid = secrets.token_hex(32)
        cur.execute(f"INSERT INTO {schema}.sessions (id, user_id) VALUES (%s, %s)", (sid, user[0]))
        conn.commit()
        cur.close(); conn.close()

        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({
            'session_id': sid,
            'user': {'id': user[0], 'email': user[1], 'name': user[2], 'plan': user[3]}
        })}

    if action == 'logout':
        if session_id:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"UPDATE {schema}.sessions SET expires_at = NOW() WHERE id = %s", (session_id,))
            conn.commit()
            cur.close(); conn.close()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'ok': True})}

    return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Неизвестный action'})}