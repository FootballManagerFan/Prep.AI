// Shared JavaScript functions for Prep.AI
// This file eliminates duplicate code across multiple HTML files

const DEFAULT_LANGUAGE = 'python';
const LANGUAGE_SELECTOR_IDS = ['languageSelector', 'languageSelect'];

const DEFAULT_CODE_SNIPPETS = {
    python: `# Write your Python solution here

def solve():
    pass

if __name__ == "__main__":
    print(solve())`,
    javascript: `// Write your JavaScript solution here

function solve() {
    return null;
}

console.log(solve());`,
    java: `// Write your Java solution here

public class Solution {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}`,
    cpp: `// Write your C++ solution here

#include <bits/stdc++.h>
using namespace std;

int main() {
    cout << "Hello World" << endl;
    return 0;
}`
};

// Common utility functions
const PrepAI = {
    monacoLanguageMap: {
        python: 'python',
        javascript: 'javascript',
        typescript: 'typescript',
        java: 'java',
        cpp: 'cpp',
        c: 'cpp',
        csharp: 'csharp',
        go: 'go',
        rust: 'rust'
    },

    monacoModuleMap: {
        python: 'vs/basic-languages/python/python',
        javascript: 'vs/basic-languages/javascript/javascript',
        typescript: 'vs/basic-languages/typescript/typescript',
        java: 'vs/basic-languages/java/java',
        cpp: 'vs/basic-languages/cpp/cpp',
        c: 'vs/basic-languages/cpp/cpp',
        csharp: 'vs/basic-languages/csharp/csharp',
        go: 'vs/basic-languages/go/go',
        rust: 'vs/basic-languages/rust/rust'
    },

    getLanguageId: function(language) {
        if (!language) return this.monacoLanguageMap[DEFAULT_LANGUAGE] || DEFAULT_LANGUAGE;
        return this.monacoLanguageMap[language] || language;
    },

    getActiveLanguage: function() {
        for (const id of LANGUAGE_SELECTOR_IDS) {
            const selector = document.getElementById(id);
            if (selector && selector.value) {
                return selector.value;
            }
        }

        if (typeof window !== 'undefined' && typeof window.currentLanguage === 'string' && window.currentLanguage) {
            return window.currentLanguage;
        }

        return DEFAULT_LANGUAGE;
    },

    setGlobalLanguage: function(language) {
        if (typeof window === 'undefined') return;
        const resolvedLanguage = language || DEFAULT_LANGUAGE;
        window.currentLanguage = resolvedLanguage;
        window.currentMonacoLanguage = this.getLanguageId(resolvedLanguage);
    },

    getStarterCode: function(language, currentProblem) {
        if (currentProblem && currentProblem.starterCode && currentProblem.starterCode[language]) {
            return currentProblem.starterCode[language];
        }

        return DEFAULT_CODE_SNIPPETS[language] || DEFAULT_CODE_SNIPPETS[DEFAULT_LANGUAGE];
    },

    setEditorLanguage: async function(editor, language) {
        if (!editor || typeof window === 'undefined' || !window.monaco || !window.monaco.editor) return;

        const model = editor.getModel ? editor.getModel() : null;
        if (!model) return;

        const languageId = this.getLanguageId(language);

        try {
            await this.ensureMonacoLanguage(languageId);
        } catch (err) {
            console.warn(`Failed to load Monaco language resources for ${languageId}:`, err);
        }

        window.monaco.editor.setModelLanguage(model, languageId);
    },

    renderExecutionLoading: function(output, language) {
        if (!output) return;
        output.innerHTML = `
            <div style="color:#6b7280; font-family:'Courier New', monospace;">
                <div># Running ${this.escapeHtml(language)} code...</div>
                <div style="font-size:0.9em; color:#9ca3af;"># Sending code to execution service</div>
            </div>
        `;
    },

    renderExecutionSuccess: function(output, language, rawOutput) {
        if (!output) return;
        const formatted = this.formatTerminalOutput(rawOutput);
        output.innerHTML = `
            <div style="color:#34d399; font-family:'Courier New', monospace; margin-bottom:0.5rem;">
                # Execution completed successfully
            </div>
            <div style="background:#0f172a; color:#d1fae5; padding:0.75rem; border-radius:0.5rem; font-family:'Courier New', monospace; font-size:0.9em; white-space:pre-wrap;">
                ${formatted}
            </div>
        `;
    },

    renderExecutionFailure: function(output, message) {
        if (!output) return;
        output.innerHTML = `
            <div style="color:#f87171; font-family:'Courier New', monospace;">
                <div># Execution failed</div>
                <div style="color:#fecaca;">${this.escapeHtml(message || 'Unknown error')}</div>
            </div>
        `;
    },

    renderExecutionNetworkError: function(output, message) {
        if (!output) return;
        output.innerHTML = `
            <div style="color:#f87171; font-family:'Courier New', monospace;">
                <div># Network error</div>
                <div style="color:#fecaca;">${this.escapeHtml(message)}</div>
            </div>
        `;
    },

    ensureMonacoLanguage: function(languageId) {
        if (!languageId) return Promise.resolve();
        if (typeof window === 'undefined' || !window.monaco || !window.monaco.languages) {
            return Promise.resolve();
        }

        const modulePath = this.monacoModuleMap[languageId];
        if (!modulePath || typeof window.require !== 'function') {
            return Promise.resolve();
        }

        return new Promise(resolve => {
            window.require([modulePath], (languageModule) => {
                try {
                    const alreadyRegistered = window.monaco.languages.getLanguages().some(lang => lang.id === languageId);
                    if (!alreadyRegistered) {
                        window.monaco.languages.register({ id: languageId });
                    }

                    if (languageModule && languageModule.language) {
                        window.monaco.languages.setMonarchTokensProvider(languageId, languageModule.language);
                    }
                    if (languageModule && languageModule.conf) {
                        window.monaco.languages.setLanguageConfiguration(languageId, languageModule.conf);
                    }
                } catch (err) {
                    console.warn(`Unable to register Monaco language: ${languageId}`, err);
                }
                resolve();
            }, (err) => {
                console.warn(`Failed to load Monaco language module: ${languageId}`, err);
                resolve();
            });
        });
    },

    // Clear output function - used across multiple pages
    clearOutput: function(outputElementId = 'codeOutput') {
        const element = document.getElementById(outputElementId);
        if (element) {
            element.innerHTML = `
                <div style="color:#9ca3af; font-family:'Courier New', monospace;">
                    <div># Output cleared</div>
                </div>
            `;
        }
    },

    // Run code function - used across multiple pages
    runCode: async function(editor, outputElementId = 'codeOutput') {
        if (!editor) return;

        const language = this.getActiveLanguage();
        this.setGlobalLanguage(language);

        try {
            await this.setEditorLanguage(editor, language);
        } catch (err) {
            console.warn(`Unable to synchronise Monaco language for ${language}:`, err);
        }

        const code = editor.getValue();
        const output = document.getElementById(outputElementId);

        this.renderExecutionLoading(output, language);

        try {
            const response = await fetch('/execute-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language })
            });

            const data = await response.json().catch(() => null);
            const succeeded = data && data.success === true;

            if (response.ok && succeeded) {
                this.renderExecutionSuccess(output, language, data.output);
                return;
            }

            const errorMessage = data && data.error ? data.error : response.statusText || 'Execution failed';
            this.renderExecutionFailure(output, errorMessage);
        } catch (error) {
            this.renderExecutionNetworkError(output, error.message);
        }
    },

    // Change programming language function
    changeLanguage: function(editor, currentProblem, languageSelectorId = 'languageSelector') {
        const languageSelector = document.getElementById(languageSelectorId);
        const currentLanguage = (languageSelector && languageSelector.value) ? languageSelector.value : this.getActiveLanguage();

        this.setGlobalLanguage(currentLanguage);

        if (editor) {
            const starterCode = this.getStarterCode(currentLanguage, currentProblem);

            if (editor.getValue() !== starterCode) {
                editor.setValue(starterCode);
            }

            this.setEditorLanguage(editor, currentLanguage).catch((err) => {
                console.warn(`Failed to synchronise Monaco language for ${currentLanguage}:`, err);
            });
        }

        return currentLanguage;
    },

    // Show error message function
    showError: function(message, containerSelector = '.left-panel') {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        
        const container = document.querySelector(containerSelector);
        if (container) {
            container.innerHTML = '';
            container.appendChild(errorDiv);
        }
    },

    // Format terminal output with proper styling
    formatTerminalOutput: function(output) {
        if (!output) return '<span class="text-gray-500" style="color:#9ca3af;">(no output)</span>';
        
        // AGGRESSIVE cleaning - remove ALL weird Docker symbols and non-standard characters
        let cleanOutput = output
            // Remove all Docker artifacts and weird symbols (comprehensive list)
            .replace(/[☺♂♣‼∟⌂☻♥♦♠♣•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼]/g, '')
            // Remove any other non-printable characters except basic punctuation
            .replace(/[^\x20-\x7E\n\r\t]/g, '')
            // Remove empty lines and normalize spacing
            .replace(/\n\s*\n/g, '\n')
            .trim();
        
        // Split output into lines and format each line
        const lines = cleanOutput.split('\n');
        const formattedLines = lines.map(line => {
            if (line.trim() === '') return '<br>';
            
            // Detect different types of output and style accordingly
            if (line.includes('Error:') || line.includes('Traceback:')) {
                return `<span class="text-red-400" style="color:#f87171;">${this.escapeHtml(line)}</span><br>`;
            } else if (line.includes('Warning:') || line.includes('DeprecationWarning:')) {
                return `<span class="text-yellow-400" style="color:#facc15;">${this.escapeHtml(line)}</span><br>`;
            } else if (line.match(/^\s*>>>/)) {
                return `<span class="text-blue-400" style="color:#60a5fa;">${this.escapeHtml(line)}</span><br>`;
            } else if (line.match(/^\s*\.\.\./)) {
                return `<span class="text-blue-400" style="color:#60a5fa;">${this.escapeHtml(line)}</span><br>`;
            } else {
                return `<span class="text-green-300" style="color:#6ee7b7;">${this.escapeHtml(line)}</span><br>`;
            }
        });
        
        return formattedLines.join('');
    },

    // Escape HTML to prevent XSS
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Start problem function - used across practice pages
    startProblem: function(problemId, category = '') {
        const url = category ? `/test?problem=${problemId}&category=${category}` : `/test?problem=${problemId}`;
        window.location.href = url;
    },

    // Generate random problem function
    generateRandomProblem: function(problems) {
        if (!problems || problems.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * problems.length);
        return problems[randomIndex];
    },

    // Create problem card HTML - eliminates repetitive card structures
    createProblemCard: function(problem, index) {
        const difficultyColors = {
            'Easy': 'bg-green-100 text-green-600',
            'Medium': 'bg-yellow-100 text-yellow-600',
            'Hard': 'bg-red-100 text-red-600'
        };
        
        const colorClass = difficultyColors[problem.difficulty] || 'bg-gray-100 text-gray-600';
        
        return `
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div class="flex items-center mb-4">
                    <div class="w-10 h-10 ${colorClass} rounded-lg flex items-center justify-center mr-3">
                        <span class="font-bold text-lg">${index}</span>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900">${problem.title}</h3>
                        <span class="text-sm ${colorClass.replace('bg-', 'text-').replace('100', '600')} font-medium">${problem.difficulty}</span>
                    </div>
                </div>
                <p class="text-gray-600 mb-4">${problem.description}</p>
                <button onclick="PrepAI.startProblem('${problem.id}', '${problem.category.toLowerCase().replace(' ', '-')}')" 
                        class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                    Start Problem
                </button>
            </div>
        `;
    },

    // Create header HTML - eliminates repetitive header structures
    createHeader: function(title, subtitle, backLink = '/', showHome = true) {
        return `
            <header class="bg-white shadow-sm border-b border-gray-200">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center py-6">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                                </svg>
                            </div>
                            <div>
                                <h1 class="text-2xl font-bold gradient-text">Prep.AI</h1>
                                <p class="text-sm text-gray-600">${subtitle}</p>
                            </div>
                        </div>
                        
                        <div class="flex items-center space-x-4">
                            <a href="${backLink}" class="text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded hover:bg-blue-50 transition-colors">
                                ← Back
                            </a>
                            ${showHome ? '<a href="/" class="text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded hover:bg-blue-50 transition-colors">Home</a>' : ''}
                        </div>
                    </div>
                </div>
            </header>
        `;
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PrepAI;
}

if (typeof window !== 'undefined') {
    window.PrepAI = PrepAI;
    if (typeof window.currentLanguage !== 'string') {
        window.currentLanguage = DEFAULT_LANGUAGE;
    }
    if (typeof window.currentMonacoLanguage !== 'string') {
        window.currentMonacoLanguage = PrepAI.getLanguageId(window.currentLanguage);
    }
}
