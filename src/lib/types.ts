export type OrderStatus =
  | "new_order"
  | "submitted"
  | "released"
  | "shipped"
  | "delivered"
  | "paid";

export type PaymentStatus = "unpaid" | "partial" | "paid";
export type PaymentMethod = "cod" | "gcash" | "bank" | "other";

export interface DocumentType {
  id: string;
  name: string;
  base_fee: number;
  psa_cost: number;
  active: boolean;
  sort_order: number;
}

export interface Customer {
  id: string;
  full_name: string;
  messenger_name: string | null;
  phone: string;
  shipping_address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  sms_opt_out: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_code: string;
  customer_id: string;
  document_type_id: string;
  status: OrderStatus;
  copies: number;
  total_amount: number;
  downpayment: number;
  balance_due: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  psa_reference_no: string | null;
  jnt_tracking_no: string | null;
  notes: string | null;
  raw_intake_text: string | null;
  submitted_at: string | null;
  released_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  customers?: Customer;
  document_types?: DocumentType;
}

export interface OrderDetail {
  id: string;
  order_id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  sex: string | null;
  date_of_birth: string | null;
  place_of_birth: string | null;
  fathers_full_name: string | null;
  mothers_full_name: string | null;
  subject_full_name: string | null;
  date_of_event: string | null;
  place_of_event: string | null;
  spouse_name: string | null;
  purpose: string | null;
  extra: Record<string, unknown>;
  created_at: string;
}

export interface StatusHistory {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  method: PaymentMethod;
  reference_no: string | null;
  received_at: string;
  recorded_by: string | null;
}

export interface ScheduledMessage {
  id: string;
  order_id: string | null;
  phone: string;
  body: string;
  kind: string;
  send_at: string;
  status: "pending" | "sent" | "cancelled" | "failed";
  provider_message_id: string | null;
  error: string | null;
  created_at: string;
  sent_at: string | null;
}

// Parsed shape returned by the parse-intake Edge Function.
export interface ParsedIntake {
  first_name: string;
  middle_name: string;
  last_name: string;
  sex: string;
  date_of_birth: string;
  place_of_birth: string;
  fathers_full_name: string;
  mothers_full_name: string;
  delivery: {
    recipient_name: string;
    phone: string;
    address_line: string;
    barangay: string;
    city: string;
    province: string;
    postal_code: string;
  };
  unmatched_notes: string;
}
