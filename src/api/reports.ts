/**
 * AirEase - Reports API Client
 * 反馈与纠错管理 API
 */

import { apiClient } from './client';

// Report categories
export type ReportCategory =
  | 'aircraft_mismatch'    // 机型不符
  | 'missing_facilities'   // 设施缺失
  | 'price_error'          // 价格错误
  | 'flight_info_error'    // 航班信息错误
  | 'time_inaccurate'      // 时间不准确
  | 'other';               // 其他

export interface ReportCategoryInfo {
  value: ReportCategory;
  label: string;       // Chinese label
  labelEn: string;     // English label
  description?: string;
}

export interface ReportCreate {
  userEmail: string;
  category: ReportCategory;
  content: string;
  flightId?: string;
  flightInfo?: {
    airline?: string;
    flightNumber?: string;
    route?: string;
    date?: string;
    aircraftModel?: string;
  };
}

export interface ReportResponse {
  id: number;
  userId?: string;
  userEmail: string;
  category: string;
  categoryLabel: string;
  content: string;
  flightId?: string;
  flightInfo?: Record<string, string>;
  status: string;
  statusLabel: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// Category labels for frontend use
export const REPORT_CATEGORIES: ReportCategoryInfo[] = [
  { value: 'aircraft_mismatch', label: '机型不符', labelEn: 'Aircraft Type Mismatch' },
  { value: 'missing_facilities', label: '设施缺失', labelEn: 'Missing Facilities' },
  { value: 'price_error', label: '价格错误', labelEn: 'Price Error' },
  { value: 'flight_info_error', label: '航班信息错误', labelEn: 'Flight Info Error' },
  { value: 'time_inaccurate', label: '时间不准确', labelEn: 'Incorrect Time' },
  { value: 'other', label: '其他', labelEn: 'Other' },
];

/**
 * Get all report categories
 */
export async function getReportCategories(): Promise<ReportCategoryInfo[]> {
  try {
    const response = await apiClient.get<ReportCategoryInfo[]>('/reports/categories');
    return response.data;
  } catch {
    // Return local categories as fallback
    return REPORT_CATEGORIES;
  }
}

/**
 * Submit a feedback/error report
 */
export async function submitReport(report: ReportCreate): Promise<ReportResponse> {
  const response = await apiClient.post<ReportResponse>('/reports/', {
    user_email: report.userEmail,
    category: report.category,
    content: report.content,
    flight_id: report.flightId,
    flight_info: report.flightInfo,
  });
  return response.data;
}

/**
 * Get user's reports
 */
export async function getUserReports(userEmail: string): Promise<ReportResponse[]> {
  const response = await apiClient.get<ReportResponse[]>('/reports/', {
    params: { user_email: userEmail },
  });
  return response.data;
}

/**
 * Get a single report by ID
 */
export async function getReport(reportId: number): Promise<ReportResponse> {
  const response = await apiClient.get<ReportResponse>(`/reports/${reportId}`);
  return response.data;
}
