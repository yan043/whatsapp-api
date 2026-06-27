-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Waktu pembuatan: 27 Jun 2026 pada 15.48
-- Versi server: 9.6.0
-- Versi PHP: 8.5.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Basis data: `db_whatsapp_gateway`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `bot_flows`
--

CREATE TABLE `bot_flows` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `session_id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `trigger_type` enum('keyword','welcome','fallback') DEFAULT 'keyword',
  `keyword` varchar(255) DEFAULT NULL,
  `match_mode` enum('exact','contains') DEFAULT 'contains',
  `reply_body` text NOT NULL,
  `reply_image` varchar(512) DEFAULT NULL,
  `buttons` text,
  `enabled` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `bot_settings`
--

CREATE TABLE `bot_settings` (
  `session_id` varchar(64) NOT NULL,
  `user_id` int NOT NULL,
  `enabled` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `broadcasts`
--

CREATE TABLE `broadcasts` (
  `id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `sender` varchar(64) DEFAULT NULL,
  `total` int DEFAULT '0',
  `success` int DEFAULT '0',
  `failed` int DEFAULT '0',
  `message` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `crm_contacts`
--

CREATE TABLE `crm_contacts` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `session_id` varchar(64) NOT NULL,
  `wa_number` varchar(32) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `label` varchar(32) DEFAULT 'none',
  `status` enum('new','open','done') DEFAULT 'new',
  `notes` text,
  `last_message` text,
  `last_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `unread` int DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `crm_messages`
--

CREATE TABLE `crm_messages` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `session_id` varchar(64) NOT NULL,
  `wa_number` varchar(32) NOT NULL,
  `direction` enum('in','out') NOT NULL,
  `body` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `message_logs`
--

CREATE TABLE `message_logs` (
  `id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `sender` varchar(64) DEFAULT NULL,
  `number` varchar(32) DEFAULT NULL,
  `status` tinyint(1) DEFAULT '0',
  `detail` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int UNSIGNED NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `sessions_wa`
--

CREATE TABLE `sessions_wa` (
  `id` varchar(64) NOT NULL,
  `user_id` int DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `ready` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `phone` varchar(32) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `templates`
--

CREATE TABLE `templates` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `image` varchar(512) DEFAULT NULL,
  `buttons` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `google_id` varchar(64) NOT NULL,
  `email` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `avatar` varchar(512) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indeks untuk tabel yang dibuang
--

--
-- Indeks untuk tabel `bot_flows`
--
ALTER TABLE `bot_flows`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indeks untuk tabel `bot_settings`
--
ALTER TABLE `bot_settings`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indeks untuk tabel `broadcasts`
--
ALTER TABLE `broadcasts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indeks untuk tabel `crm_contacts`
--
ALTER TABLE `crm_contacts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_contact` (`session_id`,`wa_number`),
  ADD KEY `idx_user` (`user_id`);

--
-- Indeks untuk tabel `crm_messages`
--
ALTER TABLE `crm_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_thread` (`session_id`,`wa_number`),
  ADD KEY `user_id` (`user_id`);

--
-- Indeks untuk tabel `message_logs`
--
ALTER TABLE `message_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indeks untuk tabel `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`);

--
-- Indeks untuk tabel `sessions_wa`
--
ALTER TABLE `sessions_wa`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indeks untuk tabel `templates`
--
ALTER TABLE `templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `google_id` (`google_id`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `bot_flows`
--
ALTER TABLE `bot_flows`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `broadcasts`
--
ALTER TABLE `broadcasts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `crm_contacts`
--
ALTER TABLE `crm_contacts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `crm_messages`
--
ALTER TABLE `crm_messages`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `message_logs`
--
ALTER TABLE `message_logs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `templates`
--
ALTER TABLE `templates`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `bot_flows`
--
ALTER TABLE `bot_flows`
  ADD CONSTRAINT `bot_flows_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `bot_settings`
--
ALTER TABLE `bot_settings`
  ADD CONSTRAINT `bot_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `broadcasts`
--
ALTER TABLE `broadcasts`
  ADD CONSTRAINT `broadcasts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `crm_contacts`
--
ALTER TABLE `crm_contacts`
  ADD CONSTRAINT `crm_contacts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `crm_messages`
--
ALTER TABLE `crm_messages`
  ADD CONSTRAINT `crm_messages_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `message_logs`
--
ALTER TABLE `message_logs`
  ADD CONSTRAINT `message_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `sessions_wa`
--
ALTER TABLE `sessions_wa`
  ADD CONSTRAINT `sessions_wa_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `templates`
--
ALTER TABLE `templates`
  ADD CONSTRAINT `templates_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
