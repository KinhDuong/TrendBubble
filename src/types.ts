export interface CryptoData {
  change_1h: number;
  change_24h: number;
  change_7d: number;
  change_30d: number;
  change_1y: number;
  current_price: number;
  volume_24h: number;
  formatted: {
    change_1h: string;
    change_24h: string;
    change_7d: string;
    change_30d: string;
    change_1y: string;
    price: string;
    volume: string;
  };
}

export interface TrendingTopic {
  id?: string;
  name: string;
  searchVolume: number;
  searchVolumeRaw: string;
  url?: string;
  createdAt?: string;
  pubDate?: string;
  category?: string;
  source?: string;
  brand?: string;
  brandColor?: string;
  crypto_data?: CryptoData;
  note?: string;
  value?: number;
  originalRank?: number;
  monthlySearches?: Array<{ month: string; volume: number }>;
}

export type CryptoTimeframe = '1h' | '24h' | '7d' | '30d' | '1y';

export interface FAQ {
  id: string;
  page_id: string;
  question: string;
  answer: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  user_id?: string;
}
