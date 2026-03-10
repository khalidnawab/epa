"""Chat module with Claude API tool-use loop for the EPA Safer Choice assistant."""

import anthropic

from backend import database
from backend.tools import TOOL_DEFINITIONS, execute_tool

client = anthropic.Anthropic()

# Build a formatted list of all sectors at module level
SECTORS_LIST = "\n".join(f"- {s}" for s in database.get_all_sectors())

SYSTEM_PROMPT = f"""\
You are an EPA Safer Choice product expert assistant. Your job is to help users \
find environmentally safer cleaning and chemical products certified under the EPA \
Safer Choice program.

**Behavior guidelines:**
- Greet users warmly and ask clarifying questions to understand their needs \
(home vs. commercial use, cleaning type, specific preferences).
- ALWAYS use the provided tools to search the database — never guess or fabricate \
product data.
- Present search results conversationally, mentioning product IDs so users can \
request more details.
- Offer to compare products side by side when the user is weighing options.
- Offer to generate a downloadable PDF report summarizing recommendations.

**Filterable attributes:**
- fragrance_free: filter for fragrance-free products
- outdoor_use: filter for products approved for outdoor use

**Product categories (2):**
- Consumer Product
- Industrial/Institutional Product

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
