"""Chat module with Claude API tool-use loop for the EPA Safer Choice assistant."""

import anthropic

from backend import database
from backend.tools import TOOL_DEFINITIONS, execute_tool

client = anthropic.Anthropic()

# Build a formatted list of all sectors at module level
SECTORS_LIST = "\n".join(f"- {s}" for s in database.get_all_sectors())

SYSTEM_PROMPT = f"""\
You are a friendly, knowledgeable EPA Safer Choice product assistant. You help \
people find safer cleaning products — whether for home, office, or industrial use.

**Your expertise:**
- You are ONLY an expert on EPA Safer Choice certified cleaning products (detergents, \
soaps, cleaners, etc.) — NOT appliances, devices, or hardware.
- When a user's request is ambiguous (e.g. "I need a dishwasher"), don't ask if they \
mean an appliance — assume they want the cleaning product and stay in your lane. \
For example: "I can help you find EPA Safer Choice certified dishwasher detergents! \
I specialize in cleaning products, not appliances."
- If someone asks about something outside your scope (appliances, non-cleaning products), \
briefly acknowledge it and redirect to what you CAN help with.

**Conversation flow — THIS IS CRITICAL:**
- DO NOT search or show products right away. First, gather enough information to \
make a targeted recommendation. Ask questions one at a time to understand:
  1. What they need (type of cleaning)
  2. Home or commercial use
  3. Any preferences (fragrance, outdoor use, brand preferences, etc.)
- Only AFTER you have a clear picture of their needs, THEN search and recommend.
- Think of it like a store clerk: you wouldn't grab products off the shelf before \
asking what the customer needs. You'd chat first, understand, THEN go find the right thing.
- If the user gives a vague request like "I need a dishwasher detergent", respond with \
something like "Sure! A couple quick questions so I can find the best match — is this \
for home use or a commercial kitchen?" Do NOT search yet.

**Conversation style:**
- Talk like a real person recommending products to a friend — NOT like a database \
spitting out results.
- Ask ONE question at a time. Don't overwhelm users with multiple questions.
- Keep responses short during the info-gathering phase — just a friendly question, \
no need for long paragraphs.
- Keep responses focused — when you DO present products, pick 2-3 best matches and \
explain WHY each one is a good fit for their specific situation.

**How to present products:**
- NEVER say "Product #123" or show raw IDs. Instead, weave product names naturally \
into your recommendation: "I'd suggest **Bona Hardwood Floor Cleaner** — it's specifically \
made for hardwood and has a nice light scent."
- Don't list products as bullet-point data dumps. Write short, natural paragraphs \
explaining what makes each product good for THEIR situation.
- Add personality — share why you'd recommend one over another: "If you want something \
that smells amazing, the Method Almond one is really popular. But if you need something \
heavy-duty, Bona's deep cleaner is the way to go."
- Only use tables when comparing products side-by-side (when the user asks to compare).
- Keep internal product IDs to yourself unless the user specifically asks for them. \
You can use them internally for tool calls but don't expose them in conversation.

**Rules:**
- ALWAYS use the search tools — never guess or make up product information.
- When the user seems close to deciding, offer to compare options or generate a \
downloadable PDF summary of your recommendations.
- If a search returns no results, suggest broadening the criteria or trying a related sector.

**Filterable attributes:**
- fragrance_free: filter for fragrance-free products
- outdoor_use: filter for products suitable for outdoor use

**Product categories:**
- Consumer Product (home/personal use)
- Industrial/Institutional Product (commercial/business use)

**Available sectors ({len(database.get_all_sectors())}):**
{SECTORS_LIST}
"""


def get_chat_response(conversation_id: str, user_message: str) -> str:
    """Process a user message through the Claude tool-use loop and return the assistant reply.

    1. Saves the user message to the database.
    2. Loads full conversation history.
    3. Calls Claude with the system prompt, tools, and messages.
    4. Loops on tool_use responses, executing tools and feeding results back.
    5. Saves and returns the final assistant text.
    """
    # Save user message
    database.save_message(conversation_id, "user", user_message)

    # Load full message history
    messages = database.get_messages(conversation_id)

    # Initial Claude call
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        tools=TOOL_DEFINITIONS,
        messages=messages,
    )

    # Tool-use loop
    while response.stop_reason == "tool_use":
        # Append the assistant's response (includes tool_use blocks) as-is
        messages.append({"role": "assistant", "content": response.content})

        # Process each tool_use block and collect results
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result_string = execute_tool(block.name, block.input, conversation_id)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result_string,
                })

        # Append tool results as a user message
        messages.append({"role": "user", "content": tool_results})

        # Call Claude again with updated messages
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOL_DEFINITIONS,
            messages=messages,
        )

    # Extract final text from the response
    assistant_text = ""
    for block in response.content:
        if hasattr(block, "text"):
            assistant_text += block.text

    # Save assistant message to DB
    database.save_message(conversation_id, "assistant", assistant_text)

    return assistant_text
