SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()), name VARCHAR(120) NOT NULL, phone VARCHAR(15) UNIQUE, cpf CHAR(11) UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE, password_hash TEXT NOT NULL, avatar_url TEXT,
  email_verified_at DATETIME(3), email_verification_token_hash VARCHAR(128), email_verification_expires_at DATETIME(3),
  password_reset_token_hash VARCHAR(128), password_reset_expires_at DATETIME(3), plan_name VARCHAR(40) NOT NULL DEFAULT 'Free',
  credits_remaining INT NOT NULL DEFAULT 5, credits_valid_until DATETIME(3), role ENUM('user','master') NOT NULL DEFAULT 'user',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX users_email_verification_token_idx(email_verification_token_hash), INDEX users_password_reset_token_idx(password_reset_token_hash)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS projects (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()), user_id CHAR(36) NOT NULL, title VARCHAR(180) NOT NULL,
  type VARCHAR(60) NOT NULL DEFAULT 'Texto para vídeo', status ENUM('draft','processing','ready','failed') NOT NULL DEFAULT 'draft',
  duration_seconds INT NOT NULL DEFAULT 0, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX projects_user_id_idx(user_id), CONSTRAINT projects_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS videos (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()), project_id CHAR(36) NOT NULL, title VARCHAR(180), file_url TEXT, thumbnail_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'processing', duration_seconds INT NOT NULL DEFAULT 0, metadata JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX videos_project_id_idx(project_id), CONSTRAINT videos_project_fk FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS templates (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()), name VARCHAR(180) NOT NULL UNIQUE, description TEXT, thumbnail_url TEXT, config JSON NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;
INSERT IGNORE INTO templates(name,description,config) VALUES
('Produto em Destaque','Apresente um produto com chamadas rápidas e visual moderno.',JSON_OBJECT('category','Vendas','format','9:16','duration',15,'color','teal')),
('Oferta Relâmpago','Template direto para promoções, descontos e campanhas urgentes.',JSON_OBJECT('category','Vendas','format','9:16','duration',10,'color','purple')),
('Apresentação da Empresa','Conte a história e os diferenciais da sua marca.',JSON_OBJECT('category','Institucional','format','16:9','duration',30,'color','blue')),
('Depoimento de Cliente','Transforme avaliações em vídeos que geram confiança.',JSON_OBJECT('category','Social','format','9:16','duration',20,'color','orange')),
('Tutorial Rápido','Explique um processo em passos simples e objetivos.',JSON_OBJECT('category','Educação','format','16:9','duration',30,'color','green')),
('Notícia para Redes','Comunique novidades em um formato dinâmico para redes sociais.',JSON_OBJECT('category','Social','format','1:1','duration',15,'color','pink'));

CREATE TABLE IF NOT EXISTS subscription_plans (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()), name VARCHAR(60) NOT NULL UNIQUE, price_cents INT NOT NULL, credits INT NOT NULL,
  mercado_pago_plan_id TEXT, active BOOLEAN NOT NULL DEFAULT TRUE, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;
INSERT IGNORE INTO subscription_plans(name,price_cents,credits) VALUES('Free',0,5),('Creator',9990,180),('Pro',19990,500);

CREATE TABLE IF NOT EXISTS subscriptions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()), user_id CHAR(36) NOT NULL, provider VARCHAR(40) NOT NULL, provider_subscription_id VARCHAR(255),
  plan VARCHAR(60) NOT NULL, status VARCHAR(30) NOT NULL, plan_id CHAR(36), external_reference VARCHAR(255), current_period_end DATETIME(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX subscriptions_user_id_idx(user_id), CONSTRAINT subscriptions_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT subscriptions_plan_fk FOREIGN KEY(plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()), user_id CHAR(36) NOT NULL, subscription_id CHAR(36), provider VARCHAR(40) NOT NULL,
  provider_payment_id VARCHAR(255), amount_cents INT NOT NULL, currency CHAR(3) NOT NULL DEFAULT 'BRL', status VARCHAR(30) NOT NULL,
  description TEXT, paid_at DATETIME(3), payment_method VARCHAR(40), payment_type VARCHAR(40), fee_cents INT NOT NULL DEFAULT 0,
  net_amount_cents INT NOT NULL DEFAULT 0, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY payments_provider_payment_idx(provider,provider_payment_id), INDEX payments_user_id_idx(user_id),
  CONSTRAINT payments_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT payments_subscription_fk FOREIGN KEY(subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()), user_id CHAR(36), level VARCHAR(20) NOT NULL DEFAULT 'info', action VARCHAR(120) NOT NULL,
  details JSON NOT NULL, ip_address VARCHAR(45), created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX logs_user_id_idx(user_id), INDEX logs_created_at_idx(created_at), CONSTRAINT logs_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS settings (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()), user_id CHAR(36) NOT NULL, `key` VARCHAR(120) NOT NULL, value JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY settings_user_key(user_id,`key`), CONSTRAINT settings_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS social_accounts (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()), user_id CHAR(36) NOT NULL, platform VARCHAR(30) NOT NULL, account_name VARCHAR(120) NOT NULL,
  profile_url TEXT, status ENUM('pending','connected','expired','error') NOT NULL DEFAULT 'pending', provider_account_id VARCHAR(255),
  encrypted_credentials TEXT, token_expires_at DATETIME(3), scopes TEXT, last_checked_at DATETIME(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY social_account_unique(user_id,platform,account_name), INDEX social_accounts_user_idx(user_id),
  CONSTRAINT social_accounts_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS schedules (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()), user_id CHAR(36) NOT NULL, title VARCHAR(180) NOT NULL, platform VARCHAR(30) NOT NULL,
  caption TEXT, scheduled_at DATETIME(3) NOT NULL, status ENUM('scheduled','publishing','published','cancelled','failed') NOT NULL DEFAULT 'scheduled',
  social_account_id CHAR(36), video_id CHAR(36), publication_error TEXT, provider_publication_id VARCHAR(255), published_at DATETIME(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX schedules_user_date_idx(user_id,scheduled_at), CONSTRAINT schedules_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT schedules_social_fk FOREIGN KEY(social_account_id) REFERENCES social_accounts(id) ON DELETE SET NULL,
  CONSTRAINT schedules_video_fk FOREIGN KEY(video_id) REFERENCES videos(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS authorized_devices (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()), user_id CHAR(36) NOT NULL, session_id CHAR(36) NOT NULL UNIQUE, device_name VARCHAR(180) NOT NULL,
  user_agent TEXT, ip_address VARCHAR(45), last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3), created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX authorized_devices_user_idx(user_id,last_seen_at),
  CONSTRAINT devices_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS credit_transactions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()), user_id CHAR(36) NOT NULL, amount INT NOT NULL, type ENUM('grant','usage','refund','adjustment') NOT NULL,
  description VARCHAR(180) NOT NULL, expires_at DATETIME(3), reference_key VARCHAR(255) UNIQUE, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX credit_transactions_user_idx(user_id,created_at), CONSTRAINT credits_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS system_expenses (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()), category VARCHAR(60) NOT NULL, description VARCHAR(180) NOT NULL, amount_cents INT NOT NULL,
  occurred_on DATE NOT NULL, recurring BOOLEAN NOT NULL DEFAULT FALSE, created_by CHAR(36), created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX expenses_date_idx(occurred_on), CONSTRAINT expenses_creator_fk FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cost_entries (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()), user_id CHAR(36), video_id CHAR(36), category ENUM('IA','Narração','Armazenamento','Renderização','Outros') NOT NULL,
  description VARCHAR(180) NOT NULL, amount_cents INT NOT NULL, occurred_on DATE NOT NULL, created_by CHAR(36), created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX cost_entries_date_idx(occurred_on), INDEX cost_entries_user_idx(user_id), INDEX cost_entries_video_idx(video_id),
  CONSTRAINT costs_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, CONSTRAINT costs_video_fk FOREIGN KEY(video_id) REFERENCES videos(id) ON DELETE CASCADE,
  CONSTRAINT costs_creator_fk FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS support_tickets (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()), user_id CHAR(36), name VARCHAR(120) NOT NULL, email VARCHAR(255) NOT NULL, category VARCHAR(40) NOT NULL,
  subject VARCHAR(160) NOT NULL, message TEXT NOT NULL, status ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX support_tickets_status_idx(status,created_at), CONSTRAINT tickets_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS error_events (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()), request_id CHAR(36) NOT NULL, user_id CHAR(36), method VARCHAR(10), path TEXT, status INT NOT NULL,
  message TEXT NOT NULL, stack TEXT, ip_address VARCHAR(45), user_agent TEXT, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX error_events_created_idx(created_at), CONSTRAINT errors_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS render_jobs (
  id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, video_id CHAR(36) NOT NULL,
  status ENUM('queued','processing','completed','failed') NOT NULL DEFAULT 'queued', attempts INT NOT NULL DEFAULT 0,
  error_message TEXT, started_at DATETIME(3), finished_at DATETIME(3), created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX render_jobs_status_created_idx(status,created_at), INDEX render_jobs_user_video_idx(user_id,video_id),
  CONSTRAINT render_jobs_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT render_jobs_video_fk FOREIGN KEY(video_id) REFERENCES videos(id) ON DELETE CASCADE
) ENGINE=InnoDB;
