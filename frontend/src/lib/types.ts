export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Product {
  id: number;
  program: string;
  category: string;
  sector: string;
  product_name: string;
  company_name: string;
  city: string | null;
  state: string | null;
  partner_since: number;
  fragrance_free: boolean;
  outdoor_use: boolean;
  company_in_good_standing: boolean;
  product_url: string;
}
