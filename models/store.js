const { pool } = require("../config/database");

const upsertSession = async function (id, userId, description, ready)
{
    await pool.execute(
        `INSERT INTO sessions_wa (id, user_id, description, ready) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE description = VALUES(description), ready = VALUES(ready)`,
        [id, userId, description, ready ? 1 : 0]
    );
};

const setSessionReady = async function (id, ready)
{
    await pool.execute("UPDATE sessions_wa SET ready = ? WHERE id = ?", [ready ? 1 : 0, id]);
};

const setSessionPhone = async function (id, phone)
{
    await pool.execute("UPDATE sessions_wa SET phone = ? WHERE id = ?", [phone, id]);
};

const claimSession = async function (id, userId)
{
    await pool.execute("UPDATE sessions_wa SET user_id = ? WHERE id = ? AND user_id IS NULL", [userId, id]);
};

const deleteSession = async function (id)
{
    await pool.execute("DELETE FROM sessions_wa WHERE id = ?", [id]);
};

const getSessionsForUser = async function (userId)
{
    const [rows] = await pool.execute(
        "SELECT id, description, phone, ready FROM sessions_wa WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC",
        [userId]
    );
    return rows;
};

const getAllSessions = async function ()
{
    const [rows] = await pool.execute("SELECT id, user_id, description, ready FROM sessions_wa");
    return rows;
};

const sessionBelongsToUser = async function (id, userId)
{
    const [rows] = await pool.execute(
        "SELECT id FROM sessions_wa WHERE id = ? AND (user_id = ? OR user_id IS NULL) LIMIT 1",
        [id, userId]
    );
    return rows.length > 0;
};

const logBroadcast = async function (userId, sender, total, success, failed, message)
{
    await pool.execute(
        "INSERT INTO broadcasts (user_id, sender, total, success, failed, message) VALUES (?, ?, ?, ?, ?, ?)",
        [userId, sender, total, success, failed, message]
    );
};

const logMessages = async function (userId, sender, results)
{
    if (!results.length)
    {
        return;
    }

    const values = results.map((r) => [userId, sender, r.number, r.status ? 1 : 0, r.message]);

    await pool.query(
        "INSERT INTO message_logs (user_id, sender, number, status, detail) VALUES ?",
        [values]
    );
};

const getMessageStats = async function (userId)
{
    const [rows] = await pool.execute(
        `SELECT
            COUNT(*) AS total,
            SUM(status = 1) AS success,
            SUM(status = 0) AS failed
         FROM message_logs WHERE user_id = ?`,
        [userId]
    );
    return rows[0];
};

const getDailyStats = async function (userId)
{
    const [rows] = await pool.execute(
        `SELECT
            DATE(created_at) AS day,
            SUM(status = 1) AS success,
            SUM(status = 0) AS failed
         FROM message_logs
         WHERE user_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
         GROUP BY DATE(created_at)
         ORDER BY day ASC`,
        [userId]
    );
    return rows;
};

const getTemplates = async function (userId)
{
    const [rows] = await pool.execute(
        "SELECT id, title, body, image, buttons, created_at FROM templates WHERE user_id = ? ORDER BY created_at DESC",
        [userId]
    );
    return rows;
};

const createTemplate = async function (userId, title, body, image, buttons)
{
    const [result] = await pool.execute(
        "INSERT INTO templates (user_id, title, body, image, buttons) VALUES (?, ?, ?, ?, ?)",
        [userId, title, body, image || null, buttons || null]
    );
    return result.insertId;
};

const deleteTemplate = async function (userId, id)
{
    await pool.execute("DELETE FROM templates WHERE id = ? AND user_id = ?", [id, userId]);
};

const getBotFlows = async function (userId)
{
    const [rows] = await pool.execute(
        "SELECT id, session_id, name, trigger_type, keyword, match_mode, reply_body, reply_image, buttons, enabled FROM bot_flows WHERE user_id = ? ORDER BY created_at DESC",
        [userId]
    );
    return rows;
};

const getFlowsForSession = async function (sessionId)
{
    const [rows] = await pool.execute(
        "SELECT trigger_type, keyword, match_mode, reply_body, reply_image, buttons FROM bot_flows WHERE session_id = ? AND enabled = 1",
        [sessionId]
    );
    return rows;
};

const createBotFlow = async function (userId, flow)
{
    const [result] = await pool.execute(
        `INSERT INTO bot_flows
            (user_id, session_id, name, trigger_type, keyword, match_mode, reply_body, reply_image, buttons, enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            userId,
            flow.session_id,
            flow.name,
            flow.trigger_type,
            flow.keyword || null,
            flow.match_mode,
            flow.reply_body,
            flow.reply_image || null,
            flow.buttons || null,
            flow.enabled ? 1 : 0,
        ]
    );
    return result.insertId;
};

const setFlowEnabled = async function (userId, id, enabled)
{
    await pool.execute(
        "UPDATE bot_flows SET enabled = ? WHERE id = ? AND user_id = ?",
        [enabled ? 1 : 0, id, userId]
    );
};

const deleteBotFlow = async function (userId, id)
{
    await pool.execute("DELETE FROM bot_flows WHERE id = ? AND user_id = ?", [id, userId]);
};

const getBotSetting = async function (sessionId)
{
    const [rows] = await pool.execute(
        "SELECT enabled FROM bot_settings WHERE session_id = ? LIMIT 1",
        [sessionId]
    );
    return rows.length ? rows[0].enabled === 1 : false;
};

const setBotEnabled = async function (userId, sessionId, enabled)
{
    await pool.execute(
        `INSERT INTO bot_settings (session_id, user_id, enabled) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)`,
        [sessionId, userId, enabled ? 1 : 0]
    );
};

const getSessionOwner = async function (sessionId)
{
    const [rows] = await pool.execute(
        "SELECT user_id FROM sessions_wa WHERE id = ? LIMIT 1",
        [sessionId]
    );

    return rows.length ? rows[0].user_id : null;
};

const saveIncomingMessage = async function (userId, sessionId, waNumber, name, body)
{
    await pool.execute(
        `INSERT INTO crm_messages (user_id, session_id, wa_number, direction, body)
         VALUES (?, ?, ?, 'in', ?)`,
        [userId, sessionId, waNumber, body]
    );

    await pool.execute(
        `INSERT INTO crm_contacts (user_id, session_id, wa_number, name, last_message, last_at, unread)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
         ON DUPLICATE KEY UPDATE
            name = COALESCE(VALUES(name), name),
            last_message = VALUES(last_message),
            last_at = CURRENT_TIMESTAMP,
            unread = unread + 1`,
        [userId, sessionId, waNumber, name, body]
    );
};

const saveOutgoingMessage = async function (userId, sessionId, waNumber, body)
{
    await pool.execute(
        `INSERT INTO crm_messages (user_id, session_id, wa_number, direction, body)
         VALUES (?, ?, ?, 'out', ?)`,
        [userId, sessionId, waNumber, body]
    );

    await pool.execute(
        `INSERT INTO crm_contacts (user_id, session_id, wa_number, last_message, last_at, unread)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 0)
         ON DUPLICATE KEY UPDATE
            last_message = VALUES(last_message),
            last_at = CURRENT_TIMESTAMP`,
        [userId, sessionId, waNumber, body]
    );
};

const getContacts = async function (userId, filters)
{
    const clauses = ["user_id = ?"];
    const params = [userId];

    if (filters.search)
    {
        clauses.push("(wa_number LIKE ? OR name LIKE ?)");
        params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.label)
    {
        clauses.push("label = ?");
        params.push(filters.label);
    }

    if (filters.status)
    {
        clauses.push("status = ?");
        params.push(filters.status);
    }

    const [rows] = await pool.execute(
        `SELECT id, session_id, wa_number, name, label, status, last_message, last_at, unread
         FROM crm_contacts
         WHERE ${clauses.join(" AND ")}
         ORDER BY last_at DESC
         LIMIT 200`,
        params
    );

    return rows;
};

const getConversation = async function (userId, sessionId, waNumber)
{
    const [rows] = await pool.execute(
        `SELECT direction, body, created_at
         FROM crm_messages
         WHERE user_id = ? AND session_id = ? AND wa_number = ?
         ORDER BY id ASC
         LIMIT 300`,
        [userId, sessionId, waNumber]
    );

    return rows;
};

const getContactDetail = async function (userId, sessionId, waNumber)
{
    const [rows] = await pool.execute(
        `SELECT session_id, wa_number, name, label, status, notes
         FROM crm_contacts
         WHERE user_id = ? AND session_id = ? AND wa_number = ? LIMIT 1`,
        [userId, sessionId, waNumber]
    );

    return rows.length ? rows[0] : null;
};

const updateContact = async function (userId, sessionId, waNumber, label, status, notes)
{
    await pool.execute(
        `UPDATE crm_contacts SET label = ?, status = ?, notes = ?
         WHERE user_id = ? AND session_id = ? AND wa_number = ?`,
        [label, status, notes, userId, sessionId, waNumber]
    );
};

const markRead = async function (userId, sessionId, waNumber)
{
    await pool.execute(
        `UPDATE crm_contacts SET unread = 0
         WHERE user_id = ? AND session_id = ? AND wa_number = ?`,
        [userId, sessionId, waNumber]
    );
};

module.exports = {
    upsertSession,
    setSessionReady,
    setSessionPhone,
    claimSession,
    deleteSession,
    getSessionsForUser,
    getAllSessions,
    sessionBelongsToUser,
    logBroadcast,
    logMessages,
    getMessageStats,
    getDailyStats,
    getTemplates,
    createTemplate,
    deleteTemplate,
    getBotFlows,
    getFlowsForSession,
    createBotFlow,
    setFlowEnabled,
    deleteBotFlow,
    getBotSetting,
    setBotEnabled,
    getSessionOwner,
    saveIncomingMessage,
    saveOutgoingMessage,
    getContacts,
    getConversation,
    getContactDetail,
    updateContact,
    markRead,
};
