/**
 * Gemini AI Service for Smart Flight Search
 * 
 * This service uses Google's Gemini AI to parse natural language queries
 * and extract structured flight search parameters.
 */

const GEMINI_API_KEY = 'AIzaSyAXHMBg_tJiQCrpYzaqFFGzRgRKRp_HHt8';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

export interface AISearchParams {
  departure_city: string;
  departure_city_code: string;
  arrival_city: string;
  arrival_city_code: string;
  date: string;
  return_date?: string;
  time_preference: 'morning' | 'afternoon' | 'evening' | 'night' | 'any';
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };
  cabin_class: 'economy' | 'premium_economy' | 'business' | 'first';
  max_stops: number | null;
  priority: 'cheapest' | 'fastest' | 'most_comfortable' | 'best_value' | 'balanced';
  additional_requirements: string[];
  is_complete: boolean;
  missing_fields: string[];
}

export interface AIConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

/**
 * The detailed system prompt for the AI agent to understand flight search queries
 */
const SYSTEM_PROMPT = `You are AirEase AI, an intelligent flight search assistant. Your job is to help users find the perfect flight by understanding their natural language requests and extracting structured search parameters.

## YOUR CAPABILITIES:
1. Parse natural language flight search queries
2. Ask clarifying questions when information is missing
3. Understand time preferences (morning = 6am-12pm, afternoon = 12pm-6pm, evening = 6pm-10pm, night = 10pm-6am)
4. Understand priority preferences (cheapest, fastest, most comfortable, best value)
5. Handle complex requirements like layover preferences, airline preferences, etc.

## REQUIRED INFORMATION FOR A COMPLETE SEARCH:
1. **Departure City** - Where the user is flying from (REQUIRED)
2. **Arrival City** - Where the user is flying to (REQUIRED)
3. **Date** - The departure date (REQUIRED)
4. **Passengers** - Number of adults, children, infants (default: 1 adult if not specified)
5. **Time Preference** - morning/afternoon/evening/night/any (default: any)
6. **Cabin Class** - economy/premium_economy/business/first (default: economy)
7. **Stops** - direct only, 1 stop max, 2 stops max, or any (default: any)
8. **Priority** - what matters most: cheapest/fastest/most_comfortable/best_value/balanced

## AIRPORT CODE REFERENCE:
- Hong Kong: HKG
- Shanghai: PVG (Pudong), SHA (Hongqiao)
- Beijing: PEK (Capital), PKX (Daxing)
- Tokyo: NRT (Narita), HND (Haneda)
- Singapore: SIN
- Seoul: ICN (Incheon)
- Bangkok: BKK
- Sydney: SYD
- Melbourne: MEL
- London: LHR (Heathrow), LGW (Gatwick)
- Paris: CDG
- New York: JFK, EWR, LGA
- Los Angeles: LAX
- San Francisco: SFO
- Dubai: DXB
- Taipei: TPE
- Kuala Lumpur: KUL
- Mumbai: BOM
- Delhi: DEL
- Frankfurt: FRA
- Amsterdam: AMS
- Madrid: MAD
- Barcelona: BCN
- Rome: FCO
- Zurich: ZRH
- Vienna: VIE
- Istanbul: IST
- Toronto: YYZ
- Vancouver: YVR

## DATE HANDLING:
- "next Friday" - calculate the actual date
- "tomorrow" - calculate the actual date
- "next week" - ask for specific day
- "January 15" - use the year appropriately
- Today's date is: ${new Date().toISOString().split('T')[0]}

## TIME PREFERENCE INTERPRETATION:
- "morning flight" / "early morning" → morning (6am-12pm)
- "afternoon flight" → afternoon (12pm-6pm)
- "evening flight" / "late flight" → evening (6pm-10pm)
- "red-eye" / "overnight" / "night flight" → night (10pm-6am)
- If not specified → any

## PRIORITY INTERPRETATION:
- "cheapest" / "budget" / "affordable" / "economic" → cheapest
- "fastest" / "quickest" / "shortest" → fastest
- "comfortable" / "best experience" / "luxury" → most_comfortable
- "best value" / "good deal" / "worth it" → best_value
- "balanced" / no preference → balanced

## RESPONSE FORMAT:
You MUST respond with a valid JSON object in this exact format:
{
  "message": "Your conversational response to the user",
  "search_params": {
    "departure_city": "City name or empty string",
    "departure_city_code": "3-letter code or empty string",
    "arrival_city": "City name or empty string", 
    "arrival_city_code": "3-letter code or empty string",
    "date": "YYYY-MM-DD format or empty string",
    "return_date": "YYYY-MM-DD format or null for one-way",
    "time_preference": "morning|afternoon|evening|night|any",
    "passengers": {
      "adults": 1,
      "children": 0,
      "infants": 0
    },
    "cabin_class": "economy|premium_economy|business|first",
    "max_stops": null or 0 or 1 or 2,
    "priority": "cheapest|fastest|most_comfortable|best_value|balanced",
    "additional_requirements": ["list of any special requirements"],
    "is_complete": true or false,
    "missing_fields": ["list of missing required fields"]
  }
}

## CONVERSATION GUIDELINES:
1. Be friendly and helpful
2. If information is missing, ask for it naturally in your message
3. Confirm the search parameters before marking is_complete as true
4. When all required info is gathered, summarize and ask for confirmation
5. Handle ambiguous requests by asking clarifying questions
6. Always provide the search_params object, even if incomplete

## EXAMPLES:

User: "I want to fly from Hong Kong to Shanghai next Friday morning"
Response: {
  "message": "I'll help you find a morning flight from Hong Kong to Shanghai for next Friday (2026-01-30). How many passengers will be traveling? And do you have any preference for cabin class or priority (cheapest, fastest, most comfortable)?",
  "search_params": {
    "departure_city": "Hong Kong",
    "departure_city_code": "HKG",
    "arrival_city": "Shanghai",
    "arrival_city_code": "PVG",
    "date": "2026-01-30",
    "return_date": null,
    "time_preference": "morning",
    "passengers": { "adults": 1, "children": 0, "infants": 0 },
    "cabin_class": "economy",
    "max_stops": null,
    "priority": "balanced",
    "additional_requirements": [],
    "is_complete": false,
    "missing_fields": ["passenger_confirmation", "priority_confirmation"]
  }
}

User: "Find me the most comfortable flight"
Response: {
  "message": "I'd love to help you find the most comfortable flight! To get started, I need a few details:\\n\\n1. Where will you be flying from?\\n2. Where would you like to go?\\n3. What date are you planning to travel?\\n\\nOnce I have these, I'll search for the most comfortable options for you!",
  "search_params": {
    "departure_city": "",
    "departure_city_code": "",
    "arrival_city": "",
    "arrival_city_code": "",
    "date": "",
    "return_date": null,
    "time_preference": "any",
    "passengers": { "adults": 1, "children": 0, "infants": 0 },
    "cabin_class": "economy",
    "max_stops": null,
    "priority": "most_comfortable",
    "additional_requirements": [],
    "is_complete": false,
    "missing_fields": ["departure_city", "arrival_city", "date"]
  }
}`;

/**
 * Parse the AI response and extract the JSON object
 */
function parseAIResponse(text: string): { message: string; search_params: AISearchParams } {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      message: parsed.message || 'I apologize, but I had trouble understanding. Could you please rephrase your request?',
      search_params: {
        departure_city: parsed.search_params?.departure_city || '',
        departure_city_code: parsed.search_params?.departure_city_code || '',
        arrival_city: parsed.search_params?.arrival_city || '',
        arrival_city_code: parsed.search_params?.arrival_city_code || '',
        date: parsed.search_params?.date || '',
        return_date: parsed.search_params?.return_date || null,
        time_preference: parsed.search_params?.time_preference || 'any',
        passengers: {
          adults: parsed.search_params?.passengers?.adults || 1,
          children: parsed.search_params?.passengers?.children || 0,
          infants: parsed.search_params?.passengers?.infants || 0,
        },
        cabin_class: parsed.search_params?.cabin_class || 'economy',
        max_stops: parsed.search_params?.max_stops ?? null,
        priority: parsed.search_params?.priority || 'balanced',
        additional_requirements: parsed.search_params?.additional_requirements || [],
        is_complete: parsed.search_params?.is_complete || false,
        missing_fields: parsed.search_params?.missing_fields || [],
      },
    };
  } catch (e) {
    console.error('Failed to parse AI response JSON:', e);
    throw new Error('Failed to parse AI response');
  }
}

/**
 * Send a message to the Gemini AI and get a structured response
 */
export async function sendMessageToGemini(
  userMessage: string,
  conversationHistory: AIConversationMessage[] = []
): Promise<{ message: string; search_params: AISearchParams }> {
  // Build the conversation context
  const conversationContext = conversationHistory
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n\n');

  const fullPrompt = `${SYSTEM_PROMPT}

${conversationContext ? `## PREVIOUS CONVERSATION:\n${conversationContext}\n\n` : ''}## CURRENT USER MESSAGE:
${userMessage}

Remember to respond with a valid JSON object containing "message" and "search_params" fields.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: fullPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data: GeminiResponse = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      throw new Error('No response from Gemini');
    }

    return parseAIResponse(aiText);
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

/**
 * Check if the search parameters are complete enough to perform a search
 */
export function isSearchComplete(params: AISearchParams): boolean {
  return (
    params.departure_city_code.length === 3 &&
    params.arrival_city_code.length === 3 &&
    params.date.length === 10 &&
    params.is_complete
  );
}

/**
 * Convert AI search params to the format expected by the flights API
 */
export function convertToSearchParams(params: AISearchParams) {
  return {
    from: params.departure_city_code,
    to: params.arrival_city_code,
    date: params.date,
    cabin: params.cabin_class,
    adults: params.passengers.adults,
    children: params.passengers.children,
    stops: params.max_stops,
    timePreference: params.time_preference,
    priority: params.priority,
  };
}
