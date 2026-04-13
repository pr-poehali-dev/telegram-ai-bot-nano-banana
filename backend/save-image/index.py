import os
import json
import uuid
import urllib.request
import boto3
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
    Скачивает изображение по URL, сохраняет в S3 и записывает в БД с привязкой к пользователю.
    Принимает: image_url, prompt, style, quality, status. Заголовок X-Session-Id — опционально.
    Возвращает: id, cdn_url, created_at.
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

    headers = event.get('headers') or {}
    session_id = headers.get('X-Session-Id') or headers.get('x-session-id', '')

    body = json.loads(event.get('body') or '{}')
    image_url = body.get('image_url', '').strip()
    prompt = body.get('prompt', '').strip()
    style = body.get('style', 'minimal')
    quality = body.get('quality', 'hd')
    status = body.get('status', 'done')

    if not image_url or not prompt:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'image_url и prompt обязательны'})
        }

    # Скачиваем изображение
    req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        image_data = resp.read()

    # Сохраняем в S3
    s3_key = f"generations/{uuid.uuid4()}.png"
    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    s3.put_object(
        Bucket='files',
        Key=s3_key,
        Body=image_data,
        ContentType='image/png',
    )
    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{s3_key}"

    # Сохраняем в БД
    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    user_id = get_user_id_from_session(cur, schema, session_id)

    cur.execute(
        f"INSERT INTO {schema}.generations (prompt, style, quality, image_url, s3_key, status, user_id) "
        f"VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, created_at",
        (prompt, style, quality, cdn_url, s3_key, status, user_id)
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'id': row[0],
            'cdn_url': cdn_url,
            'created_at': row[1].isoformat(),
        })
    }
