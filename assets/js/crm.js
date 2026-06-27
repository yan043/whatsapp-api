document.getElementById("year").textContent = new Date().getFullYear();

function startClock()
{
    const dateEl = document.getElementById("clock-date");
    const timeEl = document.getElementById("clock-time");

    const dateFmt = new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    const tick = function ()
    {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const ss = String(now.getSeconds()).padStart(2, "0");
        dateEl.textContent = dateFmt.format(now);
        timeEl.textContent = hh + ":" + mm + ":" + ss;
    };

    tick();
    setInterval(tick, 1000);
}

startClock();

function toast(message, isError)
{
    const el = document.createElement("div");
    el.className = "toast" + (isError ? " error" : "");
    el.textContent = message;
    document.getElementById("toast-wrap").appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

const contactsBox = document.getElementById("crm-contacts");
const messagesBox = document.getElementById("crm-messages");
const convBox = document.getElementById("crm-conv");
const emptyBox = document.getElementById("crm-empty");
const searchInput = document.getElementById("crm-search");
const filterLabel = document.getElementById("crm-filter-label");
const filterStatus = document.getElementById("crm-filter-status");
const convName = document.getElementById("crm-conv-name");
const convNumber = document.getElementById("crm-conv-number");
const detailBox = document.getElementById("crm-detail");
const editLabel = document.getElementById("crm-edit-label");
const editStatus = document.getElementById("crm-edit-status");
const editNotes = document.getElementById("crm-edit-notes");
const replyInput = document.getElementById("crm-reply-input");

let active = null;

function displayName(contact)
{
    return contact.name || contact.wa_number.replace(/@(c\.us|lid)$/, "");
}

function formatTime(value)
{
    if (!value)
    {
        return "";
    }

    const d = new Date(value);
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function renderContacts(list)
{
    contactsBox.innerHTML = "";

    if (!list.length)
    {
        const empty = document.createElement("p");
        empty.style.color = "var(--text-muted)";
        empty.style.padding = "16px";
        empty.textContent = i18n.t("crm.noContacts");
        contactsBox.appendChild(empty);
        return;
    }

    list.forEach((contact) =>
    {
        const row = document.createElement("div");
        row.className = "crm-contact";

        if (active && active.session_id === contact.session_id && active.wa_number === contact.wa_number)
        {
            row.classList.add("active");
        }

        const avatar = document.createElement("div");
        avatar.className = "crm-avatar";
        avatar.textContent = displayName(contact).charAt(0).toUpperCase();

        const body = document.createElement("div");
        body.className = "crm-contact-body";
        const name = document.createElement("div");
        name.className = "crm-contact-name";
        name.textContent = displayName(contact);
        const last = document.createElement("div");
        last.className = "crm-contact-last";
        last.textContent = contact.last_message || "";
        body.appendChild(name);
        body.appendChild(last);

        const meta = document.createElement("div");
        meta.className = "crm-contact-meta";

        if (contact.unread > 0)
        {
            const badge = document.createElement("span");
            badge.className = "crm-badge";
            badge.textContent = contact.unread;
            meta.appendChild(badge);
        }

        if (contact.label && contact.label !== "none")
        {
            const tag = document.createElement("span");
            tag.className = "crm-tag " + contact.label;
            tag.textContent = i18n.t("crm.label." + contact.label);
            meta.appendChild(tag);
        }

        row.appendChild(avatar);
        row.appendChild(body);
        row.appendChild(meta);
        row.addEventListener("click", () => openConversation(contact));
        contactsBox.appendChild(row);
    });
}

async function loadContacts()
{
    const params = new URLSearchParams();

    if (searchInput.value.trim())
    {
        params.set("search", searchInput.value.trim());
    }

    if (filterLabel.value)
    {
        params.set("label", filterLabel.value);
    }

    if (filterStatus.value)
    {
        params.set("status", filterStatus.value);
    }

    try
    {
        const res = await fetch("/crm/contacts?" + params.toString());
        const json = await res.json();
        renderContacts(json.contacts || []);
    }
    catch (err)
    {
        renderContacts([]);
    }
}

function renderMessages(messages)
{
    messagesBox.innerHTML = "";

    messages.forEach((msg) =>
    {
        const bubble = document.createElement("div");
        bubble.className = "crm-bubble " + (msg.direction === "out" ? "out" : "in");
        bubble.textContent = msg.body || "";
        const time = document.createElement("span");
        time.className = "crm-bubble-time";
        time.textContent = formatTime(msg.created_at);
        bubble.appendChild(time);
        messagesBox.appendChild(bubble);
    });

    messagesBox.scrollTop = messagesBox.scrollHeight;
}

async function openConversation(contact)
{
    active = { session_id: contact.session_id, wa_number: contact.wa_number };

    emptyBox.hidden = true;
    convBox.hidden = false;
    detailBox.classList.remove("open");
    convName.textContent = displayName(contact);
    convNumber.textContent = contact.wa_number.replace(/@(c\.us|lid)$/, "");
    document.getElementById("crm-conv-avatar").textContent = displayName(contact).charAt(0).toUpperCase();

    const params = new URLSearchParams({ session_id: contact.session_id, wa_number: contact.wa_number });

    try
    {
        const res = await fetch("/crm/conversation?" + params.toString());
        const json = await res.json();

        if (!json.status)
        {
            throw new Error(json.message);
        }

        renderMessages(json.messages || []);

        if (json.detail)
        {
            editLabel.value = json.detail.label || "none";
            editStatus.value = json.detail.status || "new";
            editNotes.value = json.detail.notes || "";
        }

        loadContacts();
    }
    catch (err)
    {
        toast(i18n.t("crm.loadFailed"), true);
    }
}

document.getElementById("crm-reply-form").addEventListener("submit", async function (e)
{
    e.preventDefault();
    const body = replyInput.value.trim();

    if (!body || !active)
    {
        return;
    }

    try
    {
        const res = await fetch("/crm/reply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: active.session_id, wa_number: active.wa_number, body }),
        });
        const json = await res.json();

        if (!json.status)
        {
            throw new Error(json.message);
        }

        replyInput.value = "";
        appendBubble("out", body);
    }
    catch (err)
    {
        toast(i18n.t("crm.sendFailed"), true);
    }
});

function appendBubble(direction, body)
{
    const bubble = document.createElement("div");
    bubble.className = "crm-bubble " + direction;
    bubble.textContent = body || "";
    const time = document.createElement("span");
    time.className = "crm-bubble-time";
    time.textContent = formatTime(new Date());
    bubble.appendChild(time);
    messagesBox.appendChild(bubble);
    messagesBox.scrollTop = messagesBox.scrollHeight;
}

document.getElementById("crm-toggle-detail").addEventListener("click", function ()
{
    detailBox.classList.toggle("open");
});

document.getElementById("crm-close-detail").addEventListener("click", function ()
{
    detailBox.classList.remove("open");
});

document.getElementById("crm-save-detail").addEventListener("click", async function ()
{
    if (!active)
    {
        return;
    }

    try
    {
        const res = await fetch("/crm/contact", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: active.session_id,
                wa_number: active.wa_number,
                label: editLabel.value,
                status: editStatus.value,
                notes: editNotes.value,
            }),
        });
        const json = await res.json();

        if (!json.status)
        {
            throw new Error(json.message);
        }

        toast(i18n.t("crm.detailSaved"));
        loadContacts();
    }
    catch (err)
    {
        toast(i18n.t("crm.saveFailed"), true);
    }
});

let searchTimer = null;
searchInput.addEventListener("input", function ()
{
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadContacts, 300);
});
filterLabel.addEventListener("change", loadContacts);
filterStatus.addEventListener("change", loadContacts);

const socket = io();

socket.on("crm:incoming", function (data)
{
    if (active && active.session_id === data.sessionId && active.wa_number === data.waNumber)
    {
        appendBubble("in", data.body);
    }

    loadContacts();
});

socket.on("crm:outgoing", function (data)
{
    loadContacts();
});

async function loadUser()
{
    try
    {
        const res = await fetch("/me");
        const json = await res.json();

        if (!json.status)
        {
            return;
        }

        const box = document.getElementById("sidebar-user");
        const avatar = document.createElement("img");
        avatar.className = "user-avatar";
        avatar.src = json.user.avatar || "";
        avatar.alt = "";

        const info = document.createElement("div");
        info.className = "user-info";
        const name = document.createElement("div");
        name.className = "user-name";
        name.textContent = json.user.name || json.user.email;
        const logout = document.createElement("button");
        logout.className = "user-logout";
        logout.textContent = i18n.t("user.logout");
        logout.addEventListener("click", async function ()
        {
            await fetch("/auth/logout", { method: "POST" });
            window.location.href = "/login";
        });

        info.appendChild(name);
        info.appendChild(logout);
        box.appendChild(avatar);
        box.appendChild(info);
    }
    catch (err)
    {
        return;
    }
}

loadUser();
loadContacts();

document.addEventListener("languagechange", loadContacts);
