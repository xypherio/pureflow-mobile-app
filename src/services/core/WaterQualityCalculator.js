export class WaterQualityCalculator {
    constructor() {
      this.weights = {
        pH: 0.25,
        temperature: 0.20,
        turbidity: 0.25,
        salinity: 0.30
      };
  
      this.qualityRanges = {
        excellent: { min: 90, max: 100 },
        good: { min: 70, max: 89 },
        fair: { min: 50, max: 69 },
        poor: { min: 25, max: 49 },
        veryPoor: { min: 0, max: 24 }
      };
    }
  
    calculateWQI(sensorData) {
      if (!sensorData || typeof sensorData !== 'object') {
        return null;
      }
  
      const parameterScores = {};
      let totalWeight = 0;
      let weightedSum = 0;
  
      for (const [parameter, weight] of Object.entries(this.weights)) {
        const value = sensorData[parameter];
        if (value !== null && value !== undefined && !isNaN(value)) {
          const score = this.calculateParameterScore(parameter, value);
          parameterScores[parameter] = score;
          weightedSum += score * weight;
          totalWeight += weight;
        }
      }
  
      if (totalWeight === 0) {
        return null;
      }
  
      const wqi = Math.round(weightedSum / totalWeight);
      
      return {
        overall: wqi,
        rating: this.getRating(wqi),
        parameters: parameterScores,
        weights: this.weights
      };
    }
  
    calculateParameterScore(parameter, value) {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return 0;
  
      switch (parameter.toLowerCase()) {
        case 'ph':
          return this.calculatePHScore(numValue);
        case 'temperature':
          return this.calculateTemperatureScore(numValue);
        case 'turbidity':
          return this.calculateTurbidityScore(numValue);
        case 'salinity':
          return this.calculateSalinityScore(numValue);
        default:
          return 50; // Neutral score for unknown parameters
      }
    }
  
    calculatePHScore(ph) {
      if (ph >= 6.5 && ph <= 8.5) return 100;
      if (ph >= 6.0 && ph <= 9.0) return 75;
      if (ph >= 5.5 && ph <= 9.5) return 50;
      if (ph >= 5.0 && ph <= 10.0) return 25;
      return 0;
    }
  
    calculateTemperatureScore(temp) {
      if (temp >= 26 && temp <= 30) return 100;
      if (temp >= 24 && temp <= 32) return 80;
      if (temp >= 22 && temp <= 34) return 60;
      if (temp >= 20 && temp <= 35) return 40;
      return 20;
    }
  
    calculateTurbidityScore(turbidity) {
      if (turbidity <= 10) return 100;
      if (turbidity <= 25) return 80;
      if (turbidity <= 50) return 60;
      if (turbidity <= 100) return 40;
      return 20;
    }
  
    calculateSalinityScore(salinity) {
      if (salinity <= 1) return 100;
      if (salinity <= 3) return 80;
      if (salinity <= 5) return 60;
      if (salinity <= 10) return 40;
      return 20;
    }
  
    getRating(wqi) {
      for (const [rating, range] of Object.entries(this.qualityRanges)) {
        if (wqi >= range.min && wqi <= range.max) {
          return {
            level: rating,
            description: this.getRatingDescription(rating),
            color: this.getRatingColor(rating)
          };
        }
      }
      return {
        level: 'unknown',
        description: 'Unable to determine water quality',
        color: '#666666'
      };
    }
  
    getRatingDescription(rating) {
      const descriptions = {
        excellent: 'Water quality is excellent with minimal risk',
        good: 'Water quality is good with low risk',
        fair: 'Water quality is fair with moderate risk',
        poor: 'Water quality is poor with high risk',
        veryPoor: 'Water quality is very poor with very high risk'
      };
      return descriptions[rating] || 'Unknown water quality';
    }
  
    getRatingColor(rating) {
      const colors = {
        excellent: '#4CAF50',
        good: '#8BC34A',
        fair: '#FF9800',
        poor: '#FF5722',
        veryPoor: '#F44336'
      };
      return colors[rating] || '#666666';
    }
  
    validateSensorData(data) {
      const errors = [];
      const warnings = [];
  
      for (const [parameter, value] of Object.entries(data)) {
        if (this.weights[parameter]) {
          if (value === null || value === undefined) {
            warnings.push(`${parameter} value is missing`);
          } else if (isNaN(parseFloat(value))) {
            errors.push(`${parameter} value is not a valid number: ${value}`);
          }
        }
      }
  
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        hasAllParameters: Object.keys(this.weights).every(param => 
          data[param] !== null && data[param] !== undefined
        )
      };
    }
  }
