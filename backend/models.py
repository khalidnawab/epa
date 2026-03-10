from pydantic import BaseModel


class ChatRequest(BaseModel):
    conversation_id: str
    message: str


class ChatResponse(BaseModel):
    conversation_id: str
    response: str


class ProductOut(BaseModel):
    id: int
    program: str
    category: str
    sector: str
    product_name: str
    company_name: str
    city: str | None
    state: str | None
    partner_since: int
    fragrance_free: bool
    outdoor_use: bool
    company_in_good_standing: bool
    product_url: str
