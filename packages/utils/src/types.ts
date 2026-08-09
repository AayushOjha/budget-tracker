// A calendar month in "YYYY-MM" form.
export type Month = string;
export type Role = 'USER';

export interface CategoryDto {
  id: string;
  name: string;
}

export interface PlanDto {
  id: string;
  categoryId: string;
  categoryName: string;
  month: Month;
  amount: number;
}

export interface ActualDto {
  id: string;
  categoryId: string;
  categoryName: string;
  month: Month;
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface LockDto {
  id: string;
  month: Month;
}

export interface UserDto {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthResponse {
  token: string;
  user: UserDto;
}

export interface CsvImportResult {
  imported: number;
  skipped: number;
  errors: Array<{
    line: number;
    raw: string;
    error: string;
  }>;
}

// Price values are stored as floats (dollars). Documented tradeoff in README.
export interface PlanRecord {
  categoryId: string;
  month: Month;
  amount: number;
}

// Category -> month -> value, the raw shapes used by the report aggregator.
export interface ActualRecord {
  categoryId: string;
  month: Month;
  amount: number;
}

export interface ReportRow {
  month: Month;
  categoryId: string;
  categoryName: string;
  plan: number;
  actual: number;
  hasActual: boolean;
  variance: number | null;
  variancePct: number | null;
}

export interface ReportTotals {
  month: Month;
  plan: number;
  actual: number;
  variance: number | null;
  variancePct: number | null;
}

export interface ReportResponse {
  rows: ReportRow[];
  totals: ReportTotals[];
}