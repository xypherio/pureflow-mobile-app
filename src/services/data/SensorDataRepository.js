import { fetchAllDocuments } from '@services/firebase/firestore';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db as firestore } from '../firebase/config';

export class SensorDataRepository {
  constructor() {
    this.collectionName = 'datm_data';
    
    // Bind methods to ensure 'this' context is preserved
    this.normalizeSensorData = this.normalizeSensorData.bind(this);
    this.parseDateTime = this.parseDateTime.bind(this);
    this.parseNumericValue = this.parseNumericValue.bind(this);
    this.assessDataQuality = this.assessDataQuality.bind(this);
  }

  async getMostRecent(limit = 1) {
    try {
      const data = await fetchAllDocuments(this.collectionName, {
        useCache: false,
        limitCount: limit,
        orderByField: 'datetime',
        orderDirection: 'desc'
      });

      return data.map(this.normalizeSensorData);
    } catch (error) {
      console.error('❌ Error fetching recent sensor data:', error);
      throw error;
    }
  }

  async getByDateRange(startDate, endDate, limit = null) {
    try {
      console.log('🔍 Querying sensor data by date range:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit
      });

      let q = query(
        collection(firestore, this.collectionName),
        where('datetime', '>=', startDate),
        where('datetime', '<=', endDate),
        orderBy('datetime', 'asc')
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.warn('⚠️ No sensor data found for date range');
        return [];
      }

      const data = [];
      querySnapshot.forEach((doc) => {
        const rawData = { id: doc.id, ...doc.data() };
        data.push(this.normalizeSensorData(rawData));
      });

      console.log(`✅ Retrieved ${data.length} sensor records`);
      return limit ? data.slice(0, limit) : data;

    } catch (error) {
      console.error('❌ Error fetching sensor data by date range:', error);
      throw error;
    }
  }

  async getCurrentDayData() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getByDateRange(today, tomorrow);
  }

  async getAll(options = {}) {
    const {
      limitCount = 500,
      orderByField = 'datetime',
      orderDirection = 'desc'
    } = options;

    try {
      const data = await fetchAllDocuments(this.collectionName, {
        useCache: false,
        limitCount,
        orderByField,
        orderDirection
      });

      return data.map(this.normalizeSensorData);
    } catch (error) {
      console.error('❌ Error fetching all sensor data:', error);
      throw error;
    }
  }

  normalizeSensorData(rawData) {
    const normalized = {
      id: rawData.id,
      datetime: this.parseDateTime(rawData.datetime),
      timestamp: this.parseDateTime(rawData.datetime),
      
      // Water quality parameters
      pH: this.parseNumericValue(rawData.pH),
      temperature: this.parseNumericValue(rawData.temperature),
      turbidity: this.parseNumericValue(rawData.turbidity),
      salinity: this.parseNumericValue(rawData.salinity),
      tds: this.parseNumericValue(rawData.tds),
      
      // Environmental data
      isRaining: Boolean(rawData.isRaining),
      
      // Metadata
      source: rawData.source || 'sensor',
      quality: this.assessDataQuality(rawData)
    };

    return normalized;
  }

  parseDateTime(datetime) {
    if (!datetime) return new Date();
    
    if (datetime.toDate && typeof datetime.toDate === 'function') {
      return datetime.toDate();
    }
    
    return new Date(datetime);
  }

  parseNumericValue(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  assessDataQuality(rawData) {
    const requiredFields = ['pH', 'temperature', 'turbidity', 'salinity'];
    const presentFields = requiredFields.filter(field => 
      rawData[field] !== null && 
      rawData[field] !== undefined && 
      !isNaN(parseFloat(rawData[field]))
    );

    const completeness = presentFields.length / requiredFields.length;
    
    if (completeness === 1) return 'complete';
    if (completeness >= 0.75) return 'good';
    if (completeness >= 0.5) return 'partial';
    return 'incomplete';
  }
}