CREATE TABLE IF NOT EXISTS t_p29168714_telegram_ai_bot_nano.users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    plan VARCHAR(50) DEFAULT 'starter',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p29168714_telegram_ai_bot_nano.sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES t_p29168714_telegram_ai_bot_nano.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

ALTER TABLE t_p29168714_telegram_ai_bot_nano.generations
    ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES t_p29168714_telegram_ai_bot_nano.users(id);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON t_p29168714_telegram_ai_bot_nano.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON t_p29168714_telegram_ai_bot_nano.generations(user_id);