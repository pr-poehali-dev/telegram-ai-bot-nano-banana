import os
import json
import urllib.request
import urllib.error


def handler(event: dict, context) -> dict:
    """
    Генерация изображения через OpenAI DALL-E 3 по текстовому описанию.
    Принимает prompt, style, quality — возвращает URL изображения.
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    body = json.loads(event.get('body') or '{}')
    prompt = body.get('prompt', '').strip()
    style = body.get('style', 'minimal')
    quality = body.get('quality', 'hd')

    if not prompt:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Описание изображения не может быть пустым'})
        }

    style_map = {
        'minimal': 'minimalist, clean, modern design',
        'business': 'professional business style, corporate',
        'tech': 'futuristic, technology, digital art',
        'portrait': 'portrait, professional photography style',
        'abstract': 'abstract art, creative, artistic',
    }
    style_hint = style_map.get(style, 'minimalist, clean')

    dalle_quality = 'hd' if quality in ('hd', '4k') else 'standard'
    full_prompt = f"{prompt}. Style: {style_hint}."

    api_key = os.environ.get('OPENAI_API_KEY', '')
    if not api_key:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'API ключ OpenAI не настроен'})
        }

    payload = json.dumps({
        'model': 'dall-e-3',
        'prompt': full_prompt,
        'n': 1,
        'size': '1024x1024',
        'quality': dalle_quality,
        'response_format': 'url',
    }).encode('utf-8')

    req = urllib.request.Request(
        'https://api.openai.com/v1/images/generations',
        data=payload,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        method='POST'
    )

    try:
        with urllib.request.urlopen(req, timeout=55) as resp:
            result = json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        err_data = json.loads(err_body) if err_body else {}
        err_msg = err_data.get('error', {}).get('message', 'Ошибка OpenAI API')
        return {
            'statusCode': e.code,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': err_msg})
        }

    image_url = result['data'][0]['url']
    revised_prompt = result['data'][0].get('revised_prompt', full_prompt)

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'url': image_url,
            'revised_prompt': revised_prompt,
            'prompt': prompt,
            'style': style,
            'quality': quality,
        })
    }
