export class DataProcessor {
    constructor() {
      this.processors = [];
      this.validationRules = new Map();
      this.transformationRules = new Map();
    }
  
    // Add processing steps
    addProcessor(name, processor) {
      if (typeof processor.process !== 'function') {
        throw new Error('Processor must implement process method');
      }
      this.processors.push({ name, processor });
    }
  
    // Add validation rules
    addValidationRule(parameter, rule) {
      if (!this.validationRules.has(parameter)) {
        this.validationRules.set(parameter, []);
      }
      this.validationRules.get(parameter).push(rule);
    }
  
    // Add transformation rules
    addTransformationRule(parameter, rule) {
      if (!this.transformationRules.has(parameter)) {
        this.transformationRules.set(parameter, []);
      }
      this.transformationRules.get(parameter).push(rule);
    }
  
    // Main processing pipeline
    async processData(data) {
      if (!data) {
        return { processed: null, errors: ['No data provided'], warnings: [] };
      }
  
      console.log('🔄 Processing data through pipeline');
  
      let currentData = Array.isArray(data) ? [...data] : { ...data };
      const results = {
        processed: null,
        errors: [],
        warnings: [],
        metadata: {
          originalCount: Array.isArray(data) ? data.length : 1,
          processedCount: 0,
          validationResults: {},
          transformationResults: {}
        }
      };
  
      try {
        // Step 1: Validate data
        const validation = await this.validateData(currentData);
        results.errors.push(...validation.errors);
        results.warnings.push(...validation.warnings);
        results.metadata.validationResults = validation.results;
  
        if (validation.errors.length > 0) {
          console.warn(`⚠️ Data validation found ${validation.errors.length} errors`);
        }
  
        // Step 2: Clean and normalize data
        currentData = await this.cleanData(currentData);
  
        // Step 3: Apply transformations
        const transformation = await this.transformData(currentData);
        currentData = transformation.data;
        results.metadata.transformationResults = transformation.results;
  
        // Step 4: Apply custom processors
        for (const { name, processor } of this.processors) {
          try {
            console.log(`🔄 Applying processor: ${name}`);
            currentData = await processor.process(currentData);
          } catch (error) {
            console.error(`❌ Error in processor ${name}:`, error);
            results.errors.push(`Processor ${name} failed: ${error.message}`);
          }
        }
  
        // Step 5: Final validation
        const finalValidation = await this.validateProcessedData(currentData);
        results.warnings.push(...finalValidation.warnings);
  
        results.processed = currentData;
        results.metadata.processedCount = Array.isArray(currentData) ? currentData.length : 1;
  
        console.log(`✅ Data processing completed: ${results.metadata.processedCount} items processed`);
        
      } catch (error) {
        console.error('❌ Critical error in data processing pipeline:', error);
        results.errors.push(`Pipeline error: ${error.message}`);
      }
  
      return results;
    }
  
    async validateData(data) {
      const errors = [];
      const warnings = [];
      const results = {};
  
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          const itemResult = await this.validateDataItem(data[i], i);
          errors.push(...itemResult.errors);
          warnings.push(...itemResult.warnings);
          results[i] = itemResult.results;
        }
      } else {
        const itemResult = await this.validateDataItem(data, 0);
        errors.push(...itemResult.errors);
        warnings.push(...itemResult.warnings);
        results[0] = itemResult.results;
      }
  
      return { errors, warnings, results };
    }
  
    async validateDataItem(item, index) {
      const errors = [];
      const warnings = [];
      const results = {};
  
      if (!item || typeof item !== 'object') {
        errors.push(`Item ${index}: Invalid data format`);
        return { errors, warnings, results };
      }
  
      // Apply validation rules
      for (const [parameter, rules] of this.validationRules.entries()) {
        const value = item[parameter];
        results[parameter] = { valid: true, messages: [] };
  
        for (const rule of rules) {
          try {
            const ruleResult = await rule.validate(value, item);
            if (!ruleResult.valid) {
              results[parameter].valid = false;
              results[parameter].messages.push(...ruleResult.messages);
              
              if (ruleResult.severity === 'error') {
                errors.push(`Item ${index}, ${parameter}: ${ruleResult.messages.join(', ')}`);
              } else {
                warnings.push(`Item ${index}, ${parameter}: ${ruleResult.messages.join(', ')}`);
              }
            }
          } catch (error) {
            errors.push(`Item ${index}, ${parameter}: Validation rule failed - ${error.message}`);
          }
        }
      }
  
      return { errors, warnings, results };
    }
  
    async cleanData(data) {
      if (Array.isArray(data)) {
        return data.map(item => this.cleanDataItem(item));
      } else {
        return this.cleanDataItem(data);
      }
    }
  
    cleanDataItem(item) {
      if (!item || typeof item !== 'object') return item;
  
      const cleaned = {};
  
      for (const [key, value] of Object.entries(item)) {
        // Remove null, undefined, and empty string values
        if (value !== null && value !== undefined && value !== '') {
          // Trim strings
          if (typeof value === 'string') {
            cleaned[key] = value.trim();
          }
          // Parse numbers
          else if (this.isNumericField(key) && typeof value === 'string') {
            const parsed = parseFloat(value);
            cleaned[key] = isNaN(parsed) ? value : parsed;
          }
          // Keep other values as-is
          else {
            cleaned[key] = value;
          }
        }
      }
  
      return cleaned;
    }
  
    isNumericField(fieldName) {
      const numericFields = ['ph', 'temperature', 'turbidity', 'salinity', 'tds', 'value'];
      return numericFields.includes(fieldName.toLowerCase());
    }
  
    async transformData(data) {
      const results = {};
      let transformedData = data;
  
      if (Array.isArray(data)) {
        transformedData = [];
        for (let i = 0; i < data.length; i++) {
          const itemResult = await this.transformDataItem(data[i], i);
          transformedData.push(itemResult.data);
          results[i] = itemResult.results;
        }
      } else {
        const itemResult = await this.transformDataItem(data, 0);
        transformedData = itemResult.data;
        results[0] = itemResult.results;
      }
  
      return { data: transformedData, results };
    }
  
    async transformDataItem(item, index) {
      let transformedItem = { ...item };
      const results = {};
  
      // Apply transformation rules
      for (const [parameter, rules] of this.transformationRules.entries()) {
        results[parameter] = { applied: [], errors: [] };
  
        for (const rule of rules) {
          try {
            const ruleResult = await rule.transform(transformedItem[parameter], transformedItem);
            if (ruleResult.transformed) {
              transformedItem[parameter] = ruleResult.value;
              results[parameter].applied.push(ruleResult.ruleName || 'unnamed');
            }
          } catch (error) {
            results[parameter].errors.push(error.message);
          }
        }
      }
  
      return { data: transformedItem, results };
    }
  
    async validateProcessedData(data) {
      const warnings = [];
  
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          const item = data[i];
          if (!item || typeof item !== 'object') {
            warnings.push(`Processed item ${i}: Invalid format after processing`);
          }
        }
      } else if (!data || typeof data !== 'object') {
        warnings.push('Processed data: Invalid format after processing');
      }
  
      return { warnings };
    }
  
    // Built-in validation rules
    static createRangeValidationRule(min, max, severity = 'error') {
      return {
        validate: async (value) => {
          const num = parseFloat(value);
          if (isNaN(num)) {
            return {
              valid: false,
              messages: ['Value is not a number'],
              severity
            };
          }
  
          if (num < min || num > max) {
            return {
              valid: false,
              messages: [`Value ${num} is outside valid range ${min}-${max}`],
              severity
            };
          }
  
          return { valid: true, messages: [] };
        }
      };
    }
  
    static createRequiredFieldRule(severity = 'error') {
      return {
        validate: async (value) => {
          if (value === null || value === undefined || value === '') {
            return {
              valid: false,
              messages: ['Required field is missing'],
              severity
            };
          }
          return { valid: true, messages: [] };
        }
      };
    }
  
    // Built-in transformation rules
    static createClampTransformationRule(min, max) {
      return {
        transform: async (value) => {
          const num = parseFloat(value);
          if (isNaN(num)) {
            return { transformed: false, value };
          }
  
          const clamped = Math.max(min, Math.min(max, num));
          return {
            transformed: clamped !== num,
            value: clamped,
            ruleName: 'clamp'
          };
        }
      };
    }
  
    static createRoundingTransformationRule(decimals = 2) {
      return {
        transform: async (value) => {
          const num = parseFloat(value);
          if (isNaN(num)) {
            return { transformed: false, value };
          }
  
          const factor = Math.pow(10, decimals);
          const rounded = Math.round(num * factor) / factor;
          
          return {
            transformed: rounded !== num,
            value: rounded,
            ruleName: 'round'
          };
        }
      };
    }
  }