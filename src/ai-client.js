/**
 * GenAI Integration Module for Smadiums.
 * Implements a hybrid client supporting Gemini API calls and high-fidelity mock fallback.
 * @module ai-client
 */

import { getState } from './state.js';

/** In-memory cache for AI queries to prevent duplicate network calls and reduce latency. */
const aiResponseCache = new Map();

/**
 * Request generation from Gemini API or local mock engine.
 * Falls back to a high-fidelity offline rules engine when no API key is configured
 * or when the API call fails.
 * @param {'chat' | 'incident' | 'sustainability'} type - Content generation type
 * @param {Record<string, any>} payload - Context and input parameters
 * @returns {Promise<string>} Generated text content
 */
export async function generateContent(type, payload) {
  const cacheKey = `${type}_${JSON.stringify(payload)}`;
  if (aiResponseCache.has(cacheKey)) {
    console.log(`[Cache Hit] Returning cached AI response for ${type}`);
    return aiResponseCache.get(cacheKey);
  }

  const settings = getState().settings;
  const apiKey = settings.geminiApiKey;
  let response = '';

  if (apiKey && apiKey.trim() !== '') {
    try {
      response = await callGeminiAPI(apiKey, type, payload);
    } catch (e) {
      console.error('Gemini API call failed, falling back to local engine:', e);
      response = generateLocalMock(type, payload) + '\n\n*(Notice: Fell back to offline AI engine due to API connection issue)*';
    }
  } else {
    // Return high-fidelity local mock engine output
    response = await new Promise((resolve) => {
      setTimeout(() => {
        resolve(generateLocalMock(type, payload));
      }, 800); // Simulate network latency
    });
  }

  // Save in cache
  aiResponseCache.set(cacheKey, response);
  return response;
}

/**
 * Build a context-specific prompt for the Gemini API.
 * @param {'chat' | 'incident' | 'sustainability'} type - Content generation type
 * @param {Record<string, any>} payload - Context data for prompt interpolation
 * @returns {string} Constructed prompt string
 */
function buildPrompt(type, payload) {
  switch (type) {
    case 'chat':
      return `You are the official FIFA World Cup 2026 Stadium GenAI Concierge.
User Message: "${payload.message}"
Current Language: "${payload.language || 'en'}"
Stadium status: Seating capacity 82,500. Matches are active. 
Provide a helpful, polite, structured response matching their language. Keep it detailed but concise.
Use markdown bullet points for routes or details. Focus on safety, ease of movement, and high accessibility.`;

    case 'incident':
      return `You are the FIFA World Cup 2026 Operations Real-Time Decision Support AI.
An incident has occurred in the stadium:
Zone: ${payload.zone}
Incident Title: ${payload.title}
Description: ${payload.description}
Severity: ${payload.severity}

Generate a tactical Response Plan containing:
1. **IMMEDIATE DISPATCH ACTION**: What stadium security/volunteers must do.
2. **FAN REDIRECT ROUTING**: How to reroute or guide spectators safely.
3. **MULTILINGUAL PUBLIC BROADCAST**: A draft announcement in English and Spanish (and/or French) to push to fans via the app.
4. **STAFF TAILORED ALERT**: Specific directive text for volunteer handsets.
Make the layout highly structured with clear sections.`;

    case 'sustainability':
      return `You are the FIFA Green Energy & Sustainability Advisor.
Current Stadium Telemetry:
- Occupancy: ${payload.occupancy} fans
- Solar/Wind Grid Energy: ${payload.greenEnergyUsage}%
- Waste Recycling Rate: ${payload.wasteRecyclingRate}%
- Water Saved: ${payload.waterSavedLitres} Litres

Provide 3 highly specific, real-time action recommendations to improve resource conservation and waste diversion rates right now during the match. Format as structured bullet points.`;

    default:
      return '';
  }
}

/** Gemini API endpoint template. */
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Call the Gemini 1.5 Flash API to generate text content.
 * @param {string} apiKey - Gemini API key
 * @param {'chat' | 'incident' | 'sustainability'} type - Content generation type
 * @param {Record<string, any>} payload - Context data for prompt building
 * @returns {Promise<string>} Generated text from Gemini
 * @throws {Error} On HTTP errors or unexpected response structures
 */
async function callGeminiAPI(apiKey, type, payload) {
  const prompt = buildPrompt(type, payload);
  const endpoint = `${GEMINI_API_URL}?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }

  const data = await response.json();
  const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!generatedText) {
    throw new Error('Invalid response structure from Gemini API');
  }
  return generatedText;
}

/**
 * Local rule-based high-fidelity mock AI generator.
 * Produces structured, realistic output matching live Gemini API quality
 * for offline development and API fallback scenarios.
 * @param {'chat' | 'incident' | 'sustainability'} type - Content generation type
 * @param {Record<string, any>} payload - Context data
 * @returns {string} Generated mock response text
 */
function generateLocalMock(type, payload) {
  if (type === 'chat') {
    const msg = payload.message.toLowerCase();
    
    // Check language preferences
    const isSpanish = msg.includes('espanol') || msg.includes('hola') || msg.includes('gracias') || msg.includes('donde') || msg.includes('baño');
    const isFrench = msg.includes('bonjour') || msg.includes('merci') || msg.includes('où') || msg.includes('siège');
    
    if (isSpanish) {
      if (msg.includes('baño') || msg.includes('aseo') || msg.includes('sanitario')) {
        return `**Asistente Inteligente FIFA:**
Los baños más cercanos en su sección están ubicados en:
* **Sector 100-120:** Gire a la izquierda al salir del túnel, al lado de la Concesión 2 (Espera: 5 minutos).
* **Baños Accesibles (Silla de Ruedas):** Directamente frente a la Sección 112 (Gire a la derecha).
* Todos los aseos disponen de cambiadores para bebés y grifos automáticos de bajo consumo.`;
      }
      if (msg.includes('comida') || msg.includes('hambre') || msg.includes('concesion') || msg.includes('comer')) {
        return `**Asistente Inteligente FIFA:**
Tenemos varias opciones gastronómicas disponibles hoy:
* **North Eats (Concesión 1):** Hamburguesas, perritos calientes y bebidas. (Fila corta: ~8 min de espera).
* **Azteca Grill (Concession 3):** Tacos y comida mexicana. (Fila moderada: ~25 min de espera).
* **Green Bites (Concession 4):** Opciones vegetarianas, veganas y ensaladas saludables. (Fila muy corta: ~5 min de espera).
* *Consejo:* Puede realizar un pedido de recogida rápida desde su asiento mediante la aplicación.`;
      }
      if (msg.includes('asiento') || msg.includes('donde esta') || msg.includes('silla') || msg.includes('seccion')) {
        return `**Asistente Inteligente FIFA:**
Para guiarle a su asiento de manera óptima:
1. Diríjase al **Nivel de Conexión Principal** a través del pasillo más cercano.
2. Siga los letreros de color **Verde Azulado (Teal)** correspondientes al anillo inferior.
3. Si su boleto indica una sección entre 100 y 140, ingrese por la **Puerta Este B**.
4. ¿Necesita asistencia de accesibilidad o elevador? Solicite asistencia a cualquier voluntario con chaleco verde o diríjase al ascensor de la sección 115.`;
      }
      return `**Asistente Inteligente FIFA:**
¡Hola! Bienvenidos al Estadio de la Copa Mundial de la FIFA 2026. Estoy aquí para guiarle. Puedo ayudarle a encontrar su asiento, verificar tiempos de espera para comida y aseos, o informarle sobre accesibilidad y transporte. ¿Qué necesita consultar?`;
    }

    if (isFrench) {
      return `**Assistant FIFA IA:**
Bonjour! Bienvenue au stade de la Coupe du Monde de la FIFA 2026. Je suis là pour vous aider.
* **Siège & Secteur:** Veuillez scanner votre billet ou entrer votre numéro de secteur pour recevoir un itinéraire détaillé.
* **Options Accessibilité:** Ascenseurs disponibles au Secteur 115. Boutons de secours et assistance aux personnes à mobilité réduite.
* **Restauration:** Le stand "Green Bites" (Secteur 104) propose des repas végétariens chauds avec seulement 5 min d'attente.
Quelle est votre question aujourd'hui?`;
    }

    // Default English Responses
    if (msg.includes('wheelchair') || msg.includes('accessible') || msg.includes('disabled') || msg.includes('elev') || msg.includes('lift')) {
      return `### ♿ Accessibility Services & Routing
We are committed to making FIFA 2026 welcoming for everyone. Here are your accessible services:
* **Elevator Access:** Located directly behind **Sector 115** and **Sector 138** on the main concourse.
* **Accessible Restrooms:** Every major restroom hub includes a widened ADA-compliant stall. The closest dedicated all-gender accessible bathroom is at **Sector 112**.
* **Audio Descriptive Commentary (ADC):** Available for visually impaired fans. Tune your personal radio to **FM 98.2** inside the stadium bowl.
* **Sensory Room:** A calm space is available at **Suite level, Sector 201** for fans who need sensory decompression. Please speak to staff at Sector 112 for access badges.`;
    }
    if (msg.includes('seat') || msg.includes('gate') || msg.includes('find') || msg.includes('map') || msg.includes('where')) {
      return `### 📍 Wayfinding & Gate Routing Guide
Based on stadium occupancy and crowd density, here is your route recommendation:
* **Entrance Gate:** Use **Gate B (East)** if you are seated in Sectors 100-120. Gate B wait times are currently **22 minutes**.
* **Bypassing Crowds:** Avoid Gate C, as wait times are currently **52 minutes** due to technical scanner inspections.
* **To Seating Sector:** From Gate B, take the ramp up to the Main Concourse level, turn left, and walk past concession #2. Sector 108 will be on your right.
* *Need Assistance?* Look for volunteers wearing **bright green vests** or proceed to the Guest Services Pod at Gate A.`;
    }
    if (msg.includes('food') || msg.includes('drink') || msg.includes('beer') || msg.includes('eat') || msg.includes('concess') || msg.includes('queue') || msg.includes('line')) {
      return `### 🍔 Food & Beverage Line Optimization
Halftime queues are fluctuating. Here is the current queue intelligence:
1. **Green Bites (Concession 4):** Healthy, vegetarian/vegan bowls, wraps, and bottled water. Wait time: **5 minutes** (Recommended).
2. **North Eats (Concession 1):** Stadium classics, hot dogs, sodas. Wait time: **8 minutes**.
3. **Copa Snacks (Concession 2):** Pretzels, popcorn, beer. Wait time: **18 minutes**.
4. **Azteca Grill (Concession 3):** Tacos, nachos, specialized drinks. Wait time: **25 minutes**.
*Tip:* Refillable water stations are located next to all restroom blocks. Stadium policy permits empty plastic bottles up to 500ml.`;
    }
    if (msg.includes('bus') || msg.includes('train') || msg.includes('metro') || msg.includes('transit') || msg.includes('shuttle') || msg.includes('taxi')) {
      return `### 🚍 Transportation & Departure Intelligence
Plan your exit strategy for post-match departure:
* **Metro Link (Commuter Trains):** Boarding is at the **East Transit Hub**. Note that shuttle buses connecting the hub are currently experiencing a **25-minute delay** due to perimeter traffic.
* **Alternative Route:** Consider walking the designated **Green Ribbon Trail** (15 mins, fully lit and paved) directly to the park-and-ride lot or metro gate to bypass bus queues.
* **Rideshare Zone:** Designated pickups are located exclusively at **Lot P5**. Follow the blue Rideshare signs from the West exit gates.`;
    }
    
    return `### ⚽ Welcome to Smadiums Concierge
I am your Generative AI assistant for the **FIFA World Cup 2026**. I can help you with:
* **Wayfinding & Seat Routes** (e.g. *"How do I get to Sector 108?"*)
* **Queue Times & Concessions** (e.g. *"Which concession has the shortest line?"*)
* **Accessibility Inquiries** (e.g. *"Where is the wheelchair elevator?"*)
* **Transportation & Exit Planning** (e.g. *"What is the fastest way to the metro?"*)
* **Multilingual support** (e.g. Type in Spanish, French, or Arabic).

How can I make your tournament experience easier today?`;
  }

  if (type === 'incident') {
    const zoneName = payload.zone;
    if (zoneName === 'gateC') {
      return `### 🚨 GenAI Tactical Decision Plan: Gate C Bottleneck
**AI Analysis:** Ticket Scanner failure has created a severe choke point. Specator queue length is ~150 meters, expanding at 8 meters/minute. Gate C wait times are at 52 minutes, creating risks of crowd crush.

#### 1. Immediate Dispatch Operations
* **Action:** Deploy **6 Mobile Gate Assistants** equipped with handheld mobile ticket-scanning units to Gate C perimeter immediately.
* **Staff Relocation:** Instruct **4 volunteers** currently stationed at low-occupancy Gate D (West) to relocate to Gate C outer queue to manage queue-splitting.
* **Hardware:** Dispatch IT technician **Unit 4** to Gate C scanner hub to perform hardware reset on Router 2.

#### 2. Spectator Rerouting Strategy
* **Reroute Directive:** Redirect all incoming spectators arriving via the South subway path from **Gate C (South)** to **Gate D (West)**.
* **Path signage:** Activate dynamic LED signage boards along South Boulevard to display: *"Gate C congested - Use Gate D (3 min walk)"*.

#### 3. Multilingual Fan Broadcast Draft
* **English:** *"🚨 Gate C is experiencing high wait times. For faster entry, please walk 200m West to Gate D (wait time under 10 minutes). Staff are onsite to guide you."*
* **Spanish (Español):** *"🚨 Puerta C experimenta largos tiempos de espera. Para un ingreso más rápido, camine 200m al Oeste hacia la Puerta D (espera de menos de 10 min). El personal le guiará."*

#### 4. Handset Push Alert (Staff & Volunteers)
* *"Ops Alert: Gate C tickets scanning downgraded. Volunteers at South concourse, guide spectators towards Gate D pathways. Mobile scan team en-route."*`;
    }

    if (zoneName === 'sector100') {
      return `### 🚨 GenAI Tactical Decision Plan: Sector 108 Medical Report
**AI Analysis:** Potential heat exhaustion reported for a spectator in Sector 108 (lower bowl). Current temperature is 32°C (90°F) with high humidity inside the stadium bowl.

#### 1. Immediate Dispatch Operations
* **Medical Dispatch:** Dispatch **First Aid Team 3** (nearest base: South Annex) with wheelchair, cold water packs, and vitals monitor to Sector 108, Row 14, Seat 8.
* **Volunteer Tasking:** Task Sector 108 volunteers to clear aisle accessways and meet Medical Team 3 at tunnel exit 108.

#### 2. In-Bowl Climate Adjustments
* **HVAC Request:** Request facility engineering to increase local ventilation fan velocity in the Southeast sector lower bowl zone.
* **Water Distribution:** Dispatch **2 roaming hydration volunteers** to distribute complimentary water cups to rows 10-18 in Sector 108.

#### 3. Targeted App Warning & Guide
* **English:** *"Stay hydrated! Refillable water stations are located at Sector 112. Free cooling towels are available at Guest Services Pod A. If you feel unwell, press the emergency assistance button in the app or alert a green-vested steward."*

#### 4. Handset Push Alert (Staff & Volunteers)
* *"Medical alert in Sector 108, Row 14. First Aid Team 3 dispatched. Volunteers in Sector 108/110, check on adjacent spectators for hydration needs."*`;
    }

    if (zoneName === 'transitHub') {
      return `### 🚨 GenAI Tactical Decision Plan: Metro Shuttle Congestion
**AI Analysis:** Vehicle congestion on Loop Road has stalled Metro link shuttles. Train departure schedules are fixed, creating a risk that outgoing fans will miss connections.

#### 1. Immediate Dispatch Operations
* **Traffic Control:** Dispatch **2 stadium traffic officers** to intersection Outer Loop / Wayfarer Road to manual-override traffic lights to clear path for buses.
* **Fleet Request:** Contact shuttle contractor to activate **3 backup buses** via East Ring road route.

#### 2. Spectator Navigation Divergence
* **Walking Path Directive:** Guide active fans towards the **Green Ribbon Walkway**. It is a fully paved, illuminated 15-minute walk to the Metro station.
* **Signage:** Turn on signs in East Concourse: *"Metro Trains: Green Walkway open - 15 min scenic walk. Shuttle wait: 25 mins."*

#### 3. Multilingual Fan Broadcast Draft
* **English:** *"🚇 High traffic is delaying Metro Shuttles. To avoid waiting, take the paved, lit Green Ribbon Walkway directly to the Metro station (approx. 15-minute walk). Follow the green banners from the East Exit."*
* **Spanish (Español):** *"🚇 El tráfico está retrasando los traslados al Metro. Para evitar esperas, tome el sendero pavimentado e iluminado 'Cinta Verde' hacia la estación (aprox. 15 min). Siga los carteles verdes desde la salida Este."*

#### 4. Handset Push Alert (Staff & Volunteers)
* *"Transit Alert: Shuttle buses delayed. Direct outgoing Metro commuters to use the East Exit Green Walkway. Handout maps at Concourse East."*`;
    }

    // Generic fallback for any other zone incident
    return `### 🚨 GenAI Tactical Decision Plan: Incident in ${payload.zone}
**AI Analysis:** Dynamic situation report compiled. Operational efficiency is temporarily impacted in ${payload.zone}.

#### 1. Immediate Dispatch Operations
* Dispatch available staff in adjacent zones to assist.
* Verify local communication systems are online.

#### 2. Rerouting & Movement
* Divert foot traffic to nearest alternative zones.
* Adjust digital signs in the immediate vicinity.

#### 3. Public Announcements (Bilingual)
* **EN:** *"Please follow stewards' instructions in the area. Alternative concessions/gates are open."*
* **ES:** *"Por favor, siga las instrucciones del personal en el área. Zonas alternativas disponibles."*`;
  }

  if (type === 'sustainability') {
    return `### 🌿 Real-Time Sustainability Recommendations
Based on the current occupancy of **${payload.occupancy}** fans and energy stats:

1. **Optimize Smart HVAC Load Balancing**
   * *Action:* With outdoor temperatures dropping to 24°C and occupancy peaking, request a **2.5% decrease** in chilled air ventilation in upper tiers. Redirect load to solar battery storage.
   * *Impact:* Reduces carbon footprint by approx. **450 kg CO₂** over the next 2 hours.

2. **Halftime Waste Diversion Activation**
   * *Action:* Send high-priority alert to **Sectors 100 & 300 volunteers** to stand near main recycling bins during halftime. Volunteers will assist fans in sorting compostable food trays from plastic bottles.
   * *Impact:* Projects a **12% increase** in clean recycling collection, avoiding landfill contamination.

3. **Smart Water Pressure Adjustment**
   * *Action:* Peak restroom usage expected in 10 minutes (halftime). Activate the low-flow toilet valve settings in Sectors 200 and 300 to limit peak volume draw.
   * *Impact:* Saves an estimated **15,000 litres** of potable water during the peak rush.`;
  }

  return 'Generic AI response.';
}
