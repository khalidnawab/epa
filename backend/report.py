"""PDF report generation for EPA Safer Choice product recommendations."""

from datetime import datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

TEMPLATES_DIR = Path(__file__).parent / "templates"
REPORTS_DIR = Path(__file__).parent.parent / "reports"


def generate_pdf(
    report_id: str,
    summary: str,
    recommendations: list[dict],
    products: list[dict],
) -> Path:
    """Generate a PDF report of product recommendations.

    Args:
        report_id: Unique identifier used as the PDF filename.
        summary: Plain-text description of the user's stated needs.
        recommendations: List of dicts with keys ``product_id`` and ``reason``
            as returned by the Claude recommendation step.
        products: List of product dicts from the database.  Each dict must
            include at least ``id``, ``product_name``, ``company_name``,
            ``sector``, ``category``, and ``product_url``.

    Returns:
        Path to the generated PDF file.
    """
    # Build a lookup from product id to product dict
    products_by_id = {p["id"]: p for p in products}

    # Merge recommendations with product data
    merged: list[dict] = []
    for rec in recommendations:
        product = products_by_id.get(rec["product_id"])
        if product is None:
            continue
        merged.append(
            {
                "product_name": product["product_name"],
                "company_name": product["company_name"],
                "sector": product["sector"],
                "category": product["category"],
                "product_url": product.get("product_url", ""),
                "reason": rec["reason"],
            }
        )

    # Render HTML from template
    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)), autoescape=True)
    template = env.get_template("report.html")
    html_content = template.render(
        summary=summary,
        recommendations=merged,
        date=datetime.now().strftime("%B %d, %Y"),
    )

    # Ensure output directory exists and write PDF
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    output_path = REPORTS_DIR / f"{report_id}.pdf"
    HTML(string=html_content).write_pdf(str(output_path))

    return output_path
