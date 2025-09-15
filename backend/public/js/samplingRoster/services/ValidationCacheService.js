/**
 * Validation Cache Service for Sampling Roster System
 * 🚀 OPTIMIZACIÓN: Cache inteligente para reducir consultas a BD de ~200 a ~3-5
 */

import { SAMPLING_ROSTER_CONSTANTS } from "../utils/Constants.js";
import DateUtils from "../utils/DateUtils.js";

// Importar NotificationService para asegurar que Logger esté disponible
import "../../shared/NotificationService.js";

// Importar PerformanceTracker para métricas
import { PerformanceTracker } from "./PerformanceMonitor.js";

export class ValidationCacheService {
  constructor() {
    this.weeklyCache = new Map();
    this.samplersCache = new Map();
    this.weeklyLimitsCache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
    this.maxCacheSize = 10; // Máximo 10 semanas en cache
    this.cleanupInterval = null;
    this.memoryThreshold = 50 * 1024 * 1024; // 50MB threshold
    this.performanceMetrics = {
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      memoryUsage: 0
    };

    // Iniciar cleanup automático
    this.startCleanupInterval();

    // Usar window.Logger para asegurar que esté disponible
    if (window.Logger) {
      window.Logger.info("ValidationCacheService initialized with performance optimizations", {
        module: "ValidationCacheService",
        data: {
          maxCacheSize: this.maxCacheSize,
          cacheTTL: this.cacheTTL,
          memoryThreshold: this.memoryThreshold
        },
        showNotification: false,
      });
    }
  }

  /**
   * 🚀 Preload all validation data for a week
   * This is the main optimization - loads all data in 3-5 queries instead of 200+
   */
  async preloadWeekValidationData(startDate, endDate) {
    const startTime = performance.now();
    this.performanceMetrics.totalRequests++;

    try {
      if (window.Logger) {
        window.Logger.info("🚀 Preloading week validation data", {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          module: "ValidationCacheService"
        });
      }

      const weekKey = this.getWeekKey(startDate);
      
      // Check if cache is still valid
      if (this.isCacheValid(weekKey)) {
        this.performanceMetrics.cacheHits++;
        this.updatePerformanceMetrics(startTime);
        
        // Registrar métricas de performance
        PerformanceTracker.cache('preloadWeekValidationData', true, performance.now() - startTime, {
          weekKey,
          cacheHit: true,
          cacheSize: this.weeklyCache.size
        });
        
        if (window.Logger) {
          window.Logger.info("✅ Using existing cache", { 
            weekKey, 
            module: "ValidationCacheService",
            data: { cacheHit: true, responseTime: performance.now() - startTime }
          });
        }
        return this.getWeekValidationData(weekKey);
      }

      this.performanceMetrics.cacheMisses++;

      // Load all data in parallel - this is the key optimization
      const [activeRosters, shipNominations, samplersData, truckWorkDays, otherJobs] = await Promise.all([
        this.loadActiveRostersForWeek(startDate, endDate),
        this.loadShipNominationsForWeek(startDate, endDate),
        this.loadSamplersData(),
        this.loadTruckWorkDaysForWeek(startDate, endDate),
        this.loadOtherJobsForWeek(startDate, endDate)
      ]);

      // Calculate all validations in memory
      const weekValidationData = this.calculateAllValidations(
        activeRosters,
        shipNominations,
        samplersData,
        truckWorkDays,
        otherJobs,
        startDate,
        endDate
      );

      // Store in cache - store the complete data structure
      const completeCacheData = {
        activeRosters,
        weekNominations: shipNominations,
        samplersData,
        truckWorkDays,
        otherJobs,
        validationData: weekValidationData,
        startDate,
        endDate
      };

      // Verificar límite de cache antes de almacenar
      this.enforceCacheSizeLimit();

      this.weeklyCache.set(weekKey, {
        data: completeCacheData,
        timestamp: Date.now(),
        startDate,
        endDate,
        size: this.estimateCacheEntrySize(completeCacheData)
      });

      // Actualizar métricas de memoria
      this.updateMemoryUsage();

      this.updatePerformanceMetrics(startTime);

      // Registrar métricas de performance
      PerformanceTracker.cache('preloadWeekValidationData', true, performance.now() - startTime, {
        weekKey,
        cacheHit: false,
        cacheSize: this.weeklyCache.size,
        rosters: activeRosters.length,
        nominations: shipNominations.length,
        samplers: samplersData.length,
        memoryUsage: this.performanceMetrics.memoryUsage
      });

      if (window.Logger) {
        window.Logger.success("✅ Week validation data preloaded successfully", {
          weekKey,
          rosters: activeRosters.length,
          nominations: shipNominations.length,
          samplers: samplersData.length,
          module: "ValidationCacheService",
          data: {
            responseTime: performance.now() - startTime,
            cacheSize: this.weeklyCache.size,
            memoryUsage: this.performanceMetrics.memoryUsage
          }
        });
      }

      return completeCacheData;

    } catch (error) {
      // Registrar error de performance
      PerformanceTracker.error('ValidationCacheService', 'preloadWeekValidationData', error);

      if (window.Logger) {
        window.Logger.error("❌ Failed to preload week validation data", {
          error: error.message,
          module: "ValidationCacheService"
        });
      }
      throw error;
    }
  }

  /**
   * 📊 Load active rosters for the week
   */
  async loadActiveRostersForWeek(startDate, endDate) {
    const startTime = performance.now();
    
    try {
      // Validar parámetros de entrada
      if (!startDate || !endDate) {
        throw new Error("startDate and endDate are required");
      }

      if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
        throw new Error("startDate and endDate must be Date objects");
      }

      const response = await fetch(`${SAMPLING_ROSTER_CONSTANTS.API_ENDPOINTS.SAMPLING_ROSTERS}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Validar estructura de respuesta
      if (!result) {
        throw new Error("Empty response from API");
      }

      // Registrar métricas de API
      PerformanceTracker.apiCall('loadActiveRostersForWeek', true, performance.now() - startTime, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        responseSize: JSON.stringify(result).length
      });

      // Normalizar a array
      if (Array.isArray(result)) return result;
      if (result && Array.isArray(result.data)) return result.data;
      if (result && Array.isArray(result.items)) return result.items;
      
      return [];
    } catch (error) {
      // Registrar error de performance
      PerformanceTracker.error('ValidationCacheService', 'loadActiveRostersForWeek', error);

      if (window.Logger) {
        window.Logger.error("Failed to load active rosters", { 
          error: error.message, 
          module: "ValidationCacheService",
          data: { startDate: startDate?.toISOString(), endDate: endDate?.toISOString() }
        });
      }
      return [];
    }
  }

  /**
   * 🚢 Load ship nominations for the week
   */
  async loadShipNominationsForWeek(startDate, endDate) {
    const startTime = performance.now();
    
    try {
      // Validar parámetros de entrada
      if (!startDate || !endDate) {
        throw new Error("startDate and endDate are required");
      }

      if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
        throw new Error("startDate and endDate must be Date objects");
      }

      const response = await fetch(`${SAMPLING_ROSTER_CONSTANTS.API_ENDPOINTS.SHIP_NOMINATIONS}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Validar estructura de respuesta
      if (!result) {
        throw new Error("Empty response from API");
      }

      // Registrar métricas de API
      PerformanceTracker.apiCall('loadShipNominationsForWeek', true, performance.now() - startTime, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        responseSize: JSON.stringify(result).length
      });

      if (Array.isArray(result)) return result;
      if (result && Array.isArray(result.data)) return result.data;
      if (result && Array.isArray(result.items)) return result.items;
      
      return [];
    } catch (error) {
      // Registrar error de performance
      PerformanceTracker.error('ValidationCacheService', 'loadShipNominationsForWeek', error);

      if (window.Logger) {
        window.Logger.error("Failed to load ship nominations", { 
          error: error.message, 
          module: "ValidationCacheService",
          data: { startDate: startDate?.toISOString(), endDate: endDate?.toISOString() }
        });
      }
      return [];
    }
  }

  /**
   * 👥 Load all samplers data
   */
  async loadSamplersData() {
    const startTime = performance.now();
    
    try {
      const response = await fetch(SAMPLING_ROSTER_CONSTANTS.API_ENDPOINTS.SAMPLERS);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Validar estructura de respuesta
      if (!result) {
        throw new Error("Empty response from API");
      }

      // Registrar métricas de API
      PerformanceTracker.apiCall('loadSamplersData', true, performance.now() - startTime, {
        responseSize: JSON.stringify(result).length
      });

      if (Array.isArray(result)) return result;
      if (result && Array.isArray(result.data)) return result.data;
      if (result && Array.isArray(result.items)) return result.items;
      
      return [];
    } catch (error) {
      // Registrar error de performance
      PerformanceTracker.error('ValidationCacheService', 'loadSamplersData', error);

      if (window.Logger) {
        window.Logger.error("Failed to load samplers data", { 
          error: error.message, 
          module: "ValidationCacheService"
        });
      }
      return [];
    }
  }

  /**
   * 🚛 Load truck work days for the week
   */
  async loadTruckWorkDaysForWeek(startDate, endDate) {
    const startTime = performance.now();
    
    try {
      // Validar parámetros de entrada
      if (!startDate || !endDate) {
        throw new Error("startDate and endDate are required");
      }

      if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
        throw new Error("startDate and endDate must be Date objects");
      }

      // Obtener URL base dinámicamente
      const getBaseURL = () => {
        const { hostname, protocol } = window.location;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return `${protocol}//${hostname}:3000`;
        }
        return '';
      };
      
      const baseURL = getBaseURL();
      const fromDate = startDate.toISOString().split('T')[0];
      const toDate = endDate.toISOString().split('T')[0];
      
      const response = await fetch(`${baseURL}/api/truckworkdays?from=${fromDate}&to=${toDate}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Validar estructura de respuesta
      if (!result) {
        throw new Error("Empty response from API");
      }

      // Registrar métricas de API
      PerformanceTracker.apiCall('loadTruckWorkDaysForWeek', true, performance.now() - startTime, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        responseSize: JSON.stringify(result).length
      });

      if (result && result.success && Array.isArray(result.data)) return result.data;
      
      return [];
    } catch (error) {
      // Registrar error de performance
      PerformanceTracker.error('ValidationCacheService', 'loadTruckWorkDaysForWeek', error);

      if (window.Logger) {
        window.Logger.error("Failed to load truck work days", { 
          error: error.message, 
          module: "ValidationCacheService",
          data: { startDate: startDate?.toISOString(), endDate: endDate?.toISOString() }
        });
      }
      return [];
    }
  }

  /**
   * ⚡ Load other jobs for the week
   */
  async loadOtherJobsForWeek(startDate, endDate) {
    const startTime = performance.now();
    
    try {
      // Validar parámetros de entrada
      if (!startDate || !endDate) {
        throw new Error("startDate and endDate are required");
      }

      if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
        throw new Error("startDate and endDate must be Date objects");
      }

      // Obtener URL base dinámicamente
      const getBaseURL = () => {
        const { hostname, protocol } = window.location;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return `${protocol}//${hostname}:3000`;
        }
        return '';
      };
      
      const baseURL = getBaseURL();
      const fromDate = startDate.toISOString().split('T')[0];
      const toDate = endDate.toISOString().split('T')[0];
      
      const response = await fetch(`${baseURL}/api/otherjobs?from=${fromDate}&to=${toDate}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Validar estructura de respuesta
      if (!result) {
        throw new Error("Empty response from API");
      }

      // Registrar métricas de API
      PerformanceTracker.apiCall('loadOtherJobsForWeek', true, performance.now() - startTime, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        responseSize: JSON.stringify(result).length
      });

      if (result && result.success && Array.isArray(result.data)) return result.data;
      
      return [];
    } catch (error) {
      // Registrar error de performance
      PerformanceTracker.error('ValidationCacheService', 'loadOtherJobsForWeek', error);

      if (window.Logger) {
        window.Logger.error("Failed to load other jobs", { 
          error: error.message, 
          module: "ValidationCacheService",
          data: { startDate: startDate?.toISOString(), endDate: endDate?.toISOString() }
        });
      }
      return [];
    }
  }

  /**
   * 🧮 Calculate per-sampler validations for the week (indexed by samplerName)
   */
  calculateAllValidations(activeRosters, shipNominations, samplersData, truckWorkDays, otherJobs, startDate, endDate) {
    const startTime = performance.now();
    
    try {
      // Validar parámetros de entrada
      if (!Array.isArray(activeRosters)) activeRosters = [];
      if (!Array.isArray(shipNominations)) shipNominations = [];
      if (!Array.isArray(samplersData)) samplersData = [];
      if (!Array.isArray(truckWorkDays)) truckWorkDays = [];
      if (!Array.isArray(otherJobs)) otherJobs = [];

      // Build fast lookup maps
      const nameToSampler = new Map();
      samplersData.forEach((s) => {
        if (s && s.name) nameToSampler.set(s.name, s);
      });

    // Helper to collect schedule entries for a sampler
    const buildSamplerSchedule = (samplerName) => {
      const schedule = [];
      
      // 1. Sampling Roster entries
      activeRosters.forEach((roster) => {
        // Office
        if (roster.officeSampling && roster.officeSampling.sampler?.name === samplerName) {
          schedule.push({
            start: new Date(roster.officeSampling.startTime),
            end: new Date(roster.officeSampling.finishTime),
            type: "office",
            vesselName: roster.vesselName || "",
            module: "SamplingRoster",
          });
        }
        // Line
        if (Array.isArray(roster.lineSampling)) {
          roster.lineSampling.forEach((turn) => {
            if (turn?.sampler?.name === samplerName) {
              schedule.push({
                start: new Date(turn.startTime),
                end: new Date(turn.finishTime),
                type: "line",
                vesselName: roster.vesselName || "",
                module: "SamplingRoster",
              });
            }
          });
        }
      });
      
      // 2. 🆕 Truck Loading entries
      if (Array.isArray(truckWorkDays)) {
        truckWorkDays.forEach((workDay) => {
          if (workDay.samplerName && 
              workDay.samplerName.toLowerCase() === samplerName.toLowerCase() &&
              workDay.shift && workDay.shift.startTime && workDay.shift.endTime) {
            schedule.push({
              start: new Date(workDay.shift.startTime),
              end: new Date(workDay.shift.endTime),
              type: "truck",
              vesselName: "Truck Loading",
              module: "TruckLoading",
            });
          }
        });
      }
      
      // 3. 🆕 Other Jobs entries
      if (Array.isArray(otherJobs)) {
        otherJobs.forEach((job) => {
          if (job.samplerName && 
              job.samplerName.toLowerCase() === samplerName.toLowerCase() &&
              job.shift && job.shift.startTime && job.shift.endTime) {
            schedule.push({
              start: new Date(job.shift.startTime),
              end: new Date(job.shift.endTime),
              type: "other",
              vesselName: "Other Jobs",
              module: "OtherJobs",
            });
          }
        });
      }
      
      // Filter to week range
      return schedule.filter((e) => this.isDateInRange(e.start, startDate, endDate) || this.isDateInRange(e.end, startDate, endDate));
    };

    // Helper to compute weekly hours from schedule entries
    const computeWeeklyHours = (schedule) => {
      return schedule.reduce((sum, e) => {
        const hours = (e.end - e.start) / (1000 * 60 * 60);
        return sum + Math.max(0, hours || 0);
      }, 0);
    };

    // Build POB windows indexed by samplerName
    const samplerPOBWindows = new Map();
    shipNominations.forEach((nom) => {
      const samplerName = nom?.sampler?.name;
      if (!samplerName) return;
      const pobStart = new Date(nom.pilotOnBoard || nom.pobDate);
      const etcEnd = new Date(nom.etc || nom.etcTime);
      if (!(pobStart instanceof Date) || isNaN(pobStart) || !(etcEnd instanceof Date) || isNaN(etcEnd)) return;
      if (!this.isDateInRange(pobStart, startDate, endDate) && !this.isDateInRange(etcEnd, startDate, endDate)) return;
      if (!samplerPOBWindows.has(samplerName)) samplerPOBWindows.set(samplerName, []);
      samplerPOBWindows.get(samplerName).push({ vessel: nom.vesselName, amspecRef: nom.amspecRef, pobStart, etcEnd });
    });

    const perSampler = {};

    nameToSampler.forEach((sampler, samplerName) => {
      // Weekly limit from constants map (loaded at runtime)
      const weeklyLimit = SAMPLING_ROSTER_CONSTANTS.SAMPLER_LIMITS?.WEEKLY_LIMITS?.[samplerName] || null;
      const hasWeeklyLimit = Boolean(weeklyLimit);

      // Schedule and current hours
      const schedule = buildSamplerSchedule(samplerName);
      const currentWeeklyHours = computeWeeklyHours(schedule);

      // Day restrictions from sampler data
      const wdr = sampler.weekDayRestrictions || {};
      const restrictions = {
        monday: Boolean(wdr.monday),
        tuesday: Boolean(wdr.tuesday),
        wednesday: Boolean(wdr.wednesday),
        thursday: Boolean(wdr.thursday),
        friday: Boolean(wdr.friday),
        saturday: Boolean(wdr.saturday),
        sunday: Boolean(wdr.sunday),
      };
      const hasDayRestrictions = Object.values(restrictions).some((v) => v === true);

      perSampler[samplerName] = {
        weekly: {
          hasWeeklyLimit,
          weeklyLimit: weeklyLimit || 0,
          currentWeeklyHours,
        },
        dayRestrictions: {
          hasDayRestrictions,
          restrictions,
        },
        restValidation: {
          schedule, // used to compute rest alongside proposed shift
        },
        conflicts: schedule.map((e) => ({ start: e.start, end: e.end, type: e.type, vesselName: e.vesselName })),
        pobConflicts: samplerPOBWindows.get(samplerName) || [],
      };
    });

      // Registrar métricas de performance
      PerformanceTracker.validation('calculateAllValidations', true, performance.now() - startTime, {
        samplersIndexed: Object.keys(perSampler).length,
        activeRostersCount: activeRosters?.length || 0,
        samplersDataCount: samplersData?.length || 0,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      });

      if (window.Logger) {
        window.Logger.debug("Per-sampler validations calculated", {
          samplersIndexed: Object.keys(perSampler).length,
          module: "ValidationCacheService",
        });
      }

      return perSampler;
    } catch (error) {
      // Registrar error de performance
      PerformanceTracker.error('ValidationCacheService', 'calculateAllValidations', error);

      if (window.Logger) {
        window.Logger.error("Failed to calculate validations", {
          error: error.message,
          module: "ValidationCacheService",
          data: {
            activeRostersCount: activeRosters?.length || 0,
            samplersDataCount: samplersData?.length || 0,
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString()
          }
        });
      }
      return {};
    }
  }

  /**
   * 📅 Calculate weekly limits for all samplers
   */
  calculateWeeklyLimits(samplersData, activeRosters, startDate, endDate) {
    const weeklyLimits = {};
    
    samplersData.forEach(sampler => {
      const samplerId = sampler.id;
      const weekNumber = this.getWeekNumber(startDate);
      const key = `${samplerId}_${weekNumber}`;
      
      // Count existing turns for this sampler in this week
      const existingTurns = activeRosters.reduce((count, roster) => {
        if (roster.samplerId === samplerId && this.isDateInRange(roster.date, startDate, endDate)) {
          return count + 1;
        }
        return count;
      }, 0);

      weeklyLimits[key] = {
        samplerId,
        weekNumber,
        currentTurns: existingTurns,
        maxTurns: sampler.weeklyLimit || 5, // Default limit
        available: existingTurns < (sampler.weeklyLimit || 5)
      };
    });

    return weeklyLimits;
  }

  /**
   * 🚫 Calculate day restrictions for all samplers
   */
  calculateDayRestrictions(samplersData) {
    const dayRestrictions = {};
    
    samplersData.forEach(sampler => {
      dayRestrictions[sampler.id] = {
        samplerId: sampler.id,
        restrictedDays: sampler.restrictedDays || [],
        availableDays: sampler.availableDays || [0, 1, 2, 3, 4, 5, 6] // 0 = Sunday
      };
    });

    return dayRestrictions;
  }

  /**
   * ⏰ Calculate time conflicts for all rosters
   */
  calculateTimeConflicts(activeRosters, startDate, endDate) {
    const timeConflicts = {};
    
    activeRosters.forEach(roster => {
      if (this.isDateInRange(roster.date, startDate, endDate)) {
        const dateKey = roster.date.split('T')[0];
        if (!timeConflicts[dateKey]) {
          timeConflicts[dateKey] = [];
        }
        timeConflicts[dateKey].push({
          rosterId: roster.id,
          samplerId: roster.samplerId,
          startTime: roster.startTime,
          endTime: roster.endTime,
          duration: roster.duration
        });
      }
    });

    return timeConflicts;
  }

  /**
   * 🚁 Calculate POB conflicts for all ship nominations
   */
  calculatePOBConflicts(shipNominations, startDate, endDate) {
    const pobConflicts = {};
    
    shipNominations.forEach(nomination => {
      if (this.isDateInRange(nomination.pobDate, startDate, endDate)) {
        const dateKey = nomination.pobDate.split('T')[0];
        if (!pobConflicts[dateKey]) {
          pobConflicts[dateKey] = [];
        }
        pobConflicts[dateKey].push({
          nominationId: nomination.id,
          pobDate: nomination.pobDate,
          pobTime: nomination.pobTime,
          duration: nomination.duration || 2 // Default duration
        });
      }
    });

    return pobConflicts;
  }

  /**
   * 😴 Calculate rest validation for all rosters
   */
  calculateRestValidation(activeRosters, startDate, endDate) {
    const restValidation = {};
    
    // Group rosters by sampler
    const samplerRosters = {};
    activeRosters.forEach(roster => {
      if (this.isDateInRange(roster.date, startDate, endDate)) {
        if (!samplerRosters[roster.samplerId]) {
          samplerRosters[roster.samplerId] = [];
        }
        samplerRosters[roster.samplerId].push(roster);
      }
    });

    // Calculate rest periods for each sampler
    Object.keys(samplerRosters).forEach(samplerId => {
      const rosters = samplerRosters[samplerId].sort((a, b) => new Date(a.date) - new Date(a.date));
      
      restValidation[samplerId] = {
        samplerId,
        lastRosterDate: rosters.length > 0 ? rosters[rosters.length - 1].date : null,
        minimumRestHours: 12, // Configurable
        hasMinimumRest: true // Will be calculated based on business logic
      };
    });

    return restValidation;
  }

  /**
   * 📋 Get sampler validations from cache
   */
  getSamplerValidations(samplerId, date, weekValidationData) {
    const weekNumber = this.getWeekNumber(date);
    const weeklyKey = `${samplerId}_${weekNumber}`;
    const dateKey = date.toISOString().split('T')[0];

    return {
      weeklyLimit: weekValidationData.weeklyLimits[weeklyKey] || null,
      dayRestriction: weekValidationData.dayRestrictions[samplerId] || null,
      timeConflict: weekValidationData.timeConflicts[dateKey] || [],
      pobConflict: weekValidationData.pobConflicts[dateKey] || [],
      restValidation: weekValidationData.restValidation[samplerId] || null
    };
  }

  /**
   * 📊 Get week validation data from cache
   */
  getWeekValidationData(weekKey) {
    const cached = this.weeklyCache.get(weekKey);
    return cached ? cached.data : null;
  }

  /**
   * ⏰ Check if cache is still valid
   */
  isCacheValid(weekKey) {
    const cached = this.weeklyCache.get(weekKey);
    if (!cached) return false;
    
    const age = Date.now() - cached.timestamp;
    return age < this.cacheTTL;
  }

  /**
   * 📅 Get cache age in minutes
   */
  getCacheAge(weekKey) {
    const cached = this.weeklyCache.get(weekKey);
    if (!cached) return null;
    
    return Math.floor((Date.now() - cached.timestamp) / (1000 * 60));
  }

  /**
   * 🧹 Clean up old cache entries
   */
  cleanupOldCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of this.weeklyCache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.weeklyCache.delete(key);
        cleaned++;
      }
    }

    if (window.Logger && cleaned > 0) {
      window.Logger.info(`🧹 Cleaned up ${cleaned} old cache entries`, {
        module: "ValidationCacheService"
      });
    }
  }

  /**
   * 🗑️ Clear all cache
   */
  clearAllCache() {
    this.weeklyCache.clear();
    this.samplersCache.clear();
    this.weeklyLimitsCache.clear();
    
    if (window.Logger) {
      window.Logger.info("🗑️ All cache cleared", { module: "ValidationCacheService" });
    }
  }

  /**
   * 🔑 Generate week key for cache
   */
  getWeekKey(date) {
    const weekNumber = this.getWeekNumber(date);
    const year = date.getFullYear();
    return `${year}_W${weekNumber}`;
  }

  /**
   * 📅 Get week number from date
   */
  getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  /**
   * 📍 Check if date is in range
   */
  isDateInRange(date, startDate, endDate) {
    const checkDate = new Date(date);
    return checkDate >= startDate && checkDate <= endDate;
  }

  /**
   * 🚀 Iniciar cleanup automático
   */
  startCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 2 * 60 * 1000); // Cada 2 minutos
  }

  /**
   * 🧹 Realizar cleanup de memoria
   */
  performCleanup() {
    try {
      let cleaned = 0;
      const now = Date.now();

      // Limpiar entradas expiradas
      for (const [key, value] of this.weeklyCache.entries()) {
        if (now - value.timestamp > this.cacheTTL) {
          this.weeklyCache.delete(key);
          cleaned++;
        }
      }

      // Limpiar si excede el límite de tamaño
      this.enforceCacheSizeLimit();

      // Actualizar métricas de memoria
      this.updateMemoryUsage();

      if (cleaned > 0 && window.Logger) {
        window.Logger.debug("Cache cleanup performed", {
          module: "ValidationCacheService",
          data: {
            entriesRemoved: cleaned,
            currentCacheSize: this.weeklyCache.size,
            memoryUsage: this.performanceMetrics.memoryUsage
          },
          showNotification: false,
        });
      }
    } catch (error) {
      if (window.Logger) {
        window.Logger.error("Error during cache cleanup", {
          module: "ValidationCacheService",
          error: error.message,
          showNotification: false,
        });
      }
    }
  }

  /**
   * 📏 Enforzar límite de tamaño del cache
   */
  enforceCacheSizeLimit() {
    if (this.weeklyCache.size <= this.maxCacheSize) return;

    // Ordenar por timestamp (más antiguos primero)
    const entries = Array.from(this.weeklyCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remover entradas más antiguas hasta alcanzar el límite
    const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
    toRemove.forEach(([key]) => {
      this.weeklyCache.delete(key);
    });

    if (window.Logger && toRemove.length > 0) {
      window.Logger.debug("Cache size limit enforced", {
        module: "ValidationCacheService",
        data: {
          removedEntries: toRemove.length,
          currentSize: this.weeklyCache.size,
          maxSize: this.maxCacheSize
        },
        showNotification: false,
      });
    }
  }

  /**
   * 📊 Estimar tamaño de entrada del cache
   */
  estimateCacheEntrySize(data) {
    try {
      const jsonString = JSON.stringify(data);
      return new Blob([jsonString]).size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 💾 Actualizar uso de memoria
   */
  updateMemoryUsage() {
    let totalSize = 0;
    for (const [key, value] of this.weeklyCache.entries()) {
      totalSize += value.size || 0;
    }
    this.performanceMetrics.memoryUsage = totalSize;
  }

  /**
   * ⚡ Actualizar métricas de performance
   */
  updatePerformanceMetrics(startTime) {
    const responseTime = performance.now() - startTime;
    this.performanceMetrics.averageResponseTime = 
      (this.performanceMetrics.averageResponseTime + responseTime) / 2;
  }

  /**
   * 📈 Obtener métricas de performance
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheHitRate: this.performanceMetrics.totalRequests > 0 
        ? (this.performanceMetrics.cacheHits / this.performanceMetrics.totalRequests * 100).toFixed(2) + '%'
        : '0%',
      memoryUsageMB: (this.performanceMetrics.memoryUsage / 1024 / 1024).toFixed(2) + 'MB',
      cacheSize: this.weeklyCache.size,
      maxCacheSize: this.maxCacheSize
    };
  }

  /**
   * 🔄 Resetear métricas
   */
  resetMetrics() {
    this.performanceMetrics = {
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      memoryUsage: 0
    };

    if (window.Logger) {
      window.Logger.info("Performance metrics reset", {
        module: "ValidationCacheService",
        showNotification: false,
      });
    }
  }

  /**
   * 🗑️ Destructor para limpiar recursos
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.weeklyCache.clear();
    this.samplersCache.clear();
    this.weeklyLimitsCache.clear();

    if (window.Logger) {
      window.Logger.info("ValidationCacheService destroyed", {
        module: "ValidationCacheService",
        showNotification: false,
      });
    }
  }
}

export default ValidationCacheService;
