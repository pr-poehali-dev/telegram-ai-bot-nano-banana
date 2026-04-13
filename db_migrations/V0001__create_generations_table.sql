CREATE TABLE IF NOT EXISTS t_p29168714_telegram_ai_bot_nano.generations (
    id BIGSERIAL PRIMARY KEY,
    prompt TEXT NOT NULL,
    style VARCHAR(50),
    quality VARCHAR(10),
    image_url TEXT,
    s3_key TEXT,
    status VARCHAR(10) DEFAULT 'done',
    created_at TIMESTAMPTZ DEFAULT NOW()
);