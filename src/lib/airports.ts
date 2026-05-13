export interface Airport {
  code: string;
  city: string;
  name: string;
  country: string;
}

// Major international airports
export const AIRPORTS: Airport[] = [
  // Asia Pacific
  { code: 'HKG', city: 'Hong Kong', name: 'Hong Kong International Airport', country: 'Hong Kong' },
  { code: 'SIN', city: 'Singapore', name: 'Singapore Changi Airport', country: 'Singapore' },
  { code: 'NRT', city: 'Tokyo', name: 'Narita International Airport', country: 'Japan' },
  { code: 'HND', city: 'Tokyo', name: 'Haneda Airport', country: 'Japan' },
  { code: 'ICN', city: 'Seoul', name: 'Incheon International Airport', country: 'South Korea' },
  { code: 'BKK', city: 'Bangkok', name: 'Suvarnabhumi Airport', country: 'Thailand' },
  { code: 'SYD', city: 'Sydney', name: 'Sydney Kingsford Smith Airport', country: 'Australia' },
  { code: 'MEL', city: 'Melbourne', name: 'Melbourne Airport', country: 'Australia' },
  { code: 'PEK', city: 'Beijing', name: 'Beijing Capital International Airport', country: 'China' },
  { code: 'PVG', city: 'Shanghai', name: 'Shanghai Pudong International Airport', country: 'China' },
  { code: 'TPE', city: 'Taipei', name: 'Taiwan Taoyuan International Airport', country: 'Taiwan' },
  { code: 'KUL', city: 'Kuala Lumpur', name: 'Kuala Lumpur International Airport', country: 'Malaysia' },
  { code: 'MNL', city: 'Manila', name: 'Ninoy Aquino International Airport', country: 'Philippines' },
  { code: 'DEL', city: 'New Delhi', name: 'Indira Gandhi International Airport', country: 'India' },
  { code: 'BOM', city: 'Mumbai', name: 'Chhatrapati Shivaji Maharaj International Airport', country: 'India' },

  // Europe
  { code: 'LHR', city: 'London', name: 'London Heathrow Airport', country: 'United Kingdom' },
  { code: 'LGW', city: 'London', name: 'London Gatwick Airport', country: 'United Kingdom' },
  { code: 'CDG', city: 'Paris', name: 'Paris Charles de Gaulle Airport', country: 'France' },
  { code: 'FRA', city: 'Frankfurt', name: 'Frankfurt Airport', country: 'Germany' },
  { code: 'MUC', city: 'Munich', name: 'Munich Airport', country: 'Germany' },
  { code: 'AMS', city: 'Amsterdam', name: 'Amsterdam Schiphol Airport', country: 'Netherlands' },
  { code: 'MAD', city: 'Madrid', name: 'Madrid-Barajas Airport', country: 'Spain' },
  { code: 'BCN', city: 'Barcelona', name: 'Barcelona El Prat Airport', country: 'Spain' },
  { code: 'FCO', city: 'Rome', name: 'Leonardo da Vinci–Fiumicino Airport', country: 'Italy' },
  { code: 'ZRH', city: 'Zurich', name: 'Zurich Airport', country: 'Switzerland' },
  { code: 'VIE', city: 'Vienna', name: 'Vienna International Airport', country: 'Austria' },
  { code: 'IST', city: 'Istanbul', name: 'Istanbul Airport', country: 'Turkey' },

  // Middle East
  { code: 'DXB', city: 'Dubai', name: 'Dubai International Airport', country: 'United Arab Emirates' },
  { code: 'AUH', city: 'Abu Dhabi', name: 'Abu Dhabi International Airport', country: 'United Arab Emirates' },
  { code: 'DOH', city: 'Doha', name: 'Hamad International Airport', country: 'Qatar' },

  // North America
  { code: 'JFK', city: 'New York', name: 'John F. Kennedy International Airport', country: 'United States' },
  { code: 'LAX', city: 'Los Angeles', name: 'Los Angeles International Airport', country: 'United States' },
  { code: 'SFO', city: 'San Francisco', name: 'San Francisco International Airport', country: 'United States' },
  { code: 'ORD', city: 'Chicago', name: "O'Hare International Airport", country: 'United States' },
  { code: 'MIA', city: 'Miami', name: 'Miami International Airport', country: 'United States' },
  { code: 'DFW', city: 'Dallas', name: 'Dallas/Fort Worth International Airport', country: 'United States' },
  { code: 'SEA', city: 'Seattle', name: 'Seattle-Tacoma International Airport', country: 'United States' },
  { code: 'BOS', city: 'Boston', name: 'Boston Logan International Airport', country: 'United States' },
  { code: 'ATL', city: 'Atlanta', name: 'Hartsfield-Jackson Atlanta International Airport', country: 'United States' },
  { code: 'DEN', city: 'Denver', name: 'Denver International Airport', country: 'United States' },
  { code: 'YYZ', city: 'Toronto', name: 'Toronto Pearson International Airport', country: 'Canada' },
  { code: 'YVR', city: 'Vancouver', name: 'Vancouver International Airport', country: 'Canada' },
  { code: 'IAD', city: 'Washington', name: 'Washington Dulles International Airport', country: 'United States' },
  { code: 'DCA', city: 'Washington', name: 'Ronald Reagan Washington National Airport', country: 'United States' },
  { code: 'IAH', city: 'Houston', name: 'George Bush Intercontinental Airport', country: 'United States' },
  { code: 'PHL', city: 'Philadelphia', name: 'Philadelphia International Airport', country: 'United States' },
  { code: 'PHX', city: 'Phoenix', name: 'Phoenix Sky Harbor International Airport', country: 'United States' },
  { code: 'LAS', city: 'Las Vegas', name: 'Harry Reid International Airport', country: 'United States' },
  { code: 'MSP', city: 'Minneapolis', name: 'Minneapolis-Saint Paul International Airport', country: 'United States' },
];

// Bug 2548284: Amadeus 自动补全对中文地名识别不一致（如"华盛顿"返回为空）。
// 在本地兜底搜索中提供常见中文/繁体中文别名 → 英文城市的映射，让传统搜寻
// 至少能匹配到本地机场列表中的同城机场。
const CJK_CITY_ALIASES: Record<string, string> = {
  '华盛顿': 'Washington',
  '華盛頓': 'Washington',
  '北京': 'Beijing',
  '上海': 'Shanghai',
  '香港': 'Hong Kong',
  '东京': 'Tokyo',
  '東京': 'Tokyo',
  '首尔': 'Seoul',
  '首爾': 'Seoul',
  '新加坡': 'Singapore',
  '曼谷': 'Bangkok',
  '伦敦': 'London',
  '倫敦': 'London',
  '巴黎': 'Paris',
  '法兰克福': 'Frankfurt',
  '法蘭克福': 'Frankfurt',
  '罗马': 'Rome',
  '羅馬': 'Rome',
  '迪拜': 'Dubai',
  '杜拜': 'Dubai',
  '多哈': 'Doha',
  '纽约': 'New York',
  '紐約': 'New York',
  '洛杉矶': 'Los Angeles',
  '洛杉磯': 'Los Angeles',
  '旧金山': 'San Francisco',
  '舊金山': 'San Francisco',
  '芝加哥': 'Chicago',
  '迈阿密': 'Miami',
  '邁阿密': 'Miami',
  '西雅图': 'Seattle',
  '西雅圖': 'Seattle',
  '波士顿': 'Boston',
  '波士頓': 'Boston',
  '亚特兰大': 'Atlanta',
  '亞特蘭大': 'Atlanta',
  '丹佛': 'Denver',
  '多伦多': 'Toronto',
  '多倫多': 'Toronto',
  '温哥华': 'Vancouver',
  '溫哥華': 'Vancouver',
  '台北': 'Taipei',
  '吉隆坡': 'Kuala Lumpur',
  '马尼拉': 'Manila',
  '馬尼拉': 'Manila',
  '新德里': 'New Delhi',
  '孟买': 'Mumbai',
  '孟買': 'Mumbai',
  '悉尼': 'Sydney',
  '雪梨': 'Sydney',
  '墨尔本': 'Melbourne',
  '墨爾本': 'Melbourne',
  '休斯顿': 'Houston',
  '休斯敦': 'Houston',
  '休士頓': 'Houston',
  '费城': 'Philadelphia',
  '費城': 'Philadelphia',
  '凤凰城': 'Phoenix',
  '鳳凰城': 'Phoenix',
  '拉斯维加斯': 'Las Vegas',
  '拉斯維加斯': 'Las Vegas',
  '明尼阿波利斯': 'Minneapolis',
  '明尼阿波利斯市': 'Minneapolis',
  // Bug 2548086 / 2548112 / 2548192 / 2548383
  '雷克雅未克': 'Reykjavik',
  '雷克雅維克': 'Reykjavik',
  '雷克雅维克': 'Reykjavik',
  '聖彼得堡': 'Saint Petersburg',
  '圣彼得堡': 'Saint Petersburg',
  '聖彼德堡': 'Saint Petersburg',
  '圣彼德堡': 'Saint Petersburg',
  '莫斯科': 'Moscow',
  '喀什': 'Kashgar',
  '喀什噶爾': 'Kashgar',
  '喀什噶尔': 'Kashgar',
  '海口': 'Haikou',
  '三亚': 'Sanya',
  '三亞': 'Sanya',
  '广州': 'Guangzhou',
  '廣州': 'Guangzhou',
  '深圳': 'Shenzhen',
  '成都': 'Chengdu',
  '杭州': 'Hangzhou',
  '南京': 'Nanjing',
  '青岛': 'Qingdao',
  '青島': 'Qingdao',
  '厦门': 'Xiamen',
  '廈門': 'Xiamen',
};

// Search airports by query (code, city, or name)
export function searchAirports(query: string, limit: number = 10): Airport[] {
  // Bug 2548109: 中文 / 日文输入单字时(如 "上")也应能命中 "上海/上海浦东"，
  // 不能像英文那样要求至少两个字符。
  const hasCjk = /[\u3400-\u9fff]/.test(query || '');
  const minLen = hasCjk ? 1 : 2;
  if (!query || query.length < minLen) {
    return AIRPORTS.slice(0, limit);
  }

  // Bug 2548284: 中文/繁体输入先经过别名映射，再走原有的英文匹配。
  // Bug 2548109: 当用户只输入单字(如 "上") 时，也尝试用 startsWith 匹配
  // 别名表里的城市名，让 "上" → "上海" → "Shanghai" 也能命中。
  let aliasMatchKey: string | undefined = Object.keys(CJK_CITY_ALIASES).find((alias) =>
    query.includes(alias),
  );
  if (!aliasMatchKey && /[\u3400-\u9fff]/.test(query)) {
    aliasMatchKey = Object.keys(CJK_CITY_ALIASES).find((alias) => alias.startsWith(query));
  }
  const effectiveQuery = aliasMatchKey ? CJK_CITY_ALIASES[aliasMatchKey] : query;
  const q = effectiveQuery.toLowerCase();

  // Exact code match first
  const exactMatch = AIRPORTS.filter(a => a.code.toLowerCase() === q);
  if (exactMatch.length > 0) {
    return exactMatch;
  }

  // Then search by code, city, name
  return AIRPORTS.filter(airport =>
    airport.code.toLowerCase().includes(q) ||
    airport.city.toLowerCase().includes(q) ||
    airport.name.toLowerCase().includes(q) ||
    airport.country.toLowerCase().includes(q)
  ).slice(0, limit);
}

// Get airport by code
export function getAirportByCode(code: string): Airport | undefined {
  return AIRPORTS.find(a => a.code.toUpperCase() === code.toUpperCase());
}

// Popular routes for suggestions
export const POPULAR_ROUTES = [
  { from: 'HKG', to: 'LHR' },
  { from: 'HKG', to: 'NRT' },
  { from: 'SIN', to: 'LHR' },
  { from: 'JFK', to: 'LAX' },
  { from: 'LAX', to: 'NRT' },
  { from: 'LHR', to: 'JFK' },
  { from: 'DXB', to: 'LHR' },
  { from: 'SYD', to: 'LAX' },
];
