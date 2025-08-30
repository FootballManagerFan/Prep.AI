const fs = require('fs');
const path = require('path');

class DatabaseService {
  constructor() {
    this.dbPath = path.join(__dirname, 'problems.json');
    this.problems = null;
    this.categories = null;
    this.loadDatabase();
  }

  // Load database from JSON file
  loadDatabase() {
    try {
      const data = fs.readFileSync(this.dbPath, 'utf8');
      const db = JSON.parse(data);
      this.problems = db.problems;
      this.categories = db.categories;
      console.log('✅ Database loaded successfully');
    } catch (error) {
      console.error('❌ Error loading database:', error);
      this.problems = {};
      this.categories = {};
    }
  }

  // Get all problems
  getAllProblems() {
    return this.problems;
  }

  // Get problem by ID
  getProblemById(id) {
    return this.problems[id] || null;
  }

  // Get problems by category
  getProblemsByCategory(category) {
    const categoryData = this.categories[category];
    if (!categoryData) return [];
    
    return categoryData.problems.map(problemId => this.problems[problemId]);
  }

  // Get all categories
  getAllCategories() {
    return this.categories;
  }

  // Get category by name
  getCategoryByName(name) {
    return this.categories[name] || null;
  }

  // Search problems by tags or title
  searchProblems(query) {
    const results = [];
    const searchTerm = query.toLowerCase();
    
    Object.values(this.problems).forEach(problem => {
      if (problem.title.toLowerCase().includes(searchTerm) ||
          problem.tags.some(tag => tag.toLowerCase().includes(searchTerm))) {
        results.push(problem);
      }
    });
    
    return results;
  }

  // Add new problem (for admin use)
  addProblem(problem) {
    if (!problem.id || this.problems[problem.id]) {
      throw new Error('Problem ID already exists or is missing');
    }
    
    this.problems[problem.id] = problem;
    this.saveDatabase();
    return problem;
  }

  // Update existing problem
  updateProblem(id, updates) {
    if (!this.problems[id]) {
      throw new Error('Problem not found');
    }
    
    this.problems[id] = { ...this.problems[id], ...updates };
    this.saveDatabase();
    return this.problems[id];
  }

  // Delete problem
  deleteProblem(id) {
    if (!this.problems[id]) {
      throw new Error('Problem not found');
    }
    
    delete this.problems[id];
    this.saveDatabase();
    return true;
  }

  // Save database to file
  saveDatabase() {
    try {
      const data = {
        problems: this.problems,
        categories: this.categories
      };
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
      console.log('✅ Database saved successfully');
    } catch (error) {
      console.error('❌ Error saving database:', error);
      throw error;
    }
  }

  // Reload database from file
  reload() {
    this.loadDatabase();
  }
}

module.exports = DatabaseService;
