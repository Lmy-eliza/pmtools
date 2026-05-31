import { useSettingsStore } from '../stores/settingsStore';
import { dateToTimestamp, ensureDateStr } from '../utils/dateUtils';

type TableType = 'todo' | 'timeBlock' | 'note' | 'tag' | 'moodLog';

// Add _recordId to stored objects for update/delete
declare module '../types' {
  interface Todo { _recordId?: string; }
  interface TimeBlock { _recordId?: string; }
  interface DailyNote { _recordId?: string; }
  interface Tag { _recordId?: string; }
  interface MoodLog { _recordId?: string; }
}

function getTableId(type: TableType): string {
  const { feishu } = useSettingsStore.getState();
  switch (type) {
    case 'todo': return feishu.todoTableId;
    case 'timeBlock': return feishu.timeBlockTableId;
    case 'note': return feishu.noteTableId;
    case 'tag': return feishu.tagTableId;
    case 'moodLog': return feishu.moodLogTableId || '';
  }
}

function getBaseUrl(): string {
  const { feishu } = useSettingsStore.getState();
  return `/api/feishu/bitable/v1/apps/${feishu.appToken}/tables`;
}

function getHeaders(): Record<string, string> {
  const { feishu } = useSettingsStore.getState();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  // #30: Only send app credentials if configured locally (backward compat with dev mode)
  if (feishu.appId && feishu.appSecret) {
    headers['X-Feishu-App-Id'] = feishu.appId;
    headers['X-Feishu-App-Secret'] = feishu.appSecret;
  }
  // Always send app token for server-side proxy
  headers['X-Feishu-App-Token'] = feishu.appToken;
  return headers;
}

// Map from our field names to Feishu record fields
function toFields(data: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === '_recordId') continue;
    // Feishu bitable stores dates as timestamps (local midnight)
    if (key === 'date' || key === 'created_at') {
      if (typeof value === 'string' && value) {
        // For "YYYY-MM-DD" strings, use local timezone parsing
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          fields[key] = dateToTimestamp(value);
        } else {
          // ISO datetime string — parse and convert to local-midnight timestamp
          const d = new Date(value);
          fields[key] = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        }
      }
    } else if (key === 'is_preset') {
      fields[key] = value ? 'true' : 'false';
    } else {
      fields[key] = value;
    }
  }
  return fields;
}

// Map from Feishu record fields to our data shape
function fromFields<T>(recordId: string, fields: Record<string, unknown>): T {
  const result: Record<string, unknown> = { _recordId: recordId };
  for (const [key, value] of Object.entries(fields)) {
    if (key === 'date' || key === 'created_at') {
      result[key] = ensureDateStr(value);
    } else if (key === 'is_preset') {
      result[key] = value === 'true';
    } else if (key === 'mood_score' || key === 'duration_minutes' || key === 'score') {
      result[key] = typeof value === 'number' ? value : Number(value) || 0;
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

async function request(url: string, options: RequestInit = {}): Promise<unknown> {
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers || {}) },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Feishu API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.code !== 0) {
    throw new Error(`Feishu API error: ${json.msg}`);
  }
  return json;
}

export const feishuApi = {
  /**
   * Test connection to Feishu
   */
  async testConnection(): Promise<boolean> {
    try {
      const { feishu } = useSettingsStore.getState();
      const res = await fetch(`/api/feishu/bitable/v1/apps/${feishu.appToken}/tables`, {
        headers: getHeaders(),
      });
      if (!res.ok) return false;
      const json = await res.json();
      return json.code === 0;
    } catch {
      return false;
    }
  },

  /**
   * List records from a table
   */
  async listRecords<T>(
    type: TableType,
    options?: { filter?: string; pageSize?: number }
  ): Promise<T[]> {
    const tableId = getTableId(type);
    if (!tableId) return [];

    const params = new URLSearchParams();
    if (options?.filter) params.set('filter', options.filter);
    if (options?.pageSize) params.set('page_size', String(options.pageSize));

    let allItems: T[] = [];
    let pageToken: string | undefined;

    do {
      if (pageToken) params.set('page_token', pageToken);
      const url = `${getBaseUrl()}/${tableId}/records?${params.toString()}`;
      const json = (await request(url)) as {
        data: {
          items?: { record_id: string; fields: Record<string, unknown> }[];
          has_more?: boolean;
          page_token?: string;
        };
      };

      const items = json.data?.items || [];
      allItems = allItems.concat(
        items.map((item) => fromFields<T>(item.record_id, item.fields))
      );
      pageToken = json.data?.has_more ? json.data.page_token : undefined;
    } while (pageToken);

    return allItems;
  },

  /**
   * Create a record
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createRecord(
    type: TableType,
    data: any
  ): Promise<string> {
    const tableId = getTableId(type);
    if (!tableId) throw new Error('Table not configured');

    const url = `${getBaseUrl()}/${tableId}/records`;
    const json = (await request(url, {
      method: 'POST',
      body: JSON.stringify({ fields: toFields(data) }),
    })) as { data: { record: { record_id: string } } };

    // Store record ID back
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data as any)._recordId = json.data.record.record_id;
    return json.data.record.record_id;
  },

  /**
   * Update a record
   */
  async updateRecord(
    type: TableType,
    recordId: string | undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any
  ): Promise<void> {
    if (!recordId) return;
    const tableId = getTableId(type);
    if (!tableId) return;

    const url = `${getBaseUrl()}/${tableId}/records/${recordId}`;
    await request(url, {
      method: 'PUT',
      body: JSON.stringify({ fields: toFields(data) }),
    });
  },

  /**
   * Delete a record
   */
  async deleteRecord(type: TableType, recordId: string | undefined): Promise<void> {
    if (!recordId) return;
    const tableId = getTableId(type);
    if (!tableId) return;

    const url = `${getBaseUrl()}/${tableId}/records/${recordId}`;
    await request(url, { method: 'DELETE' });
  },
};
