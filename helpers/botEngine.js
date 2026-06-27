const parseButtons = function (raw)
{
    if (!raw)
    {
        return [];
    }

    try
    {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch (err)
    {
        return [];
    }
};

const buildMenuText = function (body, buttons)
{
    if (!buttons.length)
    {
        return body;
    }

    const lines = buttons.map(function (btn, index)
    {
        if (btn.type === "url" && btn.url)
        {
            return `${btn.label}: ${btn.url}`;
        }

        return `${index + 1}. ${btn.label}`;
    });

    return `${body}\n\n${lines.join("\n")}`;
};

const buildPoll = function (buttons)
{
    return buttons
        .filter((btn) => btn.type !== "url" && btn.goto && btn.label)
        .map((btn) => ({ label: btn.label.trim(), goto: btn.goto.trim() }));
};

const findByKeyword = function (flows, keyword)
{
    const target = (keyword || "").trim().toLowerCase();

    if (!target)
    {
        return null;
    }

    return flows.find(
        (flow) => flow.trigger_type === "keyword" && (flow.keyword || "").trim().toLowerCase() === target
    ) || null;
};

const matchFlow = function (flows, text, lastFlow)
{
    const message = (text || "").trim();
    const lower = message.toLowerCase();
    const replyNumber = parseInt(message, 10);

    if (lastFlow && /^\d+$/.test(message))
    {
        const buttons = parseButtons(lastFlow.buttons);

        if (replyNumber >= 1 && replyNumber <= buttons.length)
        {
            const selected = buttons[replyNumber - 1];

            if (selected.type !== "url")
            {
                return findByKeyword(flows, selected.goto);
            }

            return null;
        }
    }

    for (const flow of flows)
    {
        if (flow.trigger_type !== "keyword" || !flow.keyword)
        {
            continue;
        }

        const keyword = flow.keyword.trim().toLowerCase();

        if (flow.match_mode === "exact" && lower === keyword)
        {
            return flow;
        }

        if (flow.match_mode === "contains" && keyword && lower.includes(keyword))
        {
            return flow;
        }
    }

    return flows.find((flow) => flow.trigger_type === "fallback") || null;
};

const matchPollOption = function (flows, lastFlow, optionName)
{
    if (!lastFlow)
    {
        return null;
    }

    const buttons = parseButtons(lastFlow.buttons);
    const selected = buttons.find(
        (btn) => btn.type !== "url" && (btn.label || "").trim() === (optionName || "").trim()
    );

    if (!selected)
    {
        return null;
    }

    return findByKeyword(flows, selected.goto);
};

const findWelcome = function (flows)
{
    return flows.find((flow) => flow.trigger_type === "welcome") || null;
};

module.exports = {
    parseButtons,
    buildMenuText,
    buildPoll,
    matchFlow,
    matchPollOption,
    findWelcome,
};
