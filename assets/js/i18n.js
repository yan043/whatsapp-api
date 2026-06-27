(function ()
{
    const dictionaries = {
        id: {
            "brand.subtitle": "API Multi-Sesi",
            "nav.connection": "Koneksi",
            "nav.crm": "CRM",
            "nav.broadcast": "Siaran",
            "nav.templates": "Templat",
            "user.logout": "Keluar",
            "lang.label": "Bahasa",

            "page.crm.title": "Inbox CRM",
            "page.crm.subtitle": "Kelola percakapan masuk, beri label, status, dan catatan.",
            "placeholder.crmSearch": "Cari nama / nomor...",
            "placeholder.crmNotes": "Catatan internal...",
            "placeholder.crmReply": "Ketik balasan...",
            "crm.label.all": "Semua Label",
            "crm.label.none": "Tanpa Label",
            "crm.label.lead": "Lead",
            "crm.label.customer": "Pelanggan",
            "crm.label.followup": "Follow-up",
            "crm.status.all": "Semua Status",
            "crm.status.new": "Baru",
            "crm.status.open": "Diproses",
            "crm.status.done": "Selesai",
            "crm.empty": "Pilih kontak di samping untuk mulai membalas pesan.",
            "crm.empty.title": "Belum ada percakapan dibuka",
            "crm.conversations": "Percakapan",
            "crm.detail": "ℹ️ Detail",
            "crm.field.label": "Label",
            "crm.field.status": "Status",
            "crm.field.notes": "Catatan",
            "crm.saveDetail": "💾 Simpan Detail",
            "crm.send": "Kirim",
            "crm.noContacts": "Belum ada percakapan.",
            "crm.loadFailed": "Gagal memuat percakapan.",
            "crm.sendFailed": "Gagal mengirim balasan.",
            "crm.detailSaved": "Detail tersimpan.",
            "crm.saveFailed": "Gagal menyimpan.",

            "page.connection.title": "Koneksi",
            "page.connection.subtitle": "Buat sesi, pindai kode QR, dan kelola perangkat WhatsApp yang tertaut.",
            "stat.totalSessions": "Total Sesi",
            "stat.connected": "Terhubung",
            "stat.pending": "Menunggu",
            "card.newSession": "➕ Sesi Baru",
            "label.sessionId": "ID Sesi",
            "placeholder.sessionId": "mis. perangkat-utama",
            "btn.createConnect": "Buat & Hubungkan",
            "card.activeSessions": "🔌 Sesi Aktif",
            "empty.noSessions": "Belum ada sesi. Buat satu untuk memulai.",
            "btn.logoutSession": "Keluar",
            "confirm.logoutSession": "Keluarkan sesi \"{id}\"? Ini akan memutus tautan perangkat.",
            "toast.loggingOut": "Mengeluarkan {id}...",
            "toast.sessionIdRequired": "ID Sesi wajib diisi",
            "toast.sessionIdUsed": "ID Sesi sudah digunakan",
            "toast.sessionRemoved": "Sesi {id} dihapus",
            "qr.hint": "Pindai dengan WhatsApp → Perangkat Tertaut",

            "status.ready": "Terhubung",
            "status.authenticated": "Mengautentikasi",
            "status.qr": "Pindai QR",
            "status.initializing": "Memulai",
            "status.disconnected": "Terputus",
            "status.offline": "Luring",
            "status.error": "Kesalahan",
            "status.auth_failure": "Autentikasi Gagal",

            "page.broadcast.title": "Siaran",
            "page.broadcast.subtitle": "Kirim pesan atau media ke banyak nomor dengan jeda aman di antara tiap pengiriman.",
            "stat.totalSent": "Total Terkirim",
            "stat.success": "Berhasil",
            "stat.failed": "Gagal",
            "card.composeMessage": "📤 Tulis Pesan",
            "label.senderSession": "Sesi Pengirim",
            "opt.loadingSessions": "Memuat sesi...",
            "opt.noConnectedSession": "Tidak ada sesi terhubung",
            "opt.selectSender": "Pilih sesi pengirim",
            "opt.loadSendersFailed": "Gagal memuat sesi",
            "label.recipients": "Nomor Penerima",
            "label.messageTemplate": "Templat Pesan",
            "opt.noTemplate": "— Tanpa templat —",
            "label.message": "Pesan",
            "placeholder.message": "Tulis pesan Anda... *tebal* _miring_",
            "label.attachImage": "Lampirkan Gambar (opsional)",
            "dropzone.text": "Seret & lepas gambar di sini, atau klik untuk memilih",
            "btn.removeImage": "🗑️ Hapus Gambar",
            "label.delay": "Jeda Antar Pesan (detik)",
            "btn.sendBroadcast": "📢 Kirim Siaran",
            "btn.sending": "Mengirim...",
            "card.livePreview": "👁️ Pratinjau Langsung",
            "wa.broadcastName": "Siaran WhatsApp",
            "wa.online": "daring",
            "wa.previewPlaceholder": "Pesan Anda akan tampil di sini...",
            "card.broadcastResult": "📊 Hasil Siaran",
            "card.usage7days": "📈 Penggunaan — 7 Hari Terakhir",
            "chart.success": "Berhasil",
            "chart.failed": "Gagal",
            "toast.imageOnly": "Hanya berkas gambar yang diperbolehkan",
            "toast.selectSender": "Pilih sesi pengirim yang terhubung",
            "toast.uploadFailed": "Unggahan gagal",
            "toast.broadcastFailed": "Siaran gagal",
            "result.sentSummary": "{ok} dari {total} terkirim.",
            "result.errorOccurred": "Terjadi kesalahan.",
            "dz.templateImage": "Gambar templat terlampir",

            "page.templates.title": "Templat Pesan",
            "page.templates.subtitle": "Buat pesan yang dapat dipakai ulang dan dipilih saat menyusun siaran.",
            "card.newTemplate": "➕ Templat Baru",
            "label.title": "Judul",
            "placeholder.templateTitle": "mis. Sapaan Promo",
            "label.messageBody": "Isi Pesan",
            "placeholder.templateBody": "Tulis isi templat... *tebal* _miring_",
            "label.imageOptional": "Gambar (opsional)",
            "btn.saveTemplate": "💾 Simpan Templat",
            "card.savedTemplates": "📋 Templat Tersimpan",
            "wa.templateName": "Templat WhatsApp",
            "empty.noTemplates": "Belum ada templat.",
            "toast.titleBodyRequired": "Judul dan isi wajib diisi",
            "toast.uploadImageFailed": "Gagal mengunggah gambar",
            "toast.saveTemplateFailed": "Gagal menyimpan templat",
            "toast.templateSaved": "Templat tersimpan",
            "toast.templateDeleted": "Templat dihapus",
            "toast.deleteTemplateFailed": "Gagal menghapus templat",
            "confirm.deleteTemplate": "Hapus templat ini?",

            "nav.bot": "Bot",
            "label.buttons": "Tombol (menu angka)",
            "buttons.hint": "Penerima membalas dengan angka untuk memilih. Tombol Alur lanjut ke kata kunci lain; tombol URL menampilkan tautan. Maksimal 5 tombol.",
            "placeholder.buttonLabel": "Label tombol, mis. Ya",
            "placeholder.buttonGoto": "Kata kunci alur lanjutan, mis. produk",
            "placeholder.buttonUrl": "https://contoh.com",
            "button.type.flow": "Alur",
            "button.type.url": "URL",
            "btn.addButton": "➕ Tambah Tombol",
            "btn.remove": "Hapus",

            "page.bot.title": "Bot WhatsApp",
            "page.bot.subtitle": "Buat balasan otomatis bercabang dengan kata kunci, menu angka, dan gambar.",
            "card.botActivation": "🤖 Aktivasi Bot per Sesi",
            "bot.activation.hint": "Aktifkan bot agar sesi membalas pesan masuk secara otomatis.",
            "card.newFlow": "➕ Alur Baru",
            "label.flowSession": "Sesi",
            "label.flowName": "Nama Alur",
            "placeholder.flowName": "mis. Menu Utama",
            "label.triggerType": "Pemicu",
            "trigger.keyword": "Kata Kunci",
            "trigger.welcome": "Sapaan (pesan pertama)",
            "trigger.fallback": "Cadangan (tak cocok)",
            "label.keyword": "Kata Kunci",
            "placeholder.keyword": "mis. menu, halo",
            "label.matchMode": "Kecocokan",
            "match.contains": "Mengandung",
            "match.exact": "Persis",
            "label.replyBody": "Balasan",
            "placeholder.replyBody": "Tulis balasan bot... *tebal* _miring_",
            "btn.saveFlow": "💾 Simpan Alur",
            "card.savedFlows": "📋 Alur Tersimpan",
            "card.flowCanvas": "🧩 Peta Alur",
            "flowCanvas.hint": "Setiap kartu adalah satu alur. Tarik untuk menata; garis menghubungkan tombol ke alur tujuannya.",
            "empty.noFlows": "Belum ada alur.",
            "empty.noSessionsForBot": "Belum ada sesi. Buat sesi dulu di halaman Koneksi.",
            "opt.selectSession": "Pilih sesi",
            "bot.on": "Aktif",
            "bot.off": "Nonaktif",
            "toast.flowSaved": "Alur tersimpan",
            "toast.flowDeleted": "Alur dihapus",
            "toast.flowSaveFailed": "Gagal menyimpan alur",
            "toast.flowFieldsRequired": "Sesi, nama, dan balasan wajib diisi",
            "toast.keywordRequired": "Kata kunci wajib untuk pemicu kata kunci",
            "toast.botToggled": "Status bot diperbarui",
            "confirm.deleteFlow": "Hapus alur ini?",

            "login.title": "WA Gateway",
            "login.subtitle": "Masuk untuk mengelola sesi dan siaran WhatsApp Anda.",
            "login.google": "Lanjutkan dengan Google"
        },
        en: {
            "brand.subtitle": "Multi-Session API",
            "nav.connection": "Connection",
            "nav.crm": "CRM",
            "nav.broadcast": "Broadcast",
            "nav.templates": "Templates",
            "user.logout": "Sign out",
            "lang.label": "Language",

            "page.crm.title": "CRM Inbox",
            "page.crm.subtitle": "Manage incoming conversations with labels, status, and notes.",
            "placeholder.crmSearch": "Search name / number...",
            "placeholder.crmNotes": "Internal notes...",
            "placeholder.crmReply": "Type a reply...",
            "crm.label.all": "All Labels",
            "crm.label.none": "No Label",
            "crm.label.lead": "Lead",
            "crm.label.customer": "Customer",
            "crm.label.followup": "Follow-up",
            "crm.status.all": "All Status",
            "crm.status.new": "New",
            "crm.status.open": "In Progress",
            "crm.status.done": "Done",
            "crm.empty": "Pick a contact on the left to start replying.",
            "crm.empty.title": "No conversation open yet",
            "crm.conversations": "Conversations",
            "crm.detail": "ℹ️ Details",
            "crm.field.label": "Label",
            "crm.field.status": "Status",
            "crm.field.notes": "Notes",
            "crm.saveDetail": "💾 Save Details",
            "crm.send": "Send",
            "crm.noContacts": "No conversations yet.",
            "crm.loadFailed": "Failed to load conversation.",
            "crm.sendFailed": "Failed to send reply.",
            "crm.detailSaved": "Details saved.",
            "crm.saveFailed": "Failed to save.",

            "page.connection.title": "Connection",
            "page.connection.subtitle": "Create sessions, scan QR codes, and manage linked WhatsApp devices.",
            "stat.totalSessions": "Total Sessions",
            "stat.connected": "Connected",
            "stat.pending": "Pending",
            "card.newSession": "➕ New Session",
            "label.sessionId": "Session ID",
            "placeholder.sessionId": "e.g. main-device",
            "btn.createConnect": "Create & Connect",
            "card.activeSessions": "🔌 Active Sessions",
            "empty.noSessions": "No sessions yet. Create one to get started.",
            "btn.logoutSession": "Sign out",
            "confirm.logoutSession": "Sign out session \"{id}\"? This will unlink the device.",
            "toast.loggingOut": "Signing out {id}...",
            "toast.sessionIdRequired": "Session ID is required",
            "toast.sessionIdUsed": "Session ID already in use",
            "toast.sessionRemoved": "Session {id} removed",
            "qr.hint": "Scan with WhatsApp → Linked Devices",

            "status.ready": "Connected",
            "status.authenticated": "Authenticating",
            "status.qr": "Scan QR",
            "status.initializing": "Starting",
            "status.disconnected": "Disconnected",
            "status.offline": "Offline",
            "status.error": "Error",
            "status.auth_failure": "Auth Failed",

            "page.broadcast.title": "Broadcast",
            "page.broadcast.subtitle": "Send messages or media to many numbers with a safe delay between each send.",
            "stat.totalSent": "Total Sent",
            "stat.success": "Success",
            "stat.failed": "Failed",
            "card.composeMessage": "📤 Compose Message",
            "label.senderSession": "Sender Session",
            "opt.loadingSessions": "Loading sessions...",
            "opt.noConnectedSession": "No connected sessions",
            "opt.selectSender": "Select a sender session",
            "opt.loadSendersFailed": "Failed to load sessions",
            "label.recipients": "Recipient Numbers",
            "label.messageTemplate": "Message Template",
            "opt.noTemplate": "— No template —",
            "label.message": "Message",
            "placeholder.message": "Write your message... *bold* _italic_",
            "label.attachImage": "Attach Image (optional)",
            "dropzone.text": "Drag & drop an image here, or click to choose",
            "btn.removeImage": "🗑️ Remove Image",
            "label.delay": "Delay Between Messages (seconds)",
            "btn.sendBroadcast": "📢 Send Broadcast",
            "btn.sending": "Sending...",
            "card.livePreview": "👁️ Live Preview",
            "wa.broadcastName": "WhatsApp Broadcast",
            "wa.online": "online",
            "wa.previewPlaceholder": "Your message will appear here...",
            "card.broadcastResult": "📊 Broadcast Result",
            "card.usage7days": "📈 Usage — Last 7 Days",
            "chart.success": "Success",
            "chart.failed": "Failed",
            "toast.imageOnly": "Only image files are allowed",
            "toast.selectSender": "Select a connected sender session",
            "toast.uploadFailed": "Upload failed",
            "toast.broadcastFailed": "Broadcast failed",
            "result.sentSummary": "{ok} of {total} sent.",
            "result.errorOccurred": "An error occurred.",
            "dz.templateImage": "Template image attached",

            "page.templates.title": "Message Templates",
            "page.templates.subtitle": "Create reusable messages to pick from when composing a broadcast.",
            "card.newTemplate": "➕ New Template",
            "label.title": "Title",
            "placeholder.templateTitle": "e.g. Promo Greeting",
            "label.messageBody": "Message Body",
            "placeholder.templateBody": "Write the template body... *bold* _italic_",
            "label.imageOptional": "Image (optional)",
            "btn.saveTemplate": "💾 Save Template",
            "card.savedTemplates": "📋 Saved Templates",
            "wa.templateName": "WhatsApp Template",
            "empty.noTemplates": "No templates yet.",
            "toast.titleBodyRequired": "Title and body are required",
            "toast.uploadImageFailed": "Failed to upload image",
            "toast.saveTemplateFailed": "Failed to save template",
            "toast.templateSaved": "Template saved",
            "toast.templateDeleted": "Template deleted",
            "toast.deleteTemplateFailed": "Failed to delete template",
            "confirm.deleteTemplate": "Delete this template?",

            "nav.bot": "Bot",
            "label.buttons": "Buttons (numbered menu)",
            "buttons.hint": "Recipients reply with a number to choose. Flow buttons jump to another keyword; URL buttons show a link. Maximum 5 buttons.",
            "placeholder.buttonLabel": "Button label, e.g. Yes",
            "placeholder.buttonGoto": "Next-flow keyword, e.g. products",
            "placeholder.buttonUrl": "https://example.com",
            "button.type.flow": "Flow",
            "button.type.url": "URL",
            "btn.addButton": "➕ Add Button",
            "btn.remove": "Remove",

            "page.bot.title": "WhatsApp Bot",
            "page.bot.subtitle": "Build branching auto-replies with keywords, numbered menus, and images.",
            "card.botActivation": "🤖 Bot Activation per Session",
            "bot.activation.hint": "Turn the bot on so a session replies to incoming messages automatically.",
            "card.newFlow": "➕ New Flow",
            "label.flowSession": "Session",
            "label.flowName": "Flow Name",
            "placeholder.flowName": "e.g. Main Menu",
            "label.triggerType": "Trigger",
            "trigger.keyword": "Keyword",
            "trigger.welcome": "Welcome (first message)",
            "trigger.fallback": "Fallback (no match)",
            "label.keyword": "Keyword",
            "placeholder.keyword": "e.g. menu, hello",
            "label.matchMode": "Match",
            "match.contains": "Contains",
            "match.exact": "Exact",
            "label.replyBody": "Reply",
            "placeholder.replyBody": "Write the bot reply... *bold* _italic_",
            "btn.saveFlow": "💾 Save Flow",
            "card.savedFlows": "📋 Saved Flows",
            "card.flowCanvas": "🧩 Flow Map",
            "flowCanvas.hint": "Each card is one flow. Drag to arrange; lines connect a button to its target flow.",
            "empty.noFlows": "No flows yet.",
            "empty.noSessionsForBot": "No sessions yet. Create one on the Connection page first.",
            "opt.selectSession": "Select a session",
            "bot.on": "On",
            "bot.off": "Off",
            "toast.flowSaved": "Flow saved",
            "toast.flowDeleted": "Flow deleted",
            "toast.flowSaveFailed": "Failed to save flow",
            "toast.flowFieldsRequired": "Session, name and reply are required",
            "toast.keywordRequired": "Keyword is required for keyword triggers",
            "toast.botToggled": "Bot status updated",
            "confirm.deleteFlow": "Delete this flow?",

            "login.title": "WA Gateway",
            "login.subtitle": "Sign in to manage your WhatsApp sessions and broadcasts.",
            "login.google": "Continue with Google"
        }
    };

    const allowedLangs = ["id", "en"];

    function readLang()
    {
        const stored = localStorage.getItem("lang");
        return allowedLangs.includes(stored) ? stored : "id";
    }

    let currentLang = readLang();

    function translate(key, vars)
    {
        const table = dictionaries[currentLang] || dictionaries.id;
        let text = table[key];
        if (text == null)
        {
            return key;
        }

        if (vars)
        {
            Object.keys(vars).forEach(function (name)
            {
                text = text.split("{" + name + "}").join(String(vars[name]));
            });
        }

        return text;
    }

    function applyStaticText()
    {
        document.querySelectorAll("[data-i18n]").forEach(function (el)
        {
            el.textContent = translate(el.getAttribute("data-i18n"));
        });

        document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el)
        {
            el.setAttribute("placeholder", translate(el.getAttribute("data-i18n-placeholder")));
        });

        document.querySelectorAll("[data-i18n-html]").forEach(function (el)
        {
            el.textContent = translate(el.getAttribute("data-i18n-html"));
        });

        document.documentElement.setAttribute("lang", currentLang);
    }

    function setLang(lang)
    {
        if (!allowedLangs.includes(lang))
        {
            return;
        }

        currentLang = lang;
        localStorage.setItem("lang", lang);
        applyStaticText();
        syncToggle();
        document.dispatchEvent(new CustomEvent("languagechange", { detail: { lang: lang } }));
    }

    function syncToggle()
    {
        document.querySelectorAll("[data-lang-btn]").forEach(function (btn)
        {
            const active = btn.getAttribute("data-lang-btn") === currentLang;
            btn.classList.toggle("active", active);
        });
    }

    function bindToggle()
    {
        document.querySelectorAll("[data-lang-btn]").forEach(function (btn)
        {
            btn.addEventListener("click", function ()
            {
                setLang(btn.getAttribute("data-lang-btn"));
            });
        });
        syncToggle();
    }

    window.i18n = {
        t: translate,
        getLang: function () { return currentLang; },
        setLang: setLang,
        apply: applyStaticText
    };

    document.addEventListener("DOMContentLoaded", function ()
    {
        applyStaticText();
        bindToggle();
    });
})();
