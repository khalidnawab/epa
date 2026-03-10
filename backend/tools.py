"""Tool definitions and dispatch for the Claude-powered EPA Safer Choice assistant."""

import json
import uuid

from backend import database

TOOL_DEFINITIONS = [
    {
        "name": "search_products",
        "description": (
            "Search the EPA Safer Choice product database with optional filters. "
            "Returns matching products and a total count. Use this when the user wants "
            "to find products by category, sector, company, location, or keyword."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["Consumer Product", "Industrial/Institutional Product"],
                    "description": "Product category filter.",
                },
                "sector": {
                    "type": "string",
                    "description": "Product sector or use-case, e.g. 'Laundry' or 'Floor Care'.",
                },
                "company": {
                    "type": "string",
                    "description": "Company name (partial match supported).",
                },
                "state": {
                    "type": "string",
                    "description": "US state where the company is located (partial match).",
                },
                "fragrance_free": {
                    "type": "boolean",
                    "description": "If true, return only fragrance-free products.",
                },
                "outdoor_use": {
                    "type": "boolean",
                    "description": "If true, return only products approved for outdoor use.",
                },
                "keyword": {
                    "type": "string",
                    "description": "Free-text keyword to search product name, company, or sector.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_product_details",
        "description": (
            "Retrieve the full details of a single product by its ID. "
            "Use this after a search to get complete information about a specific product."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "product_id": {
                    "type": "integer",
                    "description": "The unique product ID.",
                },
            },
            "required": ["product_id"],
        },
    },
    {
        "name": "compare_products",
        "description": (
            "Compare two to five products side by side. "
            "Returns full details for each product so differences can be highlighted."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "product_ids": {
                    "type": "array",
                    "items": {"type": "integer"},
                    "minItems": 2,
                    "maxItems": 5,
                    "description": "List of product IDs to compare (2-5).",
                },
            },
            "required": ["product_ids"],
        },
    },
    {
        "name": "generate_report",
        "description": (
            "Generate a downloadable PDF report with product comparisons and "
            "personalized recommendations. Use this when the user explicitly asks "
            "for a report or summary document."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "product_ids": {
                    "type": "array",
                    "items": {"type": "integer"},
                    "description": "Product IDs to include in the report.",
                },
                "user_needs_summary": {
                    "type": "string",
                    "description": "Brief summary of the user's requirements and context.",
                },
                "recommendations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "product_id": {
                                "type": "integer",
                                "description": "Recommended product ID.",
                            },
                            "reason": {
                                "type": "string",
                                "description": "Why this product is recommended.",
                            },
                        },
                        "required": ["product_id", "reason"],
                    },
                    "description": "List of product recommendations with reasons.",
                },
            },
            "required": ["product_ids", "user_needs_summary", "recommendations"],
        },
    },
]


def execute_tool(tool_name: str, tool_input: dict, conversation_id: str) -> str:
    """Dispatch a tool call to the appropriate database/report function.

    Returns a JSON string with the result.
    """
    if tool_name == "search_products":
        result = database.search_products(**tool_input)
        return json.dumps(result)

    if tool_name == "get_product_details":
        result = database.get_product_details(tool_input["product_id"])
        if result is None:
            return json.dumps({"error": "Product not found"})
        return json.dumps(result)

    if tool_name == "compare_products":
        result = database.compare_products(tool_input["product_ids"])
        return json.dumps(result)

    if tool_name == "generate_report":
        from backend.report import generate_pdf

        report_id = str(uuid.uuid4())
        product_ids = tool_input["product_ids"]
        summary = tool_input["user_needs_summary"]
        recommendations = tool_input["recommendations"]

        products = database.compare_products(product_ids)
        generate_pdf(report_id, summary, recommendations, products)
        database.save_report(report_id, conversation_id, product_ids, summary)

        import os
        base_url = os.getenv("BASE_URL", "http://localhost:8001")
        return json.dumps({
            "report_id": report_id,
            "download_url": f"{base_url}/api/chat/{conversation_id}/report/{report_id}",
        })

    return json.dumps({"error": f"Unknown tool: {tool_name}"})
