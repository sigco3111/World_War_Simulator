

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as d3Geo from 'd3-geo';
import * as topojsonClient from 'topojson-client';
import { Feature, FeatureCollection, Geometry, Point } from 'geojson';
import { Topology } from 'topojson-specification';
import { select } from 'd3-selection';
import * as d3Zoom from 'd3-zoom';
import type { ZoomTransform } from 'd3-zoom';
import { CountryDetails } from '../data/countryData'; 
import type { GameMode, CountryInGame, WarDetails, PolicyEffect as PolicyEffectType, NationalSpirit, OccupiedTerritory, GameDate, CivilianBudgetAllocation, DiplomaticProposal } from '../game/types';
import { EffectStats, MAX_RESISTANCE_LEVEL, RESISTANCE_INCOME_PENALTY_FACTOR, REBEL_STRENGTH_DISRUPTION_THRESHOLD } from '../game/types';
import type { Policy, ALL_POLICIES as AllPoliciesType } from '../game/policies';
import { ALL_ERAS } from '../game/eras';
import BudgetControlsPanel from './BudgetControlsPanel';
import DiplomacyPanel from './DiplomacyPanel'; 
import PolicyPanel from './PolicyPanel'; // Import the new PolicyPanel


interface CountryProperties { name: string; }
type CountryFeature = Feature<Geometry, CountryProperties> & { id?: string | number };
type CountryFeatureCollection = Omit<FeatureCollection<Geometry, CountryProperties>, 'features'> & {
  features: Array<CountryFeature>;
};
interface WorldAtlasTopoJSON extends Topology {
  objects: {
    countries: {
      type: "GeometryCollection";
      geometries: Array<{
        type: "Polygon" | "MultiPolygon";
        arcs: any;
        id: string;
        properties: CountryProperties;
      }>;
    };
  };
}

const TOPOJSON_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const SVG_WIDTH = 960;
const SVG_HEIGHT = 600;

interface WorldMapProps {
  gameMode: GameMode;
  allCountriesState: Record<string, CountryInGame>;
  activeWars: WarDetails[];
  playerCountryId: string | null;
  onStartGame: (countryId: string) => void;
  allCountryDetails: Record<string, CountryDetails>; 
  onEnactPolicy: (countryId: string, policyId: string) => void;
  allPolicies: typeof AllPoliciesType;
  autoEnactPolicies: boolean;
  onToggleAutoEnactPolicies: () => void;
  autoDelegateDiplomacy: boolean; // New prop for diplomacy auto-delegation
  onToggleAutoDelegateDiplomacy: () => void; // Handler for diplomacy auto-delegation
  allNationalSpirits: Record<string, NationalSpirit>; 
  currentDate: GameDate;
  onUpdateDefenseBudgetRatio: (countryId: string, newRatio: number) => void;
  onUpdateCivilianAllocation: (countryId: string, newAllocation: CivilianBudgetAllocation) => void;
  onToggleAutoManageBudget: (countryId: string) => void; // Player's budget delegation
  // Diplomacy Handlers
  onImproveRelations: (sourceId: string, targetId: string) => void;
  onHarmRelations: (sourceId: string, targetId: string) => void;
  onProposeAlliance: (sourceId: string, targetId: string) => void;
  onBreakAlliance: (sourceId: string, allyIdToBreak: string) => void;
  onOfferTruce: (sourceId: string, targetId: string) => void;
  onDeclareWar: (attackerId: string, defenderId: string) => void;
  onRespondToDiplomaticProposal: (respondingCountryId: string, proposalId: string, accepted: boolean) => void;
  totalTicks: number;
}

const getPolicyEffectText = (effect: PolicyEffectType): string => {
  let valueDisplay: string;
  let baseText = "";

  if (typeof effect.value === 'number') {
    const isPercentage = effect.stat.includes('_perc');
    const plusMinus = effect.value >= 0 ? '+' : ''; 
    valueDisplay = `${plusMinus}${isPercentage ? (effect.value * 100).toFixed(1) : effect.value.toLocaleString()}`;
    if (isPercentage) valueDisplay += "%";
  } else { 
    valueDisplay = `"${effect.value}"`;
  }

  switch (effect.stat) {
    case EffectStats.GDP_GROWTH_RATE_PERC: baseText = `GDP 성장률 ${valueDisplay}`; break;
    case EffectStats.TECH_POINTS_PER_TICK_FLAT: baseText = `기술 점수/턴 ${valueDisplay}`; break;
    case EffectStats.DIPLOMACY_POINTS_PER_TICK_FLAT: baseText = `외교 점수/턴 ${valueDisplay}`; break;
    case EffectStats.RESOURCE_POINTS_PER_TICK_FLAT: baseText = `자원 점수/턴 ${valueDisplay}`; break;
    case EffectStats.POLITICAL_CAPITAL_PER_TICK_FLAT: baseText = `정치 자본/턴 ${valueDisplay}`; break;
    case EffectStats.MILITARY_RECOVERY_EFFICIENCY_BONUS_PERC: baseText = `군 회복 효율 ${valueDisplay}`; break;
    case EffectStats.AGGRESSION_DECAY_RATE_PERC: baseText = `호전성 감소율 ${valueDisplay}`; break;
    case EffectStats.DEFENSE_EFFECTIVENESS_PERC: baseText = `방어 효율 ${valueDisplay}`; break;
    case EffectStats.ENEMY_ATTRITION_PERC: baseText = `적 소모율 ${valueDisplay}`; break;
    
    case EffectStats.RESISTANCE_LEVEL_FLAT: baseText = `저항 수준 ${valueDisplay}`; break;
    case EffectStats.RESISTANCE_GROWTH_RATE_PERC: baseText = `저항 증가율 ${valueDisplay}`; break;
    case EffectStats.OCCUPIED_TERRITORY_INCOME_PERC: baseText = `점령지 수입 ${valueDisplay}`; break;
    case EffectStats.REBELLION_RISK_CHANGE_RATE_PERC: baseText = `반란 위험 변화율 ${valueDisplay}`; break;
    case EffectStats.REBELLION_EVENT_PENALTY_MODIFIER_PERC: baseText = `반란 페널티 ${valueDisplay}`; break;
    case EffectStats.GARRISON_EFFECTIVENESS_PERC: baseText = `주둔군 효율 ${valueDisplay}`; break;
    case EffectStats.REBEL_SUPPRESSION_BONUS_PERC: baseText = `반란 진압 보너스 ${valueDisplay}`; break;

    case EffectStats.GDP_ABS_FLAT: baseText = `GDP ${valueDisplay}$`; break;
    case EffectStats.TECH_POINTS_FLAT: baseText = `기술 점수 ${valueDisplay}`; break;
    case EffectStats.DIPLOMACY_POINTS_FLAT: baseText = `외교 점수 ${valueDisplay}`; break;
    case EffectStats.RESOURCE_POINTS_FLAT: baseText = `자원 점수 ${valueDisplay}`; break;
    case EffectStats.POLITICAL_CAPITAL_FLAT: baseText = `정치 자본 ${valueDisplay}`; break;
    case EffectStats.DEFENSE_BUDGET_ABS_FLAT: baseText = `국방 예산 ${valueDisplay}$`; break;
    
    case EffectStats.GRANT_NATIONAL_SPIRIT: baseText = `국가 정신 부여: ${valueDisplay}`; break;
    case EffectStats.REMOVE_NATIONAL_SPIRIT: baseText = `국가 정신 제거: ${valueDisplay}`; break;
    
    default: baseText = `${effect.stat}: ${valueDisplay}`;
  }

  if (effect.target === 'occupied_territories') {
    baseText += " (점령지)";
  }

  return effect.type === 'one_time' ? `(일시) ${baseText}` : baseText;
};


const WorldMap: React.FC<WorldMapProps> = ({
  gameMode, allCountriesState, activeWars, playerCountryId, onStartGame, allCountryDetails, 
  onEnactPolicy, allPolicies, autoEnactPolicies, onToggleAutoEnactPolicies, 
  autoDelegateDiplomacy, onToggleAutoDelegateDiplomacy, // Added diplomacy auto-delegate props
  allNationalSpirits, 
  currentDate, onUpdateDefenseBudgetRatio, onUpdateCivilianAllocation, onToggleAutoManageBudget,
  onImproveRelations, onHarmRelations, onProposeAlliance, onBreakAlliance, onOfferTruce, onDeclareWar,
  onRespondToDiplomaticProposal, totalTicks
}) => {
  const [geoData, setGeoData] = useState<CountryFeatureCollection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [tooltipHoveredId, setTooltipHoveredId] = useState<string | number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [currentTransform, setCurrentTransform] = useState<ZoomTransform>(d3Zoom.zoomIdentity);

  const [panelCountryId, setPanelCountryId] = useState<string | number | null>(null);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState<boolean>(false);
  const [activeInfoPanelTab, setActiveInfoPanelTab] = useState<'details' | 'policies' | 'budget' | 'diplomacy'>('details');


  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const infoPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); setError(null);
      try {
        const response = await fetch(TOPOJSON_URL);
        if (!response.ok) throw new Error(`Failed to fetch map data: ${response.statusText}`);
        const topology = await response.json() as WorldAtlasTopoJSON;
        const countriesGeoJSON = topojsonClient.feature(topology, topology.objects.countries) as unknown as CountryFeatureCollection;
        setGeoData(countriesGeoJSON);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !geoData) return;
    const svgElement = select(svgRef.current);
    const zoomBehavior = d3Zoom.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 10]) 
      .translateExtent([[0, 0], [SVG_WIDTH, SVG_HEIGHT]])
      .on('zoom', (event: d3Zoom.D3ZoomEvent<SVGSVGElement, unknown>) => {
        setCurrentTransform(event.transform);
      });
    svgElement.call(zoomBehavior);
    return () => { svgElement.on('.zoom', null); };
  }, [geoData]);

  const projection = useMemo(() => geoData ? d3Geo.geoMercator().fitSize([SVG_WIDTH, SVG_HEIGHT], geoData) : null, [geoData]);
  const pathGenerator = useMemo(() => projection ? d3Geo.geoPath().projection(projection) : null, [projection]);

  const countryIdToFeatureMap = useMemo(() => {
    if (!geoData) return new Map<string, CountryFeature>();
    const map = new Map<string, CountryFeature>();
    geoData.features.forEach(feature => {
      if (feature.id) {
        map.set(feature.id.toString(), feature);
      }
    });
    return map;
  }, [geoData]);


  const getOwnerStateOfFeature = useCallback((featureId: string | number | undefined): CountryInGame | null => {
    if (!featureId) return null;
    const baseCountryIdStr = featureId.toString();
    
    const owner = Object.values(allCountriesState).find(c => 
        !c.isEliminated && 
        c.territories.includes(baseCountryIdStr)
    );
    return owner || (allCountriesState[baseCountryIdStr] && !allCountriesState[baseCountryIdStr].isEliminated ? allCountriesState[baseCountryIdStr] : null);
  }, [allCountriesState]);


  const handleMouseEnter = useCallback((feature: CountryFeature) => {
    if (feature.id && feature.properties) setTooltipHoveredId(feature.id);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltipHoveredId(null); setTooltipPosition(null);
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (svgContainerRef.current) {
      const rect = svgContainerRef.current.getBoundingClientRect();
      setTooltipPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    }
  }, []);

  const handleCountryClick = useCallback((feature: CountryFeature) => {
    if (feature.id) {
      const ownerState = getOwnerStateOfFeature(feature.id);
      const targetIdForPanel = ownerState ? ownerState.id : feature.id.toString();

      if (panelCountryId === targetIdForPanel && isInfoPanelOpen) {
        setIsInfoPanelOpen(false);
      } else {
        setPanelCountryId(targetIdForPanel);
        setIsInfoPanelOpen(true);
        // Always default to 'details' tab when opening/switching panel
        setActiveInfoPanelTab('details');
      }
    }
  }, [panelCountryId, isInfoPanelOpen, getOwnerStateOfFeature]);

  const closeInfoPanel = useCallback(() => setIsInfoPanelOpen(false), []);
  
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeInfoPanel(); };
    if (isInfoPanelOpen) {
      document.addEventListener('keydown', handleEscKey);
      infoPanelRef.current?.focus(); 
    }
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isInfoPanelOpen, closeInfoPanel]);

  const currentPanelOriginalDetails: CountryDetails | undefined = useMemo(() => {
    if (!panelCountryId) return undefined;
    const dynamicData = allCountriesState[panelCountryId.toString()];
    if (dynamicData) return allCountryDetails[dynamicData.id] || allCountryDetails["DEFAULT"];
    return allCountryDetails[panelCountryId.toString()] || allCountryDetails["DEFAULT"];
  }, [panelCountryId, allCountryDetails, allCountriesState]);
  
  const currentPanelDynamicData: CountryInGame | undefined = useMemo(() => {
    if (!panelCountryId) return undefined;
    const countryIdStr = panelCountryId.toString();
    return allCountriesState[countryIdStr];
  }, [panelCountryId, allCountriesState]);

  const currentPanelOwnerState: CountryInGame | null = useMemo(() => {
      if (!panelCountryId) return null;
      const directState = allCountriesState[panelCountryId.toString()];
      if (directState && !directState.isEliminated) return directState;
      return getOwnerStateOfFeature(panelCountryId); 
  }, [panelCountryId, getOwnerStateOfFeature, allCountriesState]);

  const playerCountryState = playerCountryId ? allCountriesState[playerCountryId] : null;

  if (loading) return <div className="flex items-center justify-center h-[600px] text-sky-400 text-lg">지도 데이터 로딩 중...</div>;
  if (error) return <div className="flex items-center justify-center h-[600px] text-red-400 text-lg">오류: {error}</div>;
  if (!geoData || !pathGenerator || !projection) return <div className="flex items-center justify-center h-[600px] text-slate-400 text-lg">지도 데이터 미사용</div>;

  const tooltipOwnerState = getOwnerStateOfFeature(tooltipHoveredId);
  const tooltipText = tooltipOwnerState?.국가명 || geoData?.features.find(f=>f.id === tooltipHoveredId)?.properties.name || "";

  const renderInfoPanelContent = () => {
    if (!currentPanelOriginalDetails) return null;

    let displayData: CountryDetails | CountryInGame | null = null;
    let effectiveCountryName = currentPanelOriginalDetails.국가명;

    if (gameMode === 'setup') {
        displayData = currentPanelOriginalDetails;
    } else {
        if (currentPanelOwnerState) { 
            displayData = currentPanelOwnerState;
            effectiveCountryName = currentPanelOwnerState.id === panelCountryId.toString() ? currentPanelOwnerState.국가명 : currentPanelOriginalDetails.국가명;
        } else if (currentPanelDynamicData) { 
            displayData = currentPanelDynamicData;
            effectiveCountryName = currentPanelDynamicData.국가명;
        } else {
            displayData = currentPanelOriginalDetails; 
        }
    }
    if (!displayData) displayData = currentPanelOriginalDetails; 

    const displayDataAsGameCountry = displayData as CountryInGame; 
    const isOriginalCountryEliminated = gameMode !== 'setup' && allCountriesState[currentPanelOriginalDetails.id]?.isEliminated === true;
    const isTerritoryOwnedByOther = currentPanelOwnerState && currentPanelOwnerState.id !== currentPanelOriginalDetails.id;

    return (
      <>
        <div className="flex justify-between items-center mb-1">
            <h2 id="info-panel-title" className="text-2xl font-bold text-sky-400">{effectiveCountryName}</h2>
            <button onClick={closeInfoPanel} className="p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-sky-400 transition-colors" aria-label="정보 패널 닫기">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        {gameMode === 'setup' && currentPanelOriginalDetails.id !== "DEFAULT" && (!playerCountryId || playerCountryId !== currentPanelOriginalDetails.id) && (
          <button
            onClick={() => {
              onStartGame(currentPanelOriginalDetails.id.toString());
              closeInfoPanel();
            }}
            className="w-full mb-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
          >
            {effectiveCountryName}(으)로 시뮬레이션 시작
          </button>
        )}
        
        {isOriginalCountryEliminated && !currentPanelOwnerState && ( 
          <p className="text-xl text-red-400 font-semibold mb-1">정복당함 (소멸)</p>
        )}
        {isTerritoryOwnedByOther && currentPanelOwnerState && (
           <p className="text-sm text-amber-400 mb-3">원 소유국: {currentPanelOriginalDetails.국가명}. 현재 통치 국가: {currentPanelOwnerState.국가명}</p>
        )}

        {gameMode !== 'setup' && displayDataAsGameCountry?.currentMilitary && !displayDataAsGameCountry.isEliminated && (
          <>
            <h3 className="text-md font-semibold text-slate-300 pt-1">실시간 군사력</h3>
            <div className="grid grid-cols-3 gap-x-2 gap-y-2 mb-2 text-sm">
              <div><dt className="text-slate-400">육군</dt><dd className="text-emerald-300">{Math.round(displayDataAsGameCountry.currentMilitary.army).toLocaleString()}</dd></div>
              <div><dt className="text-slate-400">해군</dt><dd className="text-teal-300">{Math.round(displayDataAsGameCountry.currentMilitary.navy).toLocaleString()}</dd></div>
              <div><dt className="text-slate-400">공군</dt><dd className="text-cyan-300">{Math.round(displayDataAsGameCountry.currentMilitary.airforce).toLocaleString()}</dd></div>
            </div>
            {displayDataAsGameCountry.atWarWith?.length > 0 && (
              <div className="mb-2">
                  <dt className="text-sm font-medium text-slate-400">교전중인 국가:</dt>
                  <dd className="text-red-400">{displayDataAsGameCountry.atWarWith.map(id => allCountriesState[id]?.국가명 || id).join(', ')}</dd>
              </div>
            )}
             {displayDataAsGameCountry.allies?.length > 0 && (
              <div className="mb-2">
                  <dt className="text-sm font-medium text-slate-400">동맹:</dt>
                  <dd className="text-green-400">{displayDataAsGameCountry.allies.map(id => allCountriesState[id]?.국가명 || id).join(', ')}</dd>
              </div>
            )}
          </>
        )}
        
        {displayData.id === "DEFAULT" && displayData.추가정보 && (
          <p className="text-slate-300 mb-4">{displayData.추가정보}</p>
        )}

        <dl className="space-y-2">
          {(displayData.인구수 !== undefined || (gameMode !== 'setup' && displayDataAsGameCountry?.currentPopulation !== undefined)) && (
            <div><dt className="text-xs font-medium text-slate-400">인구수</dt><dd className="text-sm text-slate-100">{(gameMode !== 'setup' && displayDataAsGameCountry?.currentPopulation !== undefined ? displayDataAsGameCountry.currentPopulation : displayData.인구수 ?? 0).toLocaleString('ko-KR')} 명</dd></div>
          )}
          {(displayData.GDP !== undefined || (gameMode !== 'setup' && displayDataAsGameCountry?.currentGDP !== undefined)) && (
            <div><dt className="text-xs font-medium text-slate-400">GDP (명목)</dt><dd className="text-sm text-slate-100">{(gameMode !== 'setup' && displayDataAsGameCountry?.currentGDP !== undefined ? displayDataAsGameCountry.currentGDP : displayData.GDP ?? 0).toLocaleString('ko-KR')} USD</dd></div>
          )}
           {(gameMode !== 'setup' && displayDataAsGameCountry?.currentDefenseBudget !== undefined && !displayDataAsGameCountry.isEliminated) && (
            <div>
                <dt className="text-xs font-medium text-slate-400">국방 예산</dt>
                <dd className="text-sm text-slate-100">
                    {displayDataAsGameCountry.currentDefenseBudget.toLocaleString('ko-KR')} USD 
                    {displayDataAsGameCountry.currentGDP > 0 && ` (GDP의 ${(displayDataAsGameCountry.defenseBudgetRatio || 0).toFixed(1)}%)`}
                </dd>
            </div>
           )}
           {(gameMode === 'setup' && displayData.국방예산 !== undefined) && (
             <div><dt className="text-xs font-medium text-slate-400">국방 예산</dt><dd className="text-sm text-slate-100">{displayData.국방예산.toLocaleString('ko-KR')} USD</dd></div>
           )}
          {displayData.군사력순위 && (
            <div><dt className="text-xs font-medium text-slate-400">군사력 순위 (GFP)</dt><dd className="text-sm text-slate-100">{displayData.군사력순위}</dd></div>
          )}
          
          <hr className="border-slate-600 my-2"/>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {displayData.경제력 !== undefined && (<div><dt className="text-xs font-medium text-slate-400">경제력</dt><dd className="text-md text-sky-300">{Number(displayData.경제력).toFixed(0)} / 1000</dd></div>)}
              {displayData.기술력 !== undefined && (<div><dt className="text-xs font-medium text-slate-400">기술력</dt><dd className="text-md text-purple-300">{Number(displayData.기술력).toFixed(0)} / 1000</dd></div>)}
              {displayData.외교력 !== undefined && (<div><dt className="text-xs font-medium text-slate-400">외교력</dt><dd className="text-md text-yellow-300">{Number(displayData.외교력).toFixed(0)} / 1000</dd></div>)}
              {displayData.자원보유량 !== undefined && (<div><dt className="text-xs font-medium text-slate-400">자원보유량</dt><dd className="text-md text-orange-400">{Number(displayData.자원보유량).toFixed(0)} / 1000</dd></div>)}
          </div>
          
          {(gameMode === 'setup' || (!displayDataAsGameCountry?.currentMilitary && !isOriginalCountryEliminated)) && ( 
              <>
                  <hr className="border-slate-600 my-2"/>
                  <h3 className="text-sm font-semibold text-slate-300">초기 전투력 ( / 1000 )</h3>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-2 text-sm">
                      {displayData.육군전투력 !== undefined && (<div><dt className="text-xs font-medium text-slate-400">육군</dt><dd className="text-md text-emerald-300">{displayData.육군전투력}</dd></div>)}
                      {displayData.해군전투력 !== undefined && (<div><dt className="text-xs font-medium text-slate-400">해군</dt><dd className="text-md text-teal-300">{displayData.해군전투력}</dd></div>)}
                      {displayData.공군전투력 !== undefined && (<div><dt className="text-xs font-medium text-slate-400">공군</dt><dd className="text-md text-cyan-300">{displayData.공군전투력}</dd></div>)}
                  </div>
              </>
          )}
          
          {displayData.주요군사자산 && displayData.주요군사자산.length > 0 && (
            <><hr className="border-slate-600 my-2"/>
            <div><dt className="text-xs font-medium text-slate-400">주요 군사 자산</dt>
              <dd className="mt-1 text-xs text-slate-200"><ul className="list-disc list-inside pl-1 space-y-0.5">
                  {displayData.주요군사자산.map((asset, index) => (<li key={index}>{asset}</li>))}
              </ul></dd>
            </div></>
          )}
          
          {gameMode !== 'setup' && displayDataAsGameCountry && displayDataAsGameCountry.nationalSpirits && displayDataAsGameCountry.nationalSpirits.length > 0 && !displayDataAsGameCountry.isEliminated && (
            <>
              <hr className="border-slate-600 my-2"/>
              <div>
                <dt className="text-md font-semibold text-slate-300 mb-1">국가 정신</dt>
                <dd className="mt-1 text-xs text-slate-200">
                  <ul className="space-y-1">
                    {displayDataAsGameCountry.nationalSpirits.map(spiritId => {
                      const spirit = allNationalSpirits[spiritId];
                      return spirit ? <li key={spirit.id} className="flex items-center"><span className="mr-1.5 text-sm">{spirit.icon}</span> {spirit.name}</li> : null;
                    })}
                  </ul>
                </dd>
              </div>
            </>
          )}

          {gameMode !== 'setup' && displayDataAsGameCountry && displayDataAsGameCountry.occupiedTerritoryData && Object.keys(displayDataAsGameCountry.occupiedTerritoryData).length > 0 && !displayDataAsGameCountry.isEliminated && (
            <>
              <hr className="border-slate-600 my-2"/>
              <div>
                <dt className="text-md font-semibold text-slate-300 mb-1">점령지 현황</dt>
                <dd className="mt-1 text-xs text-slate-200">
                  <ul className="space-y-1.5">
                    {Object.entries(displayDataAsGameCountry.occupiedTerritoryData).map(([territoryFeatureId, occData]) => {
                      const originalDetail = allCountryDetails[occData.originalOwnerId];
                      const incomeContributionPerc = (1 - (occData.resistanceLevel / MAX_RESISTANCE_LEVEL) * RESISTANCE_INCOME_PENALTY_FACTOR) * 100;
                      let rebellionInfo = `반란 위험: ${occData.rebellionRisk.toFixed(1)}%`;
                      if (occData.productionDisruptionTicks > 0 || occData.rebelStrength > REBEL_STRENGTH_DISRUPTION_THRESHOLD) {
                        rebellionInfo += ` (생산 차질!${occData.productionDisruptionTicks > 0 ? ` ${occData.productionDisruptionTicks}턴` : ''})`;
                      }
                      let rebelStrengthInfo = occData.rebelStrength > 0 ? ` | <span class="text-red-300">반란군: ${occData.rebelStrength.toFixed(0)}</span>` : "";
                      
                      return (
                        <li key={occData.originalOwnerId + "_" + territoryFeatureId} className="p-1.5 bg-slate-700/50 rounded">
                           <span className="font-medium">{originalDetail?.국가명 || `영토 ID ${occData.originalOwnerId}`}</span>:
                           <br/>
                           저항도: {occData.resistanceLevel.toFixed(1)}/100 | 수입 기여: {incomeContributionPerc.toFixed(1)}%
                           <br/>
                           <span className={occData.rebellionRisk > 50 ? 'text-red-400' : 'text-yellow-400'} dangerouslySetInnerHTML={{ __html: rebellionInfo + rebelStrengthInfo }}></span>
                        </li>
                      );
                    })}
                  </ul>
                </dd>
              </div>
            </>
          )}

          {displayData.추가정보 && displayData.id !== "DEFAULT" && gameMode === 'setup' && (
              <div className="mt-3 p-2 bg-yellow-900/30 rounded text-yellow-300 text-xs"><p>{displayData.추가정보}</p></div>
          )}
        </dl>
      </>
    );
  };

  const renderAutoDelegateToggle = (
    label: string, 
    isAuto: boolean, 
    toggleHandler: () => void,
    isActiveTab: boolean
  ) => {
    if (!isActiveTab || !playerCountryState || currentPanelOwnerState?.id !== playerCountryId) return null;
    return (
      <div className="flex items-center space-x-1 sm:space-x-2">
          <span className="text-xs text-slate-400">{label}:</span>
          <button
              onClick={toggleHandler}
              className={`relative inline-flex items-center h-5 w-9 sm:h-6 sm:w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 focus:ring-offset-slate-800 rounded-full
                  ${isAuto ? 'bg-sky-500' : 'bg-slate-600'}`}
              role="switch" aria-checked={isAuto}
          >
              <span className={`inline-block w-3 h-3 sm:w-4 sm:h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out 
                  ${isAuto ? 'translate-x-5 sm:translate-x-6' : 'translate-x-1'}`}/>
          </button>
      </div>
    );
  }


  return (
    <div ref={svgContainerRef} className="relative w-full aspect-[960/600]" onMouseMove={handleMouseMove}>
      <svg ref={svgRef} viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-full bg-slate-700 rounded-lg select-none" aria-label="세계 지도">
        <g transform={`translate(${currentTransform.x}, ${currentTransform.y}) scale(${currentTransform.k})`}>
          {geoData.features.map((feature) => {
            const featureId = feature.id; 
            if (!featureId) return null;
            
            const pathD = pathGenerator(feature);
            if (!pathD) return null;
            
            const ownerState = getOwnerStateOfFeature(featureId);
            let displayColor = 'fill-slate-400'; 

            if (ownerState) {
                 if (allCountriesState[ownerState.id]?.isEliminated) { 
                    displayColor = 'fill-slate-600'; 
                 } else if (ownerState.isPlayer) {
                    displayColor = 'fill-green-500'; 
                 } else if (ownerState.allies.includes(playerCountryId || "")) {
                    displayColor = 'fill-emerald-400'; 
                 } else if (ownerState.atWarWith && ownerState.atWarWith.includes(playerCountryId || "")) {
                    displayColor = 'fill-red-500'; 
                 } else if (ownerState.atWarWith && ownerState.atWarWith.length > 0) {
                    displayColor = 'fill-rose-500'; 
                 }
                  else {
                    displayColor = 'fill-slate-300'; 
                 }
            } else {
                const originalDetails = allCountryDetails[featureId.toString()];
                if (!originalDetails || originalDetails.id === "DEFAULT") {
                    displayColor = 'fill-slate-500'; 
                } else if (allCountriesState[featureId.toString()]?.isEliminated) { 
                    displayColor = 'fill-slate-600';
                }
            }

            const isHovered = tooltipHoveredId === featureId;
            const isSelectedForPanel = (panelCountryId === featureId || (currentPanelOwnerState && currentPanelOwnerState.territories.includes(featureId.toString()))) && isInfoPanelOpen;

            return (
              <path
                key={featureId.toString()}
                d={pathD}
                className={`
                  stroke-slate-500 transition-colors duration-100 ease-in-out
                  ${displayColor}
                  ${isHovered && !isInfoPanelOpen ? 'brightness-125' : ''}
                  ${isSelectedForPanel ? 'stroke-amber-300' : ''}
                  cursor-pointer
                `}
                style={{ strokeWidth: isSelectedForPanel ? (1.5 / currentTransform.k) : (0.5 / currentTransform.k) }}
                onMouseEnter={() => handleMouseEnter(feature)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleCountryClick(feature)}
                aria-label={feature.properties.name} 
              />
            );
          })}
           {gameMode === 'playing' && activeWars.map(war => {
            const attackerFeature = countryIdToFeatureMap.get(war.attackerId);
            const defenderFeature = countryIdToFeatureMap.get(war.defenderId);

            if (!attackerFeature || !defenderFeature || !projection) return null;

            const attackerCentroid = d3Geo.geoCentroid(attackerFeature as Feature<Point, any>);
            const defenderCentroid = d3Geo.geoCentroid(defenderFeature as Feature<Point, any>);

            const p0 = projection(attackerCentroid);
            const p2 = projection(defenderCentroid);

            if (!p0 || !p2) return null;

            const [x0, y0] = p0;
            const [x2, y2] = p2;
            const midX = (x0 + x2) / 2;
            const midY = (y0 + y2) / 2;
            const dx = x2 - x0;
            const dy = y2 - y0;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const controlPointOffset = dist * 0.15; 
            let ctrlX = midX - dy * (controlPointOffset / dist);
            let ctrlY = midY + dx * (controlPointOffset / dist);
            if (isNaN(ctrlX) || isNaN(ctrlY)) { ctrlX = midX; ctrlY = midY; }
            const pathData = `M ${x0},${y0} Q ${ctrlX},${ctrlY} ${x2},${y2}`;
            
            return (
              <path
                key={war.id}
                d={pathData}
                stroke="rgba(239, 68, 68, 0.6)" 
                strokeWidth={Math.max(0.5, 2 / currentTransform.k)}
                fill="none"
                strokeDasharray={`${Math.max(1, 5 / currentTransform.k)},${Math.max(1, 3 / currentTransform.k)}`}
                pointerEvents="none" 
              />
            );
          })}
        </g>
      </svg>
      {tooltipHoveredId && tooltipPosition && !isInfoPanelOpen && tooltipText && ( 
        <div
          className="absolute p-2 text-xs bg-slate-900 bg-opacity-80 text-white rounded-md shadow-lg pointer-events-none transform -translate-y-full -translate-x-1/2"
          style={{ left: `${tooltipPosition.x}px`, top: `${tooltipPosition.y - 10}px` }}
          role="tooltip"
        >
          {tooltipText}
        </div>
      )}

      {isInfoPanelOpen && currentPanelOriginalDetails && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeInfoPanel} aria-hidden="true"></div>
          <div
            ref={infoPanelRef}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out translate-x-0 p-6 text-slate-100 overflow-y-auto z-50 flex flex-col"
            role="dialog" aria-modal="true" aria-labelledby="info-panel-title" tabIndex={-1}
          >
            <div className="flex-grow">
              
              {gameMode !== 'setup' && currentPanelOwnerState && !currentPanelOwnerState.isEliminated && (
                 <div className="mb-4 border-b border-slate-700">
                    <nav className="-mb-px flex space-x-1 items-center justify-between" aria-label="Tabs">
                      <div className="flex space-x-1 sm:space-x-2">
                        <button onClick={() => setActiveInfoPanelTab('details')}
                            className={`whitespace-nowrap py-3 px-1 sm:px-2 border-b-2 font-medium text-xs sm:text-sm
                                ${activeInfoPanelTab === 'details' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-300'}`}>
                            상세 정보
                        </button>
                        {playerCountryId === currentPanelOwnerState.id && (
                          <>
                            <button onClick={() => setActiveInfoPanelTab('policies')}
                                className={`whitespace-nowrap py-3 px-1 sm:px-2 border-b-2 font-medium text-xs sm:text-sm
                                    ${activeInfoPanelTab === 'policies' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-300'}`}>
                                정책 ({playerCountryState?.politicalCapital !== undefined ? playerCountryState.politicalCapital.toFixed(0) : 'N/A'} PC)
                            </button>
                            <button onClick={() => setActiveInfoPanelTab('budget')}
                                className={`whitespace-nowrap py-3 px-1 sm:px-2 border-b-2 font-medium text-xs sm:text-sm
                                    ${activeInfoPanelTab === 'budget' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-300'}`}>
                                예산
                            </button>
                             <button onClick={() => setActiveInfoPanelTab('diplomacy')}
                                className={`whitespace-nowrap py-3 px-1 sm:px-2 border-b-2 font-medium text-xs sm:text-sm
                                    ${activeInfoPanelTab === 'diplomacy' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-300'}`}>
                                외교
                            </button>
                          </>
                        )}
                        {playerCountryId && currentPanelOwnerState.id !== playerCountryId && (
                           <button onClick={() => setActiveInfoPanelTab('diplomacy')}
                                className={`whitespace-nowrap py-3 px-1 sm:px-2 border-b-2 font-medium text-xs sm:text-sm
                                    ${activeInfoPanelTab === 'diplomacy' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-300'}`}>
                                외교 (플레이어)
                            </button>
                        )}
                      </div>
                      {/* Auto-delegate Toggles */}
                      {renderAutoDelegateToggle("정책 자동", autoEnactPolicies, onToggleAutoEnactPolicies, activeInfoPanelTab === 'policies')}
                      {playerCountryState && renderAutoDelegateToggle("예산 자동", playerCountryState.autoManageBudget, () => onToggleAutoManageBudget(playerCountryId!), activeInfoPanelTab === 'budget')}
                      {renderAutoDelegateToggle("외교 자동", autoDelegateDiplomacy, onToggleAutoDelegateDiplomacy, activeInfoPanelTab === 'diplomacy')}
                    </nav>
                </div>
              )}

             {activeInfoPanelTab === 'details' && renderInfoPanelContent()}

             {activeInfoPanelTab === 'policies' && playerCountryState && !playerCountryState.isEliminated && currentPanelOwnerState?.id === playerCountryId && (
                <PolicyPanel
                    playerCountryState={playerCountryState}
                    allPolicies={allPolicies}
                    currentDate={currentDate}
                    onEnactPolicy={onEnactPolicy}
                />
              )}
              {activeInfoPanelTab === 'budget' && playerCountryState && !playerCountryState.isEliminated && playerCountryId && currentPanelOwnerState?.id === playerCountryId && (
                <BudgetControlsPanel
                    country={playerCountryState}
                    onUpdateDefenseBudgetRatio={(newRatio) => onUpdateDefenseBudgetRatio(playerCountryId, newRatio)}
                    onUpdateCivilianAllocation={(newAlloc) => onUpdateCivilianAllocation(playerCountryId, newAlloc)}
                    autoManageBudget={playerCountryState.autoManageBudget} // Pass the state for disabling controls
                />
              )}
               {activeInfoPanelTab === 'diplomacy' && playerCountryId && currentPanelOwnerState && !currentPanelOwnerState.isEliminated && (
                <DiplomacyPanel
                    playerCountryId={playerCountryId}
                    selectedCountry={currentPanelOwnerState} 
                    allCountriesState={allCountriesState}
                    currentDate={currentDate}
                    onImproveRelations={onImproveRelations}
                    onHarmRelations={onHarmRelations}
                    onProposeAlliance={onProposeAlliance}
                    onBreakAlliance={onBreakAlliance}
                    onOfferTruce={onOfferTruce}
                    onDeclareWar={onDeclareWar}
                    onRespondToDiplomaticProposal={onRespondToDiplomaticProposal}
                    totalTicks={totalTicks}
                    autoDelegateDiplomacy={autoDelegateDiplomacy} // Pass this down
                />
              )}

              {((activeInfoPanelTab === 'policies' || activeInfoPanelTab === 'budget') && 
                (!playerCountryState || playerCountryState.isEliminated || (currentPanelOwnerState && playerCountryId !== currentPanelOwnerState.id))) && (
                 renderInfoPanelContent() 
              )}
               {playerCountryState?.isEliminated && currentPanelOriginalDetails.id === playerCountryId && 
                (activeInfoPanelTab === 'policies' || activeInfoPanelTab === 'budget' || activeInfoPanelTab === 'diplomacy') && (
                   renderInfoPanelContent() 
               )}

            </div>
            <p className="mt-auto pt-3 text-xs text-slate-500 text-center">정보는 예시이며 실제와 다를 수 있습니다.</p>
          </div>
        </>
      )}
    </div>
  );
};

export default WorldMap;