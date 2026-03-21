-- ============================================================
-- ads_checker schema: raw / fact / mart 3-layer structure
-- ============================================================

-- ==================== RAW 層 ====================
CREATE TABLE IF NOT EXISTS raw_meta_daily (
    id              BIGSERIAL PRIMARY KEY,
    request_start_date DATE NOT NULL,
    request_end_date   DATE NOT NULL,
    level           VARCHAR(50) NOT NULL DEFAULT 'campaign',
    account_id      VARCHAR(100) NOT NULL,
    campaign_id     VARCHAR(100),
    campaign_name   TEXT,
    date_start      DATE NOT NULL,
    date_stop       DATE NOT NULL,
    raw_json        JSONB NOT NULL,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unique_hash     VARCHAR(64) NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_raw_meta_daily_dates
    ON raw_meta_daily (date_start, date_stop);
CREATE INDEX IF NOT EXISTS idx_raw_meta_daily_account
    ON raw_meta_daily (account_id);
CREATE INDEX IF NOT EXISTS idx_raw_meta_daily_campaign
    ON raw_meta_daily (campaign_id);

-- ==================== FACT 層 ====================
CREATE TABLE IF NOT EXISTS fact_ad_daily (
    id              BIGSERIAL PRIMARY KEY,
    date            DATE NOT NULL,
    source          VARCHAR(50) NOT NULL DEFAULT 'meta',
    account_id      VARCHAR(100) NOT NULL,
    campaign_id     VARCHAR(100),
    campaign_name   TEXT,
    adset_id        VARCHAR(100),
    adset_name      TEXT,
    creative_id     VARCHAR(100),
    creative_name   TEXT,
    impressions     BIGINT NOT NULL DEFAULT 0,
    clicks          BIGINT NOT NULL DEFAULT 0,
    cost            NUMERIC(18, 6) NOT NULL DEFAULT 0,
    conversions     BIGINT NOT NULL DEFAULT 0,
    currency        VARCHAR(10) DEFAULT 'JPY',
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (date, source, account_id, campaign_id, adset_id, creative_id)
);

CREATE INDEX IF NOT EXISTS idx_fact_ad_daily_date ON fact_ad_daily (date);
CREATE INDEX IF NOT EXISTS idx_fact_ad_daily_source ON fact_ad_daily (source);
CREATE INDEX IF NOT EXISTS idx_fact_ad_daily_campaign ON fact_ad_daily (campaign_id);
CREATE INDEX IF NOT EXISTS idx_fact_ad_daily_creative ON fact_ad_daily (creative_id);

-- ==================== MART 層 ====================

-- サマリー日別
CREATE TABLE IF NOT EXISTS mart_summary_daily (
    id              BIGSERIAL PRIMARY KEY,
    date            DATE NOT NULL,
    source          VARCHAR(50) NOT NULL DEFAULT 'meta',
    impressions     BIGINT NOT NULL DEFAULT 0,
    clicks          BIGINT NOT NULL DEFAULT 0,
    cost            NUMERIC(18, 6) NOT NULL DEFAULT 0,
    conversions     BIGINT NOT NULL DEFAULT 0,
    ctr             NUMERIC(10, 6) DEFAULT 0,
    cpc             NUMERIC(18, 6) DEFAULT 0,
    cvr             NUMERIC(10, 6) DEFAULT 0,
    cpa             NUMERIC(18, 6) DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (date, source)
);

-- キャンペーン日別
CREATE TABLE IF NOT EXISTS mart_campaign_daily (
    id              BIGSERIAL PRIMARY KEY,
    date            DATE NOT NULL,
    source          VARCHAR(50) NOT NULL DEFAULT 'meta',
    campaign_id     VARCHAR(100) NOT NULL,
    campaign_name   TEXT,
    impressions     BIGINT NOT NULL DEFAULT 0,
    clicks          BIGINT NOT NULL DEFAULT 0,
    cost            NUMERIC(18, 6) NOT NULL DEFAULT 0,
    conversions     BIGINT NOT NULL DEFAULT 0,
    ctr             NUMERIC(10, 6) DEFAULT 0,
    cpc             NUMERIC(18, 6) DEFAULT 0,
    cvr             NUMERIC(10, 6) DEFAULT 0,
    cpa             NUMERIC(18, 6) DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (date, source, campaign_id)
);

-- クリエイティブ日別
CREATE TABLE IF NOT EXISTS mart_creative_daily (
    id              BIGSERIAL PRIMARY KEY,
    date            DATE NOT NULL,
    source          VARCHAR(50) NOT NULL DEFAULT 'meta',
    campaign_id     VARCHAR(100),
    campaign_name   TEXT,
    creative_id     VARCHAR(100) NOT NULL,
    creative_name   TEXT,
    impressions     BIGINT NOT NULL DEFAULT 0,
    clicks          BIGINT NOT NULL DEFAULT 0,
    cost            NUMERIC(18, 6) NOT NULL DEFAULT 0,
    conversions     BIGINT NOT NULL DEFAULT 0,
    ctr             NUMERIC(10, 6) DEFAULT 0,
    cpc             NUMERIC(18, 6) DEFAULT 0,
    cvr             NUMERIC(10, 6) DEFAULT 0,
    cpa             NUMERIC(18, 6) DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (date, source, creative_id)
);

-- 期間サマリー
CREATE TABLE IF NOT EXISTS mart_period_summary (
    id              BIGSERIAL PRIMARY KEY,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    source          VARCHAR(50) NOT NULL DEFAULT 'meta',
    impressions     BIGINT NOT NULL DEFAULT 0,
    clicks          BIGINT NOT NULL DEFAULT 0,
    cost            NUMERIC(18, 6) NOT NULL DEFAULT 0,
    conversions     BIGINT NOT NULL DEFAULT 0,
    ctr             NUMERIC(10, 6) DEFAULT 0,
    cpc             NUMERIC(18, 6) DEFAULT 0,
    cvr             NUMERIC(10, 6) DEFAULT 0,
    cpa             NUMERIC(18, 6) DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (start_date, end_date, source)
);
