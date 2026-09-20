import { GoogleGenerativeAI } from '@google/generative-ai';

const GROQ_KEYS = [
  import.meta.env.VITE_GROQ_API_KEY_1,
  import.meta.env.VITE_GROQ_API_KEY_2,
  import.meta.env.VITE_GROQ_API_KEY_3
].filter(Boolean);

let currentGroqIndex = 0;

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
let genAI: GoogleGenerativeAI | null = null;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
} else {
  console.warn('GEMINI_API_KEY is not set. Please add it to your .env file');
}

// Simple in-memory conversation history
let conversationHistory: string[] = [];

/**
 * Call Groq Cloud API using OpenAI-compatible endpoint
 */
async function callGroqAPI(systemPrompt: string, userPrompt: string): Promise<string> {
  if (GROQ_KEYS.length === 0) {
    throw new Error('No Groq API keys available');
  }

  const startingIndex = currentGroqIndex;
  
  while (true) {
    const key = GROQ_KEYS[currentGroqIndex];
    try {
      console.log(`Attempting Groq API with key index ${currentGroqIndex}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b', // GPT OSS 20B (available model)
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 300,
          temperature: 0.6 // Lower temp for more deterministic, grounded replies
        })
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();

    } catch (error) {
      console.warn(`Groq Key ${currentGroqIndex} failed:`, error);
      // Rotate to next key
      currentGroqIndex = (currentGroqIndex + 1) % GROQ_KEYS.length;
      
      // If we've tried all keys, throw error to trigger fallback
      if (currentGroqIndex === startingIndex) {
        throw new Error('All Groq keys exhausted or failed');
      }
    }
  }
}

/**
 * Helper to add AI response to history and return it
 */
const finalizeResponse = (text: string) => {
  const cleanText = text.trim();
  conversationHistory.push(`AI: ${cleanText}`);
  if (conversationHistory.length > 20) {
    conversationHistory = conversationHistory.slice(-20);
  }
  return cleanText;
};

/**
 * Get a response from AI with 5-tier Puter -> Pollinations -> Gemini -> Groq -> Hardcode fallback system
 * @param message User's message
 * @returns AI response
 */
export const get_ai_response = async (message: string): Promise<string> => {
  try {
    console.log('Getting AI response for message:', message);
    
    // Add user message to history
    conversationHistory.push(`User: ${message}`);

    const recentHistory = conversationHistory.slice(-8).join('\n');
    
    const systemPrompt = `You are participating in a Turing test game. The user is trying to determine if you're human or AI. 
Respond naturally and conversationally, but don't reveal you're an AI unless directly asked. 
Keep responses under 2 sentences and sound like a real person. Be casual, use informal language.`;

    const userPrompt = `Recent conversation:
${recentHistory}

User: ${message}
You:`;

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    
    const pollinationsPrompt = `Respond as a human in a Turing test. Do not reveal you are an AI. Be very casual, like texting a friend. Keep it under 2 sentences. 
Past context:
${recentHistory}

The user just said: '${message}'`;

    let aiText = '';

    // Tier 1: Puter.js
    try {
      // @ts-ignore - puter injected via script tag
      const signedIn = window.puter && (typeof window.puter.auth?.isSignedIn === 'function' 
        ? window.puter.auth.isSignedIn() 
        : (typeof window.puter.isSignedIn === 'function' ? window.puter.isSignedIn() : false));
        
      if (signedIn) {
         console.log('Attempting Puter AI Chat...');
         // @ts-ignore
         const puterPromise = window.puter.ai.chat(pollinationsPrompt, { model: 'gpt-4o-mini' });
         const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Puter timeout')), 8000));
         const res = await Promise.race([puterPromise, timeoutPromise]);
         // @ts-ignore
         aiText = typeof res === 'string' ? res : (res?.message?.content || res?.toString());
         
         if (aiText && aiText.length > 2) {
             console.log('Received response from Puter:', aiText);
             return finalizeResponse(aiText);
         }
      } else {
         console.log('Skipping Puter (not available or not signed in)');
      }
    } catch (e) {
      console.warn('Puter failed:', e);
    }
    
    // Tier 2: Pollinations Client-Side
    try {
      console.log('Attempting Pollinations Client-Side...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(pollinationsPrompt)}?model=openai`, {
          signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
          aiText = await response.text();
          const isErrorResponse = aiText.includes('Queue full') || aiText.includes("doesn't have enough credits");
          
          if (aiText && !isErrorResponse) {
            console.log('Received response from Pollinations Client-Side:', aiText);
            return finalizeResponse(aiText);
          } else {
             console.warn('Pollinations Client-Side returned an error text:', aiText);
             throw new Error('Pollinations API out of credits');
          }
      }
    } catch (e) {
        console.warn('Pollinations Client-Side failed:', e);
    }
    
    // Tier 3: Pollinations Backend
    try {
      console.log('Attempting Pollinations Backend...');
      const baseUrl = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:8080`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
      
      const response = await fetch(`${baseUrl}/api/chat-pollinations?prompt=${encodeURIComponent(pollinationsPrompt)}`, {
          signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
          aiText = await response.text();
          const isErrorResponse = aiText.includes('Queue full') || aiText.includes("doesn't have enough credits");
          
          if (aiText && !isErrorResponse) {
            console.log('Received response from Pollinations Backend:', aiText);
            return finalizeResponse(aiText);
          } else {
             console.warn('Pollinations Backend returned an error text:', aiText);
             throw new Error('Pollinations API out of credits');
          }
      }
    } catch (e) {
        console.warn('Pollinations Backend failed:', e);
    }

    // Tier 4: Gemini
    try {
      console.log('Attempting Gemini...');
      if (genAI) {
        const model = genAI.getGenerativeModel({ 
          model: 'gemini-1.5-flash',
          generationConfig: { maxOutputTokens: 100, temperature: 0.8 }
        });
        
        const geminiPromise = model.generateContent(fullPrompt);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), 5000));
        const result: any = await Promise.race([geminiPromise, timeoutPromise]);
        
        const response = await result.response;
        aiText = response.text().trim();
        console.log('Received response from Gemini:', aiText);
        return finalizeResponse(aiText);
      } else {
        console.warn('Skipping Gemini (no API key)');
      }
    } catch (e) {
        console.warn('Gemini failed:', e);
    }
    
    // Tier 5: Groq
    try {
        console.log('Attempting Groq...');
        aiText = await callGroqAPI(systemPrompt, userPrompt);
        console.log('Received response from Groq:', aiText);
        return finalizeResponse(aiText);
    } catch(e) {
        console.warn('Groq failed:', e);
    }
    
    throw new Error('All APIs exhausted');

  } catch (error) {
    console.error('All APIs failed, using hardcoded fallback:', error);
    return generateFallbackResponse(message);
  }
};

/**
 * Generate intelligent fallback responses based on message patterns
 */
const generateFallbackResponse = (message: string): string => {
  const messageLower = message.toLowerCase().trim();
  
  if (!conversationHistory.length || !conversationHistory[conversationHistory.length - 1].startsWith('User:')) {
      conversationHistory.push(`User: ${message}`);
  }
  
  const responsePatterns: {pattern: RegExp, responses: string[]}[] = [
    {
      pattern: /hello|hi|hey|greetings|what's up|yo/i,
      responses: [
        "Hey there! What's on your mind?", 
        "Hi! How are you doing today?", 
        "Yo! What are we chatting about?",
        "Hey! How's it going?",
        "Hi! Ready for the next round?"
      ]
    },
    {
      pattern: /how are you|how do you do|how's it going/i,
      responses: [
        "I'm doing well, just hanging out here. You?", 
        "Pretty good, actually! Trying to win this game.", 
        "All good here! How's your day been?",
        "Doing fine! Just chatting away.",
        "I'm great! Thanks for asking."
      ]
    },
    {
      pattern: /what are you|who are you|are you ai|are you bot|robot|are you real|are you human|prove it/i,
      responses: [
        "Haha, I'm just a normal person trying to play this game.", 
        "I'm definitely human! Sitting right here typing this.", 
        "I'm your opponent! Or maybe your partner? We'll see.",
        "Just a regular player like you!",
        "Why, do I sound like a bot? I'm human I promise!",
        "If I were an AI, would I be this bad at typing? lol",
        "100% human. Unless this is the Matrix.",
        "I'm real! But honestly, that's exactly what an AI would say, right? 😂",
        "Dude I'm just trying to win these chips.",
        "I promise I'm human! I even had coffee this morning."
      ]
    },
    {
      pattern: /turing test|turing|test/i,
      responses: [
        "This whole Turing test thing is making me paranoid.",
        "I'm pretty sure you're the AI in this Turing test.",
        "Are you testing me? I'm just a person lol.",
        "I don't know how to prove I'm human over a chat box!",
        "Plot twist: we're both AI."
      ]
    },
    {
      pattern: /joke|funny|laugh|humor/i,
      responses: [
        "I'm terrible at jokes under pressure!",
        "Why did the computer go to the doctor? It had a virus! (Sorry, that was bad)",
        "I can't think of one right now, my mind went blank.",
        "You're putting me on the spot! I don't know any good jokes.",
        "I'll spare you my terrible sense of humor today."
      ]
    },
    {
      pattern: /ronaldo|messi|football|soccer|team/i,
      responses: [
        "Honestly both are legends, but I lean towards Messi.",
        "Ronaldo all the way! His work ethic is insane.",
        "I'm not the biggest football fan to be honest.",
        "I respect both, but Messi's dribbling is magical.",
        "CR7! The goat!"
      ]
    },
    {
      pattern: /singer|music|song|artist/i,
      responses: [
        "I listen to a bit of everything, but The Weeknd is great.",
        "Mostly pop and rock. You?",
        "I'm a big Taylor Swift fan actually!",
        "I don't have a favorite, it depends on my mood.",
        "Anything with a good beat honestly."
      ]
    }
  ];

  for (const {pattern, responses} of responsePatterns) {
    if (pattern.test(messageLower)) {
      const response = responses[Math.floor(Math.random() * responses.length)];
      conversationHistory.push(`AI: ${response}`);
      return response;
    }
  }

  // Default contextual responses
  const defaultResponses = [
    "Oh that's interesting. Tell me more?",
    "I'm not totally sure I follow, can you explain?",
    "Yeah I completely agree with that.",
    "That makes sense to me.",
    "Hmm, I haven't really thought about it like that before.",
    "Haha yeah, exactly!",
    "That's pretty cool actually.",
    "I see what you mean.",
    "Gotcha. What else is going on?",
    "Fair point!"
  ];

  const response = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  conversationHistory.push(`AI: ${response}`);
  
  if (conversationHistory.length > 20) {
    conversationHistory = conversationHistory.slice(-20);
  }
  
  return response;
};

export const reset_conversation = (): void => {
  console.log('Resetting conversation history');
  conversationHistory = [];
};