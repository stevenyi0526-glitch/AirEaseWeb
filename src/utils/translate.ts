/**
 * Translation utility for dynamic API-returned text.
 *
 * SerpAPI / backend return strings like airline names, airport names,
 * aircraft models, cabin classes, and amenity labels in English.
 * This module provides a **static dictionary** approach that maps common
 * English values to their Traditional Chinese equivalents.
 *
 * Usage:
 *   import { translateText } from '../utils/translate';
 *   translateText('Cathay Pacific', i18n.language)  => '國泰航空'
 *   translateText('Economy', i18n.language)          => '經濟艙'
 *   translateText('Unknown Airline', i18n.language)  => 'Unknown Airline' (passthrough)
 */

import i18n from '../i18n';

// ─── Airline names ───
const AIRLINES: Record<string, string> = {
  // Hong Kong & Greater China
  'Cathay Pacific': '國泰航空',
  'Cathay Pacific Airways': '國泰航空',
  'Hong Kong Airlines': '香港航空',
  'HK Express': '香港快運航空',
  'Greater Bay Airlines': '大灣區航空',
  'China Airlines': '中華航空',
  'EVA Air': '長榮航空',
  'China Eastern Airlines': '中國東方航空',
  'China Eastern': '中國東方航空',
  'China Southern Airlines': '中國南方航空',
  'China Southern': '中國南方航空',
  'Air China': '中國國際航空',
  'Hainan Airlines': '海南航空',
  'Shenzhen Airlines': '深圳航空',
  'Xiamen Airlines': '廈門航空',
  'Sichuan Airlines': '四川航空',
  'Spring Airlines': '春秋航空',
  'Juneyao Airlines': '吉祥航空',
  'Shanghai Airlines': '上海航空',
  'Tianjin Airlines': '天津航空',
  'Starlux Airlines': '星宇航空',
  'STARLUX': '星宇航空',
  'Mandarin Airlines': '華信航空',
  'Tigerair Taiwan': '台灣虎航',
  'Peach Aviation': '樂桃航空',

  // Japan
  'Japan Airlines': '日本航空',
  'All Nippon Airways': '全日空航空',
  'ANA': '全日空航空',
  'Peach': '樂桃航空',
  'Jetstar Japan': '捷星日本',
  'Skymark Airlines': '天馬航空',

  // Korea
  'Korean Air': '大韓航空',
  'Asiana Airlines': '韓亞航空',
  'Jin Air': '真航空',
  'Jeju Air': '濟州航空',
  'T\'way Air': '德威航空',

  // Southeast Asia
  'Singapore Airlines': '新加坡航空',
  'Thai Airways': '泰國國際航空',
  'Thai AirAsia': '泰國亞洲航空',
  'Vietnam Airlines': '越南航空',
  'Philippine Airlines': '菲律賓航空',
  'Malaysia Airlines': '馬來西亞航空',
  'AirAsia': '亞洲航空',
  'Cebu Pacific': '宿霧太平洋航空',
  'Garuda Indonesia': '嘉魯達印尼航空',
  'Scoot': '酷航',
  'VietJet Air': '越捷航空',
  'Bangkok Airways': '曼谷航空',

  // Middle East
  'Emirates': '阿聯酋航空',
  'Qatar Airways': '卡達航空',
  'Etihad Airways': '阿提哈德航空',
  'Turkish Airlines': '土耳其航空',
  'El Al': '以色列航空',

  // Europe
  'British Airways': '英國航空',
  'Lufthansa': '漢莎航空',
  'Air France': '法國航空',
  'KLM': '荷蘭皇家航空',
  'KLM Royal Dutch Airlines': '荷蘭皇家航空',
  'Swiss International Air Lines': '瑞士國際航空',
  'SWISS': '瑞士國際航空',
  'Austrian Airlines': '奧地利航空',
  'Finnair': '芬蘭航空',
  'SAS': '北歐航空',
  'Scandinavian Airlines': '北歐航空',
  'Iberia': '伊比利亞航空',
  'Alitalia': '意大利航空',
  'Aer Lingus': '愛爾蘭航空',
  'LOT Polish Airlines': '波蘭航空',
  'Ryanair': '瑞安航空',
  'EasyJet': '易捷航空',
  'Wizz Air': '威茲航空',
  'Norwegian Air': '挪威航空',
  'TAP Air Portugal': '葡萄牙航空',
  'Virgin Atlantic': '維珍大西洋航空',
  'Eurowings': '歐洲之翼航空',
  'Vueling': '伏林航空',

  // North America
  'United Airlines': '聯合航空',
  'Delta Air Lines': '達美航空',
  'Delta': '達美航空',
  'American Airlines': '美國航空',
  'Southwest Airlines': '西南航空',
  'JetBlue Airways': '捷藍航空',
  'JetBlue': '捷藍航空',
  'Alaska Airlines': '阿拉斯加航空',
  'Spirit Airlines': '精神航空',
  'Frontier Airlines': '邊疆航空',
  'Hawaiian Airlines': '夏威夷航空',
  'Air Canada': '加拿大航空',
  'WestJet': '西捷航空',

  // Oceania
  'Qantas': '澳洲航空',
  'Qantas Airways': '澳洲航空',
  'Air New Zealand': '紐西蘭航空',
  'Virgin Australia': '維珍澳洲航空',
  'Jetstar': '捷星航空',

  // India
  'Air India': '印度航空',
  'IndiGo': 'IndiGo 靛藍航空',
  'SpiceJet': '香料航空',

  // Africa / Latin America
  'Ethiopian Airlines': '衣索比亞航空',
  'South African Airways': '南非航空',
  'LATAM Airlines': '南美航空',
};

// ─── Airport names ───
const AIRPORTS: Record<string, string> = {
  // Hong Kong & China
  'Hong Kong International Airport': '香港國際機場',
  'Hong Kong Intl': '香港國際機場',
  'Beijing Capital International Airport': '北京首都國際機場',
  'Beijing Daxing International Airport': '北京大興國際機場',
  'Shanghai Pudong International Airport': '上海浦東國際機場',
  'Shanghai Hongqiao International Airport': '上海虹橋國際機場',
  'Guangzhou Baiyun International Airport': '廣州白雲國際機場',
  'Shenzhen Bao\'an International Airport': '深圳寶安國際機場',
  'Chengdu Tianfu International Airport': '成都天府國際機場',
  'Chongqing Jiangbei International Airport': '重慶江北國際機場',

  // Taiwan
  'Taiwan Taoyuan International Airport': '臺灣桃園國際機場',
  'Taipei Songshan Airport': '臺北松山機場',
  'Kaohsiung International Airport': '高雄國際機場',

  // Japan
  'Narita International Airport': '成田國際機場',
  'Tokyo Haneda Airport': '東京羽田機場',
  'Haneda Airport': '東京羽田機場',
  'Kansai International Airport': '關西國際機場',
  'New Chitose Airport': '新千歲機場',
  'Fukuoka Airport': '福岡機場',
  'Chubu Centrair International Airport': '中部國際機場',

  // Korea
  'Incheon International Airport': '仁川國際機場',
  'Gimpo International Airport': '金浦國際機場',

  // Southeast Asia
  'Changi Airport': '樟宜機場',
  'Singapore Changi Airport': '新加坡樟宜機場',
  'Suvarnabhumi Airport': '素萬那普機場',
  'Kuala Lumpur International Airport': '吉隆坡國際機場',
  'Ninoy Aquino International Airport': '尼諾伊·阿基諾國際機場',
  'Tan Son Nhat International Airport': '新山一國際機場',
  'Noi Bai International Airport': '內排國際機場',
  'Ngurah Rai International Airport': '伍拉·賴國際機場',

  // Major global hubs
  'London Heathrow Airport': '倫敦希斯洛機場',
  'Heathrow Airport': '希斯洛機場',
  'London Gatwick Airport': '倫敦蓋特威克機場',
  'Charles de Gaulle Airport': '戴高樂機場',
  'Frankfurt Airport': '法蘭克福機場',
  'Amsterdam Schiphol Airport': '阿姆斯特丹史基浦機場',
  'Dubai International Airport': '杜拜國際機場',
  'John F. Kennedy International Airport': '約翰·甘迺迪國際機場',
  'JFK International Airport': '甘迺迪國際機場',
  'Los Angeles International Airport': '洛杉磯國際機場',
  'San Francisco International Airport': '舊金山國際機場',
  "O'Hare International Airport": '芝加哥奧黑爾國際機場',
  'Sydney Kingsford Smith Airport': '雪梨金斯福德·史密斯機場',
  'Sydney Airport': '雪梨機場',
  'Melbourne Airport': '墨爾本機場',
  'Toronto Pearson International Airport': '多倫多皮爾遜國際機場',
  'Vancouver International Airport': '溫哥華國際機場',
  'Istanbul Airport': '伊斯坦堡機場',
  'Hamad International Airport': '哈馬德國際機場',
  'Indira Gandhi International Airport': '英迪拉·甘地國際機場',
};

// ─── City names ───
const CITIES: Record<string, string> = {
  'Hong Kong': '香港',
  'Tokyo': '東京',
  'Osaka': '大阪',
  'Seoul': '首爾',
  'Taipei': '台北',
  'Shanghai': '上海',
  'Beijing': '北京',
  'Guangzhou': '廣州',
  'Shenzhen': '深圳',
  'Chengdu': '成都',
  'Singapore': '新加坡',
  'Bangkok': '曼谷',
  'Kuala Lumpur': '吉隆坡',
  'Manila': '馬尼拉',
  'Jakarta': '雅加達',
  'Ho Chi Minh City': '胡志明市',
  'Hanoi': '河內',
  'London': '倫敦',
  'Paris': '巴黎',
  'Frankfurt': '法蘭克福',
  'Amsterdam': '阿姆斯特丹',
  'Rome': '羅馬',
  'Madrid': '馬德里',
  'Barcelona': '巴塞隆納',
  'Istanbul': '伊斯坦堡',
  'Zurich': '蘇黎世',
  'Vienna': '維也納',
  'New York': '紐約',
  'Los Angeles': '洛杉磯',
  'San Francisco': '舊金山',
  'Chicago': '芝加哥',
  'Miami': '邁阿密',
  'Toronto': '多倫多',
  'Vancouver': '溫哥華',
  'Sydney': '雪梨',
  'Melbourne': '墨爾本',
  'Auckland': '奧克蘭',
  'Dubai': '杜拜',
  'Doha': '多哈',
  'Delhi': '新德里',
  'Mumbai': '孟買',
  'Sapporo': '札幌',
  'Fukuoka': '福岡',
  'São Paulo': '聖保羅',
  'Mexico City': '墨西哥城',
  'Johannesburg': '約翰內斯堡',
  'Cairo': '開羅',
};

// ─── Cabin classes ───
const CABINS: Record<string, string> = {
  'Economy': '經濟艙',
  'economy': '經濟艙',
  'Premium Economy': '豪華經濟艙',
  'premium economy': '豪華經濟艙',
  'Business': '商務艙',
  'business': '商務艙',
  'Business Class': '商務艙',
  'First': '頭等艙',
  'first': '頭等艙',
  'First Class': '頭等艙',
};

// ─── Aircraft models ───
const AIRCRAFT: Record<string, string> = {
  'Boeing 737': '波音 737',
  'Boeing 737 MAX': '波音 737 MAX',
  'Boeing 737 MAX 8': '波音 737 MAX 8',
  'Boeing 747': '波音 747',
  'Boeing 747-400': '波音 747-400',
  'Boeing 747-8': '波音 747-8',
  'Boeing 757': '波音 757',
  'Boeing 767': '波音 767',
  'Boeing 777': '波音 777',
  'Boeing 777-200': '波音 777-200',
  'Boeing 777-300ER': '波音 777-300ER',
  'Boeing 787': '波音 787',
  'Boeing 787 Dreamliner': '波音 787 夢想客機',
  'Boeing 787-8': '波音 787-8',
  'Boeing 787-9': '波音 787-9',
  'Boeing 787-10': '波音 787-10',
  'Airbus A220': '空客 A220',
  'Airbus A300': '空客 A300',
  'Airbus A310': '空客 A310',
  'Airbus A318': '空客 A318',
  'Airbus A319': '空客 A319',
  'Airbus A320': '空客 A320',
  'Airbus A320neo': '空客 A320neo',
  'Airbus A321': '空客 A321',
  'Airbus A321neo': '空客 A321neo',
  'Airbus A330': '空客 A330',
  'Airbus A330-200': '空客 A330-200',
  'Airbus A330-300': '空客 A330-300',
  'Airbus A330-900neo': '空客 A330-900neo',
  'Airbus A340': '空客 A340',
  'Airbus A350': '空客 A350',
  'Airbus A350-900': '空客 A350-900',
  'Airbus A350-1000': '空客 A350-1000',
  'Airbus A380': '空客 A380',
  'Embraer 170': 'Embraer 170',
  'Embraer 175': 'Embraer 175',
  'Embraer 190': 'Embraer 190',
  'Embraer E195': 'Embraer E195',
  'ATR 72': 'ATR 72',
  'ATR 42': 'ATR 42',
  'Bombardier CRJ-700': '龐巴迪 CRJ-700',
  'Bombardier CRJ-900': '龐巴迪 CRJ-900',
  'De Havilland Dash 8': '德哈維蘭 Dash 8',
};

// ─── Amenity / IFE labels ───
const AMENITIES: Record<string, string> = {
  'On-demand video': '隨選影片',
  'Live TV': '直播電視',
  'Stream to device': '串流至裝置',
  'In-flight entertainment': '機上娛樂',
  'Hot meal': '熱食',
  'Meal included': '含餐食',
  'Snacks': '輕食',
  'No WiFi': '無 WiFi',
  'No Power': '無充電',
  'No IFE': '無機上娛樂',
  'No Meal': '無餐食',
  'No Wi-Fi': '無 WiFi',
  'Wi-Fi for a fee': '付費 WiFi',
  'Free Wi-Fi': '免費 WiFi',
  'Power outlets': '充電插座',
  'Power & USB outlets': '充電與 USB 插座',
  'USB outlets': 'USB 插座',
  'Extra reclining seat': '額外傾斜座椅',
  'Meal provided': '提供餐食',
  'Breakfast': '早餐',
  'Lunch': '午餐',
  'Dinner': '晚餐',
  'Refreshments': '茶點',
  'Personal device entertainment': '個人裝置娛樂',
  'Seatback screen': '椅背螢幕',
  'No meal': '無餐食',
  'Meal for a fee': '付費餐食',
  'Lie-flat seat': '平躺座椅',
  'Angled flat seat': '斜平躺座椅',
};

// ─── Misc labels used in SerpAPI extensions / tags ───
const MISC: Record<string, string> = {
  'Often delayed 30+ min': '經常延誤 30 分鐘以上',
  'Often Delayed': '經常延誤',
  'Direct flight': '直飛航班',
  'Direct Flight': '直飛航班',
  'Power outlets': '充電插座',
  'Above average': '高於平均',
  'Average': '平均',
  'Below average': '低於平均',
  'Above average legroom': '高於平均腿部空間',
  'Average legroom': '平均腿部空間',
  'Below average legroom': '低於平均腿部空間',
  'Extra Legroom': '加大腿部空間',
  'Jet': '噴射引擎',
  'Turbo-Fan': '渦輪風扇引擎',
  'Turbo-Prop': '渦輪螺旋槳引擎',
  'Turbo-Shaft': '渦輪軸引擎',
  'Turboprop': '渦輪螺旋槳',
  'Piston': '活塞引擎',
  'Reciprocating': '往復式引擎',
  'Electric': '電動引擎',
  'years old': '年',
  'year old': '年',
  'New Aircraft': '新機型',
  'Overnight': '過夜航班',
  'Red-eye': '紅眼航班',
  'Connecting': '轉機航班',
  '1 stop': '1 次轉機',
  '2 stops': '2 次轉機',
  'Nonstop': '直飛',
  'WiFi available': 'WiFi 可用',
  'In-flight entertainment': '機上娛樂',
  'Comfortable seating': '舒適座椅',
  'Less emissions': '排放量較少',
  'Low emission flight': '低排放航班',
  'Carbon emissions': '碳排放量',
};

// Combined lookup — merged into one map for fast searching
const ALL_TRANSLATIONS: Record<string, string> = {
  ...AIRLINES,
  ...AIRPORTS,
  ...CITIES,
  ...CABINS,
  ...AIRCRAFT,
  ...AMENITIES,
  ...MISC,
};

/**
 * Translate a dynamic API-returned English string to the current UI language.
 * Returns the original string when:
 *   - The current language is English, or
 *   - No translation is found in the dictionary.
 *
 * @param text   The English string from the API
 * @param lang   Optional language override; defaults to current i18n language
 */
export function translateText(text: string, lang?: string): string {
  const currentLang = lang ?? i18n.language;
  if (!text || currentLang === 'en') return text;

  // Exact match first
  if (ALL_TRANSLATIONS[text]) return ALL_TRANSLATIONS[text];

  // Case-insensitive match
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(ALL_TRANSLATIONS)) {
    if (key.toLowerCase() === lower) return val;
  }

  // Strip leading emoji / special chars and try again
  const stripped = text.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}⚠️❗❌✅⛔🔴🟡🟢]+\s*/u, '').trim();
  if (stripped !== text && ALL_TRANSLATIONS[stripped]) {
    return ALL_TRANSLATIONS[stripped];
  }

  // Partial match for aircraft age like "7 years old"
  if (/^\d+\s*years?\s*old$/i.test(text)) {
    const num = text.match(/\d+/)?.[0];
    return num ? `${num} 年` : text;
  }

  // Dynamic pattern: "X% less emissions" → "排放量減少 X%"
  const emissionsMatch = text.match(/^(\d+)%\s*less\s*emissions$/i);
  if (emissionsMatch) {
    return `排放量減少 ${emissionsMatch[1]}%`;
  }

  // Dynamic pattern: "X% more emissions" → "排放量增加 X%"
  const moreEmissionsMatch = text.match(/^(\d+)%\s*more\s*emissions$/i);
  if (moreEmissionsMatch) {
    return `排放量增加 ${moreEmissionsMatch[1]}%`;
  }

  // Dynamic pattern: "X% on-time rate" → "準點率 X%"
  const otpMatch = text.match(/^(\d+)%\s*on[- ]time\s*rate$/i);
  if (otpMatch) {
    return `準點率 ${otpMatch[1]}%`;
  }

  return text;
}

/**
 * Translate airline name
 */
export function translateAirline(name: string, lang?: string): string {
  const currentLang = lang ?? i18n.language;
  if (!name || currentLang === 'en') return name;
  return AIRLINES[name] ?? name;
}

/**
 * Translate airport name
 */
export function translateAirport(name: string, lang?: string): string {
  const currentLang = lang ?? i18n.language;
  if (!name || currentLang === 'en') return name;
  return AIRPORTS[name] ?? name;
}

/**
 * Translate city name
 */
export function translateCity(name: string, lang?: string): string {
  const currentLang = lang ?? i18n.language;
  if (!name || currentLang === 'en') return name;
  return CITIES[name] ?? name;
}

/**
 * Translate cabin class
 */
export function translateCabin(cabin: string, lang?: string): string {
  const currentLang = lang ?? i18n.language;
  if (!cabin || currentLang === 'en') return cabin;
  return CABINS[cabin] ?? cabin;
}

/**
 * Translate aircraft model
 */
export function translateAircraft(model: string, lang?: string): string {
  const currentLang = lang ?? i18n.language;
  if (!model || currentLang === 'en') return model;
  // Exact match
  if (AIRCRAFT[model]) return AIRCRAFT[model];
  // Partial match (e.g., "Airbus A330-300" may not be exact but "Airbus A330" exists)
  for (const [key, val] of Object.entries(AIRCRAFT)) {
    if (model.startsWith(key)) return val + model.slice(key.length);
  }
  return model;
}
