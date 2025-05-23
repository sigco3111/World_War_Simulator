
export interface CountryDetails {
  id: string; // Corresponds to feature.id from TopoJSON
  국가명: string;
  인구수?: number;
  GDP?: number; // In USD
  국방예산?: number; // In USD
  군사력순위?: string; // Global Firepower Index string (e.g., "1위")
  경제력?: number; // Scaled 1-1000
  육군전투력?: number; // Scaled 1-1000
  해군전투력?: number; // Scaled 1-1000
  공군전투력?: number; // Scaled 1-1000
  기술력?: number; // Scaled 1-1000 (New)
  외교력?: number; // Scaled 1-1000 (New)
  자원보유량?: number; // Scaled 1-1000 (New)
  주요군사자산?: string[];
  추가정보?: string; // For countries where specific data isn't available or for general notes
}

// Helper function to parse monetary values like "1조 2,345억 달러" or "500억 달러"
function parseMonetaryValue(valueStr?: string): number | undefined {
  if (!valueStr) return undefined;
  let numStr = valueStr.replace(/약|달러|,|\s*\(.*?\)/g, ''); 
  
  let totalValue = 0;
  const joPattern = /(\d+)조/;
  const eokPattern = /(\d+)억/;

  const joMatch = numStr.match(joPattern);
  if (joMatch) {
    totalValue += parseFloat(joMatch[1]) * 1e12; 
    numStr = numStr.replace(joPattern, ''); 
  }

  const eokMatch = numStr.match(eokPattern);
  if (eokMatch) {
    totalValue += parseFloat(eokMatch[1]) * 1e8; 
    numStr = numStr.replace(eokPattern, '');
  }
  
  const remainingNum = parseFloat(numStr);
  if (!isNaN(remainingNum) && (joMatch || eokMatch)) {
    // If there were 조 or 억, any remaining number is likely part of that (e.g. "1조 5000억" where 5000 is already handled by eok)
    // Or it could be smaller units, but our regex is simple.
    // For simplicity, we assume 조 and 억 are the main drivers if present.
  } else if (!isNaN(remainingNum) && !joMatch && !eokMatch && valueStr.includes('달러')) {
    // Handles cases like "5000 달러" or "1234.56 달러" (though our current data doesn't use decimals in strings)
    totalValue += remainingNum;
  }


  return totalValue > 0 ? totalValue : undefined;
}


// Helper function to parse population values like "3억 3,990만 명"
function parsePopulationValue(valueStr?: string): number | undefined {
  if (!valueStr) return undefined;
  let numStr = valueStr.replace(/약|명|,|\s*\(.*?\)/g, ''); 

  let totalValue = 0;
  const eokPattern = /(\d+)억/;
  const manPattern = /(\d+)만/;

  const eokMatch = numStr.match(eokPattern);
  if (eokMatch) {
    totalValue += parseFloat(eokMatch[1]) * 1e8; 
    numStr = numStr.replace(eokPattern, '');
  }

  const manMatch = numStr.match(manPattern);
  if (manMatch) {
    totalValue += parseFloat(manMatch[1]) * 1e4; 
    numStr = numStr.replace(manPattern, '');
  }
  
  return totalValue > 0 ? totalValue : undefined;
}

function parseMilitaryRank(rankStr?: string): number | undefined {
  if (!rankStr) return undefined;
  const match = rankStr.match(/(\d+)위/);
  return match ? parseInt(match[1], 10) : undefined;
}

// --- Raw String Data (to be transformed) ---
const rawCountryData: Record<string, Omit<CountryDetails, '인구수' | 'GDP' | '국방예산' | '경제력' | '육군전투력' | '해군전투력' | '공군전투력' | '기술력' | '외교력' | '자원보유량'> & { 인구수_str?: string; GDP_str?: string; 국방예산_str?: string; }> = {
  "840": { id: "840", 국가명: "미합중국", 인구수_str: "약 3억 3,990만 명 (2023년 추정)", GDP_str: "약 26조 9,500억 달러 (2023년 명목)", 군사력순위: "1위 (GFP 2024)", 주요군사자산: ["항공모함 11척", "F-22 Raptor, F-35 Lightning II 전투기", "핵탄두 다수 보유", "이지스 전투시스템"], 국방예산_str: "약 8,770억 달러 (2023년)" },
  "410": { id: "410", 국가명: "대한민국", 인구수_str: "약 5,180만 명 (2023년 추정)", GDP_str: "약 1조 7,200억 달러 (2023년 명목)", 군사력순위: "5위 (GFP 2024)", 주요군사자산: ["K2 흑표 전차", "세종대왕급 이지스 구축함", "KF-21 보라매 전투기(개발중)", "현무 미사일"], 국방예산_str: "약 460억 달러 (2023년)" },
  "156": { id: "156", 국가명: "중화인민공화국", 인구수_str: "약 14억 2,500만 명 (2023년 추정)", GDP_str: "약 17조 7,000억 달러 (2023년 명목)", 군사력순위: "3위 (GFP 2024)", 주요군사자산: ["항공모함 3척 (랴오닝함, 산둥함, 푸젠함)", "J-20 스텔스 전투기", "DF 시리즈 탄도 미사일"], 국방예산_str: "약 2,920억 달러 (2023년 추정)" },
  "392": { id: "392", 국가명: "일본", 인구수_str: "약 1억 2,330만 명 (2023년 추정)", GDP_str: "약 4조 2,300억 달러 (2023년 명목)", 군사력순위: "7위 (GFP 2024)", 주요군사자산: ["이즈모급 다목적 운용모함", "F-35 전투기 도입 중", "해상자위대 전력 우수"], 국방예산_str: "약 480억 달러 (FY2023)" },
  "643": { id: "643", 국가명: "러시아 연방", 인구수_str: "약 1억 4,440만 명 (2023년 추정)", GDP_str: "약 1조 8,600억 달러 (2023년 명목)", 군사력순위: "2위 (GFP 2024)", 주요군사자산: ["핵탄두 최다 보유국", "Su-57 스텔스 전투기", "S-400/S-500 방공 시스템", "야센급 핵잠수함"], 국방예산_str: "약 860억 달러 (2023년 추정)" },
  "356": { id: "356", 국가명: "인도", 인구수_str: "약 14억 2,800만 명 (2023년 추정, 세계 1위)", GDP_str: "약 3조 7,300억 달러 (2023년 명목)", 군사력순위: "4위 (GFP 2024)", 주요군사자산: ["항공모함 2척 (비크라마디티야, 비크란트)", "수호이 Su-30MKI 전투기", "브라모스 초음속 순항 미사일"], 국방예산_str: "약 814억 달러 (2023년)" },
  "826": { id: "826", 국가명: "영국", 인구수_str: "약 6,770만 명 (2023년 추정)", GDP_str: "약 3조 1,300억 달러 (2023년 명목)", 군사력순위: "6위 (GFP 2024)", 주요군사자산: ["퀸 엘리자베스급 항공모함 2척", "유로파이터 타이푼 전투기", "뱅가드급 핵잠수함"], 국방예산_str: "약 685억 달러 (2023년)" },
  "250": { id: "250", 국가명: "프랑스", 인구수_str: "약 6,480만 명 (2023년 추정)", GDP_str: "약 2조 9,200억 달러 (2023년 명목)", 군사력순위: "11위 (GFP 2024)", 주요군사자산: ["샤를 드골 항공모함", "라팔 전투기", "핵탄두 보유"], 국방예산_str: "약 566억 달러 (2023년)" },
  "276": { id: "276", 국가명: "독일", 인구수_str: "약 8,320만 명 (2023년 추정)", GDP_str: "약 4조 4,300억 달러 (2023년 명목)", 군사력순위: "19위 (GFP 2024)", 주요군사자산: ["레오파르트 2 전차", "유로파이터 타이푼 전투기", "잠수함 전력"], 국방예산_str: "약 558억 달러 (2023년)" },
  "076": { id: "076", 국가명: "브라질", 인구수_str: "약 2억 1,640만 명 (2023년 추정)", GDP_str: "약 2조 800억 달러 (2023년 명목)", 군사력순위: "12위 (GFP 2024)", 주요군사자산: ["그리펜 전투기 도입 중", "해군 함정 다수", "상당 규모의 병력"], 국방예산_str: "약 200억 달러 (2023년 추정)" },
  
  "124": { id: "124", 국가명: "캐나다", 인구수_str: "약 3,870만 명 (2023년)", GDP_str: "약 2조 1,400억 달러 (2023년)", 군사력순위: "27위 (GFP 2024)", 주요군사자산: ["CF-18 호넷 전투기", "다목적 호위함", "북극 순찰 역량 강화 중"], 국방예산_str: "약 269억 달러 (2023년)" }, 
  "036": { id: "036", 국가명: "오스트레일리아 (호주)", 인구수_str: "약 2,640만 명 (2023년)", GDP_str: "약 1조 7,000억 달러 (2023년)", 군사력순위: "16위 (GFP 2024)", 주요군사자산: ["F-35A 전투기", "콜린스급 잠수함", "호바트급 이지스 구축함"], 국방예산_str: "약 323억 달러 (2023년)" }, 
  "484": { id: "484", 국가명: "멕시코", 인구수_str: "약 1억 2,850만 명 (2023년)", GDP_str: "약 1조 4,100억 달러 (2023년)", 군사력순위: "31위 (GFP 2024)", 주요군사자산: ["해군 순찰함", "경수송기", "국내 치안 유지 중심"], 국방예산_str: "약 118억 달러 (2023년)" }, 
  "032": { id: "032", 국가명: "아르헨티나", 인구수_str: "약 4,580만 명 (2023년)", GDP_str: "약 6,300억 달러 (2023년)", 군사력순위: "26위 (GFP 2024)", 주요군사자산: ["경공격기 IA-63 Pampa", "구축함 및 초계함", "경제난으로 현대화 지연"], 국방예산_str: "약 40억 달러 (2023년 추정)" }, 
  "818": { id: "818", 국가명: "이집트", 인구수_str: "약 1억 930만 명 (2023년)", GDP_str: "약 3,940억 달러 (2023년)", 군사력순위: "14위 (GFP 2024)", 주요군사자산: ["M1 에이브람스 전차", "라팔, F-16 전투기", "미스트랄급 강습상륙함"], 국방예산_str: "약 90억 달러 (2023년 추정)" }, 
  "792": { id: "792", 국가명: "튀르키예", 인구수_str: "약 8,530만 명 (2023년)", GDP_str: "약 1조 1,500억 달러 (2023년)", 군사력순위: "8위 (GFP 2024)", 주요군사자산: ["바이락타르 TB2 드론", "F-16 전투기", "자국산 방산 제품 개발 활발"], 국방예산_str: "약 160억 달러 (2023년 공식, 실제 더 높을 수 있음)" }, 
  "360": { id: "360", 국가명: "인도네시아", 인구수_str: "약 2억 7,750만 명 (2023년)", GDP_str: "약 1조 3,200억 달러 (2023년)", 군사력순위: "13위 (GFP 2024)", 주요군사자산: ["수호이 Su-27/30 전투기", "해군 프리깃함", "광대한 해역 경비"], 국방예산_str: "약 250억 달러 (2023년)" }, 
  "682": { id: "682", 국가명: "사우디아라비아", 인구수_str: "약 3,640만 명 (2023년)", GDP_str: "약 1조 1,000억 달러 (2023년)", 군사력순위: "23위 (GFP 2024)", 주요군사자산: ["F-15 전투기", "패트리엇 미사일 시스템", "최신 서방제 무기 다수"], 국방예산_str: "약 750억 달러 (2023년)" }, 
  "566": { id: "566", 국가명: "나이지리아", 인구수_str: "약 2억 2,380만 명 (2023년)", GDP_str: "약 4,700억 달러 (2023년)", 군사력순위: "36위 (GFP 2024)", 주요군사자산: ["JF-17 전투기", "해군 초계정", "대테러 작전 수행"], 국방예산_str: "약 26억 달러 (2023년)" }, 
  "710": { id: "710", 국가명: "남아프리카 공화국", 인구수_str: "약 6,040만 명 (2023년)", GDP_str: "약 3,990억 달러 (2023년)", 군사력순위: "33위 (GFP 2024)", 주요군사자산: ["루이발크 공격헬기", "그리펜 전투기", "발러급 프리깃함"], 국방예산_str: "약 30억 달러 (2023년)" }, 

  // New countries
  "408": { id: "408", 국가명: "조선민주주의인민공화국", 인구수_str: "약 2,610만 명 (2023년 추정)", GDP_str: "약 300억 달러 (추정치)", 군사력순위: "36위 (GFP 2024)", 주요군사자산: ["핵무기 프로그램", "화성 시리즈 탄도 미사일", "대규모 재래식 육군"], 국방예산_str: "약 45억 달러 (GDP의 약 15% 추정)" },
  "704": { id: "704", 국가명: "베트남 사회주의 공화국", 인구수_str: "약 9,950만 명 (2023년 추정)", GDP_str: "약 4,300억 달러 (2023년 명목)", 군사력순위: "22위 (GFP 2024)", 주요군사자산: ["킬로급 잠수함 6척", "Su-30MK2 전투기", "바스티온-P 해안 방어 미사일"], 국방예산_str: "약 70억 달러 (2023년 추정)" },
  "380": { id: "380", 국가명: "이탈리아 공화국", 인구수_str: "약 5,880만 명 (2023년 추정)", GDP_str: "약 2조 1,700억 달러 (2023년 명목)", 군사력순위: "10위 (GFP 2024)", 주요군사자산: ["카보우르 항공모함", "유로파이터 타이푼 전투기", "FREMM급 호위함", "F-35 전투기"], 국방예산_str: "약 316억 달러 (2023년)" },
  "616": { id: "616", 국가명: "폴란드 공화국", 인구수_str: "약 3,770만 명 (2023년 추정)", GDP_str: "약 8,420억 달러 (2023년 명목)", 군사력순위: "21위 (GFP 2024)", 주요군사자산: ["레오파르트 2 전차", "F-16 전투기", "K2/M1A2 전차 도입 중", "HIMARS/천무 다연장로켓"], 국방예산_str: "약 280억 달러 (2023년 추정)" },

  "DEFAULT": { id: "DEFAULT", 국가명: "정보 없음", 추가정보: "이 지역/국가에 대한 구체적인 통계는 집계되지 않았습니다. 표시된 수치는 일반적인 최소 추정치입니다."}
};

// --- Transformed Data ---
export const countryDetailsData: Record<string, CountryDetails> = Object.entries(rawCountryData).reduce((acc, [key, rawData]) => {
  const 인구수 = parsePopulationValue(rawData.인구수_str);
  const GDP = parseMonetaryValue(rawData.GDP_str);
  const 국방예산 = parseMonetaryValue(rawData.국방예산_str);
  const militaryRank = parseMilitaryRank(rawData.군사력순위);

  let 경제력: number | undefined;
  if (GDP) {
    const gdpInTrillions = GDP / 1e12;
    경제력 = Math.min(1000, Math.max(50, Math.round(gdpInTrillions * 35))); // Scale to 1000
  }

  let 육군전투력: number | undefined;
  let 해군전투력: number | undefined;
  let 공군전투력: number | undefined;

  if (militaryRank) {
    const totalMilitaryPoints = Math.max(150, Math.round(1050 - militaryRank * 25)); // Scale to ~1000
    // Subjective distribution based on rank and known strengths
    if (key === "840") { // USA
      육군전투력 = Math.round(totalMilitaryPoints * 0.33); 해군전투력 = Math.round(totalMilitaryPoints * 0.34); 공군전투력 = Math.round(totalMilitaryPoints * 0.33);
    } else if (key === "643") { // Russia
      육군전투력 = Math.round(totalMilitaryPoints * 0.35); 해군전투력 = Math.round(totalMilitaryPoints * 0.30); 공군전투력 = Math.round(totalMilitaryPoints * 0.35);
    } else if (key === "156") { // China
      육군전투력 = Math.round(totalMilitaryPoints * 0.38); 해군전투력 = Math.round(totalMilitaryPoints * 0.30); 공군전투력 = Math.round(totalMilitaryPoints * 0.32);
    } else if (key === "356") { // India
      육군전투력 = Math.round(totalMilitaryPoints * 0.35); 해군전투력 = Math.round(totalMilitaryPoints * 0.28); 공군전투력 = Math.round(totalMilitaryPoints * 0.37);
    } else if (key === "410") { // South Korea
      육군전투력 = Math.round(totalMilitaryPoints * 0.35); 해군전투력 = Math.round(totalMilitaryPoints * 0.30); 공군전투력 = Math.round(totalMilitaryPoints * 0.35);
    } else if (key === "826") { // UK
      육군전투력 = Math.round(totalMilitaryPoints * 0.28); 해군전투력 = Math.round(totalMilitaryPoints * 0.37); 공군전투력 = Math.round(totalMilitaryPoints * 0.35);
    } else if (key === "392") { // Japan
      육군전투력 = Math.round(totalMilitaryPoints * 0.28); 해군전투력 = Math.round(totalMilitaryPoints * 0.38); 공군전투력 = Math.round(totalMilitaryPoints * 0.34);
    } else if (key === "250") { // France
      육군전투력 = Math.round(totalMilitaryPoints * 0.32); 해군전투력 = Math.round(totalMilitaryPoints * 0.36); 공군전투력 = Math.round(totalMilitaryPoints * 0.32);
    } else if (key === "076") { // Brazil
      육군전투력 = Math.round(totalMilitaryPoints * 0.40); 해군전투력 = Math.round(totalMilitaryPoints * 0.27); 공군전투력 = Math.round(totalMilitaryPoints * 0.33);
    } else if (key === "276") { // Germany
      육군전투력 = Math.round(totalMilitaryPoints * 0.34); 해군전투력 = Math.round(totalMilitaryPoints * 0.26); 공군전투력 = Math.round(totalMilitaryPoints * 0.40);
    } else if (key === "792") { // Turkey
      육군전투력 = Math.round(totalMilitaryPoints * 0.36); 해군전투력 = Math.round(totalMilitaryPoints * 0.28); 공군전투력 = Math.round(totalMilitaryPoints * 0.36);
    } else if (key === "036") { // Australia
      육군전투력 = Math.round(totalMilitaryPoints * 0.30); 해군전투력 = Math.round(totalMilitaryPoints * 0.35); 공군전투력 = Math.round(totalMilitaryPoints * 0.35);
    } else if (key === "360") { // Indonesia
      육군전투력 = Math.round(totalMilitaryPoints * 0.38); 해군전투력 = Math.round(totalMilitaryPoints * 0.32); 공군전투력 = Math.round(totalMilitaryPoints * 0.30);
    } else if (key === "818") { // Egypt
      육군전투력 = Math.round(totalMilitaryPoints * 0.40); 해군전투력 = Math.round(totalMilitaryPoints * 0.25); 공군전투력 = Math.round(totalMilitaryPoints * 0.35);
    } else if (key === "682") { // Saudi Arabia
      육군전투력 = Math.round(totalMilitaryPoints * 0.33); 해군전투력 = Math.round(totalMilitaryPoints * 0.27); 공군전투력 = Math.round(totalMilitaryPoints * 0.40);
    } else if (key === "380") { // Italy
      육군전투력 = Math.round(totalMilitaryPoints * 0.30); 해군전투력 = Math.round(totalMilitaryPoints * 0.38); 공군전투력 = Math.round(totalMilitaryPoints * 0.32);
    } else if (key === "616") { // Poland
      육군전투력 = Math.round(totalMilitaryPoints * 0.45); 해군전투력 = Math.round(totalMilitaryPoints * 0.20); 공군전투력 = Math.round(totalMilitaryPoints * 0.35);
    } else if (key === "704") { // Vietnam
      육군전투력 = Math.round(totalMilitaryPoints * 0.38); 해군전투력 = Math.round(totalMilitaryPoints * 0.32); 공군전투력 = Math.round(totalMilitaryPoints * 0.30);
    } else if (key === "408") { // North Korea
      육군전투력 = Math.round(totalMilitaryPoints * 0.60); 해군전투력 = Math.round(totalMilitaryPoints * 0.15); 공군전투력 = Math.round(totalMilitaryPoints * 0.25);
    } else { // Generic fallback for other ranked countries
      육군전투력 = Math.round(totalMilitaryPoints * 0.34); 해군전투력 = Math.round(totalMilitaryPoints * 0.33); 공군전투력 = Math.round(totalMilitaryPoints * 0.33);
    }
  }
  
  // Subjective new scores (1-1000)
  let 기술력: number | undefined;
  let 외교력: number | undefined;
  let 자원보유량: number | undefined;

  if (key !== "DEFAULT") {
    switch (key) {
      case "840": 기술력 = 950; 외교력 = 900; 자원보유량 = 750; break; // USA
      case "156": 기술력 = 850; 외교력 = 800; 자원보유량 = 700; break; // China
      case "643": 기술력 = 750; 외교력 = 650; 자원보유량 = 920; break; // Russia
      case "410": 기술력 = 900; 외교력 = 650; 자원보유량 = 250; break; // South Korea
      case "392": 기술력 = 920; 외교력 = 700; 자원보유량 = 300; break; // Japan
      case "356": 기술력 = 720; 외교력 = 730; 자원보유량 = 550; break; // India
      case "826": 기술력 = 830; 외교력 = 740; 자원보유량 = 450; break; // UK
      case "250": 기술력 = 810; 외교력 = 720; 자원보유량 = 400; break; // France
      case "276": 기술력 = 880; 외교력 = 780; 자원보유량 = 350; break; // Germany
      case "076": 기술력 = 600; 외교력 = 620; 자원보유량 = 850; break; // Brazil
      case "124": 기술력 = 800; 외교력 = 750; 자원보유량 = 900; break; // Canada
      case "036": 기술력 = 780; 외교력 = 700; 자원보유량 = 800; break; // Australia
      case "484": 기술력 = 550; 외교력 = 600; 자원보유량 = 650; break; // Mexico
      case "032": 기술력 = 500; 외교력 = 520; 자원보유량 = 700; break; // Argentina
      case "818": 기술력 = 450; 외교력 = 580; 자원보유량 = 500; break; // Egypt
      case "792": 기술력 = 680; 외교력 = 710; 자원보유량 = 400; break; // Turkey
      case "360": 기술력 = 520; 외교력 = 630; 자원보유량 = 720; break; // Indonesia
      case "682": 기술력 = 650; 외교력 = 760; 자원보유량 = 950; break; // Saudi Arabia
      case "566": 기술력 = 350; 외교력 = 450; 자원보유량 = 750; break; // Nigeria
      case "710": 기술력 = 580; 외교력 = 550; 자원보유량 = 680; break; // South Africa
      case "380": 기술력 = 860; 외교력 = 820; 자원보유량 = 320; break; // Italy
      case "616": 기술력 = 750; 외교력 = 680; 자원보유량 = 480; break; // Poland
      case "704": 기술력 = 620; 외교력 = 580; 자원보유량 = 600; break; // Vietnam
      case "408": 기술력 = 400; 외교력 = 150; 자원보유량 = 520; break; // North Korea
      default:  기술력 = 300; 외교력 = 300; 자원보유량 = 300; // Generic for any other unspecified but ranked
    }
  }

  const transformedData: CountryDetails = {
    id: rawData.id,
    국가명: rawData.국가명,
    인구수,
    GDP,
    국방예산,
    군사력순위: rawData.군사력순위,
    경제력,
    육군전투력,
    해군전투력,
    공군전투력,
    기술력,
    외교력,
    자원보유량,
    주요군사자산: rawData.주요군사자산,
  };

  if (key === "DEFAULT") {
    transformedData.추가정보 = rawData.추가정보;
    transformedData.인구수 = transformedData.인구수 ?? 1000000;
    transformedData.GDP = transformedData.GDP ?? 1000000000; 
    transformedData.국방예산 = transformedData.국방예산 ?? 10000000; 
    transformedData.경제력 = transformedData.경제력 ?? 50;
    transformedData.육군전투력 = transformedData.육군전투력 ?? 50;
    transformedData.해군전투력 = transformedData.해군전투력 ?? 50;
    transformedData.공군전투력 = transformedData.공군전투력 ?? 50;
    transformedData.기술력 = transformedData.기술력 ?? 50;
    transformedData.외교력 = transformedData.외교력 ?? 50;
    transformedData.자원보유량 = transformedData.자원보유량 ?? 50;
  } else if (!인구수 || !GDP || !국방예산) { 
      transformedData.추가정보 = "일부 데이터가 누락되었거나 변환에 실패했습니다. 표시된 값은 기본 추정치일 수 있습니다.";
      // Ensure some fallback for scores if parsing completely fails for a non-DEFAULT country
      transformedData.경제력 = transformedData.경제력 ?? 100;
      transformedData.육군전투력 = transformedData.육군전투력 ?? (militaryRank ? 100 : 50);
      transformedData.해군전투력 = transformedData.해군전투력 ?? (militaryRank ? 100 : 50);
      transformedData.공군전투력 = transformedData.공군전투력 ?? (militaryRank ? 100 : 50);
      transformedData.기술력 = transformedData.기술력 ?? 100;
      transformedData.외교력 = transformedData.외교력 ?? 100;
      transformedData.자원보유량 = transformedData.자원보유량 ?? 100;
  }


  acc[key] = transformedData;
  return acc;
}, {} as Record<string, CountryDetails>);
