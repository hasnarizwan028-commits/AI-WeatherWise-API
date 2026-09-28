/**
 * AI SERVICE INTEGRATION
 * Uses the official Google Gemini SDK (@google/genai) to turn raw weather
 * metrics into natural language summaries and personalised recommendations.
 *
 * FALLBACK MODE: if no GEMINI_API_KEY is configured (or Gemini is
 * unreachable) the service generates a deterministic, template-based
 * insight so the API stays 100% functional offline / key-less.
 */
const { GoogleGenAI } = require('@google/genai');

const SYSTEM_INSTRUCTION = `You are WeatherWise, a friendly and concise weather assistant.
You receive live weather metrics for a city and must produce helpful, natural language guidance.
Rules:
- Never invent data that was not supplied. If a metric is missing, ignore it.
- Keep the summary to 2-3 short sentences.
- Give 3 to 5 specific, actionable recommendations (clothing, travel, outdoor activity, health).
- Use simple English suitable for a college student. No markdown headers, no hashtags.`;

let client = null;
const getClient = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!client) client = new GoogleGenAI({ apiKey: key });
  return client;
};

const buildPrompt = (weather, task) => {
  const c = weather.current || {};
  const base = [
    `City: ${weather.location?.city || 'Unknown'}, ${weather.location?.country || ''}`,
    `Temperature: ${c.temperature} ${weather.units.temperature} (feels like ${c.apparentTemperature})`,
    `Humidity: ${c.humidity}%`,
    `Wind: ${c.windSpeed} ${weather.units.windSpeed}`,
    `Precipitation: ${c.precipitation} mm`,
    `Pressure: ${c.pressure} ${weather.units.pressure}`,
    `Cloud cover: ${c.cloudCover}%`,
    `Condition: ${c.condition || 'unknown'}`,
  ];

  if (task === 'recommendation') {
    const days = (weather.forecast || [])
      .slice(0, 3)
      .map(
        (d) =>
          `- ${d.date}: ${d.condition || 'n/a'}, ${d.tempMin} to ${d.tempMax} ${weather.units.temperature}, rain chance ${d.precipitationProbability ?? 'n/a'}%`
      )
      .join('\n');
    return `Based on the CURRENT conditions and the 3 day FORECAST below, suggest what the user should wear, carry and do today.\n\nCURRENT:\n${base.join(
      '\n'
    )}\n\nFORECAST:\n${days || 'No forecast data available.'}\n\nAnswer in this exact format:\nSUMMARY: <one sentence>\nWHAT TO WEAR: <one line>\nACTIVITY IDEAS: <3 short bullets separated by ;>\nSAFETY NOTE: <one line>`;
  }

  if (task === 'activity') {
    return `Given the conditions below, list 4 outdoor activity ideas that suit this weather, plus one activity for indoor time. Keep each idea under 12 words.\n\n${base.join('\n')}`;
  }

  const days = (weather.forecast || [])
    .map((d) => `- ${d.date}: ${d.condition}, ${d.tempMin}/${d.tempMax} ${weather.units.temperature}, rain ${d.precipitationProbability ?? 0}%`)
    .join('\n');

  return `Write a short human-friendly weather summary for these readings, then one line of advice.\n\n${base.join(
    '\n'
  )}\n\nNEXT DAYS:\n${days || 'No forecast data available.'}\n\nAnswer in this exact format:\nSUMMARY: <2-3 sentences>\nADVICE: <one line>`;
};

/* -------------------- Deterministic fallback -------------------- */
const localFallback = (weather, task) => {
  const c = weather.current || {};
  const t = Number(c.temperature ?? 0);
  const rain = Number(c.precipitation ?? 0);
  const wind = Number(c.windSpeed ?? 0);
  const cond = c.condition || 'current conditions';

  let wear;
  if (t >= 30) wear = 'Light cotton clothes, sunglasses and sunscreen.';
  else if (t >= 22) wear = 'A comfortable t-shirt with light trousers.';
  else if (t >= 14) wear = 'A light jacket or hoodie over a shirt.';
  else if (t >= 5) wear = 'A warm sweater plus a jacket; carry a scarf.';
  else wear = 'A heavy winter coat, gloves and a woollen cap.';

  if (rain > 0 || /rain|drizzle|shower/i.test(cond)) wear += ' Carry an umbrella.';
  if (wind > 30) wear += ' It is windy - secure loose items.';

  const activities = [];
  if (t >= 15 && t <= 28 && rain === 0) activities.push('morning cycling', 'a park walk', 'outdoor cricket', 'visiting a café terrace');
  else if (t > 28) activities.push('an early-morning walk', 'indoor games', 'swimming', 'reading at a park bench');
  else activities.push('indoor board games', 'a café visit', 'a short drive to a viewpoint', 'reading a book indoors');

  const summary = `Right now ${weather.location?.city || 'this location'} is experiencing ${cond.toLowerCase()} at ${t}${weather.units.temperature} with ${c.humidity}% humidity and winds of ${wind} ${weather.units.windSpeed}. ${
    rain > 0 ? 'Precipitation is being recorded, so keep rain protection handy.' : 'No precipitation is expected in the current reading.'
  }`;

  if (task === 'recommendation') {
    return {
      source: 'fallback',
      summary,
      wear,
      activities: activities.slice(0, 3),
      safety: c.isDay === false ? 'Visibility is lower after dark - travel carefully.' : 'Stay hydrated and enjoy the day.',
    };
  }

  if (task === 'activity') {
    return { source: 'fallback', ideas: [...activities.slice(0, 3), 'indoor time: reading or a movie'] };
  }

  return { source: 'fallback', summary, advice: wear };
};

/* -------------------- Public API -------------------- */
const isAiEnabled = () => Boolean(process.env.GEMINI_API_KEY);

const generateInsight = async (weather, task = 'summary') => {
  const prompt = buildPrompt(weather, task);
  const ai = getClient();

  if (!ai) {
    return { ...localFallback(weather, task), note: 'GEMINI_API_KEY not configured - fallback mode active.' };
  }

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.7, maxOutputTokens: 600 },
    });

    const text = (response?.text || '').trim();
    if (!text) throw new Error('Empty response from Gemini');

    return { source: 'gemini', model, raw: text, ...parseGemini(text, weather, task) };
  } catch (error) {
    console.warn(`[AI] Gemini call failed -> ${error.message}. Using fallback.`);
    return { ...localFallback(weather, task), note: `Gemini unavailable (${error.message}) - fallback mode active.` };
  }
};

const parseGemini = (text, weather, task) => {
  const grab = (label) => {
    const m = text.match(new RegExp(`${label}\\s*:\\s*([^\\n]+)`, 'i'));
    return m ? m[1].trim() : null;
  };

  if (task === 'recommendation') {
    const acts = grab('ACTIVITY IDEAS');
    return {
      summary: grab('SUMMARY') || text,
      wear: grab('WHAT TO WEAR'),
      activities: acts ? acts.split(/[;\-•]/).map((a) => a.replace(/^[\s\-•*]+/, '').trim()).filter(Boolean) : [],
      safety: grab('SAFETY NOTE'),
    };
  }

  if (task === 'activity') {
    return { ideas: text.split(/\n|[;\-•]/).map((a) => a.replace(/^[\s\-•*\d.]+/, '').trim()).filter(Boolean).slice(0, 5) };
  }

  return { summary: grab('SUMMARY') || text, advice: grab('ADVICE') };
};

module.exports = { generateInsight, isAiEnabled, SYSTEM_INSTRUCTION };
